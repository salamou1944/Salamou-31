import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "api-factory-artifacts";
const EXPECTED_KEY_SHA256 = "1053ed9dd79b1f627bfc66873834f4153d17aaaa129886ad2f07099ccdccdcd3";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
async function authorized(req: Request) {
  const supplied = req.headers.get("x-factory-key") ?? "";
  if (!supplied || !SERVICE_KEY || !SUPABASE_URL) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(supplied));
  const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  if (actual.length !== EXPECTED_KEY_SHA256.length) return false;
  let diff = 0; for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ EXPECTED_KEY_SHA256.charCodeAt(i);
  return diff === 0;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!(await authorized(req))) return json({ ok: false, error: "Unauthorized" }, 401);
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^.*\/api-factory-storage/, "") || "/";
  if (pathname === "/registry/check" && req.method === "GET") {
    const { data: before, error: readError } = await supabase.from("api_factory_registry").select("id,payload").eq("id", "singleton").maybeSingle();
    if (readError) return json({ ok: false, error: "REGISTRY_READ_FAILED" }, 502);
    const payload = before?.payload && Array.isArray(before.payload.apis) ? before.payload : { apis: [] };
    const { data: after, error: writeError } = await supabase.from("api_factory_registry").upsert({ id: "singleton", payload, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("id,payload").single();
    if (writeError || after?.id !== "singleton" || JSON.stringify(after.payload) !== JSON.stringify(payload)) return json({ ok: false, error: "REGISTRY_WRITE_READ_FAILED" }, 502);
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