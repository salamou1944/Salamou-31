// SOAT evidence consumer: CI/provider evidence remains distinct from production proof.

const REQUIRED_GATES=[
  "health",
  "authentication",
  "provider_resolved",
  "api_factory_probe",
  "real_chat_completion",
  "official_smoke_suite"
];

export function validateSoatVerificationRecord(record){
  if(!record || typeof record!=="object" || Array.isArray(record)){
    return {ok:false,code:"INVALID_SOAT_VERIFICATION_RECORD"};
  }
  if(record.schema!=="soat-verification-record/v1"){
    return {ok:false,code:"INVALID_SOAT_VERIFICATION_SCHEMA"};
  }
  if(record.production_status==="not_proven"){
    // CI evidence is valid for local/provider verification, but never production proof.
  }
  const gates=record.gates;
  if(!gates || typeof gates!=="object" || Array.isArray(gates)){
    return {ok:false,code:"MISSING_SOAT_GATES"};
  }
  const missing=REQUIRED_GATES.filter((gate)=>gates[gate]!==true);
  if(missing.length){
    return {ok:false,code:"SOAT_EVIDENCE_GATE_FAILED",missing};
  }
  return {
    ok:true,
    evidenceLevel:record.evidence_level||null,
    scope:record.scope||null,
    workflow:record.workflow||null,
    runId:record.run_id||null,
    commit:record.commit||null,
    soatSha:record.soat_sha||null,
    gates:Object.fromEntries(REQUIRED_GATES.map((gate)=>[gate,true])),
    productionStatus:record.production_status||"unknown"
  };
}

export function createSoatExecutionEvidence(record){
  const validation=validateSoatVerificationRecord(record);
  if(!validation.ok) throw new Error(validation.code);
  return {
    schema:"execution-evidence/v1",
    source:"soat-runtime-integration",
    verified:true,
    evidenceLevel:validation.evidenceLevel,
    scope:validation.scope,
    runId:validation.runId,
    commit:validation.commit,
    soatSha:validation.soatSha,
    productionStatus:validation.productionStatus,
    gates:validation.gates,
    reusableFor:["VERIFY","REVIEW","PLAN"]
  };
}

export {REQUIRED_GATES};

const PRODUCTION_GATES=[
  "health",
  "authentication",
  "provider_resolved",
  "api_factory_probe",
  "real_chat_completion",
  "usage_recorded",
  "error_behavior_recorded"
];

export function createSoatProductionExecutionEvidence(record){
  if(!record || typeof record!=="object" || Array.isArray(record)){
    throw new Error("INVALID_SOAT_PRODUCTION_VERIFICATION_RECORD");
  }
  if(record.schema!=="soat-verification-record/v2"){
    throw new Error("INVALID_SOAT_PRODUCTION_VERIFICATION_SCHEMA");
  }
  if(record.production_status!=="proven"){
    throw new Error("SOAT_PRODUCTION_NOT_PROVEN");
  }
  if(record.evidence_level!=="production" || record.scope!=="production-runtime"){
    throw new Error("INVALID_SOAT_PRODUCTION_SCOPE");
  }
  const gates=record.gates;
  const missing=PRODUCTION_GATES.filter((gate)=>gates?.[gate]!==true);
  if(missing.length){
    throw new Error("SOAT_PRODUCTION_EVIDENCE_GATE_FAILED:"+missing.join(","));
  }
  return {
    schema:"execution-evidence/v1",
    source:"soat-production-verification",
    verified:true,
    evidenceLevel:"production",
    scope:"production-runtime",
    runId:record.run_id||null,
    commit:record.commit||null,
    productionStatus:"proven",
    gates:Object.fromEntries(PRODUCTION_GATES.map((gate)=>[gate,true])),
    reusableFor:["VERIFY","REVIEW","PLAN","EXECUTE"]
  };
}

export {PRODUCTION_GATES};
