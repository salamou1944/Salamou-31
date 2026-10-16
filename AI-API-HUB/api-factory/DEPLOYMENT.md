# API Factory deployment

## Container entrypoint

This directory is a self-contained Node.js service and can be deployed as a Docker service with this directory as the service root.

- Container: `Dockerfile`
- Railway config: `railway.json`
- Listener: `PORT` (defaults to 8797)
- Sherlock: installed in the production image at `/opt/sherlock/bin/sherlock`; the runtime image includes Python and the `sherlock-project` package
- Health check: `GET /health`
- Protected readiness: `GET /ready`
- Authentication: configure `FACTORY_API_KEY` as a platform secret before using protected endpoints.

The public health endpoint is only a process-health check. It does **not** prove authentication is configured, an AI provider is reachable, or a real completion works. The image build also verifies that Sherlock's Python module is installed; this does not guarantee external sites are reachable from every deployment region. `/ready` returns 503 until `FACTORY_API_KEY` is configured.

## Deploy without paid AI inference

The factory control plane can run without an external model provider. Provider-backed generated APIs still require credentials for the selected provider and must not be promoted from `COMPILED` based on container health alone. The repository policy forbids automatic paid fallback.

## Railway setup

Create or select an authorized Railway project, add a service from this GitHub repository, and set the service root directory to `AI-API-HUB/api-factory`. Railway will use the Dockerfile and health-check settings in this directory. Add `FACTORY_API_KEY` through Railway's secret/environment-variable UI; never commit it.

After deployment, verify both:
1. `GET https://YOUR-SERVICE/health` returns HTTP 200.
2. `GET https://YOUR-SERVICE/ready` returns HTTP 200 only after the secret is configured.

Then run an authenticated API Factory smoke test. A successful deploy is not equivalent to a verified provider completion or a customer-facing commercial product.

## Current limitation

Repository configuration does not create Railway infrastructure or configure account secrets. No deployment URL is claimed until a service is deployed and an external smoke test succeeds.
