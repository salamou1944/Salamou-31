const SINGLETON_ID = "singleton";

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

/**
 * Verify registry read/write/read-back without replacing the live payload.
 * compareAndSwap must update only updated_at and match the previously read timestamp.
 * A concurrent registry write therefore either wins untouched or makes this probe fail closed.
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

  if (before.id !== SINGLETON_ID || !before.payload || !Array.isArray(before.payload.apis)) {
    return { ok: false, error: "REGISTRY_INVALID_PAYLOAD" };
  }
  if (typeof before.updated_at !== "string" || before.updated_at.length === 0) {
    return { ok: false, error: "REGISTRY_WRITE_READ_UNVERIFIED" };
  }

  let after;
  try {
    after = await store.compareAndSwap({ expectedUpdatedAt: before.updated_at, updatedAt: now() });
  } catch {
    return { ok: false, error: "REGISTRY_WRITE_READ_FAILED" };
  }
  if (!after) return { ok: false, error: "REGISTRY_WRITE_CONFLICT" };
  if (after.id !== SINGLETON_ID || canonical(after.payload) !== canonical(before.payload)) {
    return { ok: false, error: "REGISTRY_WRITE_READ_FAILED" };
  }
  return { ok: true, read: true, write: true, verified: true };
}
