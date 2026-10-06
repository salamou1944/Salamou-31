import assert from "node:assert/strict";
import fs from "node:fs";

const schema = JSON.parse(fs.readFileSync(new URL("./evaluation-fixture.schema.json", import.meta.url), "utf8"));
assert.equal(schema.properties.schema_version.const, "evaluation-fixture/v1");
for (const field of ["fixture_id","task_contract","dataset","system","model","rubric","run","results"]) {
  assert.ok(schema.required.includes(field), field);
}
assert.equal(schema.properties.dataset.required.includes("revision"), true);
assert.equal(schema.properties.system.required.includes("commit"), true);
assert.equal(schema.properties.results.required.includes("invalid_cases"), true);
assert.deepEqual(schema.properties.comparison.properties.regression_status.enum, ["PASS","FAIL","INDETERMINATE","NOT_APPLICABLE"]);
console.log("evaluation-fixture contract: PASS");
