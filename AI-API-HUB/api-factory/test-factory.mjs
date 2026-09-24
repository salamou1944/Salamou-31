import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn,execFileSync} from "node:child_process";
import {validateSpec,compileApi} from "./factory.mjs";

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
const child=spawn(process.execPath,["server.mjs"],{cwd:generated,env:{...process.env,PORT:port,API_KEY:"test-secret",API_QUOTA_LIMIT:"10",REQUEST_LEDGER_FILE:path.join(generated,"data","requests.json"),USAGE_LEDGER_FILE:path.join(generated,"data","usage.json")},stdio:["ignore","pipe","pipe"]});
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
const createdText=await created.text();
assert.equal(created.status,200,"created status/body/server="+JSON.stringify({status:created.status,body:createdText,serverOutput:output}));
const replay=await fetch(base+"/v1/orders",{method:"POST",headers:{"content-type":"application/json","x-api-key":"test-secret","idempotency-key":"orders-1"},body:JSON.stringify({id:"abc"})});
const replayText=await replay.text();
console.log("IDEMPOTENCY_REPLAY_DIAGNOSTIC",JSON.stringify({status:replay.status,body:replayText,serverOutput:output}));
assert.equal(replay.status,200,"replay status/body/server="+JSON.stringify({status:replay.status,body:replayText,serverOutput:output}));
const firstBody=JSON.parse(createdText);
const replayBody=JSON.parse(replayText);
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
console.log("api-factory compiler + generated runtime + auth + idempotency + provider fail-closed: PASS");
