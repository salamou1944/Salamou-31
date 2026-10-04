import assert from "node:assert/strict";
import {buildSherlockArgs,parseSherlockOutput,validateUsername} from "./sherlock-username.mjs";

assert.equal(validateUsername(" alice_01 "), "alice_01");
assert.deepEqual(buildSherlockArgs("alice_01"),["alice_01","--print-found","--no-color","--timeout","20"]);
assert.throws(()=>validateUsername(""),/must not be empty/);
assert.throws(()=>validateUsername("a b"),/unsupported characters/);
assert.throws(()=>validateUsername("a/b"),/unsupported characters/);

const parsed=parseSherlockOutput(
  [
    "[+] GitHub: https://github.com/alice_01",
    "[+] Example: https://example.com/alice_01",
    "[+] Duplicate: https://github.com/alice_01",
    "[-] Not found"
  ].join("\n"),
  "alice_01"
);
assert.deepEqual(parsed,[
  {url:"https://github.com/alice_01",username:"alice_01"},
  {url:"https://example.com/alice_01",username:"alice_01"}
]);

console.log("sherlock username adapter: PASS");
