# Commercial AI API Runtime — MVP 0.2

A provider-neutral B2B API runtime exposing two reusable commercial endpoints: product-content generation and inbound lead qualification.

## Endpoint

`POST /v1/product-content`

Required header:

`x-api-key: <customer-service-key>`

Example request:

```json
{
  "product_name": "Wireless Headphones",
  "product_details": "Black over-ear headphones with Bluetooth and a charging case.",
  "language": "French",
  "image_url": "https://example.com/product.jpg"
}
```

The API returns a title, short description, full description, selling points, ad copy, CTA, target audience, and cautions for unknown facts.

## Commercial endpoints

### 1. Product content

`POST /v1/product-content` generates structured, sales-ready ecommerce content from factual product inputs.

### 2. Lead qualification

`POST /v1/leads/qualify` turns an inbound business lead into a score, priority, intent, evidence-based reasons, and a concrete next action.

Example request:

```json
{
  "name": "Jane Doe",
  "company": "Acme SaaS",
  "email": "jane@example.com",
  "message": "We need to automate lead routing into our CRM this month.",
  "source": "website"
}
```

Both endpoints use the same `X-API-Key`, rate-limit, daily-quota, provider-neutral runtime, and fail-closed provider boundary. `Idempotency-Key` may be supplied to prevent duplicate billable processing.

## Required environment

- `AI_PROVIDER_API_KEY` — required; provider credential, never commit it. `OPENAI_API_KEY` remains accepted as a compatibility alias.
- `AI_PROVIDER_BASE_URL` — optional; OpenAI-compatible API base URL, defaults to `https://api.openai.com/v1`.
- `AI_MODEL` — required; model identifier supplied by the selected provider. `OPENAI_MODEL` remains accepted as a compatibility alias.
- `SERVICE_API_KEYS` — required; comma-separated customer/service keys.
- `RATE_LIMIT_PER_MINUTE` — optional; defaults to `10`, bounded at startup.
- `DAILY_QUOTA_PER_KEY` — optional; defaults to `100`.
- `QUOTA_FILE` — optional; defaults to `data/ai-product-content-quota.json` under the service working directory.
- `PORT` — optional; defaults to `3000`.

The quota store is created with restrictive permissions, stores only SHA-256-derived API-key identifiers (never raw API keys), validates its structure, and is updated with an atomic temp-file/fsync/rename sequence. Quota consumption uses an atomic directory lock with stale-lock recovery so concurrent processes do not silently overwrite each other's counters. If the quota store is missing, unreadable, or malformed after startup initialization, quota operations fail closed rather than resetting usage.

For a multi-instance production deployment, use a shared transactional datastore for quota accounting before issuing high-value customer keys. The local file implementation is suitable only where the quota file is on reliable persistent storage and the deployment topology is controlled.

## Safety controls

The endpoints fail closed when required credentials are missing, requires an API key, applies per-key rate limiting and a daily quota, rejects unknown or incorrectly typed fields, caps input sizes, validates HTTP(S) image URLs, limits model output, disables provider response storage, ignores prompt-injection instructions inside seller data, and does not return provider error details to callers.

Invalid request bodies and fields are fully validated before daily quota is consumed. A request that fails validation therefore does not spend a daily generation quota. Quota is reserved immediately before the billable provider call.

## Run

```bash
npm install
AI_PROVIDER_API_KEY=your_provider_key AI_MODEL=your_model SERVICE_API_KEYS=customer_key npm start
```

Human entry point: `GET /` returns a small customer-facing description of the API and the 7-day pilot.\n\nHealth check: `GET /health`. It returns HTTP 503 until both required credentials are configured.

## Commercial MVP

The commercial runtime now supports two narrow paid offers: **product-content API** for ecommerce sellers/agencies/catalog teams and **lead-qualification API** for agencies, SaaS, ecommerce, and service businesses. These can be sold independently or combined into a small sales/ecommerce automation pilot.

## First customer trial

Use one real product from a small e-commerce seller. Ask for the product name, factual details, preferred language, and optionally a public image URL. Generate one sample, get approval, then sell a small monthly package rather than a custom software project.

## Provider-neutral factory contract

The service is an API-factory component: callers use the same POST /v1/product-content contract while the runtime selects an OpenAI-compatible provider through AI_PROVIDER_BASE_URL, AI_PROVIDER_API_KEY, and AI_MODEL. No provider credential is committed to Git. EASY already consumes the stable product-content contract through its provider adapter. Other projects can consume either endpoint through the same authenticated runtime without coupling application code to a specific vendor.
