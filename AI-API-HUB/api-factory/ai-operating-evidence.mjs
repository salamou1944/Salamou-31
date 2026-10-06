const TECHNICAL_STATES=["DISCOVERED","IMPLEMENTED","UNIT_VERIFIED","INTEGRATION_VERIFIED","RUNTIME_VERIFIED","PROVIDER_VERIFIED","E2E_VERIFIED","BUSINESS_FLOW_VERIFIED"];
const BUSINESS_STATES=["DISCOVERED","ENTRY_POINT_VERIFIED","USAGE_OBSERVED","CUSTOMER_ACTION_OBSERVED","REVENUE_OBSERVED","PAYOUT_OBSERVED"];
const OUTCOMES=["VERIFIED_OUTCOME","VERIFIED_PARTIAL","BLOCKED_EXTERNAL","FAILED_EXECUTION","VERIFICATION_FAILED","REVIEW_REQUIRED"];

export function createAiOperatingEvidence({taskId,skillRevision,provenance=[],authorization={},resources=[],acceptanceCriteria=[],result={},independentVerification=false,businessOutcome="DISCOVERED",timestamp=new Date().toISOString()}={}) {
  if(!taskId || !skillRevision) throw new Error("MISSING_AI_OPERATING_IDENTITY");
  if(!independentVerification) throw new Error("INDEPENDENT_VERIFICATION_REQUIRED");
  if(!BUSINESS_STATES.includes(businessOutcome)) throw new Error("INVALID_BUSINESS_OUTCOME");
  return {
    schema:"ai-execution-operating-evidence/v1",
    taskId,skillRevision,provenance,authorization,resources,acceptanceCriteria,
    result,independentVerification,businessOutcome,timestamp
  };
}

export function classifyAiOperatingOutcome({executionOk=false,actionObserved=false,independentVerification=false,blockedExternal=false,partial=false}={}) {
  if(blockedExternal) return "BLOCKED_EXTERNAL";
  if(executionOk && actionObserved && independentVerification) return partial ? "VERIFIED_PARTIAL" : "VERIFIED_OUTCOME";
  if(executionOk && !independentVerification) return "VERIFICATION_FAILED";
  if(executionOk && !actionObserved) return "VERIFICATION_FAILED";
  return "FAILED_EXECUTION";
}

export function isTechnicalState(value){return TECHNICAL_STATES.includes(value);}
export function isBusinessState(value){return BUSINESS_STATES.includes(value);}
export {TECHNICAL_STATES,BUSINESS_STATES,OUTCOMES};
