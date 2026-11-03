# Username Research API — Pilot Readiness Checklist

Status: **DRAFT / NOT AUTHORIZED FOR CUSTOMER ACTIVATION**

This checklist is a documentation gate for a manually operated pilot. Passing it does not establish legal compliance, production readiness, customer demand, or revenue. A human owner must approve every customer activation.

## 1. Buyer and use-case qualification

- [ ] Name the business customer and accountable buyer.
- [ ] Record the specific workflow and measurable problem the customer wants to solve.
- [ ] Confirm that the customer is authorized to submit the brand/business handles and request the research.
- [ ] Limit the pilot to public brand, business, or organization accounts. Do not accept requests to locate, track, profile, or identify private individuals.
- [ ] Record the decision the output will support and require a human analyst to review every result.
- [ ] Reject high-impact decisions, employment screening, credit, housing, insurance, law-enforcement targeting, stalking, doxxing, or other person-level surveillance use.

## 2. Data handling and output limitations

- [ ] Explain that a username match is a lead for manual review, not proof of common ownership or identity.
- [ ] Preserve source URLs and provenance where available.
- [ ] Disclose that platform coverage is limited and a missing result does not prove that an account does not exist.
- [ ] Disclose that results may be incomplete, stale, unavailable, or false-positive.
- [ ] Define the customer's permitted purpose, access controls, retention period, deletion route, and handling of accidental personal data.
- [ ] Confirm that the proposed collection and use comply with applicable law, customer authorization, and relevant platform terms; obtain qualified review where needed.

## 3. Pilot scope and commercial agreement

- [ ] Define the pilot duration, maximum request attempts, supported workflow, deliverables, and named customer reviewer.
- [ ] Confirm that every promised deliverable is supported by the current API response schema and tested manually before it is offered.
- [ ] State explicitly that there is no SLA, guaranteed coverage, identity verification, or automatic renewal unless separately evidenced and agreed.
- [ ] Agree price, currency, payment method, invoice/order reference, refund/failure terms, support channel, and acceptance criteria in writing.
- [ ] Do not issue a customer key before the written scope and payment receipt are verified by the human owner.

## 4. Technical and operational readiness

- [ ] Verify the current production endpoint with a fresh authorized smoke test; record timestamp, request ID, response, and environment.
- [ ] Verify customer-key isolation, quota limit, expiry, and revocation using a dedicated pilot key.
- [ ] Explain whether failed upstream attempts consume quota and how timeouts/provider failures are handled.
- [ ] Confirm the current request/response schema; do not promise exports or fields not present in the observed response.
- [ ] Capture request attempts, successful/failed calls, latency, quota consumed, and operator interventions.
- [ ] Do not expose internal keys, control-plane credentials, or another customer's data.

## 5. Cost and unit economics

Record actual values; do not substitute estimates for measurements.

| Cost item | Actual value / evidence |
|---|---|
| Upstream/runtime cost, including failed attempts | Pending measurement |
| Hosting/storage allocation | Pending measurement |
| Setup and QA operator time | Pending measurement |
| Support and failure-handling time | Pending measurement |
| Payment fees and applicable taxes | Pending measurement |
| Refund/rework cost | Pending measurement |

Contribution margin must be calculated from settled funds received minus attributable delivery costs. Until measured, price and margin remain hypotheses.

## 6. Revenue recognition evidence

A pilot is not revenue merely because an email was sent, a prospect replied, an invoice was drafted, a key was issued, or an API request succeeded.

Required evidence:
- [ ] Written customer acceptance of scope and price.
- [ ] Invoice/order reference linked to the customer and pilot.
- [ ] Settled payment evidence showing amount, currency, date, and transaction reference (sensitive details redacted).
- [ ] Human reconciliation of payment to the order.
- [ ] Customer key activation linked to that paid order.
- [ ] Delivery log and customer acceptance/closeout.

Track customer revenue separately from later payout or withdrawal.

## 7. Pilot closeout and go/no-go

- [ ] Report requests attempted, successful/failed calls, quota consumed, observed coverage, and limitations.
- [ ] Record customer feedback and whether the workflow measurably improved.
- [ ] Record actual delivery costs and contribution margin.
- [ ] Ask whether the customer wants a repeat pilot only after confirming value.
- [ ] If no qualified buyer validates the problem and price, pause and revise the buyer/problem/offer rather than increasing outreach volume.

## Approval record

- Human approver: **Pending**
- Customer: **Pending**
- Use-case authorization evidence: **Pending**
- Written scope and price: **Pending**
- Settled payment evidence: **Pending**
- Production smoke evidence: **Pending**
- Decision: **NOT READY — do not activate a customer key**
