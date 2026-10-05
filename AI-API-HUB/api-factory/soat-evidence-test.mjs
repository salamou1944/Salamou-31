import assert from "node:assert/strict";
import {validateSoatVerificationRecord,createSoatExecutionEvidence} from "./soat-evidence.mjs";

const record={
  schema:"soat-verification-record/v1",
  evidence_level:"provider",
  scope:"ci-pinned-local-runtime",
  workflow:"SOAT Runtime Integration Smoke",
  run_id:"37259334346",
  commit:"test-commit",
  soat_sha:"600721c1fa30de27c14f6da5e5917049a5339036",
  gates:{
    health:true,
    authentication:true,
    provider_resolved:true,
    api_factory_probe:true,
    real_chat_completion:true,
    official_smoke_suite:true
  },
  production_status:"not_proven"
};

const result=validateSoatVerificationRecord(record);
assert.equal(result.ok,true);
const evidence=createSoatExecutionEvidence(record);
assert.equal(evidence.verified,true);
assert.equal(evidence.source,"soat-runtime-integration");
assert.deepEqual(evidence.reusableFor,["VERIFY","REVIEW","PLAN"]);

const failed={...record,gates:{...record.gates,real_chat_completion:false}};
assert.equal(validateSoatVerificationRecord(failed).code,"SOAT_EVIDENCE_GATE_FAILED");

console.log("SOAT evidence consumer: OK");
