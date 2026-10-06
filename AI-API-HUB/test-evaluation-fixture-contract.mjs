import assert from "node:assert/strict";
import fs from "node:fs";

const schema = JSON.parse(fs.readFileSync(new URL("./evaluation-fixture.schema.json", import.meta.url), "utf8"));
const fixture = JSON.parse(fs.readFileSync(new URL("./evaluation-fixture-example.json", import.meta.url), "utf8"));

assert.equal(schema.properties.schema_version.const, "evaluation-fixture/v1");
for (const field of ["fixture_id","task_contract","dataset","system","model","rubric","run","results"]) {
  assert.ok(schema.required.includes(field), field);
}
assert.deepEqual(schema.properties.comparison.properties.regression_status.enum, ["PASS","FAIL","INDETERMINATE","NOT_APPLICABLE"]);

assert.equal(fixture.schema_version, "evaluation-fixture/v1");
assert.ok(fixture.dataset.revision);
assert.ok(fixture.system.commit);
assert.equal(fixture.run.case_count, fixture.dataset.case_ids.length);
assert.equal(fixture.results.invalid_cases.length, 0);
assert.equal(fixture.results.metrics.failed_cases, 0);
assert.equal(fixture.comparison.regression_status, "PASS");

const serialized = JSON.stringify(fixture).toLowerCase();
for (const forbidden of ["api_key","access_token","client_secret","password","private_key"]) {
  assert.equal(serialized.includes(forbidden), false, forbidden);
}

console.log("evaluation-fixture contract + deterministic example: PASS");
