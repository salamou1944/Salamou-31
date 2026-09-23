import Fastify from "fastify";
import fs from "node:fs";
import path from "node:path";
import {validateSpec,compileApi} from "./factory.mjs";
import {deploymentPlan} from "./deployment.mjs";

const app=Fastify({logger:true,bodyLimit:64*1024});
const port=Number(process.env.PORT||8797);
const root=process.env.FACTORY_OUTPUT_DIR||path.join(process.cwd(),"generated");
const registryFile=process.env.FACTORY_REGISTRY_FILE||path.join(process.cwd(),"registry.json");
fs.mkdirSync(root,{recursive:true});
function readRegistry(){try{const x=JSON.parse(fs.readFileSync(registryFile,"utf8"));return Array.isArray(x.apis)?x:{apis:[]};}catch{return {apis:[]};}}
function writeRegistry(x){const tmp=registryFile+"."+process.pid+".tmp";fs.writeFileSync(tmp,JSON.stringify(x,null,2)+"\n",{mode:0o600});fs.renameSync(tmp,registryFile);}
function auth(request,reply){if(process.env.FACTORY_API_KEY&&request.headers["x-api-key"]!==process.env.FACTORY_API_KEY)return reply.code(401).send({error:"Unauthorized"});}
app.get("/health",async()=>({ok:true,service:"api-factory",version:"1.0.0",mode:"manifest-to-runnable-api"}));
app.get("/v1/factory/capabilities",async()=>({ok:true,operations:["validate","compile","register","inspect"],artifact:["server.mjs","package.json","openapi.json","README.md","ledger.mjs","usage.mjs"],apiClasses:["ai","llm","vision","image","ocr","speech","translation","research","data","webhook","commerce","lead","custom-business"],evidence:["SPEC_VALIDATED","COMPILED","RUNTIME_VERIFIED","PROVIDER_VERIFIED","E2E_VERIFIED","BUSINESS_VERIFIED","HARDENED"],providers:"adapter-based; unavailable providers fail closed"}));
app.post("/v1/factory/deploy/plan",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;try{return {ok:true,plan:deploymentPlan({target:request.body?.target,serviceName:request.body?.serviceName})};}catch(e){return reply.code(400).send({ok:false,error:e.message});}});
app.get("/v1/factory/apis",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;return {ok:true,apis:readRegistry().apis};});
app.post("/v1/factory/validate",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;try{return {ok:true,spec:validateSpec(request.body)}}catch(e){return reply.code(400).send({ok:false,error:e.message});}});
app.post("/v1/factory/build",async(request,reply)=>{
  const denied=auth(request,reply);if(denied)return denied;
  try{
    const spec=validateSpec(request.body);
    const artifact=compileApi(spec,root);
    const registry=readRegistry(); registry.apis=registry.apis.filter(x=>x.name!==spec.name);
    registry.apis.push({identity:spec.name,name:spec.name,version:spec.version,status:"COMPILED",evidence:"COMPILED",capabilities:spec.capabilities,auth:spec.auth,operations:spec.operations.length,provider:spec.provider?.kind||null,runtime:"node-fastify",deployment:{status:"NOT_DEPLOYED"},artifact,updatedAt:new Date().toISOString()});
    writeRegistry(registry);
    return reply.code(201).send({ok:true,artifact});
  }catch(e){request.log.error({err:e},"factory build failed");return reply.code(400).send({ok:false,error:e.message});}
});
app.get("/v1/factory/apis/:name",async(request,reply)=>{const denied=auth(request,reply);if(denied)return denied;const item=readRegistry().apis.find(x=>x.name===request.params.name);if(!item)return reply.code(404).send({error:"API not found"});return {ok:true,api:item};});
await app.listen({port,host:"0.0.0.0"});
