# Username Research API — Current Commercial Blockers

## Runtime status

The historical Railway provisioning blocker is no longer the blocker for Product 001's live entry point. A zero-upfront-cost Render runtime is reachable:

- Production: https://salamou-31-api-factory.onrender.com
- Preview: https://salamou31-api-factory-preview.onrender.com
- Latest post-gateway-deployment smoke: https://github.com/salamou1944/Salamou-31/actions/runs/40151811406
- Shared storage gateway: Supabase Edge Function `api-factory-storage`, version 7.

The smoke verified durable registry and artifact storage, authenticated control-plane access, a real Sherlock username-research response, and HTTP 401 for an unauthenticated protected request. The research response returned four evidence items with `verified:false`; this is discovery evidence, not a verified identity claim.

The old Railway attempt was rejected because the free plan's resource provision limit was exceeded. No paid upgrade was made and no EASY infrastructure was repurposed. Render now supplies the reachable runtime, so the historical Railway failure is retained as provenance rather than treated as the current runtime blocker.

## Current release blockers

1. **Customer-safe authentication is not implemented.** The live research route uses the shared factory control-plane key. That key must never be given to a customer. Product 001 needs its own customer API-key issuance, rotation, and revocation path.
2. **Per-customer usage and quota state are not durable.** The factory's generated-runtime idempotency, usage, quota, and business state remain local-file based unless separately implemented. A shared admin key is not a customer plan.
3. **Billing and customer onboarding are not implemented.** There is no verified checkout, payment confirmation, or paid-customer activation path.
4. **No generated API is registered in the factory registry.** The live direct research route proves the endpoint works; it does not prove a generated API deployment.

Business evidence is now `ENTRY_POINT_VERIFIED`, technical evidence is `RUNTIME_VERIFIED`, while customer use remains unobserved, revenue remains `NOT_OBSERVED`, and payout remains `NOT_OBSERVED`.

## Release condition

Before selling API access, implement customer-specific credentials and revocation, durable per-customer usage/quota accounting, and a clear public API contract. Then test a customer key separately from the control-plane key, record one independent customer action, and record revenue only after an actual paid transaction. Do not upgrade a paid service or share internal credentials just to bypass these blockers.
