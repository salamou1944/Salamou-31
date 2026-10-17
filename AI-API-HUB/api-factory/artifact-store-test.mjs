import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createArtifactStore} from "./artifact-store.mjs";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"api-factory-artifacts-test-"));
try {
  const dir=path.join(root,"demo-api");
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"server.mjs"),"export const ok = true;\n");
  fs.writeFileSync(path.join(dir,"openapi.json"),"{\"openapi\":\"3.1.0\"}\n");
  const artifact={name:"demo-api",version:"v1",directory:dir,files:["server.mjs","openapi.json"]};

  const local=createArtifactStore({env:{},root});
  assert.equal(local.mode,"local-file");
  assert.equal(local.durable,false);
  const localArtifact=await local.persist(artifact,"demo-api");
  assert.equal(localArtifact.storage.durable,false);
  assert.deepEqual((await local.inspect(localArtifact)).missing,[]);
  assert.equal((await local.inspect(localArtifact)).artifactPresent,true);

  const calls=[];
  const remote=createArtifactStore({
    env:{FACTORY_REGISTRY_URL:"https://db.example.test",FACTORY_REGISTRY_SERVICE_ROLE_KEY:"test-only-secret"},
    root,
    fetchImpl:async(url,options)=>{
      calls.push({url,options});
      if(options.method==="GET") return {ok:true,status:200,text:async()=> "durable artifact content"};
      return {ok:true,status:200,json:async()=>({})};
    }
  });
  const stored=await remote.persist(artifact,"demo-api");
  assert.equal(stored.storage.durable,true);
  assert.equal(stored.storage.mode,"supabase-storage");
  assert.equal(calls.length,2);
  assert(calls.every(x=>x.options.method==="PUT"));
  assert(calls.every(x=>x.url.includes("/storage/v1/object/api-factory-artifacts/demo-api/")));
  assert(calls.every(x=>x.options.headers["x-upsert"]==="true"));

  const remoteInspection=await remote.inspect(stored);
  assert.equal(remoteInspection.artifactPresent,true);
  assert.equal(remoteInspection.durable,true);
  assert.deepEqual(remoteInspection.missing,[]);
  assert.equal(calls.length,4);
  assert(calls.slice(2).every(x=>x.options.method==="HEAD"));
  const remoteFiles=await remote.readFiles(stored);
  assert.deepEqual(remoteFiles.map(file=>file.name),["server.mjs","openapi.json"]);
  assert(remoteFiles.every(file=>file.content==="durable artifact content"));
  assert.equal(calls.length,6);
  assert(calls.slice(4).every(x=>x.options.method==="GET"));

  const partial=createArtifactStore({env:{FACTORY_REGISTRY_URL:"https://db.example.test"},root});
  await assert.rejects(()=>partial.persist(artifact,"demo-api"),e=>e.code==="ARTIFACT_STORAGE_NOT_CONFIGURED");

  const broken=createArtifactStore({
    env:{FACTORY_REGISTRY_URL:"https://db.example.test",FACTORY_REGISTRY_SERVICE_ROLE_KEY:"test-only-secret"},
    root,
    fetchImpl:async()=>({ok:false,status:503,json:async()=>({})})
  });
  await assert.rejects(()=>broken.persist(artifact,"demo-api"),e=>e.code==="ARTIFACT_STORAGE_UPSTREAM_ERROR"&&e.status===503);
  console.log("artifact-store: local inspection, private remote persistence, and fail-closed contracts passed");
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
