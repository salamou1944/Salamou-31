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
