const SINGLETON_ID = "singleton";
const MAX_CAS_ATTEMPTS = 3;

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function validRegistryRow(row) {
  return row?.id === SINGLETON_ID
    && row.payload
    && Array.isArray(row.payload.apis)
    && typeof row.updated_at === "string"
    && row.updated_at.length > 0
    && Number.isFinite(Date.parse(row.updated_at));
}

function nextTimestamp(previous, now) {
  const candidate = now();
  const previousMs = Date.parse(previous);
  const candidateMs = Date.parse(candidate);
  if (!Number.isFinite(candidateMs) || candidateMs <= previousMs) {
    return new Date(previousMs + 1).toISOString();
  }
  return candidate;
}

/**
 * Verify registry read/write/read-back without replacing the live payload.
 * compareAndSwap must update only updated_at and match the previously read timestamp.
 * Concurrent writes are handled by re-reading the latest row and retrying a bounded
 * number of times. The probe never retries against a stale timestamp or writes a payload.
 */
export async function verifyRegistryWriteRead(store, { now = () => new Date().toISOString() } = {}) {
  let before;
  try {
    before = await store.read();
  } catch {
    return { ok: false, error: "REGISTRY_READ_FAILED" };
  }

  if (before == null) {
    const payload = { apis: [] };
    let inserted;
    try {
      inserted = await store.insert({ id: SINGLETON_ID, payload, updated_at: now() });
    } catch {
      return { ok: false, error: "REGISTRY_WRITE_READ_FAILED" };
    }
    if (inserted?.id !== SINGLETON_ID || canonical(inserted.payload) !== canonical(payload)) {
      return { ok: false, error: "REGISTRY_WRITE_READ_FAILED" };
    }
    return { ok: true, read: true, write: true, verified: true };
  }

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    if (before == null) return { ok: false, error: "REGISTRY_WRITE_CONFLICT" };
    if (before.id !== SINGLETON_ID || !before.payload || !Array.isArray(before.payload.apis)) {
      return { ok: false, error: "REGISTRY_INVALID_PAYLOAD" };
    }
    if (typeof before.updated_at !== "string" || before.updated_at.length === 0 || !Number.isFinite(Date.parse(before.updated_at))) {
      return { ok: false, error: "REGISTRY_WRITE_READ_UNVERIFIED" };
    }

    const updatedAt = nextTimestamp(before.updated_at, now);
    let after;
    try {
      after = await store.compareAndSwap({ expectedUpdatedAt: before.updated_at, updatedAt });
    } catch {
      return { ok: false, error: "REGISTRY_WRITE_READ_FAILED" };
    }

    if (after) {
      const writeVerified = after.id === SINGLETON_ID
        && canonical(after.payload) === canonical(before.payload)
        && typeof after.updated_at === "string"
        && Date.parse(after.updated_at) === Date.parse(updatedAt);
      if (!writeVerified) return { ok: false, error: "REGISTRY_WRITE_READ_FAILED" };
      return { ok: true, read: true, write: true, verified: true };
    }

    if (attempt === MAX_CAS_ATTEMPTS - 1) break;
    try {
      before = await store.read();
    } catch {
      return { ok: false, error: "REGISTRY_READ_FAILED" };
    }
  }

  return { ok: false, error: "REGISTRY_WRITE_CONFLICT" };
}
