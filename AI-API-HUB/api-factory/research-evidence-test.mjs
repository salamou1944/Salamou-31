import assert from "node:assert/strict";
import {buildEvidenceLedger, requireFreshEvidence} from "./research-evidence.mjs";

const now="2026-10-04T12:00:00.000Z";
const ledger=buildEvidenceLedger([
  {source:"reddit",url:"https://example.com/post/#comments",title:"Fresh",publishedAt:"2026-10-01T10:00:00Z",relevance:.9,engagement:120},
  {source:"x",url:"https://example.com/post/",title:"Duplicate",publishedAt:"2026-10-01T10:00:00Z"},
  {source:"github",url:"https://example.org/project",title:"Old",publishedAt:"2026-08-01T10:00:00Z"},
  {source:"youtube",url:"https://video.example/watch?id=1",title:"Undated"},
  {source:"web",url:"https://future.example/item",publishedAt:"2026-10-05T10:00:00Z"}
],{days:30,now});

assert.equal(ledger.kind,"research-evidence-ledger");
assert.equal(ledger.total,4);
assert.equal(ledger.fresh,1);
assert.deepEqual(ledger.sources,["reddit"]);
assert.equal(ledger.entries[0].freshness,"fresh");
assert.equal(ledger.entries[1].freshness,"stale");
assert.equal(ledger.entries[2].freshness,"undated");
assert.equal(ledger.entries[3].freshness,"future");
assert.equal(ledger.entries[0].url,"https://example.com/post");
assert.equal(ledger.entries[0].retrievedAt,now);
assert.doesNotThrow(()=>requireFreshEvidence(ledger));
assert.throws(()=>requireFreshEvidence(ledger,2),/insufficient fresh evidence/);
assert.throws(()=>buildEvidenceLedger([],{days:0,now}),/1..3650/);
assert.throws(()=>buildEvidenceLedger([{source:"x",url:"ftp://example.com"}],{now}),/http or https/);
assert.throws(()=>buildEvidenceLedger([{source:"x",url:"https://u:p@example.com"}],{now}),/credentials/);
console.log("research evidence ledger: PASS");
