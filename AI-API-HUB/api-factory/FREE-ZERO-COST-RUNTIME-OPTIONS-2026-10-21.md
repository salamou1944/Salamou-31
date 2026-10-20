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
| 3 | Groq API | Free-plan rate limits apply; quotas vary by model/account | Existing OpenAI-compatible probe exists. Latest run [39481985765](https://github.com/salamou1944/Salamou-31/actions/runs/39481985765) did not send a request because `GROQ_BILLING_TIER` was empty. Confirm plan and model in the provider dashboard first. |
| 4 | OpenRouter `:free` models | Free model availability and limits can change; requires account/key | Existing probe filters discovered models to explicit free models. The same run [39481985765](https://github.com/salamou1944/Salamou-31/actions/runs/39481985765) made zero requests because `OPENROUTER_BILLING_TIER` was empty. Never fall back to a paid model automatically. |
| 5 | Mistral API | Free mode/quotas are account- and model-dependent; do not treat credits as perpetual | Probe and billing-tier guard exist. Verify current terms and eligible model in the official console before enabling. |
| 6 | Hugging Face Inference Providers | Free credits/limits may be small and can change; not assumed to be unlimited recurring access | Existing probe is gated. Treat as trial/limited until the current account's quota is confirmed. |
| 7 | OmniRoute as a routing layer | Router is open source; upstream requests still consume each configured provider's quota | Potentially reduces integration work, not the need for eligible accounts, API keys, policy review, and quota tracking. Do not install or expose a production endpoint until dependency/security and provider-terms review passes. |

## The “ChatGPT account” question

A GitHub repository cannot create free OpenAI API quota from a ChatGPT account. ChatGPT product access and API billing are separate. OmniRoute contains a ChatGPT Web (Codex) MCP adapter entry point, but the existence of that code does **not** prove that it is an officially supported, free, stable API route for this service. Do not import browser cookies/session tokens, share accounts, scrape a web session, or route production traffic through that adapter unless its implementation and current OpenAI terms are explicitly reviewed and permitted. Prefer official API credentials or a local model.

## GitHub Models status

**Do not build on GitHub Models:** GitHub's own changelog says the service, including its inference API, was retired on **2026-07-30**. Existing examples or old repositories mentioning it are stale for a live runtime.

## Safety rules for this project

1. No paid fallback; no card/billing activation as part of a free-provider probe.
2. Require a provider-specific billing-tier value of exactly `free` before making a network request.
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
