# Username Research API — Internal First-Customer Pilot

**Pilot owner:** Salamou-31  
**Product:** Username Research API  
**Pilot date:** 2026-11-03  
**State:** PREPARED — EXECUTION BLOCKED ON PROTECTED OPERATOR ACCESS  
**Commercial state:** INTERNAL USE ONLY; no customer sale or revenue is implied.

## Decision

Salamou-31 is the first internal user of its own Username Research API. This is an internal product-validation exercise, not a paid customer transaction. The intended business outcome is to use public business-profile discovery to improve our own prospect research and sales qualification.

## Safety and scope

- Research public business, brand, media, and institutional accounts only.
- No personal/private accounts, credential collection, private-data inference, or attempts to deanonymize individuals.
- A username match is discovery evidence only. Preserve `verified:false`; it is not proof of identity, ownership, or affiliation.
- Every result must be reviewed by a human before it influences outreach.
- Do not use results for employment, credit, housing, eligibility, or other high-impact decisions.
- Do not create a customer key for this internal exercise. The operator's factory key is accepted by the research route and bypasses customer quota accounting; it must remain in protected runtime/CI secret storage and must never be printed, committed, or pasted into chat.
- Do not modify production configuration, issue a customer key, spend paid credits, or activate paid infrastructure for this pilot.
- The Render Free service may sleep while idle. A timeout/provider error must be recorded as a failed attempt, not converted into a fabricated result.

## 20-account candidate cohort

The following handles are candidate business/brand accounts surfaced by public directories. The directory listing is discovery input, not proof of official ownership. Before submitting each handle, an operator must confirm it is a public business/brand account and record an official website or a public cross-link. If ownership cannot be confirmed, skip it and replace it with another business account.

| # | Organization / brand | Candidate username | Category | Public discovery source | Preflight |
|---:|---|---|---|---|---|
| 1 | Mobilis | `mobilis.dz` | Telecom | https://infldb.com/top-brands/Algeria | Confirm official link |
| 2 | Djezzy | `djezzy.dz` | Telecom | https://infldb.com/top-brands/Algeria | Confirm official link |
| 3 | Ooredoo Algérie | `ooredooalgerie` | Telecom | https://starngage.com/plus/hu/brand/ranking/instagram/algeria | Confirm official link |
| 4 | Yassir | `yassir.algerie` | Mobility / delivery | https://infldb.com/top-brands/Algeria | Confirm official link |
| 5 | Air Algérie | `airalgerieah` | Airline | https://infldb.com/top-brands/Algeria | Confirm official link |
| 6 | Jumia Algérie | `jumiadzair` | Ecommerce | https://starngage.com/app/es/brand/ranking/algeria/product-service | Confirm official link |
| 7 | Condor Mobile | `condor_mobile` | Electronics | https://creatordb.app/creatorstats/condor_mobile/ | Confirm official link |
| 8 | Condor Electroménager | `condor_electromenager` | Appliances | https://dspace.univ-bba.dz/server/api/core/bitstreams/ea7d5652-6aa9-4739-8fbf-7019ce31aeca/content | Confirm official link |
| 9 | OPPO Algérie | `oppoalgerie` | Electronics | https://starngage.com/app/es/brand/ranking/algeria/product-service | Confirm official link |
| 10 | Samsung Algérie | `samsung_algerie` | Electronics | https://starngage.com/app/es/brand/ranking/algeria/product-service | Confirm official link |
| 11 | Laboratoires VENUS | `laboratoires_venus_sapeco` | Cosmetics | https://infldb.com/top-brands/Algeria | Confirm official link |
| 12 | Cebon / El Mordjene | `cebon.dz` | Food manufacturing | https://infldb.com/top-brands/Algeria | Confirm official link |
| 13 | DJEB'S | `djebs.official` | Apparel | https://infldb.com/top-brands/Algeria | Confirm official link |
| 14 | Swalis Officiel | `swalis_officiel` | Cosmetics | https://infldb.com/top-brands/Algeria | Confirm official link |
| 15 | AGIVA Algeria | `agiva_algeria` | Cosmetics | https://infldb.com/top-brands/Algeria | Confirm official link |
| 16 | Azul Cosmétique | `azulcosmetique` | Cosmetics | https://infldb.com/top-brands/Algeria | Confirm official link |
| 17 | Park Mall Sétif | `park_mall_setif` | Retail / mall | https://infldb.com/top-brands/Algeria | Confirm official link |
| 18 | Djazaïr Voyages | `djazair.voyages` | Travel | https://infldb.com/top-brands/Algeria | Confirm official link |
| 19 | Sinay Cars | `sinaycars` | Automotive | https://infldb.com/top-brands/Algeria | Confirm official link |
| 20 | Profoot | `dzprofoot` | Retail / sports | https://infldb.com/top-brands/Algeria | Confirm official link |

