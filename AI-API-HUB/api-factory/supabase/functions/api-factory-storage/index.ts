import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyRegistryWriteRead } from "./registry-healthcheck.mjs";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "api-factory-artifacts";
const EXPECTED_KEY_SHA256S = ["ea9f0392681a2e405a5c425a48324705bc7b58c199aedba238cd86f735b2c831", "b8c910bfff9dc0847928a9cdebe3820122a94dacf9553d4f9c834ded7bd47db9"];
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
async function authorized(req: Request) {
  const supplied = req.headers.get("x-factory-key") ?? "";
  if (!supplied || !SERVICE_KEY || !SUPABASE_URL) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(supplied));
  const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  let accepted = false;
  for (const expected of EXPECTED_KEY_SHA256S) {
    if (actual.length !== expected.length) continue;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff === 0) accepted = true;
  }
  return accepted;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!(await authorized(req))) return json({ ok: false, error: "Unauthorized" }, 401);
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^.*\/api-factory-storage/, "") || "/";
  if (pathname === "/customer-keys/check" && req.method === "GET") {
    const { data, error } = await supabase.rpc("consume_api_factory_customer_key", {
      p_key_hash: "0000000000000000000000000000000000000000000000000000000000000000",
      p_route: "readiness-probe"
    });
    if (error || data?.ok !== false || data?.code !== "CUSTOMER_API_KEY_INVALID") {
      return json({ ok: false, error: "CUSTOMER_KEY_STORE_CHECK_FAILED" }, 502);
    }
    return json({ ok: true, mode: "supabase-edge-gateway", tables: true, quotaRpc: true });
  }
  if (pathname === "/customer-keys" && req.method === "POST") {
    let body: any; try { body = await req.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
    const keyHash = typeof body?.keyHash === "string" ? body.keyHash : "";
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const quotaLimit = body?.quotaLimit;
    if (!/^[a-f0-9]{64}$/.test(keyHash) || label.length < 1 || label.length > 100 || !Number.isInteger(quotaLimit) || quotaLimit < 1 || quotaLimit > 100000) {
      return json({ ok: false, error: "INVALID_CUSTOMER_KEY_INPUT" }, 400);
    }
    const { data, error } = await supabase.from("api_factory_customer_keys")
      .insert({ key_hash: keyHash, label, quota_limit: quotaLimit })
      .select("id,label,status,quota_limit,usage_count,created_at")
      .maybeSingle();
    if (error) return json({ ok: false, error: error.code === "23505" ? "CUSTOMER_KEY_HASH_CONFLICT" : "CUSTOMER_KEY_CREATE_FAILED" }, error.code === "23505" ? 409 : 502);
    if (!data) return json({ ok: false, error: "CUSTOMER_KEY_CREATE_FAILED" }, 502);
    return json({ ok: true, key: { id: data.id, label: data.label, status: data.status, quotaLimit: data.quota_limit, usageCount: data.usage_count, createdAt: data.created_at } }, 201);
  }
  if (pathname === "/customer-keys/consume" && req.method === "POST") {
    let body: any; try { body = await req.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
    const keyHash = typeof body?.keyHash === "string" ? body.keyHash : "";
    const route = typeof body?.route === "string" ? body.route : "";
    if (!/^[a-f0-9]{64}$/.test(keyHash) || route !== "username-research") return json({ ok: false, error: "INVALID_CUSTOMER_KEY_INPUT" }, 400);
    const { data, error } = await supabase.rpc("consume_api_factory_customer_key", { p_key_hash: keyHash, p_route: route });
    if (error || !data || typeof data !== "object") return json({ ok: false, error: "CUSTOMER_KEY_CONSUME_FAILED" }, 502);
    const status = data.ok === true ? 200 : data.code === "CUSTOMER_QUOTA_EXCEEDED" ? 429 : data.code === "INVALID_USAGE_ROUTE" ? 400 : 401;
    return json(data, status);
  }
  const revokeMatch = pathname.match(/^\\/customer-keys\\/([0-9a-f-]{36})\\/revoke$/i);
  if (revokeMatch && req.method === "POST") {
    const { data, error } = await supabase.from("api_factory_customer_keys")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", revokeMatch[1])
      .select("id,label,status,quota_limit,usage_count,created_at,revoked_at")
      .maybeSingle();
    if (error) return json({ ok: false, error: "CUSTOMER_KEY_REVOKE_FAILED" }, 502);
    if (!data) return json({ ok: false, error: "CUSTOMER_KEY_NOT_FOUND" }, 404);
    return json({ ok: true, key: { id: data.id, label: data.label, status: data.status, quotaLimit: data.quota_limit, usageCount: data.usage_count, createdAt: data.created_at, revokedAt: data.revoked_at } });
  }
  const usageMatch = pathname.match(/^\\/customer-keys\\/([0-9a-f-]{36})\\/usage$/i);
  if (usageMatch && req.method === "GET") {
    const { data: key, error: keyError } = await supabase.from("api_factory_customer_keys")
      .select("id,label,status,quota_limit,usage_count,created_at,revoked_at")
      .eq("id", usageMatch[1])
      .maybeSingle();
    if (keyError) return json({ ok: false, error: "CUSTOMER_KEY_USAGE_READ_FAILED" }, 502);
    if (!key) return json({ ok: false, error: "CUSTOMER_KEY_NOT_FOUND" }, 404);
    const { data: events, error: usageError } = await supabase.from("api_factory_customer_usage")
      .select("id,route,created_at")
      .eq("customer_key_id", usageMatch[1])
      .order("created_at", { ascending: false })
      .limit(20);
    if (usageError) return json({ ok: false, error: "CUSTOMER_KEY_USAGE_READ_FAILED" }, 502);
    return json({ ok: true, key: { id: key.id, label: key.label, status: key.status, quotaLimit: key.quota_limit, usageCount: key.usage_count, remaining: Math.max(0, key.quota_limit - key.usage_count), createdAt: key.created_at, revokedAt: key.revoked_at }, recentUsage: events ?? [] });
  }
  if (pathname === "/registry/check" && req.method === "GET") {
    const probe = await verifyRegistryWriteRead({
      read: async () => {
        const { data, error } = await supabase.from("api_factory_registry").select("id,payload,updated_at").eq("id", "singleton").maybeSingle();
        if (error) throw error;
        return data;
      },
      insert: async row => {
        const { data, error } = await supabase.from("api_factory_registry").insert(row).select("id,payload,updated_at").maybeSingle();
        if (error) throw error;
        return data;
      },
      compareAndSwap: async ({ expectedUpdatedAt, updatedAt }) => {
        const { data, error } = await supabase.from("api_factory_registry").update({ updated_at: updatedAt }).eq("id", "singleton").eq("updated_at", expectedUpdatedAt).select("id,payload,updated_at").maybeSingle();
        if (error) throw error;
        return data;
      }
    });
    if (!probe.ok) return json({ ok: false, error: probe.error }, probe.error === "REGISTRY_WRITE_CONFLICT" ? 409 : 502);
    return json({ ok: true, mode: "supabase-edge-gateway", read: true, write: true, verified: true });
  }
  if (pathname === "/registry" && req.method === "GET") {
    const { data, error } = await supabase.from("api_factory_registry").select("id,payload").eq("id", "singleton");
    if (error) return json({ ok: false, error: "REGISTRY_READ_FAILED" }, 502);
    return json(data ?? []);
  }
  if (pathname === "/registry" && req.method === "POST") {
    let rows: unknown; try { rows = await req.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
    if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.id !== "singleton" || !rows[0]?.payload || !Array.isArray(rows[0].payload.apis)) return json({ ok: false, error: "INVALID_REGISTRY_PAYLOAD" }, 400);
    const { data, error } = await supabase.from("api_factory_registry").upsert({ id: "singleton", payload: rows[0].payload, updated_at: rows[0].updated_at ?? new Date().toISOString() }, { onConflict: "id" }).select("id,payload");
    if (error) return json({ ok: false, error: "REGISTRY_WRITE_FAILED" }, 502);
    return json(data ?? []);
  }
  if (pathname === "/artifacts/check" && req.method === "POST") {
    const probeKey = "__healthcheck/storage-probe.txt";
    const marker = "api-factory-storage-probe";
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(probeKey, new TextEncoder().encode(marker), { contentType: "text/plain", upsert: true });
    if (uploadError) return json({ ok: false, error: "ARTIFACT_WRITE_FAILED" }, 502);
    const { data, error } = await supabase.storage.from(BUCKET).download(probeKey);
    if (error || !data || await data.text() !== marker) return json({ ok: false, error: "ARTIFACT_READ_AFTER_WRITE_FAILED" }, 502);
    return json({ ok: true, mode: "supabase-edge-gateway", write: true, read: true, verified: true });
  }
  if (pathname.startsWith("/artifacts/")) {
    const objectKey = pathname.slice("/artifacts/".length).split("/").map(part => decodeURIComponent(part)).join("/");
    if (!objectKey || objectKey.split("/").some(part => part === "." || part === "..")) return json({ ok: false, error: "INVALID_OBJECT_KEY" }, 400);
    if (req.method === "PUT") {
      const body = new Uint8Array(await req.arrayBuffer());
      const contentType = req.headers.get("content-type") ?? "text/plain; charset=utf-8";
      const { error } = await supabase.storage.from(BUCKET).upload(objectKey, body, { contentType, upsert: true });
      if (error) return json({ ok: false, error: "ARTIFACT_WRITE_FAILED" }, 502);
      return json({ ok: true, key: objectKey });
    }
    if (req.method === "GET") {
      const { data, error } = await supabase.storage.from(BUCKET).download(objectKey);
      if (error || !data) return json({ ok: false, error: "ARTIFACT_NOT_FOUND" }, 404);
      return new Response(data, { status: 200, headers: { "content-type": data.type || "application/octet-stream", "cache-control": "no-store" } });
    }
    return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }
  return json({ ok: false, error: "NOT_FOUND" }, 404);
});