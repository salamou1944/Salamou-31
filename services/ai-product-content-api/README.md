# AI Product Content API — MVP 0.1

A small B2B API that turns seller-supplied product information (and optionally a product image URL) into structured, sales-ready content.

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

## Required environment

- `OPENAI_API_KEY` — required; never commit it.
- `SERVICE_API_KEYS` — required; comma-separated customer/service keys.
- `OPENAI_MODEL` — optional; defaults to `gpt-5.6-luna`.
- `RATE_LIMIT_PER_MINUTE` — optional; defaults to `10`, bounded at startup.
- `DAILY_QUOTA_PER_KEY` — optional; defaults to `100`.
- `QUOTA_FILE` — optional; defaults to `data/ai-product-content-quota.json` under the service working directory.
- `PORT` — optional; defaults to `3000`.

The quota store is created with restrictive permissions, stores only SHA-256-derived API-key identifiers (never raw API keys), validates its structure, and is updated with an atomic temp-file/fsync/rename sequence. Quota consumption uses an atomic directory lock with stale-lock recovery so concurrent processes do not silently overwrite each other's counters. If the quota store is missing, unreadable, or malformed after startup initialization, quota operations fail closed rather than resetting usage.

For a multi-instance production deployment, use a shared transactional datastore for quota accounting before issuing high-value customer keys. The local file implementation is suitable only where the quota file is on reliable persistent storage and the deployment topology is controlled.

## Safety controls

The generation endpoint fails closed when required credentials are missing, requires an API key, applies per-key rate limiting and a daily quota, rejects unknown or incorrectly typed fields, caps input sizes, validates HTTP(S) image URLs, limits model output, disables provider response storage, ignores prompt-injection instructions inside seller data, and does not return provider error details to callers.

Invalid request bodies and fields are fully validated before daily quota is consumed. A request that fails validation therefore does not spend a daily generation quota. Quota is reserved immediately before the billable provider call.

## Run

```bash
npm install
OPENAI_API_KEY=your_key SERVICE_API_KEYS=customer_key npm start
```

Health check: `GET /health`. It returns HTTP 503 until both required credentials are configured.

## Commercial MVP

The first offer is intentionally narrow: **send product details once and receive ready-to-publish product copy in the customer's language**. It can be offered to e-commerce sellers, agencies, catalogs, and retailers as an API or done-for-you service.

## First customer trial

Use one real product from a small e-commerce seller. Ask for the product name, factual details, preferred language, and optionally a public image URL. Generate one sample, get approval, then sell a small monthly package rather than a custom software project.
