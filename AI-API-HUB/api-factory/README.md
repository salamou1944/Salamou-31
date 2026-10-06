# API Factory

This is the **literal API factory** for Salamou-31.

It is not an API catalog and it is not a single AI endpoint. A manifest is the manufacturing input; the factory validates it, compiles a runnable API project, emits an OpenAPI contract, registers the produced API, and exposes the factory over HTTP.

## Manufacturing lifecycle

**Define → Validate → Compile → Contract → Register → Run → Observe**

## HTTP control plane

- `GET /health`
- `GET /v1/factory/capabilities`
- `GET /v1/factory/apis`
- `GET /v1/factory/apis/:name`
- `POST /v1/factory/validate`
- `POST /v1/factory/build`

Set `FACTORY_API_KEY` in production to protect the control plane.

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

## Research evidence boundary

The factory includes a provider-neutral evidence ledger extracted from the multi-source research pattern used by Panniantong/last30days-skill. It normalizes source URLs, removes duplicates, records retrieval time, classifies evidence as `fresh`, `stale`, `undated`, or `future`, and can fail closed when a minimum amount of fresh evidence is required.

This is a contract layer only: it does not fetch external content or invent citations. A caller supplies observed research results, and the ledger preserves the evidence boundary for COLLECTION, revenue intelligence, and other research workflows.


## First commercial product

The first productized entry is the Username Research API at `POST /v1/factory/research/username`. Product contract, commercial runbook, and evidence ledger are maintained under `AI-API-HUB/products/username-research-api/`.

The repository-level operating pipeline is defined in `SALAMOU-31-OPERATING-PLAN.md`.
