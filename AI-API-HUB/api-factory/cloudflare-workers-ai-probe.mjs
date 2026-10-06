import process from "node:process";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const model = process.env.PROVIDER_MODEL ?? "@cf/meta/llama-3.1-8b-instruct";

if (!accountId || !token) {
  console.error(JSON.stringify({
    error: "MISSING_PROVIDER_CONFIG",
    provider: "cloudflare_workers_ai",
    required_env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]
  }));
  process.exit(3);
}

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`;
const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    prompt: "Reply with exactly FREE_PROVIDER_REAL_OK"
  })
});

const text = await response.text();
let body;
try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 1000) }; }

const output = typeof body?.result?.response === "string" ? body.result.response : "";
const evidence = {
  evidence_level: response.ok && output.trim() === "FREE_PROVIDER_REAL_OK" ? "REAL_COMPLETION" : "FAILED",
  provider: "cloudflare_workers_ai",
  base_url: "https://api.cloudflare.com/client/v4",
  selected_model: model,
  completion_status: response.status,
  completion_received: Boolean(output),
  exact_output_match: output.trim() === "FREE_PROVIDER_REAL_OK",
  provider_success: body?.success === true,
  rate_limit_headers: Object.fromEntries([...response.headers].filter(([k]) => /limit|remaining|reset/i.test(k))),
  secret_committed: false
};

console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.evidence_level === "REAL_COMPLETION" ? 0 : 5);
