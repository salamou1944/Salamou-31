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

The API returns a title, short description, full description, selling points, ad copy, CTA, target audience, and a list of cautions for unknown facts.

## Environment

- `OPENAI_API_KEY` — required for generation; never commit it
- `SERVICE_API_KEYS` — required to authorize generation; comma-separated customer/service keys
- `OPENAI_MODEL` — optional; defaults to `gpt-5.6-luna`
- `RATE_LIMIT_PER_MINUTE` — optional; defaults to `20`, allowed range `1–1000`
- `PORT` — optional; defaults to `3000`

The generation endpoint is disabled unless `SERVICE_API_KEYS` is configured. Requests are authenticated with `x-api-key` and rate-limited per authorized key. The server also applies request/body limits, input length validation, image URL validation, an OpenAI request timeout, and a bounded model output. Upstream errors are logged server-side but are not returned to customers.

## Run

```bash
npm install
OPENAI_API_KEY=your_key SERVICE_API_KEYS=customer_key npm start
```

Health check: `GET /health`

## Commercial MVP

The first offer is intentionally narrow: **send product details once and receive ready-to-publish product copy in the customer's language**. It can be offered to e-commerce sellers, agencies, catalogs, and retailers as an API or done-for-you service.

The service is designed as a small production-minded MVP. Billing, customer dashboards, persistent usage accounting, and additional integrations should only be added after the first customer validates the offer.
