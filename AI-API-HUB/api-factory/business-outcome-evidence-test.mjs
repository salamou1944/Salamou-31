import assert from "node:assert/strict";
import {createBusinessOutcomeEvidence,assertBusinessOutcomeTransition} from "./business-outcome-evidence.mjs";

const x=createBusinessOutcomeEvidence({taskId:"commercial-1",entryPoint:"api-entry",verifiedBy:"independent-verifier",outcome:"CUSTOMER_ACTION_OBSERVED"});
assert.equal(x.schema,"business-outcome-evidence/v1");
assert.equal(assertBusinessOutcomeTransition("ENTRY_POINT_VERIFIED","CUSTOMER_ACTION_OBSERVED").ok,true);
assert.throws(()=>assertBusinessOutcomeTransition("REVENUE_OBSERVED","USAGE_OBSERVED"),/REGRESSION/);
assert.throws(()=>createBusinessOutcomeEvidence({taskId:"x",entryPoint:"api",outcome:"REVENUE_OBSERVED"}),/INDEPENDENT_VERIFIER/);
console.log("business-outcome-evidence: ok");
