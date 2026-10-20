const NON_CHAT_MODEL = /prompt[-_/]?guard|embedding|embed-|rerank|whisper|transcrib|speech|audio|voice|music|orpheus|text-to-speech|tts|moderation|safeguard/i;

export function chooseProviderModel({ provider, configuredModel, discoveredModels = [], freeModels = [] } = {}) {
  if (configuredModel) return configuredModel;
  const isChatCandidate = (id) => typeof id === "string" && !NON_CHAT_MODEL.test(id);
  if (provider === "openrouter") {
    return freeModels.find((id) => id.toLowerCase() !== "openrouter/free" && isChatCandidate(id)) ?? "openrouter/free";
  }
  if (provider === "huggingface_inference") return null;
  return discoveredModels.find(isChatCandidate) ?? null;
}
