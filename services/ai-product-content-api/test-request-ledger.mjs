import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'product-api-ledger-'));
process.env.REQUEST_LEDGER_FILE=path.join(dir,'ledger.json');
const { getIdempotency, putIdempotency, claimIdempotency, releaseIdempotency, requestFingerprint } = await import('./request-ledger.mjs');
const body={product_name:'x',language:'English'};
const fp=requestFingerprint(body);
assert.equal(getIdempotency('key','idem'),null);
putIdempotency('key','idem',fp,{ok:true,result:{title:'x'}});
assert.deepEqual(getIdempotency('key','idem').response,{ok:true,result:{title:'x'}});
assert.throws(()=>putIdempotency('key','idem',requestFingerprint({...body,language:'French'}),{ok:true}),/idempotency_key_reused/);
console.log(JSON.stringify({ok:true,idempotency:'deduplicates-successful-retries'}));

const claim = claimIdempotency('key', 'in-flight', fp);
assert.equal(claim.status, 'claimed');
assert.equal(claimIdempotency('key', 'in-flight', fp).status, 'pending');
assert.throws(
  () => claimIdempotency('key', 'in-flight', requestFingerprint({ ...body, language: 'French' })),
  /idempotency_key_reused/
);
releaseIdempotency('key', 'in-flight', fp);
assert.equal(claimIdempotency('key', 'in-flight', fp).status, 'claimed');

const completedClaim = claimIdempotency('key', 'completed', fp);
assert.equal(completedClaim.status, 'claimed');
putIdempotency('key', 'completed', fp, { ok: true, result: { title: 'done' } });
assert.equal(claimIdempotency('key', 'completed', fp).status, 'completed');
