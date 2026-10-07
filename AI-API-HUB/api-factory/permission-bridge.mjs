import crypto from "node:crypto";
import { getResource } from "./resource-registry.mjs";

export class PermissionDeniedError extends Error {
  constructor(message, details = {}) {
    super(message); this.name = "PermissionDeniedError"; this.code = "PERMISSION_DENIED"; this.details = details;
  }
}
function normalizeGrant(grant = {}) {
  return { grantId: grant.grantId || crypto.randomUUID(), resourceId: grant.resourceId,
    capabilities: [...new Set(grant.capabilities || [])], methods: [...new Set((grant.methods || ["GET"]).map((m) => m.toUpperCase()))],
    credentialEnv: grant.credentialEnv || null, expiresAt: grant.expiresAt || null,
    maxRequests: Number.isFinite(grant.maxRequests) ? grant.maxRequests : 1,
    requestsUsed: grant.requestsUsed || 0, userApproved: grant.userApproved === true };
}
export function createPermissionBridge({ grants = [], zeroCostOnly = true } = {}) {
  const state = new Map(grants.map((g) => { const grant = normalizeGrant(g); if (!grant.resourceId) throw new TypeError("grant.resourceId is required"); return [grant.grantId, grant]; }));
  function getGrant(grantId) {
    const grant = state.get(grantId);
    if (!grant) throw new PermissionDeniedError("Unknown permission grant", { grantId });
    if (!grant.userApproved) throw new PermissionDeniedError("Grant is not user-approved", { grantId });
    if (grant.expiresAt && Date.now() >= Date.parse(grant.expiresAt)) throw new PermissionDeniedError("Grant has expired", { grantId });
    if (grant.requestsUsed >= grant.maxRequests) throw new PermissionDeniedError("Grant request limit reached", { grantId });
    return grant;
  }
  function authorize({ grantId, capability, method = "GET" }) {
    const grant = getGrant(grantId), resource = getResource(grant.resourceId), normalizedMethod = method.toUpperCase();
    if (!grant.capabilities.includes(capability)) throw new PermissionDeniedError("Capability is not granted", { grantId, capability });
    if (!grant.methods.includes(normalizedMethod)) throw new PermissionDeniedError("HTTP method is not granted", { grantId, method: normalizedMethod });
    if (zeroCostOnly && !["free", "local-compute"].includes(resource.cost)) throw new PermissionDeniedError("Resource is outside zero-cost policy", { grantId, resourceId: resource.id, cost: resource.cost });
    if (!["GET", "HEAD", "OPTIONS"].includes(normalizedMethod)) throw new PermissionDeniedError("Write-capable method is blocked by default", { grantId, method: normalizedMethod });
    if (grant.credentialEnv && !process.env[grant.credentialEnv]) throw new PermissionDeniedError("User-owned credential is not available in the runtime", { grantId, credentialEnv: grant.credentialEnv });
    return { grant: { ...grant }, resource };
  }
  async function execute({ grantId, capability, method = "GET", url, headers = {}, body }) {
    const { grant, resource } = authorize({ grantId, capability, method });
    if (!url || !url.startsWith(resource.entrypoint)) throw new PermissionDeniedError("Target URL is outside the granted resource boundary", { grantId, resourceId: resource.id, entrypoint: resource.entrypoint });
    const requestHeaders = { ...headers };
    if (grant.credentialEnv) requestHeaders.Authorization = requestHeaders.Authorization || `Bearer ${process.env[grant.credentialEnv]}`;
    const response = await fetch(url, { method: method.toUpperCase(), headers: requestHeaders, body: body ? JSON.stringify(body) : undefined });
    grant.requestsUsed += 1; state.set(grantId, grant);
    return { grantId, resourceId: resource.id, status: response.status, ok: response.ok,
      evidence: { executedAt: new Date().toISOString(), method: method.toUpperCase(), url, costPolicy: zeroCostOnly ? "zero-cost-only" : "normal", credentialUsed: Boolean(grant.credentialEnv), userApproved: true }, response };
  }
  return { authorize, execute, listGrants: () => [...state.values()].map((g) => ({ ...g })) };
}
export function createUserGrant({ resourceId, capabilities, methods = ["GET"], credentialEnv = null, maxRequests = 1, expiresAt = null }) {
  return normalizeGrant({ resourceId, capabilities, methods, credentialEnv, maxRequests, expiresAt, userApproved: true });
}
