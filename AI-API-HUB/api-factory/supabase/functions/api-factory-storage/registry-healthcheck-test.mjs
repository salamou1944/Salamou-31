import assert from "node:assert/strict";
import { verifyRegistryWriteRead } from "./registry-healthcheck.mjs";

const payload = { apis: [{ name: "demo", version: "v1", config: { b: 2, a: 1 } }] };
const timestamp = "2026-10-20T19:00:00.000Z";
const later = "2026-10-20T19:00:01.000Z";

{
  let inserted = null;
  const result = await verifyRegistryWriteRead({
    read: async () => null,
    insert: async row => { inserted = row; return row; },
    compareAndSwap: async () => { throw new Error("must not update a missing row"); }
  }, { now: () => timestamp });
  assert.deepEqual(result, { ok: true, read: true, write: true, verified: true });
  assert.deepEqual(inserted, { id: "singleton", payload: { apis: [] }, updated_at: timestamp });
}

{
  let casArgs = null;
  const result = await verifyRegistryWriteRead({
    read: async () => ({ id: "singleton", payload, updated_at: timestamp }),
    insert: async () => { throw new Error("must not insert an existing row"); },
    compareAndSwap: async args => {
      casArgs = args;
      // Simulate JSONB key ordering changes in the response; payload semantics must remain equal.
      return { id: "singleton", payload: { apis: [{ config: { a: 1, b: 2 }, version: "v1", name: "demo" }] }, updated_at: args.updatedAt };
    }
  }, { now: () => later });
  assert.deepEqual(casArgs, { expectedUpdatedAt: timestamp, updatedAt: later });
  assert.deepEqual(result, { ok: true, read: true, write: true, verified: true });
}

{
  let inserts = 0;
  const result = await verifyRegistryWriteRead({
    read: async () => ({ id: "singleton", payload, updated_at: timestamp }),
    insert: async () => { inserts++; return null; },
    compareAndSwap: async () => null
  }, { now: () => later });
  assert.deepEqual(result, { ok: false, error: "REGISTRY_WRITE_CONFLICT" });
  assert.equal(inserts, 0, "a concurrent update must never be replaced by a health probe");
}

{
  let writes = 0;
  const result = await verifyRegistryWriteRead({
    read: async () => ({ id: "singleton", payload: { apis: "invalid" }, updated_at: timestamp }),
    insert: async () => { writes++; return null; },
    compareAndSwap: async () => { writes++; return null; }
  }, { now: () => later });
  assert.deepEqual(result, { ok: false, error: "REGISTRY_INVALID_PAYLOAD" });
  assert.equal(writes, 0, "invalid live payload must not be overwritten");
}

{
  const result = await verifyRegistryWriteRead({
    read: async () => { throw new Error("unavailable"); },
    insert: async () => null,
    compareAndSwap: async () => null
  });
  assert.deepEqual(result, { ok: false, error: "REGISTRY_READ_FAILED" });
}

console.log("registry-healthcheck: non-destructive compare-and-swap read/write/read-back passed");
