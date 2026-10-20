# API Factory deployment

## Current zero-upfront-cost runtime

The existing Free Render service is a live **preview runtime** at https://salamou31-api-factory-preview.onrender.com. It can sleep when idle and does not have a persistent local disk, so the local filesystem is never treated as durable storage.

The separate main-branch service at https://salamou-31-api-factory.onrender.com is live on commit `83f69126689eaac920f044b1e54cb8878d52fffc`, but the production smoke currently reports HTTP 503 `DURABLE_STORAGE_REQUIRED` and both stores as `local-file`. Treat it as **not production-ready**. The preview is the only endpoint currently verified with durable storage. Do not simply add gateway variables to the main service until its existing local registry/artifacts and matching gateway key have been verified and safely migrated.

Durable registry and artifact storage is provided by the dedicated Supabase project salamou-31-api-factory using the Edge Function api-factory-storage:
- Registry records use the private public.api_factory_registry table.
- Artifact files use the private api-factory-artifacts Storage bucket.
- The Edge Function uses Supabase's server-side service credential internally; no Supabase service-role key is stored in Render or in this repository.
- The gateway authenticates each request with x-factory-key. The raw FACTORY_API_KEY is stored as a sensitive Render environment variable; only its SHA-256 hash is present in the gateway source.
- FACTORY_STORAGE_GATEWAY_URL points to the Supabase Edge Function. FACTORY_REGISTRY_URL and FACTORY_ARTIFACT_BUCKET identify the dedicated project and bucket.

The readiness probe verifies registry read/write/read-back and artifact upload/download. /ready may return HTTP 200 only when authentication and both durable persistence checks pass. Otherwise it returns HTTP 503. The external smoke test confirmed DURABLE_STORAGE_VERIFIED with registryMode and artifactMode both set to supabase-edge-gateway.

Free Render services can still sleep when idle. Durable storage is now verified, but this does not constitute a production uptime guarantee or prove that a generated API has been deployed to an external provider.

## Reproducing the preview

The Render Blueprint at /render.yaml can create a Free Docker service. Keep it on **Free**; do not upgrade or add a payment method just to complete setup. If creating another service, configure these variables as platform secrets/settings:
- FACTORY_API_KEY — long random secret; do not commit it or share it in chat.
- FACTORY_STORAGE_GATEWAY_URL — the project's api-factory-storage Edge Function URL.
- FACTORY_REGISTRY_URL — the dedicated Supabase project URL.
- FACTORY_ARTIFACT_BUCKET=api-factory-artifacts.

The Edge Function must be deployed to the same Supabase project and configured with the matching key hash. Never copy a service-role/secret key into Render, GitHub, or this repository.

## Container entrypoint

- Container: Dockerfile
- Render Blueprint: repository-root render.yaml
- Railway config: railway.json
- Listener: PORT (defaults to 8797)
- Sherlock: installed in the production image at /opt/sherlock/bin/sherlock
- Health check: GET /health
- Protected readiness: GET /ready
- Authentication: FACTORY_API_KEY is a platform secret; protected API routes require x-api-key.

The public health endpoint is only a process-health check. It does not prove an AI provider is reachable or that a real completion works. Provider-backed generated APIs require credentials for the selected provider and must not be promoted from COMPILED based on container health alone. Automatic paid fallback is forbidden.

## Vercel status

The Vercel deployment remains fail-closed because the connected Vercel integration cannot currently update the project's environment variables in its team scope. Do not weaken readiness checks to hide this. The Render preview is the verified durable-storage runtime until Vercel's FACTORY_API_KEY and FACTORY_STORAGE_GATEWAY_URL can be configured securely in Vercel.

## Railway alternative

Railway can use this directory as the service root and its `railway.json` configuration. The deployment preflight requires `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, and `RAILWAY_ENVIRONMENT_ID` so the target is explicit; a token alone is not sufficient. A live Railway service named `salamou31-api-factory` exists inside the `EASY Runtime Production` project, but the connected-account inspection found **zero service variables, no attached volume, and a latest deployment in `FAILED` state**. Railway's deployment diagnosis reports a `BUILD_IMAGE` failure (`Railpack failed to prepare the build`). This service is not a verified API Factory runtime and must not be presented as deployable. The account exposes only the existing EASY projects; no separate isolated API Factory project/environment is configured. Do not redirect or redeploy production services, copy EASY secrets, or create a new paid resource without explicit target setup and cost confirmation.

## Deployment execution status

The POST /v1/factory/deploy/plan endpoint is a preflight planner, not a deployer. It checks whether expected credential names are present; it does not create a provider project/service, launch a deployment, poll for completion, or smoke-test a public URL. The plan reports adapterImplemented: false, executionAvailable: false, and DEPLOYMENT_ADAPTER_NOT_IMPLEMENTED until a real provider adapter exists. Having RAILWAY_TOKEN or Vercel variables alone must never be reported as deployable.

The repository's GitHub collection includes two relevant implementation references:
- [TinyHosts unified hosting API capture](https://github.com/salamou1944/Project-/blob/4011bf3ce4767088c405b804283764f7d280a560/COLLECTION/AUTO/EXTRACTED/senamakel_tinyhosts.json): model site, database, environment, domain, deployment, and post-deploy traffic separately; unsupported provider capabilities must fail explicitly rather than return success.
- [Agentmemory Render deployment capture](https://github.com/salamou1944/Project-/blob/4011bf3ce4767088c405b804283764f7d280a560/COLLECTION/AUTO/EXTRACTED/rohitg00_agentmemory.json): demonstrates the Render persistent-disk configuration, while documenting that persistent disks require a paid service. The Edge Function gateway avoids requiring a paid Render disk for the registry and artifacts.

## Evidence and limitations

- Latest API Factory tests: https://github.com/salamou1944/Salamou-31/actions/runs/39372209265
- Render durable-storage smoke test: https://github.com/salamou1944/Salamou-31/actions/runs/39372209251
- Vercel fail-closed smoke test: https://github.com/salamou1944/Salamou-31/actions/runs/39372209205

A successful image build or deploy is not equivalent to a verified provider deployment or a customer-facing commercial product. The Render endpoint is externally smoke-tested for health, authentication, registry persistence, and artifact persistence; provider deployment execution remains unimplemented.
