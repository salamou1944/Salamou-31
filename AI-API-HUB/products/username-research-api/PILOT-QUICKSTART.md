# Username Research API — Pilot Quickstart

**Status:** live endpoint with customer-key authentication and durable request quotas; manually onboarded pilot only. This is not a self-serve paid product yet.

## What it does

Submit a username and receive public-source account-discovery evidence from the current Sherlock-backed research route. It is intended for lawful research, fraud/impersonation triage, prospect research, and internal analyst workflows.

A matching username is a lead for further review, **not proof that two accounts belong to the same person**. Results must not be used alone for employment, housing, credit, eligibility, or other high-impact decisions.

## Production endpoint

    POST https://salamou-31-api-factory.onrender.com/v1/factory/research/username
    Content-Type: application/json
    x-api-key: YOUR_CUSTOMER_KEY

The customer key is a unique sal31_ key issued by the operator after pilot terms are agreed. Never use or request the internal factory control-plane key.

## First request

    curl --request POST \
      --url https://salamou-31-api-factory.onrender.com/v1/factory/research/username \
      --header 'Content-Type: application/json' \
      --header 'x-api-key: YOUR_CUSTOMER_KEY' \
      --data '{"username":"example_username"}'

Replace example_username with a username you are authorized to research and replace YOUR_CUSTOMER_KEY with the customer-specific key supplied to you. Do not commit the key to source control or expose it in client-side browser code.

Optional request field: timeoutMs (integer). Omit it for the first test unless the operator has agreed on a value.

## Authentication, quota, and errors

- 200: request processed; inspect the returned evidence and limitations.
- 401: key is missing, invalid, or revoked.
- 429: customer quota has been reached.
- 502: upstream research provider failed.
- 503: research provider unavailable.
- 504: research timed out.

Each syntactically valid request attempt consumes one unit of quota **before** the upstream research call. A provider failure or timeout can therefore consume one request. Invalid usernames/timeouts are rejected before quota consumption. The operator will agree a quota limit with you before issuing the key.

## Pilot terms

The initial offer is a small, manually onboarded pilot:
- Up to 25 request attempts on one customer key.
- Seven-day evaluation window, starting when the key is issued.
- One endpoint and email-based/operator-assisted setup.
- No uptime SLA, guaranteed platform coverage, or identity-verification guarantee.
- No automatic renewal; any further use requires a separate agreement.
- The pilot is activated only after scope, price, and payment method are agreed and payment is confirmed by the operator.

**Price is quoted directly before activation.** Do not assume that the endpoint is a checkout page or that access is activated automatically after payment. No self-serve checkout or automated billing is currently implemented.

## Request a pilot

Send:
1. Your organization and role.
2. The workflow you want to test.
3. Approximate request volume and timeline.
4. Confirmation that you will use the results lawfully and review findings before acting on them.

The operator will confirm fit, scope, price, and payment method, then issue a customer-specific key. Never send passwords, private account credentials, or the internal control-plane key.

## Technical evidence

- [Production customer-key lifecycle test](https://github.com/salamou1944/Salamou-31/actions/runs/40154410859)
- [Preview customer-key lifecycle test](https://github.com/salamou1944/Salamou-31/actions/runs/40154267374)
- [Customer key and quota implementation notes](../../api-factory/CUSTOMER-API-KEYS.md)

These tests prove the technical customer-access path, quota enforcement, and revocation. They do not prove an independent customer has used the service or that revenue has been received.
