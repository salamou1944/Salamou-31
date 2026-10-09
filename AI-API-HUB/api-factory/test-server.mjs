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
  const buildBody=await build.json();
  assert.equal(build.status,201,JSON.stringify(buildBody));
  const built=buildBody;
  assert.equal(built.execution.schema,"execution-contract/v1");
  assert.equal(built.execution.state,"BUILD");
  assert.equal(built.execution.artifacts.artifact.directory,built.artifact.directory);
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

  const businessOutcome=await fetch(base+"/v1/factory/verify/business-outcome",{method:"POST",headers,body:JSON.stringify({
    taskId:"commercial-1",
    entryPoint:"api-entry",
    verifiedBy:"independent-verifier",
    outcome:"CUSTOMER_ACTION_OBSERVED",
    previousOutcome:"ENTRY_POINT_VERIFIED",
    observations:["customer_action_observed"]
  })});
  assert.equal(businessOutcome.status,200);
  const businessBody=await businessOutcome.json();
  assert.equal(businessBody.ok,true);
  assert.equal(businessBody.evidence.schema,"business-outcome-evidence/v1");
  assert.equal(businessBody.evidence.outcome,"CUSTOMER_ACTION_OBSERVED");
  assert.equal(businessBody.transition.ok,true);

  const businessRegression=await fetch(base+"/v1/factory/verify/business-outcome",{method:"POST",headers,body:JSON.stringify({
    taskId:"commercial-1",
    entryPoint:"api-entry",
    verifiedBy:"independent-verifier",
    outcome:"USAGE_OBSERVED",
    previousOutcome:"REVENUE_OBSERVED"
  })});
  assert.equal(businessRegression.status,422);
  assert.equal((await businessRegression.json()).error,"BUSINESS_OUTCOME_REGRESSION");

  const businessUnverified=await fetch(base+"/v1/factory/verify/business-outcome",{method:"POST",headers,body:JSON.stringify({
    taskId:"commercial-2",
    entryPoint:"api-entry",
    outcome:"REVENUE_OBSERVED"
  })});
  assert.equal(businessUnverified.status,422);
  assert.equal((await businessUnverified.json()).error,"INDEPENDENT_VERIFIER_REQUIRED");

  const missing=await fetch(base+"/v1/factory/inspect/missing-api",{headers:{"x-api-key":"factory-secret"}});
  assert.equal(missing.status,404);

  const deploymentMissing=await fetch(base+"/v1/factory/deploy/plan",{method:"POST",headers,body:JSON.stringify({target:"railway",serviceName:"server-contract-demo"})});
  assert.equal(deploymentMissing.status,200);
  const deploymentBody=await deploymentMissing.json();
  assert.equal(deploymentBody.ok,true);
  assert.equal(deploymentBody.plan.target,"railway");
  assert.equal(deploymentBody.plan.serviceName,"server-contract-demo");
  assert.equal(deploymentBody.plan.deployable,false);
  assert.deepEqual(deploymentBody.plan.missing,["RAILWAY_TOKEN"]);

  const unsupportedDeployment=await fetch(base+"/v1/factory/deploy/plan",{method:"POST",headers,body:JSON.stringify({target:"unknown",serviceName:"server-contract-demo"})});
  assert.equal(unsupportedDeployment.status,400);
  assert.equal((await unsupportedDeployment.json()).ok,false);

  const registerUnknown=await fetch(base+"/v1/factory/register",{method:"POST",headers,body:JSON.stringify({...spec,name:"missing-build"})});
  assert.equal(registerUnknown.status,409);

  console.log("api-factory HTTP control plane + auth + build + registry + inspection + registration: PASS");
}finally{
  child.kill("SIGTERM");
  await wait(300);
  fs.rmSync(root,{recursive:true,force:true});
}
 
const unconfiguredRoot=fs.mkdtempSync(path.join(os.tmpdir(),"api-factory-auth-config-"));
const unconfiguredRegistry=path.join(unconfiguredRoot,"registry.json");
const unconfiguredPort=String(9000+Math.floor(Math.random()*500));
const unconfiguredEnv={...process.env,PORT:unconfiguredPort,FACTORY_OUTPUT_DIR:unconfiguredRoot,FACTORY_REGISTRY_FILE:unconfiguredRegistry};
delete unconfiguredEnv.FACTORY_API_KEY;
const unconfiguredChild=spawn(process.execPath,["server.mjs"],{
  cwd:path.dirname(new URL(import.meta.url).pathname),
  env:unconfiguredEnv,
  stdio:["ignore","pipe","pipe"]
});
let unconfiguredOutput="";
unconfiguredChild.stdout.on("data",d=>{unconfiguredOutput+=d.toString();});
unconfiguredChild.stderr.on("data",d=>{unconfiguredOutput+=d.toString();});
const unconfiguredBase="http://127.0.0.1:"+unconfiguredPort;
try{
  await wait(1200);
  assert.equal(unconfiguredChild.exitCode,null,"unconfigured factory runtime exited early: "+unconfiguredOutput);
  const publicHealth=await fetch(unconfiguredBase+"/health");
  assert.equal(publicHealth.status,200,"health should remain public");
  const protectedResponse=await fetch(unconfiguredBase+"/v1/factory/apis");
  assert.equal(protectedResponse.status,503,"protected endpoints must fail closed without FACTORY_API_KEY");
  assert.equal((await protectedResponse.json()).code,"AUTH_CONFIGURATION_REQUIRED");
  console.log("api-factory missing-key fail-closed auth: PASS");
}finally{
  unconfiguredChild.kill("SIGTERM");
  await wait(300);
  fs.rmSync(unconfiguredRoot,{recursive:true,force:true});
}
