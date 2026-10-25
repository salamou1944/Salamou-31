import Fastify from "fastify";
import fs from "node:fs";
import {createHash,timingSafeEqual,randomBytes} from "node:crypto";
import path from "node:path";
import {createRegistryStore} from "./registry-store.mjs";
import {createCustomerKeyStore,hashCustomerApiKey} from "./customer-key-store.mjs";
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
const customerKeyStore=createCustomerKeyStore();
async function readRegistry(){return registryStore.read();}
async function writeRegistry(x){return registryStore.write(x);}
function isFactoryKeyValue(supplied){
  const configuredKey=process.env.FACTORY_API_KEY;
  const configuredHash=process.env.FACTORY_API_KEY_SHA256;
  const keyConfigured=typeof configuredKey==="string"&&configuredKey.length>0;
  const hashConfigured=typeof configuredHash==="string"&&/^[a-f0-9]{64}$/i.test(configuredHash);
  if(!keyConfigured&&!hashConfigured)return false;
  let accepted=keyConfigured&&typeof supplied==="string"&&supplied===configuredKey;
  if(!accepted&&hashConfigured&&typeof supplied==="string"){
    const actual=createHash("sha256").update(supplied,"utf8").digest();
    const expected=Buffer.from(configuredHash,"hex");
    accepted=actual.length===expected.length&&timingSafeEqual(actual,expected);
  }
  return accepted;
}
function customerResearchAuth(request,reply){
  const supplied=request.headers["x-api-key"];
  if(isFactoryKeyValue(supplied))return {kind:"factory"};
  if(typeof supplied!=="string"||!supplied.startsWith("sal31_")){
    reply.code(401).send({ok:false,error:"Unauthorized",code:"UNAUTHORIZED"});
    return null;
  }
  if(!customerKeyStore.configured){
    reply.code(503).send({ok:false,error:"Customer API key storage is not configured",code:"CUSTOMER_KEY_STORE_NOT_CONFIGURED"});
    return null;
  }
  return {kind:"customer",keyHash:hashCustomerApiKey(supplied)};
}
async function consumeCustomerResearchKey(authContext,request,reply){
  if(authContext.kind!=="customer")return {usage:null};
  let result;
  try{
    result=await customerKeyStore.consume({keyHash:authContext.keyHash,route:"username-research"});
  }catch(error){
    request.log.warn({code:error.code||"CUSTOMER_KEY_STORE_UNAVAILABLE"},"customer API key check failed");
    return {response:reply.code(503).send({ok:false,error:"Customer API key verification is unavailable",code:"CUSTOMER_AUTH_UNAVAILABLE"})};
  }
  if(result.ok===true){
    const usage={usageCount:result.usageCount,quotaLimit:result.quotaLimit,remaining:result.remaining};
    reply.header("x-api-quota-limit",String(result.quotaLimit));
    reply.header("x-api-quota-remaining",String(result.remaining));
    return {usage};
  }
  if(result.code==="CUSTOMER_QUOTA_EXCEEDED"){
    reply.header("x-api-quota-limit",String(result.quotaLimit));
    reply.header("x-api-quota-remaining","0");
    return {response:reply.code(429).send({ok:false,error:"Customer API quota exceeded",code:"CUSTOMER_QUOTA_EXCEEDED",usage:{usageCount:result.usageCount,quotaLimit:result.quotaLimit,remaining:0}})};
  }
  if(result.code==="CUSTOMER_API_KEY_REVOKED"||result.code==="CUSTOMER_API_KEY_INVALID"){
    return {response:reply.code(401).send({ok:false,error:"Customer API key is invalid or revoked",code:result.code})};
  }
  return {response:reply.code(503).send({ok:false,error:"Customer API key verification is unavailable",code:"CUSTOMER_AUTH_UNAVAILABLE"})};
}
function auth(request,reply){const configuredKey=process.env.FACTORY_API_KEY;const configuredHash=process.env.FACTORY_API_KEY_SHA256;const supplied=request.headers["x-api-key"];const keyConfigured=typeof configuredKey==="string"&&configuredKey.length>0;const hashConfigured=typeof configuredHash==="string"&&/^[a-f0-9]{64}$/i.test(configuredHash);if(!keyConfigured&&!hashConfigured)return reply.code(503).send({ok:false,error:"API factory authentication is not configured",code:"AUTH_CONFIGURATION_REQUIRED"});let accepted=keyConfigured&&typeof supplied==="string"&&supplied===configuredKey;if(!accepted&&hashConfigured&&typeof supplied==="string"){const actual=createHash("sha256").update(supplied,"utf8").digest();const expected=Buffer.from(configuredHash,"hex");accepted=actual.length===expected.length&&timingSafeEqual(actual,expected);}if(!accepted)return reply.code(401).send({ok:false,error:"Unauthorized",code:"UNAUTHORIZED"});}
function registryEntry(spec,artifact){return {identity:spec.name,name:spec.name,version:spec.version,status:"COMPILED",evidence:"COMPILED",capabilities:spec.capabilities,auth:spec.auth,operations:spec.operations.length,provider:spec.provider?.kind||null,runtime:"node-fastify",runtimeState:artifact.runtimeState||{durable:false,status:"NOT_VERIFIED",blocker:"GENERATED_RUNTIME_STATE_STORE_NOT_CONFIGURED"},deployment:{status:"NOT_DEPLOYED"},artifact,updatedAt:new Date().toISOString()};}
async function register(spec,artifact){const registry=await readRegistry();registry.apis=registry.apis.filter(x=>x.name!==spec.name);registry.apis.push(registryEntry(spec,artifact));await writeRegistry(registry);return registry.apis.find(x=>x.name===spec.name);}
app.get("/health",async()=>({ok:true,service:"api-factory",version:"1.0.0",mode:"manifest-to-runnable-api"}));
app.get("/ready",async(request,reply)=>{
  const authConfigured=(typeof process.env.FACTORY_API_KEY==="string"&&process.env.FACTORY_API_KEY.length>0)||(typeof process.env.FACTORY_API_KEY_SHA256==="string"&&/^[a-f0-9]{64}$/i.test(process.env.FACTORY_API_KEY_SHA256));
  if(!authConfigured)return reply.code(503).send({ok:false,ready:false,code:"AUTH_CONFIGURATION_REQUIRED",checks:{authentication:false}});
  const [registryCheck,artifactCheck]=await Promise.all([registryStore.check(),artifactStore.check()]);
  const persistenceReady=registryCheck.ok&&artifactCheck.ok;
  const readiness={
    checks:{authentication:true,registryPersistence:registryCheck.ok,artifactPersistence:artifactCheck.ok},
    storage:{registryMode:registryStore.mode,artifactMode:artifactStore.mode,durable:persistenceReady},
    ...(persistenceReady?{}:{storageErrors:{registry:registryCheck.reason||null,artifacts:artifactCheck.reason||null}})
  };
  if(!persistenceReady)return reply.code(503).send({ok:false,ready:false,code:"DURABLE_STORAGE_REQUIRED",...readiness});
  return {ok:true,ready:true,degraded:false,...readiness};
});
app.get("/v1/factory/capabilities",async()=>({ok:true,operations:["validate","build","register","inspect","export","deploy-plan","consume-soat-evidence"],deploymentExecutionImplemented:false,evidence:["VALIDATED","COMPILED","RUNTIME_VERIFIED","PROVIDER_VERIFIED","BUSINESS_VERIFIED"],deployment:["railway","vercel"]}));
app.post("/v1/factory/research/username",async(request,reply)=>{
  const authContext=customerResearchAuth(request,reply);if(!authContext)return;
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
  const consumed=await consumeCustomerResearchKey(authContext,request,reply);
  if(consumed.response)return consumed.response;
  const customerUsage=consumed.usage;
  try{
    const result=await runSherlock(username,{executable:process.env.SHERLOCK_BIN||"sherlock",timeoutMs:timeoutMs??30_000});
    return {ok:true,source:"sherlock",...result,...(customerUsage?{usage:customerUsage}:{})};
  }catch(e){
    const status=e.code==="SHERLOCK_UNAVAILABLE"?503:e.code==="SHERLOCK_TIMEOUT"?504:502;
    return reply.code(status).send({ok:false,source:"sherlock",error:e.message,code:e.code,evidence:e.evidence||[],...(customerUsage?{usage:customerUsage}:{})});
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
app.post("/v1/factory/customer-keys",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  const label=typeof request.body?.label==="string"?request.body.label.trim():"";
  const quotaLimit=request.body?.quotaLimit;
  if(label.length<1||label.length>100||!Number.isInteger(quotaLimit)||quotaLimit<1||quotaLimit>100000){
    return reply.code(400).send({ok:false,error:"label must be 1-100 characters and quotaLimit must be an integer from 1 to 100000",code:"INVALID_CUSTOMER_KEY_INPUT"});
  }
  const apiKey="sal31_"+randomBytes(32).toString("base64url");
  try{
    const key=await customerKeyStore.create({keyHash:hashCustomerApiKey(apiKey),label,quotaLimit});
    return reply.code(201).send({ok:true,apiKey,secretReturnedOnce:true,key});
  }catch(error){
    request.log.error({code:error.code||"CUSTOMER_KEY_STORE_UNAVAILABLE"},"customer API key creation failed");
    return reply.code(503).send({ok:false,error:"Customer API key storage is unavailable",code:error.code||"CUSTOMER_KEY_STORE_UNAVAILABLE"});
  }
});
app.post("/v1/factory/customer-keys/:id/revoke",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)){
    return reply.code(400).send({ok:false,error:"Invalid customer key id",code:"INVALID_CUSTOMER_KEY_ID"});
  }
  try{return {ok:true,key:await customerKeyStore.revoke({id:request.params.id})};}
  catch(error){
    const status=error.code==="CUSTOMER_KEY_NOT_FOUND"?404:503;
    return reply.code(status).send({ok:false,error:status===404?"Customer key not found":"Customer API key storage is unavailable",code:error.code||"CUSTOMER_KEY_STORE_UNAVAILABLE"});
  }
});
app.get("/v1/factory/customer-keys/:id/usage",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)){
    return reply.code(400).send({ok:false,error:"Invalid customer key id",code:"INVALID_CUSTOMER_KEY_ID"});
  }
  try{return await customerKeyStore.usage({id:request.params.id});}
  catch(error){
    const status=error.code==="CUSTOMER_KEY_NOT_FOUND"?404:503;
    return reply.code(status).send({ok:false,error:status===404?"Customer key not found":"Customer API key storage is unavailable",code:error.code||"CUSTOMER_KEY_STORE_UNAVAILABLE"});
  }
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
    return {ok:true,api:{name:item.name,version:item.version,auth:item.auth,provider:item.provider,runtimeState:item.runtimeState||item.artifact?.runtimeState||{durable:false,status:"NOT_VERIFIED",blocker:"GENERATED_RUNTIME_STATE_STORE_NOT_CONFIGURED"}},files};
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
