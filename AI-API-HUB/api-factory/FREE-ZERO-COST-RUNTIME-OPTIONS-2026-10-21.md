# Zero-cost AI runtime options — 2026-10-21

## Decision summary

**Best verified no-provider-bill path today:** keep Ollama as the local/CI inference path for tests and development. A GitHub Actions Ollama completion has passed, but that is CI-local evidence, not a public production inference endpoint.

**Best next hosted candidate:** Google AI Studio's Gemini API free tier, because this repository already has a dedicated model-discovery + real-completion probe. It is not verified for live use yet: the latest probe had `GOOGLE_AI_STUDIO_BILLING_TIER` empty and correctly made zero network requests. A masked key being present in CI is not proof that it is valid or that every selected model is eligible for free access.

**Useful free-tier router:** [OmniRoute](https://github.com/diegosouzapw/OmniRoute) is an MIT-licensed OpenAI-compatible gateway/router. Its own guide says users bring their own provider accounts and keys; it does not grant the advertised aggregate quota. Treat its large free-provider catalog as discovery data, not guaranteed capacity. Audit provider-specific terms and the selected model before routing production traffic.

## Ranked options

| Rank | Path | Cost boundary | Current evidence / next step |
|---|---|---|---|
| 1 | Ollama local inference | No hosted API bill; consumes local CPU/GPU/RAM and electricity | CI-local completion passed previously. Keep as default test/fallback; verify hardware and install locally before promising a user-facing endpoint. |
| 2 | Google AI Studio / Gemini API | Certain models have a free tier with model-specific quotas; paid tier requires billing setup | Existing `google-provider-probe.mjs` discovers eligible models and checks exact sentinel output. Latest run [39481985766](https://github.com/salamou1944/Salamou-31/actions/runs/39481985766) was a **safe NOT_VERIFIED no-op** because `GOOGLE_AI_STUDIO_BILLING_TIER` was empty. Confirm actual account/model eligibility before setting it to `free`. |
| 3 | Groq API | Free-plan rate limits apply; quotas vary by model/account | Existing OpenAI-compatible probe exists. Latest run [39515881263](https://github.com/salamou1944/Salamou-31/actions/runs/39515881263) did not send a request because `GROQ_BILLING_TIER` was empty. Confirm plan and model in the provider dashboard first. |
| 4 | OpenRouter `:free` models | Free model availability and limits can change; requires account/key | Existing probe filters discovered models to explicit free models. The same run [39515881263](https://github.com/salamou1944/Salamou-31/actions/runs/39515881263) made zero requests because `OPENROUTER_BILLING_TIER` was empty. Never fall back to a paid model automatically. |
| 5 | Mistral API | Free mode/quotas are account- and model-dependent; do not treat credits as perpetual | Probe and billing-tier guard exist. Verify current terms and eligible model in the official console before enabling. |
| 6 | Hugging Face Inference Providers | Free credits/limits may be small and can change; not assumed to be unlimited recurring access | Probe is blocked before network access unless both `PROVIDER_MODEL` and `HF_MODEL_FREE_CONFIRMED=true` are set for a specifically verified free model/provider. |
| 7 | OmniRoute as a routing layer | Router is open source; upstream requests still consume each configured provider's quota | Potentially reduces integration work, not the need for eligible accounts, API keys, policy review, and quota tracking. Do not install or expose a production endpoint until dependency/security and provider-terms review passes. |

## The “ChatGPT account” question

**There is a legitimate free coding route:** OpenAI's current Help Center says Codex is included on ChatGPT Free, including the local/CLI/IDE experience, subject to plan usage limits. Codex Cloud is **not** included on Free or Go. This lets a user sign in with their ChatGPT account to run the coding agent in a supported local client; it does not create a general OpenAI API key, free API quota, or an always-on production inference endpoint. See https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan.

ChatGPT product access and API billing remain separate. OmniRoute also contains a ChatGPT Web (Codex) MCP adapter entry point, but the existence of that code does **not** prove that it is an officially supported, free, stable API route for this service. Do not import browser cookies/session tokens, share accounts, scrape a web session, or route production traffic through that adapter unless its implementation and current OpenAI terms are explicitly reviewed and permitted. Prefer the supported Codex local client for coding work, or official API credentials/local inference for a service.

## GitHub Models status

**Do not build on GitHub Models:** GitHub's own changelog says the service, including its inference API, was retired on **2026-07-30**. Existing examples or old repositories mentioning it are stale for a live runtime.

## Safety rules for this project

1. No paid fallback; no card/billing activation as part of a free-provider probe.
2. Require a provider-specific billing-tier value of exactly `free` before making a network request. Hugging Face also requires an explicit model and `HF_MODEL_FREE_CONFIRMED=true` before any provider call.
3. Record `NOT_VERIFIED` when a probe is skipped; a green workflow alone is not live-provider evidence.
4. Promote only after an official source confirms the current plan, the real completion returns the exact sentinel, and the evidence artifact passes validation.
5. Keep API keys in repository/service secrets only. Never print, copy, commit, or request them in chat.
6. Use free-tier providers for development and small tests, not as a production SLA. Track quota exhaustion and return a clear error instead of silently switching to a paid model.

## Official sources checked

- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Groq rate limits: https://console.groq.com/docs/rate-limits
- OpenRouter free models: https://openrouter.ai/models?max_price=0
- Mistral pricing: https://mistral.ai/pricing
- Hugging Face Inference Providers pricing: https://huggingface.co/docs/inference-providers/pricing
- Ollama documentation: https://docs.ollama.com/
- OmniRoute free-tier guide: https://github.com/diegosouzapw/OmniRoute/blob/main/docs/getting-started/FREE-TIERS-GUIDE.md
- OmniRoute free-tier methodology: https://github.com/diegosouzapw/OmniRoute/blob/main/docs/reference/FREE_TIERS.md
- GitHub Models retirement announcement: https://github.blog/changelog/2026-07-01-github-models-is-being-fully-retired-on-july-30-2026/

Researched 2026-10-21. Recheck official provider terms before enabling a provider; catalog numbers and quotas are not guarantees.

## Official free-tier refresh — 2026-10-21

### OpenRouter free tier
OpenRouter's current official pricing page lists 25+ free models and 4 free providers on its Free plan. Free-model requests are capped at 20 requests/minute and 50 requests/day; the 1,000/day allowance is unlocked only after the account has purchased $10 of credits, which is outside this project's no-spend policy. Failed attempts count toward the daily cap, and free-model availability/limits can change. Sources:
- https://openrouter.ai/pricing
- https://openrouter.ai/collections/free-models/

This makes OpenRouter the next practical hosted candidate for a single, non-sensitive sentinel test only if an existing account/key is already available and its plan is confirmed. The connected tools do not expose an OpenRouter account or prove a usable key. The existing probe deliberately skipped the request while OPENROUTER_BILLING_TIER was empty; do not change that guard based only on the existence of a free plan.

### Gemini free tier and data boundary
Google's official pricing page lists free input/output tokens for certain eligible models, with model-specific limits. It also states that content in the free tier is used to improve Google's products, unlike the paid tier. Therefore do not send customer data, secrets, or confidential business content through a free-tier Gemini probe. Account/model eligibility still needs to be verified before any request:
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits

### Supported ChatGPT/Codex route
OpenAI's Help Center currently says Codex is included with ChatGPT Free and Go, subject to plan usage limits, but Codex Cloud is not included in Free or Go. The supported local CLI/app/IDE route is a coding agent, not a general OpenAI API key or always-on inference endpoint:
- https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan

### Current decision
1. First try to verify the existing OpenRouter account/key without revealing the key or activating billing. If no account/key is already available, do not create paid dependencies.
2. If account access is confirmed, run exactly one deterministic sentinel through a strictly free model, with paid fallback disabled, save response metadata, and record rate/terms.
3. In parallel, restore the existing Windows self-hosted runner to Idle so the local inventory can prove whether Ollama/Codex CLI is installed. The queued runner workflow is not evidence of local availability.