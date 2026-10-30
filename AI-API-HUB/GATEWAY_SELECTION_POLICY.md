# AI-API Hub — Gateway Selection Policy

## Objective

Replace dependency on an unverified third-party gateway with an auditable provider pool and owned routing policy.

## Preferred architecture

AI-API Hub remains the control plane. External gateways are optional adapters, not trusted authorities.

Provider order:
1. Google AI Studio
2. Groq
3. Cerebras
4. Mistral
5. NVIDIA NIM
6. Hugging Face
7. Cloudflare Workers AI
8. OpenRouter

Routing requirements:
- health-aware selection;
- quota/rate-limit awareness;
- deterministic fallback;
- per-provider and per-account isolation;
- SOAT evidence on every real invocation;
- no secret material in logs/evidence;
- no automatic paid fallback.

## Gateway references

- alienz-dev/llm-router: primary routing/control-plane reference.
- MrFadiAi/free-llm-gateway: broad provider/fallback reference.
- TheGP/ai-gateway: multi-account routing reference.
- OpenProviderAi/OpenProvider: optional unified gateway reference.

These projects are reference implementations. Their README/test claims are not production evidence for Salamou-31.

## Readiness states

DISCOVERED -> CONFIGURED -> PROBED -> VERIFIED -> ACTIVE

A provider cannot become ACTIVE from repository metadata alone.

## IREZE

IREZE remains isolated as UNVERIFIED and must not be selected by default routing.

## Cost guard

If all free candidates are exhausted, return an explicit no-capacity result. Do not spend money implicitly.
