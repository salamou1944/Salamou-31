import assert from "node:assert/strict";
import {createServer} from "node:http";
import {createProviderAdapter} from "./provider.mjs";

function startServer(handler){
  const server=createServer(handler);
  return new Promise((resolve,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",()=>resolve(server));
  });
}
function stopServer(server){return new Promise(resolve=>server.close(resolve));}

process.env.TEST_PROVIDER_KEY="test-secret";

let calls=0;
const retryServer=await startServer((req,res)=>{
  calls++;
  assert.equal(req.headers.authorization,"Bearer test-secret");
  assert.equal(req.headers["idempotency-key"],"pilot-1");
  if(calls<3){
    res.writeHead(503,{"content-type":"application/json","retry-after":"0"});
    return res.end(JSON.stringify({error:"temporary"}));
  }
  res.writeHead(200,{"content-type":"application/json"});
  res.end(JSON.stringify({ok:true,calls}));
});
const adapter=createProviderAdapter({
  kind:"openai-compatible",
  baseUrl:"http://127.0.0.1:"+retryServer.address().port,
  model:"test-model",
  credentialEnv:"TEST_PROVIDER_KEY"
});
const result=await adapter.execute({
  messages:[{role:"user",content:"hello"}],
  __idempotencyKey:"pilot-1"
});
assert.deepEqual(result,{ok:true,calls:3});
assert.equal(calls,3);
await stopServer(retryServer);

let unsafeCalls=0;
const unsafeServer=await startServer((req,res)=>{
  unsafeCalls++;
  res.writeHead(503,{"content-type":"application/json","retry-after":"0"});
  res.end(JSON.stringify({error:"temporary"}));
});
const unsafeAdapter=createProviderAdapter({
  kind:"openai-compatible",
  baseUrl:"http://127.0.0.1:"+unsafeServer.address().port,
  model:"test-model",
  credentialEnv:"TEST_PROVIDER_KEY"
});
await assert.rejects(
  unsafeAdapter.execute({messages:[{role:"user",content:"hello"}]}),
  error=>error?.code==="PROVIDER_UNAVAILABLE"
);
assert.equal(unsafeCalls,1,"POST without idempotency must not be retried");
await stopServer(unsafeServer);

let circuitCalls=0;
const circuitServer=await startServer((req,res)=>{
  circuitCalls++;
  res.writeHead(503,{"content-type":"application/json","retry-after":"0"});
  res.end(JSON.stringify({error:"down"}));
});
process.env.PROVIDER_MAX_RETRIES="0";
process.env.PROVIDER_CIRCUIT_FAILURE_THRESHOLD="2";
process.env.PROVIDER_CIRCUIT_COOLDOWN_MS="1000";
const circuitAdapter=createProviderAdapter({
  kind:"openai-compatible",
  baseUrl:"http://127.0.0.1:"+circuitServer.address().port,
  model:"test-model",
  credentialEnv:"TEST_PROVIDER_KEY"
});
await assert.rejects(circuitAdapter.execute({messages:[],__idempotencyKey:"c1"}));
await assert.rejects(circuitAdapter.execute({messages:[],__idempotencyKey:"c2"}));
const before=circuitCalls;
await assert.rejects(circuitAdapter.execute({messages:[],__idempotencyKey:"c3"}),error=>/circuit is open/i.test(error.message));
assert.equal(circuitCalls,before);
await stopServer(circuitServer);

console.log("provider retry + idempotency + circuit-breaker: PASS");
