import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn,execFileSync} from "node:child_process";
import {createServer} from "node:http";
import {validateSpec,compileApi} from "./factory.mjs";
import {createProviderAdapter} from "./provider.mjs";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"api-factory-"));
const spec={name:"demo-orders",version:"v1",description:"Generated test API",auth:"api-key",capabilities:["commerce"],operations:[
 {method:"GET",path:"/v1/orders",summary:"List orders",responseSchema:{type:"object"}},
 {method:"POST",path:"/v1/orders",summary:"Create order",requestSchema:{type:"object",required:["id"],properties:{id:{type:"string"}}}}
]};
assert.equal(validateSpec(spec).name,"demo-orders");
assert.throws(()=>validateSpec({...spec,name:"Bad Name"}),/name/);
assert.throws(()=>validateSpec({...spec,operations:[spec.operations[0],spec.operations[0]]}),/duplicate/);
assert.throws(()=>validateSpec({...spec,operations:[{...spec.operations[0],handler:"provider"}]}),/provider handler requires/);

const artifact=compileApi(spec,root);
for(const file of artifact.files) assert.equal(fs.existsSync(path.join(root,"demo-orders",file)),true);
const generated=path.join(root,"demo-orders");
assert.match(fs.readFileSync(path.join(generated,"server.mjs"),"utf8"),/RequestLedger/);
assert.match(fs.readFileSync(path.join(generated,"openapi.json"),"utf8"),/"x-api-key"/);

execFileSync("npm",["install","--ignore-scripts","--no-audit","--no-fund"],{cwd:generated,stdio:"inherit"});
const port="3007";
const child=spawn(process.execPath,["server.mjs"],{cwd:generated,env:{...process.env,PORT:port,API_KEY:"test-secret",API_QUOTA_LIMIT:"4",REQUEST_LEDGER_FILE:path.join(generated,"data","requests.json"),USAGE_LEDGER_FILE:path.join(generated,"data","usage.json")},stdio:["ignore","pipe","pipe"]});
let output="";
child.stdout.on("data",d=>{output+=d.toString();});
child.stderr.on("data",d=>{output+=d.toString();});

const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(1500);
assert.equal(child.exitCode,null,"generated runtime exited early: "+output);
const base="http://127.0.0.1:"+port;
const health=await fetch(base+"/health");
assert.equal(health.status,200);
assert.equal((await health.json()).service,"demo-orders");
const denied=await fetch(base+"/v1/orders");
assert.equal(denied.status,401);
const ok=await fetch(base+"/v1/orders",{headers:{"x-api-key":"test-secret"}});
assert.equal(ok.status,200);
const created=await fetch(base+"/v1/orders",{method:"POST",headers:{"content-type":"application/json","x-api-key":"test-secret","idempotency-key":"orders-1"},body:JSON.stringify({id:"abc"})});
assert.equal(created.status,200);
const replay=await fetch(base+"/v1/orders",{method:"POST",headers:{"content-type":"application/json","x-api-key":"test-secret","idempotency-key":"orders-1"},body:JSON.stringify({id:"abc"})});
assert.equal(replay.status,200);
const firstBody=await created.clone().json();
const replayBody=await replay.clone().json();
assert.deepEqual(replayBody,firstBody);
const conflict=await fetch(base+"/v1/orders",{method:"POST",headers:{"content-type":"application/json","x-api-key":"test-secret","idempotency-key":"orders-1"},body:JSON.stringify({id:"different"})});
assert.equal(conflict.status,409);
assert.equal((await conflict.json()).error.code,"IDEMPOTENCY_KEY_CONFLICT");
const concurrent=[1,2,3,4].map(()=>fetch(base+"/v1/orders",{method:"POST",headers:{"content-type":"application/json","x-api-key":"test-secret","idempotency-key":"orders-concurrent"},body:JSON.stringify({id:"concurrent"})}));
const concurrentResponses=await Promise.all(concurrent);
assert.deepEqual(concurrentResponses.map(x=>x.status),[200,200,200,200]);
const concurrentBodies=await Promise.all(concurrentResponses.map(x=>x.json()));
assert.deepEqual(concurrentBodies[0],concurrentBodies[1]);
assert.deepEqual(concurrentBodies[0],concurrentBodies[2]);
assert.deepEqual(concurrentBodies[0],concurrentBodies[3]);
const third=await fetch(base+"/v1/orders",{headers:{"x-api-key":"test-secret"}});
assert.equal(third.status,200);
const quotaHit=await fetch(base+"/v1/orders",{headers:{"x-api-key":"test-secret"}});
assert.equal(quotaHit.status,429);
const usage=JSON.parse(fs.readFileSync(path.join(generated,"data","usage.json"),"utf8"));
assert.equal(usage.total,4);
child.kill("SIGTERM");
await wait(300);

