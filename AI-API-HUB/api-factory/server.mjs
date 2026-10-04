import Fastify from "fastify";
import fs from "node:fs";
import path from "node:path";
import {validateSpec,compileApi} from "./factory.mjs";
import {deploymentPlan} from "./deployment.mjs";
import {runSherlock} from "./sherlock-username.mjs";

const app=Fastify({logger:true,bodyLimit:64*1024});
const port=Number(process.env.PORT||8797);
const root=process.env.FACTORY_OUTPUT_DIR||path.join(process.cwd(),"generated");
const registryFile=process.env.FACTORY_REGISTRY_FILE||path.join(process.cwd(),"registry.json");
fs.mkdirSync(root,{recursive:true});
function readRegistry(){try{const x=JSON.parse(fs.readFileSync(registryFile,"utf8"));return Array.isArray(x.apis)?x:{apis:[]};}catch{return {apis:[]};}}
function writeRegistry(x){const tmp=registryFile+"."+process.pid+".tmp";fs.writeFileSync(tmp,JSON.stringify(x,null,2)+"\n",{mode:0o600});fs.renameSync(tmp,registryFile);}
function auth(request,reply){if(process.env.FACTORY_API_KEY&&request.headers["x-api-key"]!==process.env.FACTORY_API_KEY)return reply.code(401).send({error:"Unauthorized"});}
function registryEntry(spec,artifact){return {identity:spec.name,name:spec.name,version:spec.version,status:"COMPILED",evidence:"COMPILED",capabilities:spec.capabilities,auth:spec.auth,operations:spec.operations.length,provider:spec.provider?.kind||null,runtime:"node-fastify",deployment:{status:"NOT_DEPLOYED"},artifact,updatedAt:new Date().toISOString()};}
function register(spec,artifact){const registry=readRegistry();registry.apis=registry.apis.filter(x=>x.name!==spec.name);registry.apis.push(registryEntry(spec,artifact));writeRegistry(registry);return registry.apis.find(x=>x.name===spec.name);}
app.get("/health",async()=>({ok:true,service:"api-factory",version:"1.0.0",mode:"manifest-to-runnable-api"}));
app.get("/v1/factory/capabilities",async()=>({ok:true,operations:["validate","build","register","inspect","deploy-plan"],evidence:["VALIDATED","COMPILED","RUNTIME_VERIFIED","PROVIDER_VERIFIED","BUSINESS_VERIFIED"],deployment:["railway","vercel"]}));
app.post("/v1/factory/research/username",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  try{
    const result=await runSherlock(request.body?.username,{
      executable:process.env.SHERLOCK_BIN||"sherlock",
      timeoutMs:request.body?.timeoutMs??30_000
    });
    return {ok:true,source:"sherlock",...result};
  }catch(e){
    const status=e.code==="SHERLOCK_UNAVAILABLE"?503:e.code==="SHERLOCK_TIMEOUT"?504:502;
    return reply.code(status).send({ok:false,source:"sherlock",error:e.message,code:e.code,evidence:e.evidence||[]});
  }
});
app.post("/v1/factory/deploy/plan",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;try{return {ok:true,plan:deploymentPlan({target:request.body?.target,serviceName:request.body?.serviceName})};}catch(e){return reply.code(400).send({ok:false,error:e.message});}});
app.get("/v1/factory/apis",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;return {ok:true,apis:readRegistry().apis};});
app.post("/v1/factory/validate",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;try{return {ok:true,spec:validateSpec(request.body)}}catch(e){return reply.code(400).send({ok:false,error:e.message});}});
app.post("/v1/factory/build",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  try{
    const spec=validateSpec(request.body);
    const artifact=compileApi(spec,root);
    const api=register(spec,artifact);
    return reply.code(201).send({ok:true,artifact,api});
  }catch(e){request.log.error({err:e},"factory build failed");return reply.code(400).send({ok:false,error:e.message});}
});
app.post("/v1/factory/register",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  try{
    const spec=validateSpec(request.body);
    const existing=readRegistry().apis.find(x=>x.name===spec.name);
    if(!existing)return reply.code(409).send({ok:false,error:"API must be built before registration"});
    const api={...existing,version:spec.version,status:"REGISTERED",evidence:existing.evidence==="COMPILED"?"COMPILED":existing.evidence,registeredAt:new Date().toISOString()};
    const registry=readRegistry();registry.apis=registry.apis.map(x=>x.name===spec.name?api:x);writeRegistry(registry);
    return {ok:true,api};
  }catch(e){return reply.code(400).send({ok:false,error:e.message});}
});
app.get("/v1/factory/apis/:name",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;const item=readRegistry().apis.find(x=>x.name===request.params.name);if(!item)return reply.code(404).send({error:"API not found"});return {ok:true,api:item};});
app.get("/v1/factory/inspect/:name",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  const item=readRegistry().apis.find(x=>x.name===request.params.name);
  if(!item)return reply.code(404).send({ok:false,error:"API not found"});
  const artifactDir=item.artifact?.directory;
  const files=Array.isArray(item.artifact?.files)?item.artifact.files:[];
  const present=artifactDir?files.filter(file=>fs.existsSync(path.join(artifactDir,file))):[];
  return {ok:true,api:{...item,inspection:{artifactPresent:present.length===files.length,files:present,missing:files.filter(file=>!present.includes(file))}}};
});
await app.listen({port,host:"0.0.0.0"});
