# Free LLM Gateway Alternatives — Collection Intelligence

Date: 2026-10-05
Status: VERIFIED-AS-CODE / RUNTIME UNVERIFIED
Purpose: replace the blocked IREZE path with owned, auditable gateway/router options and real provider accounts.

## Decision

Do not make IREZE a production dependency. Preserve the existing IREZE probe as an isolated candidate only.

Prioritized candidates:

1. **alienz-dev/llm-router** — preferred routing/control-plane reference.
   - 11 providers behind one OpenAI-compatible API.
   - availability-aware routing, quota tracking, circuit breakers, model discovery/probing, fallback.
   - provider accounts remain external; secrets live in environment.
   - Best fit for SOAT evidence, health/quota state, and deterministic fallback.

2. **MrFadiAi/free-llm-gateway** — preferred broad provider aggregation reference.
   - 24+ providers and 260+ free models advertised.
   - OpenAI-compatible endpoint, automatic fallback, round-robin, streaming, aliases, dashboard.
   - Project test report records successful local tests for startup, model discovery, completions, streaming, fallback, auth, analytics and key management. This is repository evidence, not our production proof.

3. **TheGP/ai-gateway** — preferred multi-account routing reference.
   - Google, Groq, Mistral, Cerebras and NVIDIA.
   - Multiple account keys per provider, account health/cooldown management, explicit fallback.
   - Never silently downgrades tiers; paid last-resort can be configured as an explicit high-tier option. For our policy, paid fallback stays disabled.

4. **OpenProviderAi/OpenProvider** — useful optional unified gateway reference.
   - Advertises 24 free-tier providers, auto-routing and credential management.
   - Supports optional/keyless providers and multiple media APIs.
   - Must be security-reviewed before hosting or storing credentials.

## Provider-account acquisition plan

Use first-party accounts/API keys where possible:
- Google AI Studio
- Groq
- Cerebras
- Mistral
- NVIDIA NIM
- Hugging Face
- Cloudflare Workers AI
- OpenRouter

No credentials are committed to this repository.

## Operating policy

- Free-first.
- No silent paid fallback.
- No customer-sensitive data until provider privacy/security is independently verified.
- Every provider must pass a real probe before being marked runtime-ready.
- Every successful invocation should emit SOAT evidence: provider, model, timestamp, status, latency, quota/rate-limit signal, fallback path, and evidence reference; never include API keys or sensitive prompt content.
- Provider health is dynamic; repository README claims are not production proof.
- Account count is configuration, not evidence. Only real key validation and successful completion establish runtime readiness.

## Acceptance gates

A provider/account moves to READY only after:
1. key exists in secret storage;
2. /models or equivalent discovery succeeds;
3. real completion succeeds;
4. response is structurally valid;
5. failure/rate-limit path is tested;
6. SOAT evidence is recorded;
7. no paid fallback occurred.

## Sources

- https://github.com/alienz-dev/llm-router
- https://github.com/MrFadiAi/free-llm-gateway
- https://github.com/TheGP/ai-gateway
- https://github.com/OpenProviderAi/OpenProvider
