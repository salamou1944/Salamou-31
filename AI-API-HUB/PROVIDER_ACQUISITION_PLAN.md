# Provider Acquisition Plan

## Objective
Turn collected provider accounts into real measured capacity for AI-API-HUB without introducing subscription spend.

## Execution order
P0: Google AI Studio, Groq, OpenRouter.
P1: Cloudflare Workers AI, Mistral, NVIDIA NIM, Hugging Face.
P2: Chutes.

## Gate
DISCOVERED -> CONFIGURED -> PROBED -> VERIFIED -> ACTIVE.
No provider becomes ACTIVE merely because an account exists.

## Required evidence
- Runtime secret exists outside Git.
- Discovery/model listing succeeds where supported.
- Real completion succeeds.
- Response structure is validated.
- Rate-limit/quota exhaustion is captured.
- Failure mode is deterministic.
- SOAT verification record exists.
- Routing cannot cross into paid capacity without explicit authorization.

## Secret handling
Only environment-variable names are stored in Git. Actual credentials remain in runtime secret storage.

## Next engineering action
Implement one provider-neutral probe contract and run the same SOAT evidence workflow against each configured provider. The first VERIFIED providers become the free-first routing pool.
