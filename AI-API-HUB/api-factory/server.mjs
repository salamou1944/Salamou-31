import Fastify from "fastify";
import fs from "node:fs";
import path from "node:path";
import {createRegistryStore} from "./registry-store.mjs";
import {createArtifactStore} from "./artifact-store.mjs";
import {validateSpec,compileApi} from "./factory.mjs";
import {deploymentPlan} from "./deployment.mjs";
import {runSherlock,validateUsername} from "./sherlock-username.mjs";
import {createExecutionRecord,assertStateExit} from "./execution-contract.mjs";
import {createSoatExecutionEvidence,createSoatProductionExecutionEvidence} from "./soat-evidence.mjs";
import {createAiOperatingEvidence,classifyAiOperatingOutcome} from "./ai-operating-evidence.mjs";
import {createBusinessOutcomeEvidence,assertBusinessOutcomeTransition} from "./business-outcome-evidence.mjs";

const app=Fastify({logger:true,bodyLimit:64*1024});
const port=Number(process.env.PORT||8797);
const root=process.env.FACTORY_OUTPUT_DIR||path.join(process.env.VERCEL?"/tmp":process.cwd(),"generated");
const registryFile=process.env.FACTORY_REGISTRY_FILE||path.join(process.env.VERCEL?"/tmp":process.cwd(),"api-factory-registry.json");
fs.mkdirSync(root,{recursive:true});
const registryStore=createRegistryStore({file:registryFile});
const artifactStore=createArtifactStore({root});
async function readRegistry(){return registryStore.read();}
async function writeRegistry(x){return registryStore.write(x);}
function auth(request,reply){const configuredKey=process.env.FACTORY_API_KEY;if(typeof configuredKey!=="string"||configuredKey.length===0)return reply.code(503).send({ok:false,error:"API factory authentication is not configured",code:"AUTH_CONFIGURATION_REQUIRED"});if(request.headers["x-api-key"]!==configuredKey)return reply.code(401).send({ok:false,error:"Unauthorized",code:"UNAUTHORIZED"});}
function registryEntry(spec,artifact){return {identity:spec.name,name:spec.name,version:spec.version,status:"COMPILED",evidence:"COMPILED",capabilities:spec.capabilities,auth:spec.auth,operations:spec.operations.length,provider:spec.provider?.kind||null,runtime:"node-fastify",deployment:{status:"NOT_DEPLOYED"},artifact,updatedAt:new Date().toISOString()};}
async function register(spec,artifact){const registry=await readRegistry();registry.apis=registry.apis.filter(x=>x.name!==spec.name);registry.apis.push(registryEntry(spec,artifact));await writeRegistry(registry);return registry.apis.find(x=>x.name===spec.name);}
app.get("/health",async()=>({ok:true,service:"api-factory",version:"1.0.0",mode:"manifest-to-runnable-api"}));
app.get("/ready",async(request,reply)=>{
  const authConfigured=typeof process.env.FACTORY_API_KEY==="string"&&process.env.FACTORY_API_KEY.length>0;
  if(!authConfigured)return reply.code(503).send({ok:false,ready:false,code:"AUTH_CONFIGURATION_REQUIRED",checks:{authentication:false}});
  const persistenceReady=registryStore.durable&&artifactStore.durable;
  return {ok:true,ready:true,degraded:!persistenceReady,checks:{authentication:true,registryPersistence:registryStore.durable,artifactPersistence:artifactStore.durable},storage:{registryMode:registryStore.mode,artifactMode:artifactStore.mode,durable:persistenceReady}};
});
app.get("/v1/factory/capabilities",async()=>({ok:true,operations:["validate","build","register","inspect","deploy-plan","consume-soat-evidence"],evidence:["VALIDATED","COMPILED","RUNTIME_VERIFIED","PROVIDER_VERIFIED","BUSINESS_VERIFIED"],deployment:["railway","vercel"]}));
app.post("/v1/factory/research/username",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  let username;
  try{
    username=validateUsername(request.body?.username);
  }catch(e){
    return reply.code(400).send({ok:false,error:e.message,code:"INVALID_USERNAME"});
  }
  const timeoutMs=request.body?.timeoutMs;
  if(timeoutMs!==undefined&&(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000)){
    return reply.code(400).send({ok:false,error:"timeoutMs must be between 1000 and 300000",code:"INVALID_TIMEOUT"});
  }
  try{
    const result=await runSherlock(username,{executable:process.env.SHERLOCK_BIN||"sherlock",timeoutMs:timeoutMs??30_000});
    return {ok:true,source:"sherlock",...result};
  }catch(e){
    const status=e.code==="SHERLOCK_UNAVAILABLE"?503:e.code==="SHERLOCK_TIMEOUT"?504:502;
    return reply.code(status).send({ok:false,source:"sherlock",error:e.message,code:e.code,evidence:e.evidence||[]});
  }
});
app.post("/v1/factory/deploy/plan",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;try{return {ok:true,plan:deploymentPlan({target:request.body?.target,serviceName:request.body?.serviceName})};}catch(e){return reply.code(400).send({ok:false,error:e.message});}});
app.post("/v1/factory/verify/soat",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  try{
    const evidence=request.body?.schema==="soat-verification-record/v2"?createSoatProductionExecutionEvidence(request.body):createSoatExecutionEvidence(request.body);
    const execution=createExecutionRecord({
      state:"VERIFY",
      artifacts:{verification:evidence},
      evidence:Object.entries(evidence.gates).filter(([,ok])=>ok).map(([gate])=>"soat-"+gate),
      metadata:{source:"SOAT Runtime Integration Smoke",run_id:evidence.runId,soat_sha:evidence.soatSha}
    });
    assertStateExit(execution);
    let operating=null;
    if(request.body?.operating){
      const op=request.body.operating;
      operating={
        evidence:createAiOperatingEvidence({
          taskId:op.taskId,
          skillRevision:op.skillRevision,
          provenance:op.provenance||["SOAT Runtime Integration Smoke"],
          authorization:op.authorization||{},
          resources:op.resources||[],
          acceptanceCriteria:op.acceptanceCriteria||[],
          result:{execution,evidence},
          independentVerification:op.independentVerification===true,
          businessOutcome:op.businessOutcome||"DISCOVERED"
        }),
        outcome:classifyAiOperatingOutcome({executionOk:true,actionObserved:true,independentVerification:op.independentVerification===true})
      };
    }
    return {ok:true,evidence,execution,operating};
  }catch(e){
    return reply.code(422).send({ok:false,error:e.message});
  }
});
app.post("/v1/factory/verify/business-outcome",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  try{
    const evidence=createBusinessOutcomeEvidence(request.body||{});
    const transition=assertBusinessOutcomeTransition(request.body?.previousOutcome||"DISCOVERED",evidence.outcome);
    return {ok:true,evidence,transition};
  }catch(e){return reply.code(422).send({ok:false,error:e.message});}
});
app.get("/v1/factory/apis",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;return {ok:true,apis:(await readRegistry()).apis};});
app.post("/v1/factory/validate",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;try{return {ok:true,spec:validateSpec(request.body)}}catch(e){return reply.code(400).send({ok:false,error:e.message});}});
app.post("/v1/factory/build",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  try{
    const spec=validateSpec(request.body);
    const compiledArtifact=compileApi(spec,root);
    const artifact=await artifactStore.persist(compiledArtifact,spec.name);
    const execution=createExecutionRecord({state:"BUILD",artifacts:{artifact},metadata:{api:spec.name,version:spec.version}});
    assertStateExit(execution);
    const api=await register(spec,artifact);
    return reply.code(201).send({ok:true,artifact,api,execution});
  }catch(e){request.log.error({err:e},"factory build failed");return reply.code(400).send({ok:false,error:e.message});}
});
app.post("/v1/factory/register",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  try{
    const spec=validateSpec(request.body);
    const registryBefore=await readRegistry();
    const existing=registryBefore.apis.find(x=>x.name===spec.name);
    if(!existing)return reply.code(409).send({ok:false,error:"API must be built before registration"});
    const api={...existing,version:spec.version,status:"REGISTERED",evidence:existing.evidence==="COMPILED"?"COMPILED":existing.evidence,registeredAt:new Date().toISOString()};
    const registry=await readRegistry();registry.apis=registry.apis.map(x=>x.name===spec.name?api:x);await writeRegistry(registry);
    return {ok:true,api};
  }catch(e){return reply.code(400).send({ok:false,error:e.message});}
});
app.get("/v1/factory/apis/:name",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;const item=(await readRegistry()).apis.find(x=>x.name===request.params.name);if(!item)return reply.code(404).send({error:"API not found"});return {ok:true,api:item};});
app.get("/v1/factory/export/:name",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  const item=(await readRegistry()).apis.find(x=>x.name===request.params.name);
  if(!item)return reply.code(404).send({ok:false,error:"API not found"});
  try{
    const files=await artifactStore.readFiles(item.artifact);
    return {ok:true,api:{name:item.name,version:item.version,auth:item.auth,provider:item.provider},files};
  }catch(e){
    const status=e.code==="ARTIFACT_NOT_FOUND"?410:503;
    return reply.code(status).send({ok:false,error:e.message,code:e.code||"ARTIFACT_EXPORT_UNAVAILABLE"});
  }
});
app.get("/v1/factory/inspect/:name",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  const item=(await readRegistry()).apis.find(x=>x.name===request.params.name);
  if(!item)return reply.code(404).send({ok:false,error:"API not found"});
  const inspection=await artifactStore.inspect(item.artifact);
  return {ok:true,api:{...item,inspection}};
});
export { app };
if (!process.env.VERCEL) await app.listen({port,host:"0.0.0.0"});
