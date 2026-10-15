import process from "node:process";

const key = process.env.GOOGLE_AI_API_KEY;
if (!key) {
  console.error(JSON.stringify({ error: "MISSING_PROVIDER_KEY", provider: "google_ai_studio", required_env: "GOOGLE_AI_API_KEY" }));
  process.exit(3);
}

const base = "https://generativelanguage.googleapis.com/v1beta";
const modelsResponse = await fetch(`${base}/models?key=${encodeURIComponent(key)}`);
const modelsText = await modelsResponse.text();
let models;
try { models = JSON.parse(modelsText); } catch { models = { raw: modelsText.slice(0, 500) }; }

const discovered = Array.isArray(models?.models) ? models.models : [];
const candidates = discovered.filter((m) =>
  Array.isArray(m?.supportedGenerationMethods) &&
  m.supportedGenerationMethods.includes("generateContent") &&
  /flash/i.test(m?.name ?? "")
);
const preferred = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash"];
const cleanModelName = (name) => name.startsWith("models/") ? name.slice("models/".length) : name;
const sortedCandidates = candidates.sort((a, b) => {
  const an = cleanModelName(a.name);
  const bn = cleanModelName(b.name);
  return (preferred.indexOf(an) < 0 ? 999 : preferred.indexOf(an)) -
         (preferred.indexOf(bn) < 0 ? 999 : preferred.indexOf(bn));
});
const configuredModel = process.env.GOOGLE_MODEL
  ? discovered.find((m) => m.name === `models/${process.env.GOOGLE_MODEL}` || m.name === process.env.GOOGLE_MODEL)
  : null;
const candidateModels = configuredModel ? [configuredModel] : sortedCandidates.slice(0, 3);
let model = candidateModels[0];

if (!model?.name) {
  console.error(JSON.stringify({
    provider: "google_ai_studio",
    models_status: modelsResponse.status,
    discovered_models: discovered.length,
    candidate_models: candidates.length,
    error: "NO_GENERATE_CONTENT_MODEL_DISCOVERED"
  }));
  process.exit(4);
}

let modelName = cleanModelName(model.name);
const completionRequest = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: "Reply with exactly FREE_PROVIDER_REAL_OK" }] }],
    generationConfig: { temperature: 0 }
  })
};
let completionResponse;
let completion;
for (let attempt = 0; attempt < candidateModels.length; attempt++) {
  model = candidateModels[attempt];
  modelName = model.name.replace(/^models\\//, "");
  completionResponse = await fetch(
    `${base}/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(key)}`,
    completionRequest
  );
  const completionText = await completionResponse.text();
  try { completion = JSON.parse(completionText); } catch { completion = { raw: completionText.slice(0, 1000) }; }
  // Only fall back to another discovered model for transient provider overload, never for quota or auth failures.
  if (completionResponse.status !== 503 || configuredModel || attempt === candidateModels.length - 1) break;
}
const output = completion?.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? "").join("") ?? "";
const evidence = {
  evidence_level: completionResponse.ok && output.trim() === "FREE_PROVIDER_REAL_OK" ? "REAL_COMPLETION" : "FAILED",
  provider: "google_ai_studio",
  base_url: base,
  models_status: modelsResponse.status,
  model_discovered: true,
  discovered_models: discovered.length,
  candidate_models: candidates.length,
  selected_model: modelName,
  completion_status: completionResponse.status,
  completion_received: Boolean(output),
  exact_output_match: output.trim() === "FREE_PROVIDER_REAL_OK",
  rate_limit_headers: Object.fromEntries([...completionResponse.headers].filter(([k]) => /limit|remaining|reset/i.test(k))),
  provider_error: completion?.error ? {
    code: completion.error.code ?? completionResponse.status,
    status: completion.error.status ?? null,
    message: typeof completion.error.message === "string" ? completion.error.message.slice(0, 240) : null
  } : null,
  secret_committed: false
};
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.evidence_level === "REAL_COMPLETION" ? 0 : 5);
