import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";
import net from "node:net";

function freePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.once("error",reject);
    server.listen(0,"127.0.0.1",()=>{
      const address=server.address();
      server.close(error=>error?reject(error):resolve(address.port));
    });
  });
}

const root=fs.mkdtempSync(path.join(os.tmpdir(),"ai-product-health-"));
const port=await freePort();
const env={...process.env,PORT:String(port),QUOTA_FILE:path.join(root,"quota.json")};
for(const key of ["AI_PROVIDER_API_KEY","OPENAI_API_KEY","AI_MODEL","OPENAI_MODEL","SERVICE_API_KEYS"])delete env[key];
const child=spawn(process.execPath,["server.js"],{cwd:import.meta.dirname,env,stdio:["ignore","ignore","pipe"]});
let stderr="";
child.stderr.on("data",chunk=>{stderr+=chunk.toString();});
const base="http://127.0.0.1:"+port;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

try{
  let health,ready,landing;
  for(let attempt=0;attempt<60;attempt++){
    if(child.exitCode!==null)throw new Error("API process exited before listening: "+stderr);
    try{
      health=await fetch(base+"/health");
      ready=await fetch(base+"/ready");
      landing=await fetch(base+"/");
      break;
    }catch{
      await wait(100);
    }
  }
  assert(health,"health endpoint did not become reachable");
  assert.equal(health.status,200,"liveness must succeed without provider credentials");
  assert.deepEqual(await health.json(),{ok:true,service:"ai-product-content-api",version:"0.1.0",status:"process-running"});
  assert(ready,"readiness endpoint did not become reachable");
  assert.equal(ready.status,503,"readiness must fail closed without required configuration");
  const readiness=await ready.json();
  assert.equal(readiness.ready,false);
  assert.equal(readiness.authentication,"not-configured");
  assert.equal(readiness.ai_provider_configured,false);
  assert(landing,"customer entry page did not become reachable");
  assert.equal(landing.status,200,"customer entry page should remain available without provider credentials");
  console.log("ai-product-content-api liveness/readiness separation: PASS");
}finally{
  child.kill("SIGTERM");
  await wait(250);
  fs.rmSync(root,{recursive:true,force:true});
}
