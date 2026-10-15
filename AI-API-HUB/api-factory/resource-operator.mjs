import process from "node:process";
import { getResource, listResources } from "./resource-registry.mjs";

export class ResourceBlockedError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "ResourceBlockedError";
    this.code = "RESOURCE_BLOCKED";
  }
}

function envName(id) {
  return "RESOURCE_" + id.toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_ENABLED";
}

function zeroCostGate(resource, policy = {}) {
  if (!policy.zeroCostOnly) return { allowed: true, reason: "normal-policy" };
  if (!resource) return { allowed: false, reason: "unknown-resource" };
  if (resource.cost === "free" || resource.cost === "local-compute") return { allowed: true, reason: "free-or-local" };
  if (resource.cost === "quota-dependent") {
    return policy.allowQuotaDependent === true
      ? { allowed: true, reason: "explicit-quota-policy" }
      : { allowed: false, reason: "quota-dependent-needs-explicit-policy" };
  }
  return { allowed: false, reason: "plan-dependent-needs-explicit-policy" };
}

export function inspectResource(id, options = {}) {
  const resource = getResource(id);
  const gate = zeroCostGate(resource, options.policy);
  if (!resource) return { ok: false, id, gate };
  return {
    ok: gate.allowed,
    resource,
    gate,
    enabled: process.env[envName(id)] === "true",
    credentialConfigured: Boolean(options.credentialEnv && process.env[options.credentialEnv])
  };
}

export async function probePublicEndpoint(id, options = {}) {
  const resource = getResource(id);
  if (!resource) throw new ResourceBlockedError("Unknown resource");
  const gate = zeroCostGate(resource, options.policy);
  if (!gate.allowed) throw new ResourceBlockedError(`Resource blocked by cost policy: ${gate.reason}`);

  const response = await fetch(resource.entrypoint, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(options.timeoutMs ?? 5000)
  });

  return {
    id,
    ok: response.ok || (response.status >= 300 && response.status < 400),
    status: response.status,
    costGate: gate.reason,
    evidence: "transport-only"
  };
}

export function buildExecutionPlan(id, options = {}) {
  const resource = getResource(id);
  if (!resource) throw new ResourceBlockedError("Unknown resource");
  const gate = zeroCostGate(resource, options.policy);
  if (!gate.allowed) throw new ResourceBlockedError(`Resource blocked by cost policy: ${gate.reason}`);

  return {
    schema: "resource-execution-plan/v1",
    resourceId: id,
    capability: resource.capability,
    access: resource.access,
    entrypoint: resource.entrypoint,
    costPolicy: gate.reason,
    requiresUserAuthorization: resource.auth === "oauth",
    requiresCredential: resource.auth === "api-key",
    evidenceRequired: true,
    hardStopOnUnexpectedCost: true
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , command, id] = process.argv;
  if (command === "list") {
    console.log(JSON.stringify(listResources(), null, 2));
  } else if (command === "inspect" && id) {
    console.log(JSON.stringify(inspectResource(id, { policy: { zeroCostOnly: true, allowQuotaDependent: false } }), null, 2));
  } else if (command === "plan" && id) {
    console.log(JSON.stringify(buildExecutionPlan(id, { policy: { zeroCostOnly: true, allowQuotaDependent: false } }), null, 2));
  } else {
    console.error("Usage: node resource-operator.mjs <list|inspect|plan> [resource-id]");
    process.exit(2);
  }
}
