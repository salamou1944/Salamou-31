# Salamou-31 Operating Plan

## Mission

Turn existing Collection / AI Operating Memory assets into verified commercial APIs and services, then convert verified usage into repeatable revenue.

## Closed-loop pipeline

COLLECTION / AI Operating Memory
→ Asset Inventory
→ Extract / Merge
→ API Factory
→ Reliability
→ Real Entry
→ SOAT Evidence
→ First Customer
→ Revenue
→ Repeatability
→ Productization

## Execution rules

1. Preserve valuable source material and provenance; do not discard useful small assets.
2. Semantic deduplication happens at the canonical Skill layer; historical source evidence remains preserved.
3. Existing verified Skills/assets are preferred before new implementation.
4. API Factory output is not commercial-ready merely because it compiles.
5. Evidence states may only advance from observed evidence; no inferred promotion.
6. Provider credentials are runtime secrets only.
7. Reliability must fail closed for unsafe retries and unavailable providers.
8. External customer, payment, and production claims require independent evidence.
9. Collection continues in parallel but cannot block the revenue path.
10. After the first verified revenue event, optimize for repeatability before broad product expansion.

## Evidence ladders

Business:
DISCOVERED → ENTRY_POINT_VERIFIED → USAGE_OBSERVED → CUSTOMER_ACTION_OBSERVED → REVENUE_OBSERVED → PAYOUT_OBSERVED

Technical:
VALIDATED → COMPILED → RUNTIME_VERIFIED → PROVIDER_VERIFIED → BUSINESS_VERIFIED

Neither ladder may advance without its corresponding observation.

## Current implementation focus

### Phase A — Factory foundation
Manifest validation, isolated Fastify generation, OpenAPI output, registry, authentication, request validation, idempotency, quota/usage ledgers, provider adapters, retry/backoff/Retry-After, circuit breaker, and evidence contracts.

### Phase B — First commercial entry

Product 001: Username Research API / lead-intelligence primitive.

Existing implementation:
POST /v1/factory/research/username

Runtime dependency:
Sherlock executable.

Commercial boundary:
API-key protected factory endpoint; no credentials embedded in source.

### Phase C — SOAT

Deterministic factory suite, pinned SOAT runtime, authenticated local provider, real completion, evidence consumption, and business-outcome gate.

### Phase D — Customer/revenue

Expose a real external entry point, observe first independent external use, observe customer action, record actual revenue, record payout when available, and never manufacture or simulate evidence.

### Phase E — Repeatability/productization

Second independent customer/use, package pricing, usage/quota model, API documentation, monitoring, recurring billing path, then broaden the commercial API catalog.

## Definition of done

The whole plan is complete only when at least one API has a real usable entry point, technical and SOAT evidence are recorded, an independent external customer action is observed, revenue is observed, the revenue path is repeatable, and the winning capability is packaged as a product.

Until those observations exist, the remaining stages stay explicitly open.