const providerSpec={name:"provider-demo",version:"v1",auth:"none",provider:{kind:"openai-compatible",baseUrl:"https://example.invalid/v1",model:"test-model",credentialEnv:"TEST_PROVIDER_KEY"},operations:[
 {method:"POST",path:"/v1/generate",summary:"Generate output",handler:"provider",requestSchema:{type:"object"}}
]};
const providerArtifact=compileApi(providerSpec,root);
const providerDir=path.join(root,"provider-demo");
assert(providerArtifact.files.includes("provider.mjs"));
execFileSync("npm",["install","--ignore-scripts","--no-audit","--no-fund"],{cwd:providerDir,stdio:"inherit"});
const providerChild=spawn(process.execPath,["server.mjs"],{cwd:providerDir,env:{...process.env,PORT:"3008",TEST_PROVIDER_KEY:""},stdio:["ignore","pipe","pipe"]});
let providerOutput="";
providerChild.stdout.on("data",d=>{providerOutput+=d.toString();});
providerChild.stderr.on("data",d=>{providerOutput+=d.toString();});
await wait(1200);
assert.equal(providerChild.exitCode,null,"provider runtime exited early: "+providerOutput);
const ready=await fetch("http://127.0.0.1:3008/ready");
assert.equal(ready.status,503);
const readyBody=await ready.json();
assert.equal(readyBody.ready,false);
assert.equal(readyBody.provider.reason,"missing_credentials");
providerChild.kill("SIGTERM");
await wait(300);
const soatSpec={name:"soat-demo",version:"v1",auth:"none",provider:{kind:"soat",baseUrl:"http://127.0.0.1:5047",credentialEnv:"SOAT_TEST_KEY"},operations:[
 {method:"POST",path:"/v1/generate",summary:"Generate through SOAT",handler:"provider",requestSchema:{type:"object"}}
]};
const soatArtifact=compileApi(soatSpec,root);
const soatDir=path.join(root,"soat-demo");
assert(soatArtifact.files.includes("provider.mjs"));
execFileSync("npm",["install","--ignore-scripts","--no-audit","--no-fund"],{cwd:soatDir,stdio:"inherit"});
const soatChild=spawn(process.execPath,["server.mjs"],{cwd:soatDir,env:{...process.env,PORT:"3009",SOAT_TEST_KEY:"soat-test-token",SOAT_AI_PROVIDER_ID:""},stdio:["ignore","pipe","pipe"]});
let soatOutput="";
soatChild.stdout.on("data",d=>{soatOutput+=d.toString();});
soatChild.stderr.on("data",d=>{soatOutput+=d.toString();});
await wait(1200);
assert.equal(soatChild.exitCode,null,"SOAT runtime exited early: "+soatOutput);
const soatReady=await fetch("http://127.0.0.1:3009/ready");
assert.equal(soatReady.status,503);
const soatReadyBody=await soatReady.json();
assert.equal(soatReadyBody.ready,false);
assert.equal(soatReadyBody.provider.reason,"missing_soat_ai_provider_id");
soatChild.kill("SIGTERM");
await wait(300);

const mockSoat=createServer((request,response)=>{
  assert.equal(request.method,"GET");
  assert.equal(request.url,"/api/v1/projects");
  assert.equal(request.headers.authorization,"Bearer soat-live-token");
  response.writeHead(200,{"content-type":"application/json"});
  response.end(JSON.stringify([{id:"proj_test",name:"Integration Test"}]));
});
await new Promise((resolve,reject)=>{
  mockSoat.once("error",reject);
  mockSoat.listen(0,"127.0.0.1",resolve);
});
const mockPort=mockSoat.address().port;
process.env.SOAT_TEST_KEY="soat-live-token";
process.env.SOAT_AI_PROVIDER_ID="aip_test";
const soatAdapter=createProviderAdapter({
  kind:"soat",
  baseUrl:"http://127.0.0.1:"+mockPort,
  credentialEnv:"SOAT_TEST_KEY"
});
const probe=await soatAdapter.probe();
assert.deepEqual(probe,{ok:true,kind:"soat",transport:true,authorization:true,status:200});
await new Promise(resolve=>mockSoat.close(resolve));

console.log("api-factory compiler + generated runtime + auth + idempotency + provider fail-closed + SOAT fail-closed + SOAT connectivity probe: PASS");
