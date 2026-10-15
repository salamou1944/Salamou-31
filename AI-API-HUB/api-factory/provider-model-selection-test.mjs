import assert from "node:assert/strict";
import { chooseProviderModel } from "./provider-model-selection.mjs";

assert.equal(chooseProviderModel({
  provider: "groq",
  discoveredModels: ["meta-llama/llama-prompt-guard-2-22m", "canopylabs/orpheus-v1-english", "openai/gpt-oss-120b"]
}), "openai/gpt-oss-120b");

assert.equal(chooseProviderModel({
  provider: "openrouter",
  discoveredModels: ["openrouter/free", "vendor/embed-model:free", "vendor/chat-model:free"],
  freeModels: ["openrouter/free", "vendor/embed-model:free", "vendor/chat-model:free"]
}), "vendor/chat-model:free");

assert.equal(chooseProviderModel({provider: "mistral", configuredModel: "mistral-small-latest", discoveredModels: []}), "mistral-small-latest");
assert.equal(chooseProviderModel({provider: "groq", discoveredModels: ["meta-llama/llama-prompt-guard-2-22m"]}), null);
assert.equal(chooseProviderModel({provider: "huggingface_inference"}), "openai/gpt-oss-120b:fastest");
console.log("provider-model-selection-test: OK");
