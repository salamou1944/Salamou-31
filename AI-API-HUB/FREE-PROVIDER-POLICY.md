# Free Provider Policy

This policy is the internal decision boundary for zero-cost provider routing.

## Provenance

- Source: OmniRoute `release/v3.8.52`
- Collection artifact: `COLLECTION/VERIFIED_EXTERNAL/OMNIROUTE_PROVIDER_INTELLIGENCE_2026-10-05.md`
- This file adopts the **schema and decision rules**, not OmniRoute runtime code.
- Provider facts are snapshots and MUST be revalidated against current provider terms before production routing.

## Canonical fields

| Field | Required | Meaning |
|---|---|---|
| `provider_id` | yes | Stable internal provider identifier |
| `access_class` | yes | `keyless`, `api_key`, `oauth`, `local`, or other explicitly defined access path |
| `free_status` | yes | `recurring`, `one_time_initial`, `promotion`, `none`, or `unknown` |
| `quota_basis` | yes | Unit/basis of the allowance, e.g. tokens/day, requests/minute, neurons/day |
| `estimated_monthly_tokens` | no | Comparable recurring-token estimate when defensible |
| `hard_stop` | yes | Whether exceeding the free allowance is established to refuse further usage rather than bill/charge |
| `eligibility_gate` | yes | Signup, payment method, region, KYC, approval, or `none` |
| `tos_risk` | yes | `ok`, `review`, or `avoid` |
| `source_last_researched` | yes | Date of the source audit |
| `source_url` | yes | Provider/source documentation reference |

## Zero-cost routing rules

1. `free_status=one_time_initial` is never treated as recurring capacity.
2. `recurring` does not mean unlimited.
3. `recurring-uncapped` may only be represented as a documented free state; rate/concurrency limits still apply.
4. `hard_stop=true` is required before the router can assume that exceeding the allowance cannot create a paid charge.
5. A payment-method, KYC, regional, approval, or other eligibility gate MUST remain explicit.
6. `tos_risk=avoid` excludes the provider from automatic zero-cost routing.
7. Shared or pooled quotas MUST be deduplicated before capacity is summed.
8. Stale provider intelligence MUST NOT be used as production billing/cost truth.
9. The router must fail closed when a required field is missing or contradictory.

## Adoption boundary

The API Factory already owns provider execution through its provider/SOAT boundary. This policy only supplies **cost/free-tier eligibility metadata**. It does not replace the gateway, provider adapter, SOAT runtime, or existing API Factory authorization.

## Evidence gate

A provider may move from catalog/reference status to automatic zero-cost routing only after:

- current provider terms are revalidated;
- required fields are complete;
- the provider passes an isolated routing-policy test;
- runtime evidence confirms the selected access path;
- no paid fallback can occur silently.
