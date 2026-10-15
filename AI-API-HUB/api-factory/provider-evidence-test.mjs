import assert from "node:assert/strict";
import {validateProviderEvidence,assertProviderEvidence} from "./provider-evidence.mjs";

const good={evidence_level:"REAL_COMPLETION",provider:"test-provider",base_url:"https://example.invalid/v1",models_status:200,selected_model:"test-model",completion_status:200,completion_received:true,exact_output_match:true,secret_committed:false};
assert.equal(validateProviderEvidence(good).ok,true);
assert.equal(assertProviderEvidence(good).provider,"test-provider");
assert.equal(validateProviderEvidence({...good,exact_output_match:false}).code,"REAL_COMPLETION_GATE_FAILED");
assert.equal(validateProviderEvidence({...good,secret_committed:true}).code,"SECRET_COMMIT_VIOLATION");
assert.equal(validateProviderEvidence({...good,completion_status:429}).code,"HTTP_SUCCESS_GATE_FAILED");
assert.equal(validateProviderEvidence({...good,selected_model:undefined}).code,"MISSING_PROVIDER_EVIDENCE_FIELDS");
// Mistral's completion probe can provide real-completion evidence without a separate model-list request.
const completionOnly={...good};
delete completionOnly.models_status;
assert.equal(validateProviderEvidence(completionOnly).ok,true);
assert.equal(validateProviderEvidence({...completionOnly,models_status:403}).code,"MODEL_DISCOVERY_GATE_FAILED");
assert.equal(validateProviderEvidence({...completionOnly,models_status:"invalid"}).code,"MODEL_DISCOVERY_GATE_FAILED");
// A completion-only probe may omit model-discovery evidence entirely.
assert.equal(validateProviderEvidence({
  evidence_level:"REAL_COMPLETION",provider:"mistral",base_url:"https://api.mistral.ai/v1",
  selected_model:"mistral-small-latest",completion_status:200,completion_received:true,
  exact_output_match:true,secret_committed:false
}).ok,true);
console.log("provider-evidence-test: OK");
