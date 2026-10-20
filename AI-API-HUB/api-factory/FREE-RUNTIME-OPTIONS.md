# Zero-upfront-cost AI runtime options (research, not provider verification)

Updated: 2026-10-21

## Decision

Use an existing, explicitly authorized account quota or local inference first. Keep the API Factory provider-neutral. A gateway is not itself free inference: it routes to an account/provider that must independently permit the intended use.

## Candidate A — OmniRoute (open-source local gateway)

- Repository: https://github.com/diegosouzapw/OmniRoute
- License shown by repository: MIT.
- Purpose: local OpenAI-compatible gateway/router with provider-specific connections, quota-aware routing, and fallback.
- Run it on the user's own machine or an already-authorized host; do not assume a free cloud host can keep it running 24/7. A hosted gateway also creates account-token and endpoint-security risks.
- It can connect supported provider accounts via their documented OAuth flows, including Codex CLI-related flows. This does **not** grant a ChatGPT subscription or make paid models free.
- Prefer the documented Codex App-Server approach, where the official Codex CLI owns its OAuth session, over replaying ChatGPT/Codex tokens directly to a proxy. OmniRoute's own provider guide distinguishes these methods and notes a usage/authorization caveat for direct token replay: https://github.com/diegosouzapw/OmniRoute/blob/release/v3.8.52/docs/guides/CODEX-APP-SERVER-PROVIDER.md
- The official Codex desktop app cannot be pointed at an arbitrary gateway; the documented integration path is Codex CLI or another compatible client: https://github.com/diegosouzapw/OmniRoute/discussions/2510
- No OmniRoute installation, account OAuth, or token handling has been performed in this repository or on the user's computer.

## Candidate B — Existing account allowances

Check only accounts the operator already owns and their current terms:

1. GitHub Copilot: the official Copilot Free plan is limited and model selection may be restricted; GitHub login alone does not imply Copilot entitlement. Prefer the official client unless the account's current terms permit the intended third-party routing. Current plan details: https://docs.github.com/en/copilot/get-started/plans
2. Gemini CLI: use its OAuth allowance through the official Gemini CLI itself, subject to current account limits. Google announced anti-abuse measures specifically addressing Gemini CLI OAuth used by third-party software and limited free-tier access to Flash models; do **not** route Gemini CLI OAuth through OmniRoute or another third-party proxy unless Google's current terms explicitly permit that exact use. Source: https://github.com/google-gemini/gemini-cli/discussions/22970
3. OpenAI Codex: use the quota included with an eligible ChatGPT plan via the official Codex CLI/app-server route. This is an existing subscription allowance, not a free API key or a way to bypass OpenAI billing.

Do not rotate identities, share tokens, or proxy session cookies to evade provider limits or terms. Treat provider quotas as separate, finite entitlements.

## Candidate C — Free API-key tiers

Discovery list: https://github.com/mnfst/awesome-free-llm-apis

This is a useful shortlist of OpenAI-compatible endpoints, not proof that every entry is still free, available in Algeria, or suitable for production. Before enabling any provider, verify its current official pricing, regional availability, model terms, rate limits, data handling, and key requirements. The API Factory's provider gates must remain closed until a provider's actual free-tier eligibility is confirmed and a real completion is observed.

Current API Factory probes for NVIDIA NIM, Cloudflare Workers AI, Mistral, and Hugging Face are deliberately gated on both credentials and an explicit `*_BILLING_TIER=free` setting. The successful CI runs prove the gates work; they do not prove those providers are configured or reachable.

## Candidate D — Local Ollama

The repository's pinned CI smoke has already observed a real local Ollama completion (`4`) through SOAT/API Factory. That is a deterministic integration test, not proof that Ollama is installed on the user's computer or running as a public production service. Local inference has no provider-token bill but consumes local CPU/GPU/RAM and must be tested on the actual host.

## What is verified today

- API Factory test suite passes on the current main commit; see https://github.com/salamou1944/Salamou-31/actions/runs/39498772225.
- SOAT local-Ollama integration smoke passes in CI; see https://github.com/salamou1944/Salamou-31/actions/runs/39498772198. Evidence remains CI-local, not production proof.
- Render preview has previously passed durable registry/artifact storage smoke; Free services may sleep.
- API Factory deployment execution is still not implemented. Its deployment planner must not report a deploy as successful.
- The main Render service is still fail-closed with `DURABLE_STORAGE_REQUIRED`; do not replace its existing local data until a safe migration is verified.
- No new paid resource or provider secret was created by this research.

## Next safe path to a usable endpoint

1. Choose one already-authorized account/provider (or local Ollama) and verify its allowance in the provider's official UI.
2. Run OmniRoute locally if a gateway is needed; keep its management dashboard bound to localhost and never expose OAuth tokens or its admin interface publicly.
3. Add a narrow provider contract test to API Factory using the chosen documented integration, with paid fallback explicitly disabled.
4. Run a real, authenticated completion and persist redacted evidence. Do not persist access tokens, cookies, API keys, or raw authorization headers.
5. Only then consider connecting the selected provider to the free Render preview; separately verify the generated API's own quota, usage, idempotency, and business-data persistence.

## Safety boundary

This document records research and test evidence only. It does not claim that a ChatGPT/Copilot/Gemini account is connected, that any hosted provider is enabled, that OmniRoute is installed, or that a customer-facing production API is ready.
