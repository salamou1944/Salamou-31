# AI Product Content API — MVP 0.1

A small B2B API that turns seller-supplied product information (and optionally a product image URL) into structured, sales-ready content.

## Endpoint

`POST /v1/product-content`

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

- `OPENAI_API_KEY` — required
- `OPENAI_MODEL` — optional; defaults to `gpt-5.6-luna`
- `PORT` — optional; defaults to `3000`

## Run

```bash
npm install
OPENAI_API_KEY=your_key npm start
```

Health check: `GET /health`

## Commercial MVP

The first sellable offer is intentionally narrow: **send product details once and receive ready-to-publish product copy in the customer's language**. It can be offered to e-commerce sellers, agencies, catalogs, and retailers as an API or done-for-you service.

The implementation is deliberately provider/API based and keeps the business logic small so it can later be wrapped with authentication, usage limits, billing, dashboard UI, and integrations.
