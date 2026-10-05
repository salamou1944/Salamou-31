import assert from "node:assert/strict";
import {runEvidenceCommand} from "./evidence-runner.mjs";

const pass=await runEvidenceCommand({
  command:process.execPath,
  args:["-e","process.stdout.write('proof')"],
  timeoutMs:1000,
});
assert.equal(pass.status,"passed");
assert.equal(pass.exitCode,0);
assert.equal(pass.stdout,"proof");
assert.equal(pass.schema,"evidence-command/v1");

const fail=await runEvidenceCommand({
  command:process.execPath,
  args:["-e","process.stderr.write('boom'); process.exit(3)"],
  timeoutMs:1000,
});
assert.equal(fail.status,"failed");
assert.equal(fail.exitCode,3);
assert.equal(fail.stderr,"boom");

const timeout=await runEvidenceCommand({
  command:process.execPath,
  args:["-e","setTimeout(()=>{},5000)"],
  timeoutMs:50,
});
assert.equal(timeout.status,"timeout");
assert.equal(timeout.timedOut,true);

console.log(JSON.stringify({
  status:"PASS",
  checks:["passed-command","failed-command","timeout-command"],
}));
