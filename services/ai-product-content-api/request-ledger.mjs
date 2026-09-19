import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const file = process.env.REQUEST_LEDGER_FILE || path.join(process.cwd(), 'data', 'ai-product-content-request-ledger.json');
const lock = `${file}.lock`;
const staleMs = 30_000;

function keyId(key) { return crypto.createHash('sha256').update(key, 'utf8').digest('hex'); }
function entryId(apiKey, idempotencyKey) { return `${keyId(apiKey)}:${keyId(idempotencyKey)}`; }
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
      fs.writeFileSync(path.join(lock, 'owner'), JSON.stringify({ pid: process.pid, at: Date.now() }), { mode: 0o600 });
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const owner = JSON.parse(fs.readFileSync(path.join(lock, 'owner'), 'utf8'));
        if (Date.now() - Number(owner.at) > staleMs) fs.rmSync(lock, { recursive: true, force: true });
      } catch {
        try { fs.rmSync(lock, { recursive: true, force: true }); } catch {}
      }
    }
  }
  throw new Error('request_ledger_lock_timeout');
}
function release() { fs.rmSync(lock, { recursive: true, force: true }); }

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
        const age = Date.now() - Date.parse(existing.createdAt || '');
        if (Number.isFinite(age) && age <= staleMs) return { status: 'pending', entry: existing };
      } else {
        return { status: 'completed', entry: existing };
      }
    }
    const pending = { fingerprint, status: 'pending', createdAt: new Date().toISOString() };
    state.entries[id] = pending;
    write(state);
    return { status: 'claimed', entry: pending };
  } finally {
    release();
  }
}

export function putIdempotency(apiKey, idempotencyKey, fingerprint, response) {
  if (!idempotencyKey) return;
  acquire();
  try {
    const state = read();
    const id = entryId(apiKey, idempotencyKey);
    const existing = state.entries[id];
    if (existing && existing.fingerprint !== fingerprint) throw new Error('idempotency_key_reused_with_different_request');
    state.entries[id] = { fingerprint, status: 'completed', response, createdAt: existing?.createdAt || new Date().toISOString(), completedAt: new Date().toISOString() };
    write(state);
  } finally { release(); }
}

export function releaseIdempotency(apiKey, idempotencyKey, fingerprint) {
  if (!idempotencyKey) return;
  acquire();
  try {
    const state = read();
    const id = entryId(apiKey, idempotencyKey);
    const existing = state.entries[id];
    if (!existing) return;
    if (existing.fingerprint !== fingerprint) throw new Error('idempotency_key_reused_with_different_request');
    if ((existing.status || 'completed') === 'pending') {
      delete state.entries[id];
      write(state);
    }
  } finally { release(); }
}

export function requestFingerprint(body) { return crypto.createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex'); }
