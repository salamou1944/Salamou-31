# Username Research API — Commercial Runbook

## Offer

A small API endpoint that turns a supplied username into structured public-profile discovery results for research and lead-intelligence workflows.

## Buyer outcome

Reduce manual multi-site username research and return machine-readable evidence that can be consumed by a CRM, research agent, or automation workflow.

## Live entry and verification

- Production: `POST https://salamou-31-api-factory.onrender.com/v1/factory/research/username`
- Preview: `POST https://salamou31-api-factory-preview.onrender.com/v1/factory/research/username`
- Request fields: `username` (required), `timeoutMs` (optional integer).
- Current live authentication: `x-api-key` using the shared factory control-plane key.
- Latest verified smoke: https://github.com/salamou1944/Salamou-31/actions/runs/40151811406

**Security boundary:** the current key is an internal control-plane credential, not a customer key. Never send it to a customer or expose it in client code. The endpoint is runtime-verified, but it is not yet ready for customer API access.

## Customer delivery path — not yet complete

1. Implement customer-specific API-key issuance, rotation, and revocation.
2. Submit a username using a customer key, isolated from the factory control-plane key.
3. Execute Sherlock through the controlled adapter and return public-source evidence.
4. Record usage, quota, and idempotency in durable per-customer storage.
5. Provide clear errors when Sherlock is unavailable, times out, or fails.
6. Observe a real independent customer action.
7. Record revenue only after an actual paid transaction.
8. Record payout only when an actual payout is confirmed.

## Evidence discipline

- Technical state: `RUNTIME_VERIFIED` based on the live Render smoke.
- Business state: `ENTRY_POINT_VERIFIED`; independent customer use is not yet observed.
- Do not mark `PROVIDER_VERIFIED` from source inspection alone.
- Do not mark `CUSTOMER_ACTION_OBSERVED`, `REVENUE_OBSERVED`, or `PAYOUT_OBSERVED` without independent evidence.
- The current research response may return discoveries; it does not prove identity and must preserve `verified:false` unless an independent verification mechanism exists.

## Failure behavior

- Sherlock unavailable → explicit 503.
- Sherlock timeout → explicit 504.
- Other Sherlock failure → explicit 502.
- Invalid authentication → 401.
- No fabricated research result is acceptable.

## Pricing path

Start with a small paid pilot rather than a broad subscription.

Candidate units:
- fixed pilot;
- usage bundle;
- recurring monthly API quota.

Final price is selected only after observing actual buyer demand and delivery cost. Do not activate paid plans before customer-specific usage accounting and payment confirmation are implemented.
