# Pollinations Free API Classic — candidate review — 2026-10-21

## Finding

Pollinations is a plausible no-key test path, but the current product has two distinct API paths that must not be confused:

1. **Free API Classic:** the official privacy policy explicitly covers `text.pollinations.ai` and `image.pollinations.ai` as endpoints that need no account. The deprecated auth page states that anonymous API calls still work, while token management has moved to `enter.pollinations.ai`.
2. **Current Gen API:** the current official API docs at `gen.pollinations.ai` say generation requests require an API key. Do not assume a keyless request to the Gen API will work.

## Evidence

- Official API docs: https://gen.pollinations.ai/docs
- Official privacy policy (last updated 2026-10-15): https://enter.pollinations.ai/privacy
- Official legacy auth/anonymous-call page: https://auth.pollinations.ai/
- OmniRoute current free-tier guide: https://github.com/cheaper-inference/OmniRoute/blob/release/v3.8.53/docs/getting-started/FREE-TIERS-GUIDE.md
- OmniRoute's current executor documents the keyless model aliases and separates premium models requiring a key: https://github.com/cheaper-inference/OmniRoute/blob/39777dfe307994101079b8313339c6b7180176fa/open-sse/executors/pollinations.ts

## Privacy and commercial boundaries

- Pollinations' official privacy policy says Classic anonymous usage metadata includes timestamps, endpoints, request status, IP/country and referring app/site information.
- The policy says prompts and outputs are processed to deliver results and may be cached temporarily; generated-response caches can typically persist up to 30 days.
- Requests routed through community models may be sent to independent upstream providers whose data practices vary.
- Therefore use only non-sensitive prompts in any anonymous test. Do not send customer data, credentials, proprietary code, or confidential business content.
- The Classic endpoint's current availability, exact rate limit, reliability, and model behavior have not been verified by a live request from this session.

## Decision

- Status: **candidate — not live-verified**.
- Suitable next experiment: one non-sensitive deterministic sentinel through the official Classic endpoint, with no API key and no paid fallback.
- The provider-owned privacy source has now been reviewed and recorded in the fixture, but runtime evidence is still missing. Keep `hard_stop=false` and do not enable automatic routing until the live sentinel and exact quota behavior are verified.
- A proposed one-shot GitHub Actions workflow was blocked by the connected execution tool's safety checks, and the browser tool could not access the endpoint. No network request was made from this session, no provider was enabled, and no paid resource was created.
- Keep the existing provider gate fail-closed. The current OpenAI-compatible provider registry can be extended only after the separate probe and policy test are implemented and pass.
