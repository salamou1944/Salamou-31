# Provider Account Matrix — 2026-10-05

## Decision

OpenAI API access is **PROBED but billing-blocked**: the real probe authenticated successfully, discovered 127 models, selected `gpt-5-mini`, and received HTTP 429 with `billing_not_active`. Do not route OpenAI and do not treat it as free capacity.

IREZE is **not** a production dependency. Keep it **UNVERIFIED / DO NOT ROUTE** until authentication and key provisioning are independently verified.

OpenRouter is now **VERIFIED / REAL_COMPLETION** on the explicitly free `openrouter/free` route. The real GitHub Actions probe discovered 464 models, identified 17 free models, and completed successfully with HTTP 200 and the exact contract output. It is eligible for free-first routing.

Preferred strategy: first-party free-tier accounts + AI-API-HUB routing, with explicit quota/health evidence and a hard stop on exhausted free capacity. No silent paid fallback.

## Priority targets

| Priority | Provider | Role | Free status | Compatibility | State |
|---|---|---|---|---|---|
| P0 | Google AI Studio / Gemini API | Primary free model capacity | Official free tier for eligible models | Native Gemini; adapter required | VERIFIED / REAL_COMPLETION |
| P0 | Groq | Fast inference | Free-plan rate limits documented | OpenAI-compatible | VERIFIED / REAL_COMPLETION |
| P0 | OpenRouter | Multi-provider aggregation | Official Free plan and free models | OpenAI-compatible | VERIFIED / REAL_COMPLETION |
| HOLD | OpenAI API | Optional paid API capacity | Billing inactive; not free-core | Responses API | PROBED / BILLING BLOCKED |
| P1 | Cloudflare Workers AI | Free compute/provider capacity | 10,000 Neurons/day on Workers Free | Adapter required | DISCOVERED |
| P1 | Mistral | First-party provider | Verify current direct free terms | OpenAI-compatible | DISCOVERED |
| P1 | NVIDIA NIM | Model/provider capacity | Verify current direct free terms | Verify | DISCOVERED |
| P1 | Hugging Face Inference Providers | Aggregation/provider access | Free-user credits currently documented | Provider-dependent | DISCOVERED |
| P2 | Chutes | Optional inference | Not free-core; current catalog shows paid token prices | OpenAI/Anthropic-compatible | DISCOVERED |
| HOLD | Cerebras | Optional paid/credit-dependent provider | Current official pricing requires a valid payment method for the $5 promotional credit; not part of the $0 core | OpenAI-compatible | HOLD / NOT FREE-CORE |
| HOLD | IREZE | Experimental gateway | Key provisioning unverified | Advertised OpenAI-compatible | UNVERIFIED / DO NOT ROUTE |

## OpenRouter evidence

GitHub Actions run `37405988519` / jobs `112083562406` (Groq) and `112083562576` (OpenRouter) completed successfully against the PR merge ref.

OpenRouter real probe evidence:
- `models_status: 200`
- `discovered_models: 464`
- `free_models_discovered: 17`
- `selected_model: openrouter/free`
- `completion_status: 200`
- `completion_received: true`
- `exact_output_match: true`
- `secret_committed: false`

This is sufficient to move OpenRouter from DISCOVERED/NEEDS RETEST to VERIFIED/REAL_COMPLETION and enable it in the free-first routing pool.

## Groq evidence

The same successful run produced:
- `models_status: 200`
- `selected_model: openai/gpt-oss-120b`
- `completion_status: 200`
- `exact_output_match: true`
- observable request/token rate-limit headers
- `secret_committed: false`

## OpenAI evidence

The real probe on commit `5c4dfd8e86d87c515e79bbe852b84fd9c4a76c52` authenticated successfully: `/v1/models` returned HTTP 200 with 127 models. The completion request then returned HTTP 429 with `billing_not_active`. This proves API access/model discovery, but not a usable completion. OpenAI remains out of automatic routing until a real completion succeeds.

## Evidence rules

DISCOVERED -> CONFIGURED -> PROBED -> VERIFIED -> ACTIVE.

A provider becomes CONFIGURED only when its account and secret exist outside Git. It becomes PROBED only after a real request. It becomes VERIFIED only after model discovery, real completion, schema validation, quota/rate-limit evidence, failure capture, SOAT evidence, and confirmation that paid fallback cannot occur silently. Only VERIFIED providers may enter automatic routing.

## Free-first policy

1. Prefer first-party free capacity.
2. Prefer providers with observable quotas/rate limits.
3. Route around unhealthy or exhausted providers.
4. Never silently switch to paid capacity.
5. Stop with structured FREE_CAPACITY_EXHAUSTED when no eligible free route remains.
6. Never commit API keys, cookies, OAuth tokens, Discord tokens, or secrets.
7. No sensitive/customer data on unverified providers.

## Official evidence

- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing.md — free tier documented for eligible models.
- Google billing: https://ai.google.dev/gemini-api/docs/billing.md — free billing tier documented.
- Groq rate limits: https://console.groq.com/docs/rate-limits — organization rate limits and remaining/reset information are documented.
- OpenRouter pricing: https://openrouter.ai/pricing — current Free plan documented.
- OpenRouter free models: https://openrouter.ai/collections/free-models — current free catalog documented.
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/ — Workers Free includes 10,000 Neurons/day; exhausted free allocation fails rather than silently billing.
- Hugging Face pricing: https://huggingface.co/docs/inference-providers/pricing — free-user credits currently documented.

## Corrections

### Cerebras
Cerebras is removed from the $0 core. Do not probe or route it as free capacity.

### GitHub Models
GitHub Models is **not active**. Do not route traffic to it.

### SambaNova
Do not classify SambaNova as a $0 core provider; its current developer path requires payment/credits for first requests.

### IREZE
Do not route automatically. The observed sign-in/key-provisioning flow did not produce a verified usable key. This is an evidence gap, not proof of malicious behavior.

## Account acquisition order

1. Google AI Studio — verified
2. Groq — verified
3. OpenRouter — verified
4. Cloudflare Workers AI
5. Mistral
6. NVIDIA NIM
7. Hugging Face
8. Chutes only if later proven economically useful

Collection is for leverage, not accumulation: retain items that add real free capacity, unique capability, routing/failover, strong evidence, or reusable architecture; remove stale, retired, duplicate, or low-leverage items.
