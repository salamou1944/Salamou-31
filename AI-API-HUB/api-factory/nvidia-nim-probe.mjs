import process from "node:process";

const key = process.env.NVIDIA_NIM_API_KEY;
const model = process.env.PROVIDER_MODEL ?? "meta/llama-3.1-8b-instruct";

if (!key) {
  console.error(JSON.stringify({
    error: "MISSING_PROVIDER_KEY",
    provider: "nvidia_nim",
    required_env: "NVIDIA_NIM_API_KEY"
  }));
  process.exit(3);
}

const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    accept: "application/json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "Reply with exactly FREE_PROVIDER_REAL_OK" }],
    temperature: 0,
    max_tokens: 32,
    stream: false
  })
});

const text = await response.text();
let body;
try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 1000) }; }

const output = body?.choices?.[0]?.message?.content ?? "";
const evidence = {
  evidence_level: response.ok && output.trim() === "FREE_PROVIDER_REAL_OK" ? "REAL_COMPLETION" : "FAILED",
  provider: "nvidia_nim",
  base_url: "https://integrate.api.nvidia.com/v1",
  selected_model: model,
  completion_status: response.status,
  completion_received: Boolean(output),
  exact_output_match: output.trim() === "FREE_PROVIDER_REAL_OK",
  rate_limit_headers: Object.fromEntries([...response.headers].filter(([k]) => /limit|remaining|reset/i.test(k))),
  secret_committed: false
};

console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.evidence_level === "REAL_COMPLETION" ? 0 : 5);
