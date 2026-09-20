import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const file = process.env.REQUEST_LEDGER_FILE || path.join(process.cwd(), 'data', 'ai-product-content-request-ledger.json');
const lock = `${file}.lock`;
const staleMs = 30_000;
let heldLockToken = null;

function keyId(key) { return crypto.createHash('sha256').update(key, 'utf8').digest('hex'); }
function entryId(apiKey, idempotencyKey) { return `${keyId(apiKey)}:${keyId(idempotencyKey)}`; }
function processStartToken(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const afterComm = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
    return afterComm[19] || null;
  } catch { return null; }
}
const ownerIdentity = () => ({ pid: process.pid, startToken: processStartToken(process.pid), at: Date.now(), token: `${process.pid}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}` });
function ownerAlive(owner) {
  if (!owner || !Number.isInteger(Number(owner.pid))) return false;
  const pid = Number(owner.pid);
  const current = processStartToken(pid);
  if (current && owner.startToken) return current === owner.startToken;
  try { process.kill(pid, 0); return true; } catch { return false; }
}
function pendingIsRecoverable(entry) {
  if (!entry || entry.status !== 'pending') return false;
  if (entry.owner && ownerAlive(entry.owner)) return false;
  const age = Date.now() - Date.parse(entry.createdAt || '');
  return Number.isFinite(age) && age > staleMs;
}
function read() {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed.version !== 1 || !parsed.entries || typeof parsed.entries !== 'object') throw new Error('malformed');
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, entries: {} };
    throw new Error(`request_ledger_unavailable:${error.message}`);
  }
}
function write(state) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(state), 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
function acquire() {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  for (let i = 0; i < 100; i += 1) {
    try {
      fs.mkdirSync(lock, { mode: 0o700 });
      const owner = ownerIdentity();
      fs.writeFileSync(path.join(lock, 'owner'), JSON.stringify(owner), { mode: 0o600 });
      heldLockToken = owner.token;
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const owner = JSON.parse(fs.readFileSync(path.join(lock, 'owner'), 'utf8'));
        if (Date.now() - Number(owner.at) > staleMs && !ownerAlive(owner)) {
          const stalePath=`${lock}.stale-${process.pid}-${Date.now()}-${randomUUID()}`;
          try { fs.renameSync(lock, stalePath); fs.rmSync(stalePath,{recursive:true,force:true}); } catch {}
        }
      } catch {
        try {
          const stat = fs.statSync(lock);
          if (Date.now() - stat.mtimeMs > staleMs) {
            const stalePath=`${lock}.stale-${process.pid}-${Date.now()}-${randomUUID()}`;
            try { fs.renameSync(lock,stalePath); fs.rmSync(stalePath,{recursive:true,force:true}); } catch {}
          }
        } catch {}
      }
    }
  }
  throw new Error('request_ledger_lock_timeout');
}
function release() {
  if (!heldLockToken) return;
  try {
    const owner = JSON.parse(fs.readFileSync(path.join(lock, 'owner'), 'utf8'));
    if (owner?.token === heldLockToken) fs.rmSync(lock, { recursive: true, force: true });
  } catch {}
  heldLockToken = null;
}

export function getIdempotency(apiKey, idempotencyKey) {
  if (!idempotencyKey) return null;
  const state = read();
  return state.entries[entryId(apiKey, idempotencyKey)] || null;
}

export function claimIdempotency(apiKey, idempotencyKey, fingerprint) {
  if (!idempotencyKey) return { status: 'disabled' };
  acquire();
  try {
    const state = read();
    const id = entryId(apiKey, idempotencyKey);
    const existing = state.entries[id];
    if (existing && existing.fingerprint !== fingerprint) throw new Error('idempotency_key_reused_with_different_request');
    if (existing) {
      const status = existing.status || 'completed';
      if (status === 'pending') {
        if (!pendingIsRecoverable(existing)) return { status: 'pending', entry: existing };
      } else return { status: 'completed', entry: existing };
    }
    const pending = { fingerprint, status: 'pending', createdAt: new Date().toISOString(), owner: ownerIdentity() };
    state.entries[id] = pending;
    write(state);
    return { status: 'claimed', entry: pending, ownerToken: pending.owner.token };
  } finally { release(); }
}

export function putIdempotency(apiKey, idempotencyKey, fingerprint, response, ownerToken = null) {
  if (!idempotencyKey) return true;
  acquire();
  try {
    const state = read();
    const id = entryId(apiKey, idempotencyKey);
    const existing = state.entries[id];
    if (existing && existing.fingerprint !== fingerprint) throw new Error('idempotency_key_reused_with_different_request');
    if (existing?.status === 'pending') {
      if (!ownerToken || existing.owner?.token !== ownerToken) return false;
    } else if (ownerToken) {
      return false;
    }
    state.entries[id] = { fingerprint, status: 'completed', response, createdAt: existing?.createdAt || new Date().toISOString(), completedAt: new Date().toISOString() };
    write(state);
    return true;
  } finally { release(); }
}

export function releaseIdempotency(apiKey, idempotencyKey, fingerprint, ownerToken = null) {
  if (!idempotencyKey) return true;
  acquire();
  try {
    const state = read();
    const id = entryId(apiKey, idempotencyKey);
    const existing = state.entries[id];
    if (!existing) return true;
    if (existing.fingerprint !== fingerprint) throw new Error('idempotency_key_reused_with_different_request');
    if ((existing.status || 'completed') === 'pending') {
      if (!ownerToken || existing.owner?.token !== ownerToken) return false;
      delete state.entries[id];
      write(state);
    }
    return true;
  } finally { release(); }
}

export function requestFingerprint(body) { return crypto.createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex'); }
