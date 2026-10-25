import assert from "node:assert/strict";
import { createCustomerKeyStore, hashCustomerApiKey } from "./customer-key-store.mjs";

const rawKey = "sal31_test_customer_key_never_persist_this";
const keyHash = hashCustomerApiKey(rawKey);
assert.match(keyHash, /^[a-f0-9]{64}$/);
assert.notEqual(keyHash, rawKey);

{
  const store = createCustomerKeyStore({ env: {}, fetchImpl: async () => { throw new Error("must not call"); } });
  assert.deepEqual(await store.check(), { ok: false, reason: "CUSTOMER_KEY_STORE_NOT_CONFIGURED" });
  await assert.rejects(() => store.create({ keyHash, label: "pilot", quotaLimit: 10 }), { code: "CUSTOMER_KEY_STORE_NOT_CONFIGURED" });
}

{
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/customer-keys/check")) {
      return new Response(JSON.stringify({ ok: true, tables: true, quotaRpc: true }), { status: 200 });
    }
    if (url.endsWith("/customer-keys/consume")) {
      const body = JSON.parse(options.body);
      assert.equal(body.keyHash, keyHash);
      return new Response(JSON.stringify({ ok: true, keyId: "customer-id", usageCount: 1, quotaLimit: 10, remaining: 9 }), { status: 200 });
    }
    if (url.endsWith("/customer-keys")) {
      const body = JSON.parse(options.body);
      assert.equal(body.keyHash, keyHash);
      assert.equal(body.label, "pilot");
      return new Response(JSON.stringify({ ok: true, key: { id: "customer-id", label: "pilot", quotaLimit: 10, usageCount: 0 } }), { status: 201 });
    }
    if (url.endsWith("/customer-keys/customer-id/revoke")) {
      return new Response(JSON.stringify({ ok: true, key: { id: "customer-id", status: "revoked" } }), { status: 200 });
    }
    if (url.endsWith("/customer-keys/customer-id/usage")) {
      return new Response(JSON.stringify({ ok: true, key: { id: "customer-id", usageCount: 1, quotaLimit: 10, remaining: 9 }, recentUsage: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: false, error: "NOT_FOUND" }), { status: 404 });
  };
  const store = createCustomerKeyStore({
    env: { FACTORY_STORAGE_GATEWAY_URL: "https://gateway.example/functions/v1/api-factory-storage/", FACTORY_API_KEY: "internal-only" },
    fetchImpl
  });
  assert.deepEqual(await store.check(), { ok: true, mode: "supabase-edge-gateway" });
  assert.deepEqual(await store.create({ keyHash, label: "pilot", quotaLimit: 10 }), { id: "customer-id", label: "pilot", quotaLimit: 10, usageCount: 0 });
  assert.deepEqual(await store.consume({ keyHash, route: "username-research" }), { ok: true, keyId: "customer-id", usageCount: 1, quotaLimit: 10, remaining: 9, httpStatus: 200 });
  assert.deepEqual(await store.revoke({ id: "customer-id" }), { id: "customer-id", status: "revoked" });
  assert.deepEqual(await store.usage({ id: "customer-id" }), { ok: true, key: { id: "customer-id", usageCount: 1, quotaLimit: 10, remaining: 9 }, recentUsage: [] });
  assert(calls.every(call => call.options.headers["x-factory-key"] === "internal-only"));
  assert(calls.every(call => !JSON.stringify(call.options).includes(rawKey)), "raw customer key must never be sent to the gateway");
}

{
  const store = createCustomerKeyStore({
    env: { FACTORY_STORAGE_GATEWAY_URL: "https://gateway.example", FACTORY_API_KEY: "internal-only" },
    fetchImpl: async () => new Response(JSON.stringify({ ok: false, code: "CUSTOMER_QUOTA_EXCEEDED", usageCount: 10, quotaLimit: 10, remaining: 0 }), { status: 429 })
  });
  const result = await store.consume({ keyHash, route: "username-research" });
  assert.equal(result.code, "CUSTOMER_QUOTA_EXCEEDED");
  assert.equal(result.httpStatus, 429);
}

{
  const store = createCustomerKeyStore({
    env: { FACTORY_STORAGE_GATEWAY_URL: "https://gateway.example", FACTORY_API_KEY: "internal-only" },
    fetchImpl: async () => { throw new Error("offline"); }
  });
  assert.deepEqual(await store.check(), { ok: false, reason: "CUSTOMER_KEY_STORE_UNAVAILABLE" });
  await assert.rejects(() => store.create({ keyHash, label: "pilot", quotaLimit: 10 }), { code: "CUSTOMER_KEY_STORE_UNAVAILABLE" });
}

console.log("customer-key-store: hashing, fail-closed behavior, issue/consume/revoke/usage adapter passed");