## Execution protocol

### Phase 0 — preflight (must pass before API calls)

1. Confirm the production endpoint is reachable using the public health route.
2. Confirm durable readiness from the operator's protected context; public health alone is not readiness.
3. Confirm the operator's protected factory key is available to the approved runner. Never retrieve or display it in logs.
4. Verify each target against an official website or official cross-link; replace any unverified candidate.
5. Record the start time and baseline manual research time for each target using the same search scope.
6. If the service is sleeping, unhealthy, or not ready, stop and record the blocker. Do not restart or redeploy production for this pilot.

### Phase 1 — controlled run

- Submit one request per approved username to `POST /v1/factory/research/username`.
- Use the operator factory key only in a protected header; do not create a customer key.
- Omit optional `timeoutMs` for the first pass.
- Record HTTP status, elapsed time, source, returned evidence count, platform/site labels if present, and error code.
- Store only public usernames, public profile URLs, and the minimum evidence needed to evaluate the product. Do not collect profile biographies or personal attributes unless essential to validate a public business account.
- Stop on repeated provider failures, service instability, or unexpected cost/usage. Do not retry blindly.

### Phase 2 — human validation

For every returned item, label it:
- `RELEVANT_PUBLIC_BUSINESS_PROFILE`
- `IRRELEVANT_OR_FALSE_MATCH`
- `UNAVAILABLE_OR_NOT_FOUND`
- `AMBIGUOUS_REQUIRES_REVIEW`

A correct result means that the returned public profile is demonstrably associated with the target organization/brand by an official website link or other reliable public cross-reference. Similar usernames alone do not count.

### Phase 3 — scorecard

Report all metrics with numerator and denominator:

- Eligible targets: count after official-account preflight.
- Successful API responses: HTTP 200 / attempted requests.
- Provider failures: 502/503/504 / attempted requests.
- Relevant discovery precision: relevant returned profiles / all returned profiles reviewed.
- Target coverage: targets with at least one relevant result / eligible targets.
- False-positive rate: irrelevant returned profiles / all returned profiles reviewed.
- Average and median API latency.
- Manual baseline time vs API-assisted time, including human review.
- Incremental cost: actual measured Render/resource usage if available; do not infer zero cost from the Free plan.
- Operational issues: sleep/wake delay, timeout, missing platform coverage, rate/quota behavior.

Do not report accuracy as a single percentage without showing the denominator and the human-review method.

### Phase 4 — business decision

- **Continue internally** only if the results reduce total analyst time or materially improve prospect research quality.
- **Fix product** if false positives, weak coverage, provider instability, or latency erase the benefit.
- **Commercialize** only after the internal workflow is useful and a real external buyer agrees on scope and price.
- Record internal usage separately from external customer usage and revenue.

## Current execution blocker

The endpoint and customer-key lifecycle have previously been verified in Production and Preview. The research route accepts the internal factory key without consuming a customer quota. However, the current connected GitHub/Render tools do not expose the protected Render `FACTORY_API_KEY` for use in an authenticated POST, and no approved protected runner has been executed in this session. The key must not be exposed to chat or repository files.

Therefore this document prepares the controlled pilot but does **not** claim that any of the 20 API requests have run. Next implementation step is a protected operator-side runner that reads the existing secret from its secret store, executes the cohort, and emits a redacted results artifact only. Do not add a new secret or alter production environment variables merely to run this test.

## Evidence references

- Product manifest: `PRODUCT-MANIFEST.json`
- Commercial runbook: `COMMERCIAL-RUNBOOK.md`
- Pilot quickstart: `PILOT-QUICKSTART.md`
- Customer key contract: `../../api-factory/CUSTOMER-API-KEYS.md`
- Runtime persistence and production evidence: `../../api-factory/PERSISTENCE.md`
- Public candidate directory: https://infldb.com/top-brands/Algeria
- Additional public directory evidence: https://starngage.com/app/es/brand/ranking/algeria/product-service
