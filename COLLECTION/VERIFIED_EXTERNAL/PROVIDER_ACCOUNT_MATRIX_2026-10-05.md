# Provider Account Matrix — 2026-10-05

## Decision

IREZE is **not** a production dependency. Keep it as **UNVERIFIED / DO NOT ROUTE** until authentication and key provisioning are independently verified.

Preferred strategy: first-party free-tier accounts + AI-API-HUB routing, with explicit quota/health evidence and a hard stop on exhausted free capacity. No silent paid fallback.

## Priority targets

| Priority | Provider | Role | Free status | Compatibility | State |
|---|---|---|---|---|---|
| P0 | Google AI Studio / Gemini API | Primary free model capacity | Official free tier; free input/output for eligible models | Native Gemini; adapter required | DISCOVERED |
| P0 | Groq | Fast inference | Free-plan rate limits documented | OpenAI-compatible | DISCOVERED |
| P0 | Cerebras | High-speed inference | Candidate; verify current free quota | Verify | DISCOVERED |
| P0 | OpenRouter | Multi-provider aggregation | Official Free plan and free models | OpenAI-compatible | DISCOVERED |
| P1 | Cloudflare Workers AI | Free compute/provider capacity | 10,000 Neurons/day on Workers Free | Adapter required | DISCOVERED |
| P1 | Mistral | First-party provider | Verify current direct free terms | OpenAI-compatible | DISCOVERED |
| P1 | NVIDIA NIM | Model/provider capacity | Verify current direct free terms | Verify | DISCOVERED |
| P1 | Hugging Face Inference Providers | Aggregation/provider access | $0.10 monthly free-user credits currently documented | Provider-dependent | DISCOVERED |
| P2 | Chutes | Optional inference | Not free-core; current catalog shows paid token prices | OpenAI/Anthropic-compatible | DISCOVERED |
| HOLD | IREZE | Experimental gateway | Key provisioning unverified | Advertised OpenAI-compatible | UNVERIFIED / DO NOT ROUTE |

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

- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing.md — current page documents a free tier and free input/output for eligible models; it also says free-tier content may be used to improve products.
- Google billing: https://ai.google.dev/gemini-api/docs/billing.md — free billing tier documented.
- Groq rate limits: https://console.groq.com/docs/rate-limits — organization rate limits and remaining/reset information are documented.
- OpenRouter pricing: https://openrouter.ai/pricing — current Free plan documented.
- OpenRouter free models: https://openrouter.ai/collections/free-models — current free catalog documented.
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/ — Workers Free includes 10,000 Neurons/day; exhausted free allocation fails rather than silently billing.
- Hugging Face pricing: https://huggingface.co/docs/inference-providers/pricing — $0.10 monthly credits for free users, subject to change.

## Corrections

### GitHub Models
GitHub Models is **not active**. Official GitHub documentation states it was fully retired July 30, 2026, including playground, model catalog, inference API, and BYOK. Do not route traffic to it.

### SambaNova
Do not classify SambaNova as a $0 core provider; its current developer path requires payment/credits for first requests.

### IREZE
Do not route automatically. The gateway is an interesting candidate, but the observed sign-in/key-provisioning flow did not produce a verified usable key. This is an evidence gap, not proof of malicious behavior.

## Account acquisition order

1. Google AI Studio
2. Groq
3. Cerebras
4. OpenRouter
5. Cloudflare Workers AI
6. Mistral
7. NVIDIA NIM
8. Hugging Face
9. Chutes only if later proven economically useful

Collection is for leverage, not accumulation: retain items that add real free capacity, unique capability, routing/failover, strong evidence, or reusable architecture; remove stale, retired, duplicate, or low-leverage items.
