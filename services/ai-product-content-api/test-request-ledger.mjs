import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'product-api-ledger-'));
process.env.REQUEST_LEDGER_FILE=path.join(dir,'ledger.json');
const { getIdempotency, putIdempotency, requestFingerprint }=await import('./request-ledger.mjs');
const body={product_name:'x',language:'English'};
const fp=requestFingerprint(body);
assert.equal(getIdempotency('key','idem'),null);
putIdempotency('key','idem',fp,{ok:true,result:{title:'x'}});
assert.deepEqual(getIdempotency('key','idem').response,{ok:true,result:{title:'x'}});
assert.throws(()=>putIdempotency('key','idem',requestFingerprint({...body,language:'French'}),{ok:true}),/idempotency_key_reused/);
console.log(JSON.stringify({ok:true,idempotency:'deduplicates-successful-retries'}));


test('request ledger fails closed on corrupt or missing persistent state', async () => {
  const corrupt = path.join(dir, 'corrupt.json');
  fs.writeFileSync(corrupt, '{not-json', 'utf8');
  process.env.REQUEST_LEDGER_FILE = corrupt;
  const mod = await import('./request-ledger.mjs?corrupt=' + Date.now());
  assert.throws(() => mod.getIdempotency('key', 'idem'), /Unexpected token|JSON/);
  fs.rmSync(corrupt, { force: true });
  assert.equal(mod.getIdempotency('key', 'idem'), null);
});
