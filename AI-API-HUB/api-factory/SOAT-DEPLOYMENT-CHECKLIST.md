# SOAT self-host deployment contract

This document is intentionally deployment-safe: it contains no credentials and does not create infrastructure.

## Required runtime

SOAT is self-hosted and requires a PostgreSQL database with pgvector 0.8+.
The official container image is `ttoss/soat:latest`, listening on port `5047`.

Minimum server configuration:

- `PORT=5047`
- `DATABASE_HOST`
- `DATABASE_PORT=5432`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `SECRETS_ENCRYPTION_KEY` (64 hex characters)
- `FILES_STORAGE_DIR=/data/files`
- embedding configuration:
  - `EMBEDDING_PROVIDER=ollama|openai|bedrock`
  - `EMBEDDING_MODEL`
  - `EMBEDDING_DIMENSIONS`

For a minimal provider-backed deployment, use an embedding provider that is actually available to the deployment; do not enable Ollama unless an Ollama runtime is deployed.

## Integration with AI-API-HUB

After SOAT is reachable:

- `SOAT_BASE_URL` = public SOAT URL
- `SOAT_API_KEY` = project-scoped SOAT API key
- `SOAT_AI_PROVIDER_ID` = provider record used by chat completions

The API Factory adapter calls:

`POST {SOAT_BASE_URL}/api/v1/chat/completions`

with `ai_provider_id` and the request messages.

The safe connectivity probe uses:

`GET {SOAT_BASE_URL}/api/v1/projects`

with the SOAT bearer credential. It is diagnostic only and does not mutate SOAT state.

## Evidence gates

Do not mark the integration production-ready until all are proven:

1. SOAT runtime health is reachable.
2. Authentication is accepted.
3. `SOAT_AI_PROVIDER_ID` resolves to a configured provider.
4. API Factory probe succeeds against the real deployment.
5. A real chat completion succeeds through SOAT.
6. Usage/error behavior is recorded.
7. The result is linked to the corresponding verification record.

No secret belongs in Git, this file, or chat messages.
