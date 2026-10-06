const REQUIRED_FIELDS=["provider","base_url","selected_model","completion_status","completion_received","exact_output_match","secret_committed"];

export function validateProviderEvidence(evidence={}){
  if(!evidence || typeof evidence!=="object" || Array.isArray(evidence)) return {ok:false,code:"INVALID_PROVIDER_EVIDENCE"};
  const missing=REQUIRED_FIELDS.filter((key)=>evidence[key]===undefined || evidence[key]===null);
  if(missing.length) return {ok:false,code:"MISSING_PROVIDER_EVIDENCE_FIELDS",missing};
  if(evidence.secret_committed!==false) return {ok:false,code:"SECRET_COMMIT_VIOLATION"};
  if(evidence.evidence_level!=="REAL_COMPLETION" || evidence.completion_received!==true || evidence.exact_output_match!==true){
    return {ok:false,code:"REAL_COMPLETION_GATE_FAILED"};
  }
  if(evidence.models_status!==undefined && Number(evidence.models_status)!==200) return {ok:false,code:"MODEL_DISCOVERY_GATE_FAILED"};
  if(Number(evidence.completion_status)!==200){
    return {ok:false,code:"HTTP_SUCCESS_GATE_FAILED"};
  }
  return {ok:true,provider:evidence.provider,model:evidence.selected_model,evidenceLevel:"REAL_COMPLETION"};
}

export function assertProviderEvidence(evidence){
  const result=validateProviderEvidence(evidence);
  if(!result.ok) throw new Error(result.code+(result.missing?":"+result.missing.join(","):""));
  return result;
}

export {REQUIRED_FIELDS};
