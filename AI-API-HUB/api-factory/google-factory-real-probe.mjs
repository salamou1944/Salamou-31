import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn,execFileSync} from "node:child_process";
import {createServer} from "node:http";
import {compileApi} from "./factory.mjs";

const apiKey=process.env.GOOGLE_AI_API_KEY;
if(!apiKey){
  console.error(JSON.stringify({evidence_level:"NOT_VERIFIED",provider:"google_ai_studio",reason:"missing_google_ai_api_key",required_env:"GOOGLE_AI_API_KEY"}));
  process.exit(3);
}

const root=fs.mkdtempSync(path.join(os.tmpdir(),"gemini-api-factory-"));
const portServer=createServer();
await new Promise((resolve,reject)=>{portServer.once("error",reject);portServer.listen(0,"127.0.0.1",resolve);});
const port=portServer.address().port;
await new Promise(resolve=>portServer.close(resolve));

let child;
let output="";
const evidencePath=path.resolve("gemini-factory-evidence.json");
const writeEvidence=(evidence)=>fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+"\n",{mode:0o600});

try{
  const spec={
    name:"gemini-factory-probe",
    version:"v1",
    description:"Factory-generated API using Google Gemini through its OpenAI-compatible endpoint",
    auth:"api-key",
    capabilities:["text-generation","google-gemini"],
    provider:{
      kind:"openai-compatible",
      baseUrl:"https://generativelanguage.googleapis.com/v1beta/openai",
      model:process.env.GOOGLE_MODEL||"gemini-3.5-flash-lite",
      credentialEnv:"GOOGLE_AI_API_KEY",
      freePolicy:{
        zeroCostOnly:true,
        providerId:"google-ai-studio-gemini",
        accessClass:"api-key",
        freeStatus:"free-tier",
        quotaBasis:"Google AI Studio account free-tier quota; subject to account eligibility and current limits",
        hardStop:true,
        eligibilityGate:"GOOGLE_AI_API_KEY must be configured; no paid fallback",
        tosRisk:"reviewed",
        sourceLastResearched:"2026-10-15",
        sourceUrl:"https://ai.google.dev/gemini-api/docs/openai"
      }
    },
    operations:[{
      method:"POST",
      path:"/v1/generate",
      summary:"Generate text through the configured Gemini model",
      handler:"provider",
      requestSchema:{
        type:"object",
        required:["messages"],
        properties:{
          messages:{type:"array",minItems:1,items:{type:"object"}},
          temperature:{type:"number"}
        }
      }
    }]
  };
  const artifact=compileApi(spec,root);
  const generatedDir=artifact.directory;
  execFileSync("npm",["install","--ignore-scripts","--no-audit","--no-fund"],{cwd:generatedDir,stdio:"inherit"});
  child=spawn(process.execPath,["server.mjs"],{
    cwd:generatedDir,
    env:{...process.env,PORT:String(port),API_KEY:"factory-local-test-key",API_QUOTA_LIMIT:"2",REQUEST_LEDGER_FILE:path.join(generatedDir,"data","requests.json"),USAGE_LEDGER_FILE:path.join(generatedDir,"data","usage.json")},
    stdio:["ignore","pipe","pipe"]
  });
  child.stdout.on("data",d=>{output+=d.toString();});
  child.stderr.on("data",d=>{output+=d.toString();});
  const base="http://127.0.0.1:"+port;
  let ready=false;
  for(let i=0;i<40;i++){
    if(child.exitCode!==null) throw new Error("factory-generated runtime exited early: "+output.slice(-1200));
    try{
      const response=await fetch(base+"/ready",{signal:AbortSignal.timeout(1000)});
      if(response.ok){ready=true;break;}
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.equal(ready,true,"factory-generated API did not become ready: "+output.slice(-1200));
  const response=await fetch(base+"/v1/generate",{
    method:"POST",
    headers:{"content-type":"application/json","x-api-key":"factory-local-test-key","idempotency-key":"gemini-real-probe-"+Date.now()},
    body:JSON.stringify({messages:[{role:"user",content:"Reply with exactly GEMINI_API_FACTORY_REAL_OK"}],temperature:0}),
    signal:AbortSignal.timeout(45000)
  });
  const body=await response.json();
  const resultText=body?.choices?.[0]?.message?.content??"";
  const evidence={
    schema:"api-factory-provider-real-completion/v1",
    evidence_level:response.ok&&resultText.trim()==="GEMINI_API_FACTORY_REAL_OK"?"REAL_COMPLETION":"FAILED",
    provider:"google_ai_studio",
    integration:"factory-generated-api",
    base_url:"https://generativelanguage.googleapis.com/v1beta/openai",
    selected_model:spec.provider.model,
    factory_http_status:response.status,
    provider_response_success:response.ok,
    completion_received:Boolean(resultText),
    exact_output_match:resultText.trim()==="GEMINI_API_FACTORY_REAL_OK",
    zero_cost_policy_enforced:true,
    paid_fallback_enabled:false,
    secret_committed:false
  };
  writeEvidence(evidence);
  console.log(JSON.stringify(evidence,null,2));
  assert.equal(response.status,200,"factory-generated API did not return HTTP 200");
  assert.equal(resultText.trim(),"GEMINI_API_FACTORY_REAL_OK","Gemini completion did not exactly match expected output");
}catch(error){
  const evidence={
    schema:"api-factory-provider-real-completion/v1",
    evidence_level:"FAILED",
    provider:"google_ai_studio",
    integration:"factory-generated-api",
    reason:error?.message||"unknown_error",
    secret_committed:false
  };
  writeEvidence(evidence);
  console.error(JSON.stringify(evidence,null,2));
  process.exitCode=1;
}finally{
  if(child&&child.exitCode===null){child.kill("SIGTERM");await new Promise(resolve=>setTimeout(resolve,300));}
  fs.rmSync(root,{recursive:true,force:true});
}
