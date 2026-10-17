import assert from "node:assert/strict";
import {zeroCostDecision} from "./provider.mjs";

const today=new Date().toISOString().slice(0,10);
const base={
  freePolicy:{
    zeroCostOnly:true,
    providerId:"ollama-local",
    accessClass:"local",
    freeStatus:"recurring",
    quotaBasis:"local_compute",
    hardStop:true,
    eligibilityGate:"local_runtime",
    tosRisk:"ok",
    sourceLastResearched:today,
    sourceUrl:"https://docs.ollama.com/",
    officialSourceVerified:true
  }
};
assert.deepEqual(zeroCostDecision(base),{allowed:true,mode:"zero-cost"});
assert.equal(zeroCostDecision({...base,freePolicy:{...base.freePolicy,hardStop:false}}).reason,"free_policy_not_hard_stop");
assert.equal(zeroCostDecision({...base,freePolicy:{...base.freePolicy,officialSourceVerified:false}}).reason,"free_policy_source_unverified");
assert.equal(zeroCostDecision({...base,freePolicy:{...base.freePolicy,sourceUrl:"https://github.com/diegosouzapw/OmniRoute"}}).reason,"free_policy_source_not_official");
assert.equal(zeroCostDecision({...base,freePolicy:{...base.freePolicy,accessClass:"api-key"}}).reason,"free_policy_access_class_invalid");
assert.equal(zeroCostDecision({...base,freePolicy:{...base.freePolicy,freeStatus:"promotion"}}).reason,"free_policy_not_recurring");
assert.equal(zeroCostDecision({...base,freePolicy:{...base.freePolicy,sourceLastResearched:"2020-01-01"}}).reason,"free_policy_source_stale");
assert.equal(zeroCostDecision({...base,freePolicy:{...base.freePolicy,sourceLastResearched:"not-a-date"}}).reason,"free_policy_source_date_invalid");
console.log("provider-policy: official source, hard-stop, enum and freshness gates passed");
