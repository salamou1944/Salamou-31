import fs from "node:fs";
import path from "node:path";

const TABLE = "api_factory_registry";
const SINGLETON_ID = "singleton";

export function createRegistryStore({
  env = process.env,
  file = path.join(process.cwd(), "api-factory-registry.json"),
  fetchImpl = globalThis.fetch
} = {}) {
  const url = typeof env.FACTORY_REGISTRY_URL === "string" ? env.FACTORY_REGISTRY_URL.trim().replace(/\/$/, "") : "";
  const key = typeof env.FACTORY_REGISTRY_SERVICE_ROLE_KEY === "string" ? env.FACTORY_REGISTRY_SERVICE_ROLE_KEY.trim() : "";
  const gateway = typeof env.FACTORY_STORAGE_GATEWAY_URL === "string" ? env.FACTORY_STORAGE_GATEWAY_URL.trim().replace(/\/$/, "") : "";
  const internalKey = typeof env.FACTORY_API_KEY === "string" ? env.FACTORY_API_KEY.trim() : "";
  const gatewayConfigured = Boolean(url && gateway && internalKey);
  const remoteRequested = Boolean(url || key || gateway);
  const remoteConfigured = Boolean(url && (key || gatewayConfigured));
  const useGateway = gatewayConfigured && !key;
  const mode = remoteConfigured ? (useGateway ? "supabase-edge-gateway" : "supabase-rest") : env.VERCEL ? "ephemeral-file" : "local-file";

  function readFile() {
    try {
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      return value && Array.isArray(value.apis) ? value : { apis: [] };
    } catch (error) {
      if (error?.code === "ENOENT" || error instanceof SyntaxError) return { apis: [] };
      throw error;
    }
  }

  function writeFile(value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = file + "." + process.pid + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(temp, file);
  }

  async function remoteRequest(method, body) {
    if (!remoteConfigured) {
      const error = new Error(remoteRequested ? "Registry storage configuration is incomplete" : "Registry storage is not configured");
      error.code = "REGISTRY_STORAGE_NOT_CONFIGURED";
      throw error;
    }
    const response = useGateway
      ? await fetchImpl(gateway + "/registry", {
          method,
          headers: { "x-factory-key": internalKey, "content-type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(5000)
        })
      : await fetchImpl(url + "/rest/v1/" + TABLE + (method === "POST" ? "?on_conflict=id" : "?id=eq." + SINGLETON_ID + "&select=id,payload"), {
          method,
          headers: {
            apikey: key,
            authorization: "Bearer " + key,
            "content-type": "application/json",
            prefer: "resolution=merge-duplicates,return=representation"
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(5000)
        });
    if (!response.ok) {
      const error = new Error("Registry storage request failed with HTTP " + response.status);
      error.code = "REGISTRY_STORAGE_UPSTREAM_ERROR";
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return [];
    return response.json();
  }

  return {
    mode,
    durable: remoteConfigured,
    configured: remoteConfigured,
    async check() {
      if (!remoteConfigured) return { ok: false, mode, reason: remoteRequested ? "REGISTRY_STORAGE_CONFIGURATION_INCOMPLETE" : "REGISTRY_STORAGE_NOT_CONFIGURED" };
      try {
        const rows = await remoteRequest("GET", undefined);
        const row = Array.isArray(rows) ? rows.find(item => item.id === SINGLETON_ID) : null;
        if (row && (!row.payload || !Array.isArray(row.payload.apis))) return { ok: false, mode, reason: "REGISTRY_STORAGE_INVALID_PAYLOAD" };
        return { ok: true, mode };
      } catch (error) {
        return { ok: false, mode, reason: error?.code || "REGISTRY_STORAGE_CHECK_FAILED" };
      }
    },
    async read() {
      if (remoteRequested) {
        const rows = await remoteRequest("GET", undefined);
        const row = Array.isArray(rows) ? rows.find(item => item.id === SINGLETON_ID) : null;
        if (!row) return { apis: [] };
        if (!row.payload || !Array.isArray(row.payload.apis)) {
          const error = new Error("Registry storage row has an invalid payload");
          error.code = "REGISTRY_STORAGE_INVALID_PAYLOAD";
          throw error;
        }
        return row.payload;
      }
      return readFile();
    },
    async write(value) {
      if (!value || typeof value !== "object" || !Array.isArray(value.apis)) {
        throw new TypeError("Registry must be an object containing an apis array");
      }
      if (remoteRequested) {
        await remoteRequest("POST", [{ id: SINGLETON_ID, payload: value, updated_at: new Date().toISOString() }]);
        return;
      }
      writeFile(value);
    }
  };
}

export const REGISTRY_STORAGE_SQL = `create table if not exists public.api_factory_registry (
  id text primary key check (id = 'singleton'),
  payload jsonb not null default '{"apis":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.api_factory_registry enable row level security;
revoke all on table public.api_factory_registry from anon, authenticated;
grant all on table public.api_factory_registry to service_role;
`;
