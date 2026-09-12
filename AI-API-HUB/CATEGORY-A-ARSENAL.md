# Category A — Core Commercial Arsenal

Category A is the highest-priority skill layer for the AI/API commercial operation. These skills are the first line of capability for winning, building, securing, deploying, and maintaining paid client work.

## Selection rule

A skill belongs in Category A only if it materially improves our ability to sell or deliver a recurring commercial service, has a credible source/provenance, and can be used without committing secrets or granting unnecessary destructive access.

## A1 — Core Build & OpenAI

| Skill | Role |
|---|---|
| skill-creator | Create and maintain reusable delivery skills |
| skill-installer | Install/manage approved skills quickly |
| plugin-creator | Package reusable skills into deployable plugins |
| openai-docs | Implement against current OpenAI APIs/docs |
| cli-creator | Turn APIs/tools into reusable CLIs + companion skills |
| chatgpt-apps | Build ChatGPT Apps, Apps SDK and MCP integrations |
| OpenAI Developers plugin | Agents SDK, ChatGPT Apps, OpenAI API workflows and troubleshooting |

## A2 — Client Product Delivery

| Skill | Role |
|---|---|
| build-web-apps | Deliver client portals, dashboards and MVPs |
| build-web-data-visualization | Build reporting/data interfaces |
| data-analytics | Transform business data into useful analysis |
| creative-production | Automate creative/content production workflows |
| Figma plugin | Design-system and design-to-code delivery |
| Notion plugin | Knowledge bases, research, documentation and business workflows |
| Remotion plugin | Programmatic video/content production |
| Expo plugin | React Native/mobile app delivery |

## A3 — Automation & Integrations

| Skill | Role |
|---|---|
| n8n automation skills | Build/repair production workflows and integrations |
| Airtable | Database/CRM/operations automation |
| ClickUp | Project/operations workflow automation |
| Twilio Developer Kit | SMS/voice/communications automation |
| Supabase | Database/auth/backend delivery |
| Shopify skills | E-commerce integrations, Admin API, app/theme workflows and CLI operations |
| Google Drive plugin | Business document/file workflow automation |

## A4 — Production, Security & Reliability

| Skill | Role |
|---|---|
| Cloudflare / cloudflare-deploy | Deploy low-cost production infrastructure |
| Cloudflare AI Agent skill | Build stateful AI agents, tool calling, WebSockets and scheduled tasks |
| CodeRabbit | Automated code review and QA support |
| CircleCI | CI/CD automation |
| Sentry | Error monitoring and production diagnostics |
| PostHog | Product analytics and event instrumentation |
| codex-security | Security-focused development checks |
| Trail of Bits differential-review | High-value security/code review |
| Trail of Bits skill-improver | Improve skills through controlled review/fix loops |

## A5 — AI / Model Ecosystem

| Skill | Role |
|---|---|
| Hugging Face skills | Access/open-source model and ML workflows |

## A6 — High-Value Codex Plugin Opportunities

These are official or vendor-maintained Codex plugin/skill sources that are particularly relevant to the commercial operation. They are candidates for installation when a client project requires them; we do not blindly vendor every upstream bundle.

| Plugin / source | Commercial use |
|---|---|
| OpenAI Plugins — openai-developers | Build AI apps, agents and ChatGPT Apps |
| OpenAI Plugins — build-web-apps | Full-stack client apps, payments, databases, browser QA |
| OpenAI Plugins — cloudflare | Production hosting, storage, AI infrastructure and agents |
| OpenAI Plugins — shopify | E-commerce apps, Admin API and store automation |
| OpenAI Plugins — sentry | Production debugging and observability |
| OpenAI Plugins — notion | Research, documentation and knowledge workflows |
| OpenAI Plugins — figma | Design-to-code and design-system workflows |
| OpenAI Plugins — expo | Mobile application delivery |
| OpenAI Plugins — remotion | Programmatic video production |
| OpenAI Plugins — twilio-developer-kit | Voice/SMS communications and integrations |

## Commercial chain

Lead → Research → API → Automation → AI → CRM/communications → Web App → Analytics → Security → Deployment → Maintenance

## Security boundary

Category A does **not** mean unrestricted trust. Third-party skills remain subject to review. Never commit API keys, tokens, passwords, OAuth secrets, customer credentials, or private data. Prefer environment variables, GitHub Actions Secrets, Replit Secrets, or a production secret manager.

## Adoption status

This file records the approved Category A target set. It does not claim that every upstream skill source has been physically vendored into this repository. Official installers/plugins or individually reviewed local copies should be used for actual skill installation.
