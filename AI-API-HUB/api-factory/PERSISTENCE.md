# API Factory persistence setup

The factory must distinguish process health from durable storage. `GET /health` only proves that the process responds; `GET /ready` returns HTTP 200 only after authenticated registry and artifact read/write verification. Incomplete or failed remote storage returns HTTP 503 and must never be silently downgraded to ephemeral storage.

## Current verified zero-upfront-cost configuration

The main-branch Render service at `https://salamou-31-api-factory.onrender.com` is live on commit `83f69126689eaac920f044b1e54cb8878d52fffc`, but its latest external smoke returned HTTP 503 `DURABLE_STORAGE_REQUIRED` with both registry and artifact modes set to `local-file`. It is **not production-ready**. The preview remains the only endpoint currently verified with durable registry and artifact storage. Do not switch the main service to the gateway until its existing registry/artifact state and matching gateway-key configuration can be verified and migrated safely.

The active preview uses the dedicated Salamou-31 Supabase project through the `api-factory-storage` Edge Function gateway:

- `FACTORY_STORAGE_GATEWAY_URL`: the deployed `api-factory-storage` Edge Function URL.
- `FACTORY_REGISTRY_URL`: the dedicated Salamou-31 Supabase project URL.
- `FACTORY_ARTIFACT_BUCKET`: optional; defaults to `api-factory-artifacts`.
- `FACTORY_API_KEY`: the internal gateway key, configured as a sensitive environment variable on the Render preview and matched to the digest in the Edge Function source.

The gateway uses the Supabase service-role credential only inside the Supabase Edge Function environment. Do not copy that credential into Render, GitHub, client-side code, or chat. The gateway validates the internal key by comparing its SHA-256 digest; the raw key is not stored in the repository.

The registry check performs a read and upsert/read-back verification. The artifact check uploads a probe object to the private bucket and downloads it to verify the content. The generated API artifact store also uses the gateway for object upload and retrieval. The externally observed `DURABLE_STORAGE_VERIFIED` smoke is evidence for the preview's registry and artifact paths, not a general production SLA.

## Direct Supabase mode

The adapters also support direct server-side Supabase REST and Storage calls through `FACTORY_REGISTRY_SERVICE_ROLE_KEY`. If this mode is used, the service-role key must be stored only as a protected server environment variable and must never be committed or exposed to a client. Use a dedicated Salamou-31 project; never point these variables at EASY's project. Direct REST registry readiness currently fails closed with `REGISTRY_STORAGE_WRITE_READ_UNVERIFIED`: a GET-only probe is insufficient, and writing the live singleton as a health check could overwrite a concurrent registry update. Use the Edge Function gateway for a readiness-verified deployment until a safe, isolated direct-mode probe exists.

## Runtime and deployment limitations

- Render's Free preview can sleep while idle. Verified persistence does not provide an uptime guarantee.
- Vercel remains fail-closed until its environment can be configured with the gateway URL and matching internal key through authorized project/team access.
- Local-file and Vercel `/tmp` modes are not durable.
- The factory's registry and generated bundle files are persisted, but a generated API's own request-idempotency ledger, usage ledger, quota state, and application/business data are not automatically moved to the remote store. A generated API that mutates state must not be advertised as production-durable until its own state store is separately designed and tested.
- Deployment planning is not deployment execution. The current Railway/Vercel deployment adapter is unimplemented; provider credentials alone do not prove that a service has been created, deployed, or smoke-tested.

No paid resource is required for the currently verified preview configuration. Do not upgrade a service or add a payment method just to complete setup.
