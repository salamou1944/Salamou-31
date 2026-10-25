import assert from "node:assert/strict";
import { verifyRegistryWriteRead } from "./registry-healthcheck.mjs";

const payload = { apis: [{ name: "demo", version: "v1", config: { b: 2, a: 1 } }] };
const updatedPayload = { apis: [{ name: "demo", version: "v2", config: { a: 3 } }] };
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
  let reads = 0;
  const casArgs = [];
  const result = await verifyRegistryWriteRead({
    read: async () => {
      reads++;
      return { id: "singleton", payload: reads === 1 ? payload : updatedPayload, updated_at: reads === 1 ? timestamp : later };
    },
    insert: async () => { throw new Error("must not insert an existing row"); },
    compareAndSwap: async args => {
      casArgs.push(args);
      if (casArgs.length === 1) return null; // another writer won the first compare-and-swap
      return { id: "singleton", payload: updatedPayload, updated_at: args.updatedAt };
    }
  }, { now: () => later });
  assert.deepEqual(result, { ok: true, read: true, write: true, verified: true });
  assert.equal(reads, 2, "a CAS conflict must re-read the latest registry row");
  assert.deepEqual(casArgs[0], { expectedUpdatedAt: timestamp, updatedAt: later });
  assert.deepEqual(casArgs[1], { expectedUpdatedAt: later, updatedAt: "2026-10-20T19:00:01.001Z" });
}

{
  let inserts = 0;
  let compareAttempts = 0;
  const result = await verifyRegistryWriteRead({
    read: async () => ({ id: "singleton", payload, updated_at: timestamp }),
    insert: async () => { inserts++; return null; },
    compareAndSwap: async () => { compareAttempts++; return null; }
  }, { now: () => later });
  assert.deepEqual(result, { ok: false, error: "REGISTRY_WRITE_CONFLICT" });
  assert.equal(inserts, 0, "a concurrent update must never be replaced by a health probe");
  assert.equal(compareAttempts, 3, "conflicts must stop after the bounded retry budget");
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

console.log("registry-healthcheck: non-destructive compare-and-swap read/write/read-back with bounded conflict retry passed");
