import fs from "node:fs";
import path from "node:path";

const NAME=/^[a-z][a-z0-9-]{2,62}$/;
const METHOD=/^(GET|POST|PUT|PATCH|DELETE)$/;
const AUTH=/^(none|api-key)$/;
const HANDLER=/^(builtin|provider)$/;

function schemaObject(value,label){
  if(value===undefined) return undefined;
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error(label+" must be an object");
  return value;
}

export function validateSpec(spec){
  if(!spec||typeof spec!=="object"||Array.isArray(spec)) throw new Error("spec must be an object");
  if(typeof spec.name!=="string"||!NAME.test(spec.name)) throw new Error("name must match ^[a-z][a-z0-9-]{2,62}$");
  if(typeof spec.version!=="string"||!/^v[0-9]+$/.test(spec.version)) throw new Error("version must look like v1");
  if(!Array.isArray(spec.operations)||spec.operations.length<1||spec.operations.length>100) throw new Error("operations must contain 1..100 items");
  if(!AUTH.test(spec.auth||"none")) throw new Error("auth must be none or api-key");
  const provider=spec.provider;
  if(provider!==undefined){
    if(!provider||typeof provider!=="object"||Array.isArray(provider)) throw new Error("provider must be an object");
    if(typeof provider.kind!=="string"||!/^[a-z][a-z0-9-]{2,62}$/.test(provider.kind)) throw new Error("provider.kind is invalid");
    if(provider.credentialEnv!==undefined && (typeof provider.credentialEnv!=="string"||!/^[A-Z][A-Z0-9_]{1,127}$/.test(provider.credentialEnv))) throw new Error("provider.credentialEnv is invalid");
    if(provider.baseUrl!==undefined && (typeof provider.baseUrl!=="string"||!/^https?:\/\//.test(provider.baseUrl))) throw new Error("provider.baseUrl must be an http(s) URL");
    if(provider.model!==undefined && typeof provider.model!=="string") throw new Error("provider.model must be a string");
  }
  const seen=new Set();
  const operations=spec.operations.map((op)=>{
    if(!op||typeof op!=="object"||!METHOD.test(op.method)||typeof op.path!=="string"||!/^\/[A-Za-z0-9_:\-\/{}]*$/.test(op.path)) throw new Error("invalid operation");
    const key=op.method+" "+op.path;
    if(seen.has(key)) throw new Error("duplicate operation: "+key);
    seen.add(key);
    if(typeof op.summary!=="string"||op.summary.length<1||op.summary.length>300) throw new Error("operation summary is required and <=300 chars");
    const handler=op.handler||"builtin";
    if(!HANDLER.test(handler)) throw new Error("operation handler must be builtin or provider");
    const requestSchema=schemaObject(op.requestSchema,"requestSchema");
    const responseSchema=schemaObject(op.responseSchema,"responseSchema");
    if(handler==="provider" && !provider) throw new Error("provider handler requires provider configuration");
    return {method:op.method,path:op.path,summary:op.summary,handler,requestSchema,responseSchema};
  });
  return {
    name:spec.name,
    version:spec.version,
    description:typeof spec.description==="string"?spec.description.slice(0,1000):"",
    auth:spec.auth||"none",
    provider:provider ? {
      kind:provider.kind,
      baseUrl:provider.baseUrl||null,
      model:provider.model||null,
      credentialEnv:provider.credentialEnv||null
    } : null,
    capabilities:Array.isArray(spec.capabilities)?spec.capabilities.filter(x=>typeof x==="string").slice(0,50):[],
    operations
  };
}

function routeSource(op,auth,provider){
  const method=op.method.toLowerCase();
  const route=JSON.stringify(op.path);
  const schema=op.requestSchema?JSON.stringify(op.requestSchema):"null";
  const body=op.handler==="provider"
    ? "const result=await provider.execute(request.body??{}); return reply.send(result);"
    : "return reply.send({ok:true,api:"+JSON.stringify(op.path)+",received:"+(method==="get"||method==="delete"?"null":"request.body??null")+"});";
  const guard=auth==="api-key"
    ? "if(!process.env.API_KEY || request.headers['x-api-key']!==process.env.API_KEY) return reply.code(401).send({error:{code:'UNAUTHORIZED',message:'Invalid API key'}});\n  "
    : "";
  const schemaLine=op.requestSchema ? "schema:{body:"+schema+"}," : "";
  return "app."+method+"("+route+",{"+schemaLine+"},async(request,reply)=>{\n  "+guard+body+"\n});";
}

export function compileApi(spec,outRoot){
  const s=validateSpec(spec);
  const dir=path.join(outRoot,s.name);
  fs.mkdirSync(dir,{recursive:true,mode:0o755});
  const routes=s.operations.map(op=>routeSource(op,s.auth,s.provider)).join("\n");
  const providerImport=s.operations.some(op=>op.handler==="provider") ? "import {createProviderAdapter} from "./provider.mjs";\nconst provider=createProviderAdapter("+JSON.stringify(s.provider)+");\n" : "const provider=null;\n";
  const server="import Fastify from "fastify";\n"+providerImport+"const app=Fastify({logger:true,bodyLimit:64*1024});\nconst port=Number(process.env.PORT||3000);\napp.get(\"/health\",async()=>({ok:true,service:"+JSON.stringify(s.name)+",version:"+JSON.stringify(s.version)+",factory:\"api-factory\"}));\napp.get(\"/ready\",async(request,reply)=>{const providerHealth=provider?await provider.health():{available:true,reason:\"not_required\"};if(!providerHealth.available)return reply.code(503).send({ok:false,ready:false,provider:providerHealth});return {ok:true,ready:true,provider:providerHealth};});\n"+routes+"\nawait app.listen({port,host:\"0.0.0.0\"});\n";
  const pkg=JSON.stringify({name:s.name,version:"0.1.0",private:true,type:"module",scripts:{start:"node server.mjs",test:"node --check server.mjs"},dependencies:{fastify:"5.6.1"}},null,2)+"\n";
  const openapi={openapi:"3.1.0",info:{title:s.name,version:s.version,description:s.description},paths:{},components:{schemas:{}}};
  if(s.auth==="api-key") openapi.components.securitySchemes={ApiKey:{type:"apiKey",in:"header",name:"x-api-key"}};
  for(const op of s.operations){
    const method=op.method.toLowerCase(); openapi.paths[op.path]??={};
    openapi.paths[op.path][method]={summary:op.summary,responses:{"200":{description:"Success"},"401":{description:"Unauthorized"},"503":{description:"Provider unavailable"}}};
    if(s.auth==="api-key") openapi.paths[op.path][method].security=[{ApiKey:[]}];
    if(op.requestSchema) openapi.paths[op.path][method].requestBody={required:true,content:{"application/json":{schema:op.requestSchema}}};
  }
  fs.writeFileSync(path.join(dir,"server.mjs"),server);
  fs.writeFileSync(path.join(dir,"package.json"),pkg);
  fs.writeFileSync(path.join(dir,"openapi.json"),JSON.stringify(openapi,null,2)+"\n");
  fs.writeFileSync(path.join(dir,"README.md"),"# "+s.name+"\n\nGenerated by API Factory.\n\nVersion: "+s.version+"\n\nCapabilities: "+s.capabilities.join(", ")+"\n\nAuth: "+s.auth+"\n\nProvider: "+(s.provider?s.provider.kind:"none")+"\n");
  if(s.provider) fs.writeFileSync(path.join(dir,"provider.mjs"),"export {createProviderAdapter,ProviderUnavailableError} from "../provider.mjs";\n");
  return {name:s.name,version:s.version,directory:dir,files:[...["server.mjs","package.json","openapi.json","README.md"],...(s.provider?["provider.mjs"]:[])],operations:s.operations.length,provider:s.provider?.kind||null};
}
