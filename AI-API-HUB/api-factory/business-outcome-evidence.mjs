const BUSINESS_STATES=["DISCOVERED","ENTRY_POINT_VERIFIED","USAGE_OBSERVED","CUSTOMER_ACTION_OBSERVED","REVENUE_OBSERVED","PAYOUT_OBSERVED"];

const ORDER=Object.fromEntries(BUSINESS_STATES.map((x,i)=>[x,i]));

export function createBusinessOutcomeEvidence({taskId,entryPoint,observations=[],verifiedBy=null,outcome="DISCOVERED",timestamp=new Date().toISOString()}={}) {
  if(!taskId) throw new Error("MISSING_TASK_ID");
  if(!BUSINESS_STATES.includes(outcome)) throw new Error("INVALID_BUSINESS_OUTCOME");
  if(!entryPoint && outcome!== "DISCOVERED") throw new Error("ENTRY_POINT_REQUIRED");
  if(outcome!=="DISCOVERED" && !verifiedBy) throw new Error("INDEPENDENT_VERIFIER_REQUIRED");
  return {schema:"business-outcome-evidence/v1",taskId,entryPoint:entryPoint||null,observations,verifiedBy,outcome,timestamp};
}

export function assertBusinessOutcomeTransition(previous="DISCOVERED",next="DISCOVERED"){
  if(!BUSINESS_STATES.includes(previous)||!BUSINESS_STATES.includes(next)) throw new Error("INVALID_BUSINESS_STATE");
  if(ORDER[next]<ORDER[previous]) throw new Error("BUSINESS_OUTCOME_REGRESSION");
  return {ok:true,previous,next};
}

export {BUSINESS_STATES};
