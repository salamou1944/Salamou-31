import assert from "node:assert/strict";
import { buildExecutionPlan, inspectResource, ResourceBlockedError } from "./resource-operator.mjs";
import { listResources } from "./resource-registry.mjs";

const resources = listResources();
assert.ok(resources.length >= 4);
assert.ok(resources.some((resource) => resource.id === "github-public"));
assert.ok(resources.some((resource) => resource.id === "google-workspace"));
assert.ok(resources.some((resource) => resource.id === "google-ai-studio"));
assert.ok(resources.some((resource) => resource.id === "local-ollama"));
assert.ok(resources.some((resource) => resource.id === "groq-api" && resource.cost === "quota-dependent"));
assert.ok(resources.some((resource) => resource.id === "openrouter-free-models" && resource.cost === "quota-dependent"));
assert.ok(resources.some((resource) => resource.id === "mistral-api" && resource.cost === "quota-dependent"));
assert.ok(resources.some((resource) => resource.id === "huggingface-inference" && resource.cost === "quota-dependent"));

for (const id of ["groq-api", "openrouter-free-models", "mistral-api", "huggingface-inference"]) {
  assert.throws(
    () => buildExecutionPlan(id, { policy: { zeroCostOnly: true, allowQuotaDependent: false } }),
    (error) => error instanceof ResourceBlockedError && error.code === "RESOURCE_BLOCKED"
  );
  const plan = buildExecutionPlan(id, { policy: { zeroCostOnly: true, allowQuotaDependent: true } });
  assert.equal(plan.requiresCredential, true);
  assert.equal(plan.hardStopOnUnexpectedCost, true);
}

const github = buildExecutionPlan("github-public", {
  policy: { zeroCostOnly: true, allowQuotaDependent: false }
});
assert.equal(github.hardStopOnUnexpectedCost, true);
assert.equal(github.requiresCredential, false);

const local = inspectResource("local-ollama", {
  policy: { zeroCostOnly: true, allowQuotaDependent: false }
});
assert.equal(local.ok, true);

assert.throws(
  () => buildExecutionPlan("google-workspace", {
    policy: { zeroCostOnly: true, allowQuotaDependent: false }
  }),
  (error) => error instanceof ResourceBlockedError && error.code === "RESOURCE_BLOCKED"
);

assert.throws(
  () => buildExecutionPlan("google-ai-studio", {
    policy: { zeroCostOnly: true, allowQuotaDependent: false }
  }),
  (error) => error instanceof ResourceBlockedError && error.code === "RESOURCE_BLOCKED"
);

const aiStudio = buildExecutionPlan("google-ai-studio", {
  policy: { zeroCostOnly: true, allowQuotaDependent: true }
});
assert.equal(aiStudio.requiresCredential, true);
assert.equal(aiStudio.hardStopOnUnexpectedCost, true);

console.log("resource-operator-test: OK");
