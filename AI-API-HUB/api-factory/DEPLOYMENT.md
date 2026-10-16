# API Factory deployment

## Fastest no-upfront-cost preview: Render

This repository includes a Render Blueprint at `/render.yaml`. It defines a **Free** Docker web service, uses this directory as the service root, checks `GET /health`, and asks you to enter `FACTORY_API_KEY` as a secret rather than committing it.

To create the preview:
1. Open Render and choose **New → Blueprint**.
2. Connect `salamou1944/Salamou-31` and select branch `feat/api-factory-railway-deployable-2026-10-16` (or the branch containing this file).
3. Review the service plan. Keep it on **Free**; do not upgrade and do not add a payment method just to complete this setup.
4. Set a long random `FACTORY_API_KEY` when prompted, then apply the Blueprint.
5. After Render reports the deploy is live, test `GET /health` and `GET /ready`; then run the authenticated API smoke tests.

Render documents free web services here: https://render.com/docs/free. Free services can sleep when idle and have an ephemeral filesystem. This blueprint is therefore for a **public preview / runtime smoke test only**, not durable production: generated API files and `registry.json` may disappear after restart, redeploy, or sleep. Do not store customer data or rely on generated APIs surviving. Production requires a durable storage design and verified budget limits.

## Container entrypoint

- Container: `Dockerfile`
- Render Blueprint: repository-root `render.yaml`
- Railway config: `railway.json`
- Listener: `PORT` (defaults to 8797)
- Sherlock: installed in the production image at `/opt/sherlock/bin/sherlock`
- Health check: `GET /health`
- Protected readiness: `GET /ready`
- Authentication: configure `FACTORY_API_KEY` as a platform secret before using protected endpoints.

The public health endpoint is only a process-health check. It does **not** prove authentication is configured, an AI provider is reachable, or a real completion works. `/ready` returns 503 until `FACTORY_API_KEY` is configured. The image build verifies Sherlock is installed, but does not guarantee external sites are reachable from every region.

## No paid inference by default

The control plane can run without an external model provider. Provider-backed generated APIs require credentials for the selected provider and must not be promoted from `COMPILED` based on container health alone. Automatic paid fallback is forbidden.

## Railway alternative

Railway can use this directory as the service root and its `railway.json` configuration. A Railway project, service, billing eligibility, and secrets are account-level setup; this repository does not create them. Do not deploy to the existing EASY project/service.

## Evidence and limitations

A successful image build or deploy is not equivalent to a verified provider completion, a persistent API registry, or a customer-facing commercial product. No public URL is claimed until a service is deployed and externally smoke-tested.
