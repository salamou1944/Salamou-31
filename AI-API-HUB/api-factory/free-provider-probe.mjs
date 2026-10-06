import process from "node:process";

const PROVIDERS = {
  groq: { env: "GROQ_API_KEY", base: "https://api.groq.com/openai/v1" },
  openrouter: { env: "OPENROUTER_API_KEY", base: "https://openrouter.ai/api/v1" },
  mistral: { env: "MISTRAL_API_KEY", base: "https://api.mistral.ai/v1" },
  chutes: { env: "CHUTES_API_KEY", base: "https://llm.chutes.ai/v1" },
  huggingface_inference: { env: "HF_TOKEN", base: "https://router.huggingface.co/v1" }
};

const provider = process.env.PROVIDER ?? "groq";
const cfg = PROVIDERS[provider];
if (!cfg) {
  console.error(JSON.stringify({ error: "UNSUPPORTED_PROVIDER", provider, supported: Object.keys(PROVIDERS) }));
  process.exit(2);
}
const key = process.env[cfg.env];
if (!key) {
  console.error(JSON.stringify({ error: "MISSING_PROVIDER_KEY", provider, required_env: cfg.env }));
  process.exit(3);
}

const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const modelsResponse = await fetch(`${cfg.base}/models`, { headers });
const modelsText = await modelsResponse.text();
let models;
try { models = JSON.parse(modelsText); } catch { models = { raw: modelsText.slice(0, 500) }; }

const discovered = Array.isArray(models?.data) ? models.data.map((m) => m?.id).filter(Boolean) : [];
const freeModels = discovered.filter((id) => /:free$/i.test(id) || /^openrouter\/free$/i.test(id));
const model = process.env.PROVIDER_MODEL ??
  (provider === "openrouter" ? "openrouter/free" : provider === "huggingface_inference" ? "openai/gpt-oss-120b:fastest" : discovered[0]);

if (!model) {
  console.error(JSON.stringify({
    provider,
    models_status: modelsResponse.status,
    discovered_models: discovered.length,
    free_models: freeModels.length,
    error: provider === "openrouter" ? "NO_FREE_MODEL_DISCOVERED" : "NO_MODEL_DISCOVERED"
  }));
  process.exit(4);
}

if (provider === "openrouter" && model !== "openrouter/free" && !freeModels.includes(model)) {
  console.error(JSON.stringify({
    provider,
    models_status: modelsResponse.status,
    discovered_models: discovered.length,
    free_models: freeModels.length,
    selected_model: model,
    error: "SELECTED_MODEL_NOT_FREE"
  }));
  process.exit(4);
}

const completionResponse = await fetch(`${cfg.base}/chat/completions`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "Reply with exactly FREE_PROVIDER_REAL_OK" }],
    temperature: 0
  })
});
const completionText = await completionResponse.text();
let completion;
try { completion = JSON.parse(completionText); } catch { completion = { raw: completionText.slice(0, 1000) }; }

const output = completion?.choices?.[0]?.message?.content ?? "";
const evidence = {
  evidence_level: completionResponse.ok && output.trim() === "FREE_PROVIDER_REAL_OK" ? "REAL_COMPLETION" : "FAILED",
  provider,
  base_url: cfg.base,
  models_status: modelsResponse.status,
  model_discovered: Boolean(model),
  discovered_models: discovered.length,
  free_models_discovered: freeModels.length,
  selected_model: model,
  completion_status: completionResponse.status,
  completion_received: Boolean(output),
  exact_output_match: output.trim() === "FREE_PROVIDER_REAL_OK",
  rate_limit_headers: Object.fromEntries([...completionResponse.headers].filter(([k]) => /limit|remaining|reset/i.test(k))),
  secret_committed: false
};
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.evidence_level === "REAL_COMPLETION" ? 0 : 5);
