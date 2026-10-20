# P1 Provider Runtime Status — 2026-10-06

## Purpose

Record the real runtime state of the P1 provider probes without treating a skipped credential gate as provider readiness.

## Verified workflow runs

| Provider | Workflow run | Result | Real probe step | State |
|---|---:|---|---|---|
| NVIDIA NIM | 37413515360 | SUCCESS | skipped | BLOCKED_UNCONFIGURED |
| Cloudflare Workers AI | 37413517594 | SUCCESS | skipped | BLOCKED_UNCONFIGURED |
| Mistral | 37413520236 | SUCCESS | skipped | BLOCKED_UNCONFIGURED |
| Hugging Face Inference | 37413522890 | SUCCESS | skipped | BLOCKED_UNCONFIGURED |

## Evidence interpretation

The four workflows now have an explicit credential/configuration gate. A workflow may finish successfully when the provider secret is absent, but this record does **not** promote the provider.

Promotion requires all of the following to be observed in a real workflow run:

1. Provider credentials/configuration present.
2. Provider endpoint reached.
3. Completion HTTP status is successful.
4. Non-empty completion received.
5. Exact sentinel response observed: `FREE_PROVIDER_REAL_OK`.
6. `provider-evidence.mjs` validates the evidence as `REAL_COMPLETION`.
7. `secret_committed=false`.

## Current free-runtime baseline

SOAT + local Ollama remains the verified zero-cost runtime path for API Factory. The four P1 providers remain probe candidates, not production-ready providers.

## Operating rule

Never convert configuration-gate SUCCESS into REAL_COMPLETION or PRODUCTION-VERIFIED. Missing credentials remain an explicit external blocker.

## Next promotion condition

When valid provider credentials become available, run the corresponding `workflow_dispatch` probe and promote only from the resulting evidence artifact after the real-completion gate passes.


## Repeat gate verification — 2026-10-20

The provider-specific billing-tier guard was added for NVIDIA NIM, Cloudflare Workers AI, Hugging Face Inference, and Mistral. Each probe requires its provider credential **and** an explicit repository variable whose value is exactly `free`; otherwise the real probe is skipped before any provider network request.

| Provider | Latest workflow run | Result | Gate evidence |
|---|---:|---|---|
| NVIDIA NIM | [39483019938](https://github.com/salamou1944/Salamou-31/actions/runs/39483019938) | SUCCESS | credential and billing-tier variables empty; NOT VERIFIED; no live request |
| Cloudflare Workers AI | [39483019957](https://github.com/salamou1944/Salamou-31/actions/runs/39483019957) | SUCCESS | credentials and billing-tier variable empty; NOT VERIFIED; no live request |
| Mistral | [39483019940](https://github.com/salamou1944/Salamou-31/actions/runs/39483019940) | SUCCESS | credential and billing-tier variable empty; NOT VERIFIED; no live request |
| Hugging Face Inference | [39483019959](https://github.com/salamou1944/Salamou-31/actions/runs/39483019959) | SUCCESS | credential and billing-tier variable empty; NOT VERIFIED; no live request |

The latest API Factory Test on the documentation follow-up commit also passed: [run 39489047000](https://github.com/salamou1944/Salamou-31/actions/runs/39489047000). These results prove the safety gates behave as intended; they are **not** evidence that any of the four hosted providers is configured or available.

Required repository variables:
- `NVIDIA_NIM_BILLING_TIER=free`
- `CLOUDFLARE_WORKERS_AI_BILLING_TIER=free`
- `MISTRAL_BILLING_TIER=free`
- `HUGGINGFACE_INFERENCE_BILLING_TIER=free`

Do not set a tier to `free` unless the actual account/model access is confirmed free under its current terms. No provider secrets were added by this work.
