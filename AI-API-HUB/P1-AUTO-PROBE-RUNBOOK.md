# P1 Automatic Probe Runbook — 2026-10-06

## Execution contract

P1 providers remain non-routable until real provider evidence is captured.

Mistral is the first P1 target because the existing provider probe already supports its OpenAI-compatible API surface.

Required sequence:

1. CONFIGURED — provider secret exists outside Git.
2. PROBED — /models succeeds and a model is selected.
3. REAL_COMPLETION — chat completion returns exactly FREE_PROVIDER_REAL_OK.
4. QUOTA_EVIDENCE — rate-limit or provider billing/quota response is observable.
5. SOAT — evidence is consumed by the operating verification layer.
6. VERIFIED/ACTIVE — only after all gates pass.

## Safety gates

- No secrets committed.
- No silent paid fallback.
- Missing secret is configuration state, not proof of provider failure.
- Billing/quota exhaustion is a deterministic non-routing outcome.
- Documentation alone never promotes a provider.

## Current implementation

AI-API-HUB/api-factory/free-provider-probe.mjs already supports mistral through MISTRAL_API_KEY and https://api.mistral.ai/v1.

The next automatic execution requires the repository's Mistral secret to be available to a trusted push-triggered workflow. GitHub documents that secrets can be exposed to workflow steps through job environment variables, while secret values cannot be tested directly in if expressions; a job-level environment check is the supported pattern.
