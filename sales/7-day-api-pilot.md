# 7-Day Free AI Product Content API Pilot

## Offer

We provide a **7-day free pilot** of an API that generates structured product content for ecommerce workflows.

The pilot is designed for ecommerce agencies, Shopify/Magento service providers, marketplace operators, catalog teams, and SaaS products that need product-content generation through an API rather than another dashboard.

## What the pilot includes

- API access for one controlled pilot integration
- Product title/description/content generation from structured product inputs
- Authentication and request validation
- Rate limiting and daily usage controls
- A short integration test with the customer's real workflow
- Fast fixes for defects discovered during the pilot
- No payment required during the first 7 days

## Pilot success criteria

Before a pilot is considered successful, we verify:

1. Valid requests return usable product content.
2. Missing/invalid fields are rejected without consuming billable quota.
3. Authentication and rate limiting behave correctly.
4. Daily quota cannot be bypassed by concurrent requests.
5. The quota store fails closed if it becomes unavailable or corrupt.
6. Provider failures are surfaced without leaking credentials.
7. The customer's integration can call the API reliably from its normal workflow.

## After the pilot

If the API saves time or increases output for the customer, we agree on a paid plan based on request volume and integration requirements. If it does not provide value, the pilot ends with no payment required.

## Positioning

This is a **backend/API component**, not a replacement for the customer's existing ecommerce platform, agency workflow, or storefront. The goal is to add a useful AI capability with minimal integration effort.

## First-customer protocol

For the first customer, treat the pilot as a live acceptance test:

- reproduce the customer's exact request pattern;
- record PASS/FAIL for each acceptance criterion;
- fix defects immediately when safe;
- rerun the failed test after each fix;
- keep the customer's integration isolated from unrelated changes;
- do not call the service production-ready until the acceptance suite passes.
