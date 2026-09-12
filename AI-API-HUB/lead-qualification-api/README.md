# Lead Qualification API

A small B2B API that turns an inbound lead into a consistent qualification record.

## Commercial use case

Agencies, SaaS companies, e-commerce teams, and service businesses can send a lead to one endpoint and receive:

- 0–100 qualification score
- priority
- detected intent
- concise summary
- reasons supporting the score
- recommended next action

This is intentionally narrow so it can be sold as a paid integration pilot before expanding into CRM, WhatsApp, email, or workflow automation.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY="..."
export SERVICE_API_KEY="..."
uvicorn app:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Qualification request:

```bash
curl -X POST http://localhost:8000/v1/leads/qualify \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: YOUR_SERVICE_API_KEY' \
  -d '{
    "name":"Jane Doe",
    "company":"Acme SaaS",
    "email":"jane@example.com",
    "message":"We need to automate lead routing into our CRM this month.",
    "source":"website"
  }'
```

## Production checklist

- Put secrets in the hosting provider's secret store, never in Git.
- Add rate limiting and request logging with sensitive fields redacted.
- Add provider-side structured output validation before production use.
- Add CRM/webhook adapters as paid upsells.
- Deploy behind HTTPS and rotate service keys regularly.

## Status

**MVP code exists in GitHub. It is not yet deployed or independently production-tested.**
