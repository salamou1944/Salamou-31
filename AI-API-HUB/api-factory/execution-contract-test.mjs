import assert from "node:assert/strict";
import {createExecutionRecord,assertStateExit} from "./execution-contract.mjs";

const verified=createExecutionRecord({
  state:"VERIFY",
  artifacts:{verification:{status:"PASS"}},
  evidence:[{kind:"ci",id:"soat-runtime"}],
  metadata:{scope:"ci-pinned-local-runtime"}
});
assert.deepEqual(assertStateExit(verified),{ok:true,state:"VERIFY",missing:[]});

assert.throws(
  ()=>assertStateExit(createExecutionRecord({
    state:"VERIFY",
    artifacts:{verification:{status:"PASS"}},
    evidence:[]
  })),
  /VERIFY_REQUIRES_EVIDENCE/
);

assert.throws(()=>createExecutionRecord({state:"UNKNOWN"}),/INVALID_EXECUTION_STATE/);

assert.throws(
  ()=>assertStateExit(createExecutionRecord({state:"SHIP",artifacts:{}})),
  /MISSING_EXIT_ARTIFACT:release/
);

console.log("execution contract state + exit-artifact + evidence gates: PASS");
