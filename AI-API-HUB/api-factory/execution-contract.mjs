const STATES=["INTAKE","RESEARCH","PLAN","BUILD","VERIFY","REVIEW","SHIP","LEARN"];
const REQUIRED={
  INTAKE:["request"],
  RESEARCH:["evidence"],
  PLAN:["plan"],
  BUILD:["artifact"],
  VERIFY:["verification"],
  REVIEW:["review"],
  SHIP:["release"],
  LEARN:["learning"]
};

export function createExecutionRecord({state="INTAKE",artifacts={},evidence=[],metadata={}}={}) {
  if(!STATES.includes(state)) throw new Error("INVALID_EXECUTION_STATE");
  if(!artifacts || typeof artifacts!=="object") throw new Error("INVALID_ARTIFACTS");
  if(!Array.isArray(evidence)) throw new Error("INVALID_EVIDENCE");
  return {schema:"execution-contract/v1",state,artifacts,evidence,metadata};
}

export function assertStateExit(record) {
  if(!record || !STATES.includes(record.state)) throw new Error("INVALID_EXECUTION_RECORD");
  const required=REQUIRED[record.state]||[];
  const missing=required.filter(key=>{
    const value=record.artifacts?.[key];
    return value===undefined || value===null || (typeof value==="string" && value.trim()==="");
  });
  if(missing.length) throw new Error("MISSING_EXIT_ARTIFACT:"+missing.join(","));
  if(record.state==="VERIFY" && record.evidence.length===0) throw new Error("VERIFY_REQUIRES_EVIDENCE");
  return {ok:true,state:record.state,missing:[]};
}

export {STATES};
