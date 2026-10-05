# ireze Provider Intelligence — 2026-10-05

## Classification

- Status: **UNVERIFIED / HIGH-LEVERAGE CANDIDATE**
- Role: optional OpenAI-compatible provider / fallback candidate
- Automatic zero-cost routing: **NO**
- Production primary: **NO**
- Customer-sensitive data: **NO**
- Source: https://ireze.site/?ref=REF_6679e275
- Base URL advertised by the site: https://directrouter.pages.dev/v1

## Observed capabilities

The public site currently advertises:

- 27 model entries behind one edge.
- OpenAI-compatible `/v1/chat/completions`.
- OpenAI Responses API `/v1/responses`.
- Anthropic Messages API `/v1/messages`.
- SSE streaming.
- Tool calling.
- OpenAI Python SDK compatibility.
- Claude Code, Codex, Cursor, Aider, Cline, RooCode, OpenCode, Continue and Qwen Code setup guidance.
- Dynamic routing with primary + Tier 1 + Tier 2 failover.
- Metering and prepaid credits.
- Sponsored tasks advertised as +$10 credits per completion and referrals advertised as +$10 after the referred user completes their first sponsored task.

## Important risk observations

The public page also exposes administrative/control-plane descriptions including user/IP management, request logs/prompt inspection, voucher minting, credit controls and routing controls. These observations are **not evidence of an exploitable vulnerability**, but they are sufficient reason to prohibit sensitive production data until independent security/privacy verification exists.

The site also displays model identifiers that require independent verification. A catalog name is not treated as proof that the underlying upstream model is official or available.

## Adoption rule

ireze must enter the Salamou-31 provider catalog as **reference/unverified** only.

It may become an executable fallback only after:

1. A real API key is supplied through a secret store.
2. `/v1/models` is reachable and returns a usable model.
3. A real `/v1/chat/completions` request succeeds.
4. The response is captured as runtime evidence.
5. Rate-limit/error behavior is tested.
6. The advertised free-credit path is independently verified.
7. Privacy/data-retention and terms are reviewed.
8. No paid fallback can occur silently.

## Intended leverage

If verification passes, the same existing `openai-compatible` provider adapter can consume ireze without introducing a new provider protocol. That makes ireze useful as:

- free/low-cost experimental capacity;
- provider fallback during exhausted paid-provider credits;
- compatibility testing target;
- benchmark target for SOAT/Execution Evidence;
- an input to the AI/API Hub provider registry.

No ireze credential is committed by this artifact.
