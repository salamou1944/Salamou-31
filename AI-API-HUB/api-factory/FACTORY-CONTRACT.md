# API Factory Contract

The factory is a manufacturing control plane, not a catalog.

## Input

A manifest contains:

- name: immutable service identity, lowercase kebab-case.
- version: API contract version such as v1.
- description: bounded human-readable purpose.
- auth: none or api-key.
- operations: 1–100 unique HTTP method/path pairs with summaries.

## Output

Every build produces:

1. executable server.mjs
2. isolated package.json
3. OpenAPI 3.1 contract
4. README
5. registry entry

## Invariants

- Invalid manifests fail before compilation.
- Duplicate routes fail closed.
- Generated APIs do not inherit the factory process.
- No credentials are generated, copied, or fabricated.
- Provider selection is outside the core compiler.
- Compilation alone is not commercial readiness.

## Evidence levels

validated -> manifest accepted.
compiled -> runnable artifact emitted.
runtime -> generated service starts and health endpoint responds.
provider -> required external provider actually responds.
business -> real customer transaction or equivalent production use is observed.

The factory must never upgrade an evidence level without the corresponding observation.

## Runtime contract

Generated services include:

- `/health` for process health.
- `/ready` for dependency readiness; provider-backed APIs return HTTP 503 when the configured provider is unavailable.
- `/metrics` for real request usage and quota state.
- API-key authentication through `API_KEY` when requested.
- JSON-schema request validation through Fastify.
- idempotency protection through `Idempotency-Key` on mutating requests.
- quota enforcement through `API_QUOTA_LIMIT`; rejected requests are not counted as successful usage.
- structured errors for validation, quota, provider, and internal failures.

## Provider contract

The core compiler is provider-neutral. Provider-backed operations declare an adapter kind and a credential environment variable name. Credentials are never emitted into generated source. The built-in `openai-compatible` adapter only reaches a provider when credentials and endpoint/model configuration are present.

## Deployment contract

Deployment is an adapter boundary. Railway and Vercel plans explicitly report missing deployment credentials instead of pretending to deploy. A deployment artifact or healthy process is not promoted to provider or business evidence automatically.
