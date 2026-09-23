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
