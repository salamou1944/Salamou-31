import assert from "node:assert/strict";
import {createAiOperatingEvidence,classifyAiOperatingOutcome,isTechnicalState,isBusinessState} from "./ai-operating-evidence.mjs";

const record=createAiOperatingEvidence({taskId:"soat-smoke",skillRevision:"agent-skills@ecafae3",independentVerification:true,businessOutcome:"ENTRY_POINT_VERIFIED"});
assert.equal(record.schema,"ai-execution-operating-evidence/v1");
assert.equal(classifyAiOperatingOutcome({executionOk:true,actionObserved:true,independentVerification:true}),"VERIFIED_OUTCOME");
assert.equal(classifyAiOperatingOutcome({executionOk:true,actionObserved:true,independentVerification:false}),"VERIFICATION_FAILED");
assert.equal(classifyAiOperatingOutcome({blockedExternal:true}),"BLOCKED_EXTERNAL");
assert.equal(isTechnicalState("RUNTIME_VERIFIED"),true);
assert.equal(isBusinessState("REVENUE_OBSERVED"),true);
console.log("ai-operating-evidence: ok");
