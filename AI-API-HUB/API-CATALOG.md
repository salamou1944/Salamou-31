# Commercial API Catalog

Prioritized from the existing EASY API registry and current market demand.

| Capability | Providers | Priority | Typical paid service |
|---|---|---:|---|
| LLM / reasoning | OpenAI, Anthropic, Gemini, Groq, OpenRouter | P0 | AI agents, extraction, automation |
| Vision / Product DNA | Gemini, Google Vision, Cloudflare Workers AI | P0 | image analysis, catalog enrichment |
| Image generation | Replicate, fal.ai, Stability AI | P0 | creatives and marketing assets |
| Video generation | Replicate, Runway, Kling, fal.ai | P1 | short-form marketing video |
| Speech | OpenAI Speech, Deepgram, ElevenLabs | P0 | voice agents and transcription |
| Web research | Tavily, Brave Search, Exa, Serper | P0 | research agents and lead intelligence |
| Workflow automation | n8n | P0 | business workflow implementation |
| Commerce | Shopify, WooCommerce, BigCommerce | P1 | order/catalog automation |
| Marketing | Meta Marketing API, Meta Ad Library, Google Ads | P0 | ad operations and reporting |
| Payments | Stripe, PayPal, Adyen | P1 | payment workflows |
| Shipping | DHL, FedEx, UPS, Shippo, EasyPost | P2 | tracking and logistics automation |
| Maps | Google Maps, Mapbox, OpenStreetMap | P1 | delivery and location workflows |
| Translation | Google Translate, DeepL, AWS Translate | P1 | multilingual automation |
| Analytics | PostHog, Mixpanel, Google Analytics Data API | P1 | product/marketing analytics |
| Moderation | OpenAI Moderation, Google NLP | P1 | content safety pipelines |

## Credential variables
Use names only; put actual values in runtime secret storage.

- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GOOGLE_API_KEY / GEMINI_API_KEY
- GROQ_API_KEY
- OPENROUTER_API_KEY
- REPLICATE_API_TOKEN
- FAL_KEY
- TAVILY_API_KEY
- BRAVE_SEARCH_API_KEY
- EXA_API_KEY
- STRIPE_SECRET_KEY
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- META_ACCESS_TOKEN
- WHATSAPP_ACCESS_TOKEN
- SHOPIFY_ACCESS_TOKEN
- DEEPGRAM_API_KEY
- ELEVENLABS_API_KEY

Never place the values themselves in this repository.
