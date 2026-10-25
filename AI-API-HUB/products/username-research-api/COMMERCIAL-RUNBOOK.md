# Username Research API — Commercial Runbook

## Offer

A small API endpoint that turns a supplied username into structured public-profile discovery results for research and lead-intelligence workflows.

## Buyer outcome

Reduce manual multi-site username research and return machine-readable evidence that can be consumed by a CRM, research agent, or automation workflow.

## Live entry and verified customer access

- Production: `POST https://salamou-31-api-factory.onrender.com/v1/factory/research/username`
- Preview: `POST https://salamou31-api-factory-preview.onrender.com/v1/factory/research/username`
- Request fields: `username` (required), `timeoutMs` (optional integer).
- Customer authentication: `x-api-key` with a customer-specific `sal31_` key.
- Internal control-plane authentication remains private; never provide `FACTORY_API_KEY` to a customer.
- Production lifecycle smoke: https://github.com/salamou1944/Salamou-31/actions/runs/40154410859
- Preview lifecycle smoke: https://github.com/salamou1944/Salamou-31/actions/runs/40154267374

The live smoke verified customer key issuance, one real successful Sherlock research request, quota rejection at the second request with HTTP 429, durable usage accounting, key revocation, and HTTP 401 after revocation. Temporary smoke keys were revoked. This proves the technical customer access path; it does not prove independent customer use or revenue.

## Next commercial steps

1. Recruit one real pilot customer and define a narrow outcome and support boundary.
2. Agree on pilot pricing and delivery terms before activation.
3. Implement customer onboarding and payment confirmation; do not treat key issuance as proof of payment.
4. Provide the customer a customer-specific key only, never the shared internal control-plane key.
5. Monitor usage/quota and return explicit errors when Sherlock is unavailable, times out, or fails.
6. Observe and record a real independent customer action.
7. Record revenue only after an actual paid transaction.
8. Record payout only when an actual payout is confirmed.
9. Separately decide whether to register/build a generated API in the factory; the direct research route is not evidence that a generated API has been deployed.

## Evidence discipline

- Technical state: `RUNTIME_VERIFIED`.
- Customer-access path: verified in Production and Preview by the linked lifecycle runs.
- Business state: `ENTRY_POINT_VERIFIED`; independent customer use remains unobserved.
- Revenue and payout: `NOT_OBSERVED`.
- Do not mark `CUSTOMER_ACTION_OBSERVED`, `REVENUE_OBSERVED`, or `PAYOUT_OBSERVED` without independent evidence.
- Research discoveries must not be represented as verified identity; preserve `verified:false` absent an independent verification mechanism.

## Failure behavior

- Sherlock unavailable → explicit 503.
- Sherlock timeout → explicit 504.
- Other Sherlock failure → explicit 502.
- Invalid or revoked authentication → 401.
- Exceeded customer quota → 429.
- No fabricated research result is acceptable.

## Pricing path

Start with a small paid pilot rather than a broad subscription. Candidate units are a fixed pilot, usage bundle, or recurring monthly API quota. Choose final pricing after observing buyer demand and delivery cost. Do not claim a paid plan is active until customer onboarding and payment confirmation exist.
