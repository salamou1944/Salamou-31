import assert from "node:assert/strict";
import fs from "node:fs";

const policy = fs.readFileSync(new URL("./FREE-PROVIDER-POLICY.md", import.meta.url), "utf8");
const fixture = JSON.parse(fs.readFileSync(new URL("./free-provider-policy-fixture.json", import.meta.url), "utf8"));

const required = [
  "provider_id",
  "access_class",
  "free_status",
  "quota_basis",
  "hard_stop",
  "eligibility_gate",
  "tos_risk",
  "source_last_researched",
  "source_url"
];

assert.match(policy, /hard_stop=true/);
assert.match(policy, /one_time_initial/);
assert.match(policy, /fail closed/);
assert.ok(Array.isArray(fixture) && fixture.length > 0);

for (const item of fixture) {
  for (const field of required) assert.ok(Object.hasOwn(item, field), field);
  assert.ok(["recurring", "one_time_initial", "promotion", "none", "unknown"].includes(item.free_status));
  assert.ok(typeof item.hard_stop === "boolean");
  assert.ok(["ok", "review", "avoid"].includes(item.tos_risk));
  assert.match(item.source_last_researched, /^2026-10-05$/);
  assert.match(item.source_url, /^https:\/\//);
}

console.log("free-provider-policy fixture + fail-closed rules: PASS");
