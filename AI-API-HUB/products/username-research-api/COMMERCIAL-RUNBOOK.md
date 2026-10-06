# Username Research API — Commercial Runbook

## Offer

A small API endpoint that turns a supplied username into structured public-profile discovery results for research and lead-intelligence workflows.

## Buyer outcome

Reduce manual multi-site username research and return machine-readable evidence that can be consumed by a CRM, research agent, or automation workflow.

## Delivery path

1. Customer receives an API key.
2. Customer submits a username.
3. API executes Sherlock through the controlled adapter.
4. Results and evidence are returned.
5. Usage is observable through the factory/runtime usage boundary.
6. Customer action is recorded only when independently observed.
7. Revenue is recorded only from an actual paid transaction.
8. Repeatability requires a second independent use/customer.

## Verification

Health: GET /health
Capabilities: GET /v1/factory/capabilities
Product: POST /v1/factory/research/username
Authentication: x-api-key

## Evidence discipline

Do not mark a product PROVIDER_VERIFIED from source inspection.

Do not mark CUSTOMER_ACTION_OBSERVED, REVENUE_OBSERVED, or PAYOUT_OBSERVED without independent evidence.

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

Final price is selected only after observing actual buyer demand and delivery cost.
