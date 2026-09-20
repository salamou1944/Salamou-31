import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'product-api-ledger-'));
process.env.REQUEST_LEDGER_FILE=path.join(dir,'ledger.json');
const { getIdempotency, putIdempotency, claimIdempotency, releaseIdempotency, requestFingerprint } = await import('./request-ledger.mjs');
const body={product_name:'x',language:'English'};
const fp=requestFingerprint(body);
assert.equal(getIdempotency('key','idem'),null);
putIdempotency('key','idem',fp,{ok:true,result:{title:'x'}});
assert.deepEqual(getIdempotency('key','idem').response,{ok:true,result:{title:'x'}});
assert.throws(()=>putIdempotency('key','idem',requestFingerprint({...body,language:'French'}),{ok:true}),/idempotency_key_reused/);

const claim = claimIdempotency('key', 'in-flight', fp);
assert.equal(claim.status, 'claimed');
assert.equal(claim.entry.owner.pid, process.pid);
assert.equal(claimIdempotency('key', 'in-flight', fp).status, 'pending');
assert.throws(() => claimIdempotency('key', 'in-flight', requestFingerprint({ ...body, language: 'French' })), /idempotency_key_reused/);
releaseIdempotency('key', 'in-flight', fp);
assert.equal(claimIdempotency('key', 'in-flight', fp).status, 'claimed');

const completedClaim = claimIdempotency('key', 'completed', fp);
assert.equal(completedClaim.status, 'claimed');
putIdempotency('key', 'completed', fp, { ok: true, result: { title: 'done' } });
assert.equal(claimIdempotency('key', 'completed', fp).status, 'completed');

const staleLiveId = 'stale-live';
const ledger = JSON.parse(fs.readFileSync(process.env.REQUEST_LEDGER_FILE,'utf8'));
ledger.entries[`${crypto.createHash('sha256').update('key').digest('hex')}:${require('node:crypto').createHash('sha256').update(staleLiveId).digest('hex')}`] = {
  fingerprint: fp, status: 'pending', createdAt: new Date(Date.now()-60_000).toISOString(),
  owner: { pid: process.pid, startToken: 'current-process-token-mismatch-test', at: Date.now()-60_000 }
};
fs.writeFileSync(process.env.REQUEST_LEDGER_FILE, JSON.stringify(ledger));
assert.equal(claimIdempotency('key', staleLiveId, fp).status, 'claimed');

const activeId = 'active-live';
const activeLedger = JSON.parse(fs.readFileSync(process.env.REQUEST_LEDGER_FILE,'utf8'));
activeLedger.entries[`${require('node:crypto').createHash('sha256').update('key').digest('hex')}:${require('node:crypto').createHash('sha256').update(activeId).digest('hex')}`] = {
  fingerprint: fp, status: 'pending', createdAt: new Date(Date.now()-60_000).toISOString(),
  owner: { pid: process.pid, startToken: (() => { const stat=fs.readFileSync(`/proc/${process.pid}/stat`,'utf8'); return stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/)[19]; })(), at: Date.now()-60_000 }
};
fs.writeFileSync(process.env.REQUEST_LEDGER_FILE, JSON.stringify(activeLedger));
assert.equal(claimIdempotency('key', activeId, fp).status, 'pending');

console.log(JSON.stringify({ok:true,idempotency:'atomic-claim-and-live-owner-stale-recovery-safe'}));
