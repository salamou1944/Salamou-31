# API Factory

This is the **literal API factory** for Salamou-31.

It is not an API catalog and it is not a single AI endpoint. A manifest is the manufacturing input; the factory validates it, compiles a runnable API project, emits an OpenAPI contract, registers the produced API, and exposes the factory over HTTP.

## Manufacturing lifecycle

**Define → Validate → Compile → Contract → Register → Run → Observe**

## HTTP control plane

- `GET /health`
- `GET /ready` (authenticated durable-storage readiness)
- `GET /v1/factory/capabilities`
- `GET /v1/factory/apis`
- `GET /v1/factory/apis/:name`
- `POST /v1/factory/validate`
- `POST /v1/factory/build`
- `POST /v1/factory/register`
- `GET /v1/factory/export/:name`
- `GET /v1/factory/inspect/:name`
- `POST /v1/factory/deploy/plan` (preflight only; not a deployment executor)

Set `FACTORY_API_KEY` in production to protect the control plane. Protected endpoints fail closed with HTTP 503 (`AUTH_CONFIGURATION_REQUIRED`) when the key is missing and HTTP 401 (`UNAUTHORIZED`) when the supplied key does not match. `/health` and the non-mutating capabilities description remain public.

## Durable storage

The currently verified zero-upfront-cost Render deployments (Production and Preview) use a dedicated Salamou-31 Supabase project through the `api-factory-storage` Edge Function gateway. The latest strict external smoke run on 2026-10-25, [40151811406](https://github.com/salamou1944/Salamou-31/actions/runs/40151811406), verified authenticated registry and artifact write/read checks on both targets after the gateway was updated; see [PERSISTENCE.md](./PERSISTENCE.md) for deployment commits, evidence, and limitations. Configure:

- `FACTORY_STORAGE_GATEWAY_URL`: the deployed Edge Function URL.
- `FACTORY_REGISTRY_URL`: the dedicated Supabase project URL.
- `FACTORY_ARTIFACT_BUCKET`: optional; defaults to `api-factory-artifacts`.
- `FACTORY_API_KEY`: the same gateway key configured as a sensitive Render environment variable; never commit or share it.

The gateway keeps the Supabase service-role credential inside Supabase's Edge Function environment. Do not copy it into Render, GitHub, browser code, or chat. The gateway source contains only the SHA-256 digest of its expected internal key. The readiness check performs registry read/write/read-back and artifact upload/download probes. `/ready` returns HTTP 200 only when authentication and both persistence checks pass; otherwise it returns HTTP 503. The currently verified Render services use the Free plan and may sleep while idle, so this is not an uptime guarantee.

Direct Supabase REST/Storage mode is also supported with `FACTORY_REGISTRY_SERVICE_ROLE_KEY`, but that secret must remain server-side. In direct REST registry mode, readiness intentionally fails closed with `REGISTRY_STORAGE_WRITE_READ_UNVERIFIED`: a GET-only check does not prove write/read-back, and writing the live singleton as a health probe could overwrite a concurrent update. Use the Edge Function gateway for readiness-verified deployments until a safe isolated direct-mode probe exists. If remote storage is partially configured or remote requests fail, the factory fails closed rather than silently treating local or Vercel `/tmp` storage as durable. See [PERSISTENCE.md](./PERSISTENCE.md) and [DEPLOYMENT.md](./DEPLOYMENT.md) for the current verified configuration and limitations.

The generated API is independent of the factory after compilation. Provider credentials are never invented or embedded.

## Current manufacturing capabilities

The factory now compiles contracts into isolated Fastify services with:

- request/response contract metadata and OpenAPI 3.1
- built-in or provider-backed handlers
- provider health and fail-closed readiness
- API-key authentication
- request validation
- idempotency ledger
- real-request usage ledger
- quota enforcement
- structured runtime errors
- health/readiness/metrics endpoints
- lifecycle/evidence-aware registry metadata
- deployment credential gating for Railway/Vercel

A provider-backed API without real credentials remains **COMPILED** and can be **RUNTIME_VERIFIED** only for its fail-closed behavior; it is not **PROVIDER_VERIFIED** until a real provider response is observed.

## Deployment execution boundary

The `POST /v1/factory/deploy/plan` route is a preflight planner only. Neither Railway nor Vercel has a verified deployment execution adapter in this version. The factory must not report a deployment as successful until it can create or update a provider deployment, wait for completion, resolve a public URL, and pass an authenticated or appropriately public smoke test against that URL. Having provider credentials alone is not proof of execution.

## Zero-cost model runtime options

See [FREE-ZERO-COST-RUNTIME-OPTIONS-2026-10-21.md](./FREE-ZERO-COST-RUNTIME-OPTIONS-2026-10-21.md) for the ranked free/local options, live-probe evidence, provider eligibility gates, and the GitHub Models retirement status. No provider is considered verified when its live probe is skipped.

## Research evidence boundary

The factory includes a provider-neutral evidence ledger extracted from the multi-source research pattern used by Panniantong/last30days-skill. It normalizes source URLs, removes duplicates, records retrieval time, classifies evidence as `fresh`, `stale`, `undated`, or `future`, and can fail closed when a minimum amount of fresh evidence is required.

This is a contract layer only: it does not fetch external content or invent citations. A caller supplies observed research results, and the ledger preserves the evidence boundary for COLLECTION, revenue intelligence, and other research workflows.

## First commercial product

The first productized entry is the Username Research API at `POST /v1/factory/research/username`. Product contract, commercial runbook, and evidence ledger are maintained under `AI-API-HUB/products/username-research-api/`.

The repository-level operating pipeline is defined in `SALAMOU-31-OPERATING-PLAN.md`.
