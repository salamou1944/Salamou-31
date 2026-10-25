import crypto from "node:crypto";

export function hashCustomerApiKey(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function createCustomerKeyStore({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const gateway = typeof env.FACTORY_STORAGE_GATEWAY_URL === "string" ? env.FACTORY_STORAGE_GATEWAY_URL.trim().replace(/\/$/, "") : "";
  const internalKey = typeof env.FACTORY_API_KEY === "string" ? env.FACTORY_API_KEY.trim() : "";
  const configured = Boolean(gateway && internalKey);

  function unavailable() {
    const error = new Error("Customer key storage is not configured");
    error.code = "CUSTOMER_KEY_STORE_NOT_CONFIGURED";
    return error;
  }

  async function call(path, { method = "GET", body } = {}) {
    if (!configured) throw unavailable();
    let response;
    try {
      response = await fetchImpl(gateway + path, {
        method,
        headers: {
          "x-factory-key": internalKey,
          ...(body === undefined ? {} : { "content-type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      const error = new Error("Customer key gateway is unavailable");
      error.code = "CUSTOMER_KEY_STORE_UNAVAILABLE";
      throw error;
    }
    let data;
    try { data = await response.json(); } catch { data = null; }
    return { status: response.status, ok: response.ok, data };
  }

  async function requireSuccess(path, options) {
    const result = await call(path, options);
    if (!result.ok || result.data?.ok !== true) {
      const error = new Error("Customer key gateway request failed");
      error.code = typeof result.data?.error === "string" ? result.data.error : "CUSTOMER_KEY_STORE_REQUEST_FAILED";
      error.status = result.status;
      throw error;
    }
    return result.data;
  }

  return {
    configured,
    async check() {
      if (!configured) return { ok: false, reason: "CUSTOMER_KEY_STORE_NOT_CONFIGURED" };
      try {
        const result = await call("/customer-keys/check");
        return result.ok && result.data?.ok === true && result.data?.tables === true && result.data?.quotaRpc === true
          ? { ok: true, mode: "supabase-edge-gateway" }
          : { ok: false, reason: result.data?.error || "CUSTOMER_KEY_STORE_CHECK_FAILED" };
      } catch (error) {
        return { ok: false, reason: error.code || "CUSTOMER_KEY_STORE_CHECK_FAILED" };
      }
    },
    async create({ keyHash, label, quotaLimit }) {
      const result = await requireSuccess("/customer-keys", {
        method: "POST",
        body: { keyHash, label, quotaLimit }
      });
      return result.key;
    },
    async consume({ keyHash, route }) {
      const result = await call("/customer-keys/consume", {
        method: "POST",
        body: { keyHash, route }
      });
      if (!result.data || typeof result.data !== "object") {
        const error = new Error("Customer key gateway returned an invalid response");
        error.code = "CUSTOMER_KEY_STORE_INVALID_RESPONSE";
        throw error;
      }
      return { ...result.data, httpStatus: result.status };
    },
    async revoke({ id }) {
      const result = await requireSuccess("/customer-keys/" + encodeURIComponent(id) + "/revoke", { method: "POST", body: {} });
      return result.key;
    },
    async usage({ id }) {
      return requireSuccess("/customer-keys/" + encodeURIComponent(id) + "/usage");
    }
  };
}
