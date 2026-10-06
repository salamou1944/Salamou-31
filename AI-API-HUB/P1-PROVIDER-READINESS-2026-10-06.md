# P1 Provider Readiness — 2026-10-06

This layer records current official free-access conditions without promoting any provider to VERIFIED.

## Cloudflare Workers AI
- Workers Free: 10,000 Neurons/day at no charge.
- Usage above the free allocation requires Workers Paid.
- Some frontier models now require paid billing even within the broader Workers AI catalog.
- Routing state: DISCOVERED / DO NOT ROUTE until an account-level real completion is captured.
- Source: https://developers.cloudflare.com/workers-ai/platform/pricing/

## Mistral
- Mistral documents a Free mode where API keys can use included monthly usage within the current limits.
- Pay-as-you-go extends usage beyond included monthly usage.
- Routing state: DISCOVERED / DO NOT ROUTE until real completion and quota evidence are captured.
- Source: https://docs.mistral.ai/admin/billing-usage/usage-limits

## NVIDIA NIM
- NVIDIA states that NVIDIA Developer Program members have free access to NIM API endpoints for prototyping.
- This is suitable for the free-first candidate pool, but account entitlement and real completion still need to be verified.
- Routing state: DISCOVERED / DO NOT ROUTE until real completion is captured.
- Source: https://docs.api.nvidia.com/nim/docs/product

## Hugging Face Inference Providers
- Free users currently receive $0.10/month of inference-provider credits.
- Additional usage becomes pay-as-you-go and requires purchased credits.
- Therefore this is a limited free-capacity source, not an unlimited $0 provider.
- Routing state: DISCOVERED / DO NOT ROUTE until real completion and a hard-stop-before-paid condition are verified.
- Source: https://huggingface.co/docs/inference-providers/main/pricing

## Policy
No provider moves to VERIFIED merely from documentation. Required evidence remains:

DISCOVERED -> CONFIGURED -> PROBED -> VERIFIED -> ACTIVE

For the free-first pool:
- no silent paid fallback;
- no routing after free quota exhaustion;
- no secrets in Git;
- real completion required;
- quota/billing failure must be observable;
- SOAT evidence required before ACTIVE.
