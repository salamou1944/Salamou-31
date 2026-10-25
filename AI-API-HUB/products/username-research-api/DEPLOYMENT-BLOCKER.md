# Username Research API — Current Commercial Blockers

## Runtime and customer-access status

Product 001 is reachable in both environments:

- Production: https://salamou-31-api-factory.onrender.com
- Preview: https://salamou31-api-factory-preview.onrender.com
- Production customer-key lifecycle smoke: https://github.com/salamou1944/Salamou-31/actions/runs/40154410859
- Preview customer-key lifecycle smoke: https://github.com/salamou1944/Salamou-31/actions/runs/40154267374
- Shared storage gateway: Supabase Edge Function `api-factory-storage`, version 8.

The customer API-key and durable quota path is now live and tested in both environments. The smoke created a temporary key without printing its raw value, completed a real Sherlock username-research request, confirmed HTTP 429 on the second request at quota 1, confirmed durable usageCount=1, revoked the key, and confirmed HTTP 401 after revocation. The temporary test key was revoked.

The username-research response is discovery evidence, not proof of identity; preserve `verified:false` unless an independent verification mechanism exists.

## Remaining commercial blockers

1. **Customer onboarding and billing are not implemented.** There is no verified checkout, payment confirmation, or paid-customer activation path.
2. **No generated API is registered in the factory registry.** The live direct research route proves the endpoint works; it does not prove a generated API deployment.
3. **No independent paying customer, real revenue, or payout has been observed.** Do not mark these states complete without evidence of an actual paid transaction and actual payout.

The historical Railway free-plan provisioning limit remains provenance only. Render provides the reachable runtime; no paid upgrade was made.

## Release condition

Keep internal control-plane credentials private. Next, acquire a real pilot customer, agree on a small offer, and implement payment confirmation/onboarding before describing access as paid. Record revenue only after a real transaction, and payout only after a real payout confirmation. Do not upgrade paid services or fabricate customer activity.
