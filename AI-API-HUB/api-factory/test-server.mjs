import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"api-factory-server-"));
const registryFile=path.join(root,"registry.json");
const port=String(8800+Math.floor(Math.random()*200));
const child=spawn(process.execPath,["server.mjs"],{
  cwd:path.dirname(new URL(import.meta.url).pathname),
  env:{...process.env,PORT:port,FACTORY_API_KEY:"factory-secret",FACTORY_OUTPUT_DIR:root,FACTORY_REGISTRY_FILE:registryFile},
  stdio:["ignore","pipe","pipe"]
});
let output="";
child.stdout.on("data",d=>{output+=d.toString();});
child.stderr.on("data",d=>{output+=d.toString();});
const base="http://127.0.0.1:"+port;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
  await wait(1200);
  assert.equal(child.exitCode,null,"factory runtime exited early: "+output);

  const health=await fetch(base+"/health");
  assert.equal(health.status,200);
  assert.equal((await health.json()).service,"api-factory");

  const unauthorized=await fetch(base+"/v1/factory/apis");
  assert.equal(unauthorized.status,401);

  const headers={"content-type":"application/json","x-api-key":"factory-secret"};
  const spec={
    name:"server-contract-demo",
    version:"v1",
    description:"Server control-plane integration test",
    auth:"none",
    capabilities:["custom-business"],
    operations:[{method:"GET",path:"/v1/ping",summary:"Ping"}]
  };

  const capabilities=await fetch(base+"/v1/factory/capabilities");
  assert.equal(capabilities.status,200);
  const capabilityBody=await capabilities.json();
  assert(capabilityBody.operations.includes("register"));
  assert(capabilityBody.evidence.includes("BUSINESS_VERIFIED"));

  const validate=await fetch(base+"/v1/factory/validate",{method:"POST",headers,body:JSON.stringify(spec)});
  assert.equal(validate.status,200);
  assert.equal((await validate.json()).spec.name,spec.name);

  const build=await fetch(base+"/v1/factory/build",{method:"POST",headers,body:JSON.stringify(spec)});
  assert.equal(build.status,201);
  const built=await build.json();
  assert.equal(built.api.name,spec.name);
  assert.equal(built.api.evidence,"COMPILED");
  assert.equal(built.api.deployment.status,"NOT_DEPLOYED");
  assert.equal(built.api.artifact.directory,path.join(root,spec.name));
  assert(fs.existsSync(path.join(root,spec.name,"server.mjs")));

  const listed=await fetch(base+"/v1/factory/apis",{headers:{"x-api-key":"factory-secret"}});
  assert.equal(listed.status,200);
  assert.equal((await listed.json()).apis.length,1);

  const inspected=await fetch(base+"/v1/factory/inspect/"+spec.name,{headers:{"x-api-key":"factory-secret"}});
  assert.equal(inspected.status,200);
  const inspection=(await inspected.json()).api.inspection;
  assert.equal(inspection.artifactPresent,true);
  assert.deepEqual(inspection.missing,[]);

  const registered=await fetch(base+"/v1/factory/register",{method:"POST",headers,body:JSON.stringify(spec)});
  assert.equal(registered.status,200);
  const registeredBody=await registered.json();
  assert.equal(registeredBody.api.status,"REGISTERED");
  assert.equal(registeredBody.api.evidence,"COMPILED");

  const detail=await fetch(base+"/v1/factory/apis/"+spec.name,{headers:{"x-api-key":"factory-secret"}});
  assert.equal(detail.status,200);
  const detailBody=await detail.json();
  assert.equal(detailBody.api.status,"REGISTERED");
  assert.equal(detailBody.api.evidence,"COMPILED");

  const missing=await fetch(base+"/v1/factory/inspect/missing-api",{headers:{"x-api-key":"factory-secret"}});
  assert.equal(missing.status,404);

  const registerUnknown=await fetch(base+"/v1/factory/register",{method:"POST",headers,body:JSON.stringify({...spec,name:"missing-build"})});
  assert.equal(registerUnknown.status,409);

  console.log("api-factory HTTP control plane + auth + build + registry + inspection + registration: PASS");
}finally{
  child.kill("SIGTERM");
  await wait(300);
  fs.rmSync(root,{recursive:true,force:true});
}