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
assert.equal(putIdempotency('key','idem',fp,{ok:true,result:{title:'x'}}),true);
assert.deepEqual(getIdempotency('key','idem').response,{ok:true,result:{title:'x'}});
assert.throws(()=>putIdempotency('key','idem',requestFingerprint({...body,language:'French'}),{ok:true}),/idempotency_key_reused/);

const claim = claimIdempotency('key', 'in-flight', fp);
assert.equal(claim.status, 'claimed');
assert.equal(claim.entry.owner.pid, process.pid);
assert.equal(typeof claim.ownerToken, 'string');
assert.equal(claimIdempotency('key', 'in-flight', fp).status, 'pending');
assert.throws(() => claimIdempotency('key', 'in-flight', requestFingerprint({ ...body, language: 'French' })), /idempotency_key_reused/);
assert.equal(releaseIdempotency('key', 'in-flight', fp, 'wrong-owner-token'), false);
assert.equal(claimIdempotency('key', 'in-flight', fp).status, 'pending');
assert.equal(releaseIdempotency('key', 'in-flight', fp, claim.ownerToken), true);
assert.equal(claimIdempotency('key', 'in-flight', fp).status, 'claimed');

const completedClaim = claimIdempotency('key', 'completed', fp);
assert.equal(completedClaim.status, 'claimed');
assert.equal(putIdempotency('key', 'completed', fp, { ok: true, result: { title: 'done' } }, completedClaim.ownerToken), true);
assert.equal(claimIdempotency('key', 'completed', fp).status, 'completed');
assert.equal(putIdempotency('key', 'completed', fp, { ok: true }), true);

const staleLiveId = 'stale-live';
const ledger = JSON.parse(fs.readFileSync(process.env.REQUEST_LEDGER_FILE,'utf8'));
const staleEntryId = `${crypto.createHash('sha256').update('key').digest('hex')}:${crypto.createHash('sha256').update(staleLiveId).digest('hex')}`;
ledger.entries[staleEntryId] = {
  fingerprint: fp, status: 'pending', createdAt: new Date(Date.now()-60_000).toISOString(),
  owner: { pid: process.pid, startToken: 'current-process-token-mismatch-test', at: Date.now()-60_000, token:'old-owner-token' }
};
fs.writeFileSync(process.env.REQUEST_LEDGER_FILE, JSON.stringify(ledger));
const recovered = claimIdempotency('key', staleLiveId, fp);
assert.equal(recovered.status, 'claimed');
assert.notEqual(recovered.ownerToken, 'old-owner-token');
assert.equal(putIdempotency('key', staleLiveId, fp, {ok:'old'}, 'old-owner-token'), false);
assert.equal(getIdempotency('key', staleLiveId).status, 'pending');
assert.equal(putIdempotency('key', staleLiveId, fp, {ok:'new'}, recovered.ownerToken), true);
assert.deepEqual(getIdempotency('key', staleLiveId).response,{ok:'new'});

const activeId = 'active-live';
const activeLedger = JSON.parse(fs.readFileSync(process.env.REQUEST_LEDGER_FILE,'utf8'));
const activeEntryId = `${crypto.createHash('sha256').update('key').digest('hex')}:${crypto.createHash('sha256').update(activeId).digest('hex')}`;
activeLedger.entries[activeEntryId] = {
  fingerprint: fp, status: 'pending', createdAt: new Date(Date.now()-60_000).toISOString(),
  owner: { pid: process.pid, startToken: (() => { const stat=fs.readFileSync(`/proc/${process.pid}/stat`,'utf8'); return stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/)[19]; })(), at: Date.now()-60_000, token:'live-owner-token' }
};
fs.writeFileSync(process.env.REQUEST_LEDGER_FILE, JSON.stringify(activeLedger));
assert.equal(claimIdempotency('key', activeId, fp).status, 'pending');
assert.equal(putIdempotency('key', activeId, fp, {ok:'intruder'}, 'wrong-owner-token'), false);
assert.equal(getIdempotency('key', activeId).status, 'pending');

const lockPath = process.env.REQUEST_LEDGER_FILE + '.lock';
fs.mkdirSync(lockPath, { recursive: true });
try {
  assert.throws(() => claimIdempotency('key', 'fresh-ownerless-lock', fp), /request_ledger_lock_timeout/);
} finally {
  fs.rmSync(lockPath, { recursive: true, force: true });
}

console.log(JSON.stringify({ok:true,idempotency:'owner-bound-claim-completion-and-release'}));
