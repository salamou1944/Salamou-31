import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createRegistryStore,REGISTRY_STORAGE_SQL} from "./registry-store.mjs";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"api-factory-registry-test-"));
try {
  const file=path.join(root,"nested","registry.json");
  const local=createRegistryStore({env:{},file});
  assert.equal(local.mode,"local-file");
  assert.equal(local.durable,false);
  assert.deepEqual(await local.read(),{apis:[]});
  const registry={apis:[{name:"registry-test-api",version:"v1",status:"COMPILED"}]};
  await local.write(registry);
  assert.deepEqual(await local.read(),registry);
  assert.match(fs.readFileSync(file,"utf8"),/registry-test-api/);

  assert.match(REGISTRY_STORAGE_SQL,/create table if not exists public\.api_factory_registry/);
  assert.match(REGISTRY_STORAGE_SQL,/enable row level security/);
  assert.match(REGISTRY_STORAGE_SQL,/revoke all/);

  const calls=[];
  const remote=createRegistryStore({
    env:{FACTORY_REGISTRY_URL:"https://db.example.test",FACTORY_REGISTRY_SERVICE_ROLE_KEY:"test-only-secret"},
    file,
    fetchImpl:async(url,options)=>{
      calls.push({url,options});
      if(options.method==="GET") return {ok:true,status:200,json:async()=>[{id:"singleton",payload:registry}]};
      if(options.method==="POST") return {ok:true,status:201,json:async()=>[{id:"singleton",payload:JSON.parse(options.body)[0].payload}]};
      return {ok:false,status:405,json:async()=>({})};
    }
  });
  assert.equal(remote.mode,"supabase-rest");
  assert.equal(remote.durable,true);
  assert.deepEqual(await remote.read(),registry);
  const updated={apis:[...registry.apis,{name:"second-api",version:"v1"}]};
  await remote.write(updated);
  assert.deepEqual(JSON.parse(calls[1].options.body)[0].payload,updated);
  assert.equal(calls[0].options.headers.authorization,"Bearer test-only-secret");
  assert(calls[0].url.includes("/rest/v1/api_factory_registry?on_conflict=id"));

  const partial=createRegistryStore({env:{FACTORY_REGISTRY_URL:"https://db.example.test"},file});
  await assert.rejects(()=>partial.read(),e=>e.code==="REGISTRY_STORAGE_NOT_CONFIGURED");

  const broken=createRegistryStore({
    env:{FACTORY_REGISTRY_URL:"https://db.example.test",FACTORY_REGISTRY_SERVICE_ROLE_KEY:"test-only-secret"},
    file,
    fetchImpl:async()=>({ok:false,status:503,json:async()=>({})})
  });
  await assert.rejects(()=>broken.read(),e=>e.code==="REGISTRY_STORAGE_UPSTREAM_ERROR"&&e.status===503);
  console.log("registry-store: local atomic file and remote fail-closed contracts passed");
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
