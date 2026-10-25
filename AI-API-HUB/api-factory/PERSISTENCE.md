# API Factory persistence setup

The factory must distinguish process health from durable storage. `GET /health` only proves that the process responds; `GET /ready` returns HTTP 200 only after authenticated registry and artifact read/write verification. Incomplete or failed remote storage returns HTTP 503 and must never be silently downgraded to ephemeral storage.

## Current verified zero-upfront-cost configuration

As of 2026-10-25, the latest external Render Smoke run [40138094818](https://github.com/salamou1944/Salamou-31/actions/runs/40138094818) verified both live Render targets:

| Target | Render deployment commit | Readiness result |
|---|---|---|
| Production — https://salamou-31-api-factory.onrender.com | `87c69c24c293486e7ae68194e5500eb705ab9d32` | `DURABLE_STORAGE_VERIFIED`, HTTP 200 |
| Preview — https://salamou31-api-factory-preview.onrender.com | `a0ab62be7c3d71ef23f0cd018b38108bd2061786` | `DURABLE_STORAGE_VERIFIED`, HTTP 200 |

For both targets, the smoke job observed authentication, registry persistence, and artifact persistence checks as true, with both storage modes reported as `supabase-edge-gateway`. The same run passed the public health and capabilities checks, authenticated control-plane access, the real Sherlock username-research entrypoint, and rejection of an unauthenticated protected request. The username-research response returned four evidence items for `salamou1944` with `verified:false`; discovery results must not be represented as independently verified identity claims.

The active Production and Preview services use the dedicated Salamou-31 Supabase project through the `api-factory-storage` Edge Function gateway:

- `FACTORY_STORAGE_GATEWAY_URL`: the deployed `api-factory-storage` Edge Function URL.
- `FACTORY_REGISTRY_URL`: the dedicated Salamou-31 Supabase project URL.
- `FACTORY_ARTIFACT_BUCKET`: optional; defaults to `api-factory-artifacts`.
- `FACTORY_API_KEY`: the internal gateway key, configured as a sensitive environment variable on the Render service and matched to the digest in the Edge Function source.

The gateway uses the Supabase service-role credential only inside the Supabase Edge Function environment. Do not copy that credential into Render, GitHub, client-side code, or chat. The gateway validates the internal key by comparing its SHA-256 digest; the raw key is not stored in the repository.

The registry readiness check reads the singleton and compare-and-swap updates only `updated_at`, conditioned on the exact timestamp previously read, then verifies that the payload is unchanged. If the singleton is absent, it inserts an empty row only; a concurrent insert/update causes a fail-closed conflict rather than replacing live data. The artifact check uploads a deterministic probe object to the private bucket and downloads it to verify exact content. The generated API artifact store also uses the gateway for object upload and retrieval.

These smoke results prove the tested persistence paths at the time of the run; they are not a general production SLA or an uptime guarantee. Both Render services use the Free plan and may sleep while idle. The smoke found zero registered APIs in both targets, so the control plane is verified but there is not yet a customer-facing generated API deployment evidenced by this run.

## Direct Supabase mode

The adapters also support direct server-side Supabase REST and Storage calls through `FACTORY_REGISTRY_SERVICE_ROLE_KEY`. If this mode is used, the service-role key must be stored only as a protected server environment variable and must never be committed or exposed to a client. Use a dedicated Salamou-31 project; never point these variables at EASY's project. Direct REST registry readiness currently fails closed with `REGISTRY_STORAGE_WRITE_READ_UNVERIFIED`: a GET-only probe is insufficient, and writing the live singleton as a health check could overwrite a concurrent registry update. Use the Edge Function gateway for a readiness-verified deployment until a safe, isolated direct-mode probe exists.

## Runtime and deployment limitations

- Render Free services can sleep while idle. Verified persistence does not provide an uptime guarantee.
- Vercel remains fail-closed until its environment can be configured with the gateway URL and matching internal key through authorized project/team access.
- Local-file and Vercel `/tmp` modes are not durable.
- The factory's registry and generated bundle files are persisted, but a generated API's own request-idempotency ledger, usage ledger, quota state, and application/business data are not automatically moved to the remote store. A generated API that mutates state must not be advertised as production-durable until its own state store is separately designed and tested.
- Deployment planning is not deployment execution. The current Railway/Vercel deployment adapter is unimplemented; provider credentials alone do not prove that a service has been created, deployed, or smoke-tested.

No paid resource is required for the currently verified Render configuration. Do not upgrade a service or add a payment method just to complete setup.
