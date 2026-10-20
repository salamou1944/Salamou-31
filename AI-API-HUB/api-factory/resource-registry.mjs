export const RESOURCE_REGISTRY = Object.freeze([
  {
    id: "github-public",
    category: "code",
    access: "public",
    cost: "free",
    capability: "repositories-actions-packages",
    entrypoint: "https://api.github.com",
    auth: "optional",
    tosRisk: "ok",
    notes: "Public GitHub data can be queried without credentials; authenticated operations require an explicitly granted token."
  },
  {
    id: "google-workspace",
    category: "productivity",
    access: "oauth",
    cost: "plan-dependent",
    capability: "workspace-drive-docs-sheets-gmail",
    entrypoint: "https://www.googleapis.com",
    auth: "oauth2",
    tosRisk: "ok",
    notes: "Use only scopes explicitly granted by the account owner; do not infer paid Workspace entitlement."
  },
  {
    id: "google-ai-studio",
    category: "ai",
    access: "api-key",
    cost: "quota-dependent",
    capability: "gemini-generation",
    entrypoint: "https://generativelanguage.googleapis.com",
    auth: "api-key",
    tosRisk: "ok",
    notes: "Only execute when the configured account/key is known to be within the intended free/quota policy."
  },
  {
    id: "groq-api",
    category: "ai",
    access: "api-key",
    cost: "quota-dependent",
    capability: "openai-compatible-llm-inference",
    entrypoint: "https://api.groq.com/openai/v1",
    auth: "api-key",
    tosRisk: "ok",
    sourceUrl: "https://console.groq.com/docs/rate-limits",
    notes: "Use only after the account/model's current free-plan limits are confirmed. Never infer free status from a key alone."
  },
  {
    id: "openrouter-free-models",
    category: "ai",
    access: "api-key",
    cost: "quota-dependent",
    capability: "openai-compatible-free-model-inference",
    entrypoint: "https://openrouter.ai/api/v1",
    auth: "api-key",
    tosRisk: "ok",
    sourceUrl: "https://openrouter.ai/models?max_price=0",
    notes: "Use only explicitly free model IDs (for example a model ending in :free); never fall back to a paid model. Free availability and rate limits can change."
  },
  {
    id: "mistral-api",
    category: "ai",
    access: "api-key",
    cost: "quota-dependent",
    capability: "openai-compatible-llm-inference",
    entrypoint: "https://api.mistral.ai/v1",
    auth: "api-key",
    tosRisk: "ok",
    sourceUrl: "https://mistral.ai/pricing",
    notes: "Confirm the account's current free mode and model quota. Promotional credits are not evidence of a recurring free tier."
  },
  {
    id: "huggingface-inference",
    category: "ai",
    access: "api-key",
    cost: "quota-dependent",
    capability: "openai-compatible-llm-inference",
    entrypoint: "https://router.huggingface.co/v1",
    auth: "api-key",
    tosRisk: "ok",
    sourceUrl: "https://huggingface.co/docs/inference-providers/pricing",
    notes: "Treat included credits as limited unless current terms explicitly confirm recurring free access; select only a verified model/provider."
  },
  {
    id: "local-ollama",
    category: "ai",
    access: "local",
    cost: "local-compute",
    capability: "local-llm",
    entrypoint: "http://127.0.0.1:11434",
    auth: "none",
    tosRisk: "ok",
    notes: "No provider charge; compute/storage remain the operator's responsibility."
  }
]);

export function getResource(id) {
  return RESOURCE_REGISTRY.find((resource) => resource.id === id) ?? null;
}

export function listResources() {
  return RESOURCE_REGISTRY.map((resource) => ({ ...resource }));
}
