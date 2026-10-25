# Product 001 — Pilot Prospecting Pack

**Purpose:** acquire the first legitimate pilot customer for Username Research API without paid acquisition or new subscriptions.

**Evidence boundary:** two initial outreach emails were sent on 2026-10-25 from the dedicated AI API Pilot Outreach inbox. No reply, customer conversion, or revenue is confirmed. Fit remains a hypothesis based on public company descriptions. Do not claim a partnership, integration, customer, or endorsement.

## Pilot offer to validate

- **Product:** Sherlock-backed public username discovery endpoint.
- **Use case:** enrich an existing analyst or prospect-research workflow with machine-readable public-profile discovery.
- **Pilot cap:** up to 25 request attempts on one customer-specific key, for seven days.
- **Commercial model:** manually agreed, one-time pilot; quote the price and payment method before activation and record payment only after it is actually confirmed.
- **Support boundary:** operator-assisted setup; no uptime SLA, no guaranteed platform coverage, and no claim of verified identity.
- **Important quota term:** every syntactically valid attempt consumes quota before the upstream call, including a provider failure or timeout.
- **Not included:** self-serve onboarding, automated checkout, automated billing, generated API registration, or identity verification.

Do not issue a key until the prospect has agreed to scope and price. Never share the internal FACTORY_API_KEY; create a dedicated customer key only.

## Ranked prospects

### 1. Institut d'Études Algériennes (IEA) — strongest local fit

- **Why:** its public site describes market research, data/AI, social-media listening, media intelligence, and business research—work where an analyst may need to triage public usernames.
- **Contact:** contact@iea-etudes.com
- **Phone:** +213 555 080 148
- **Outreach:** sent 2026-10-25 from api-pilot@agentmail.to; message ID: <010001a170eb2421-6dd1c3e4-da1c-4cc3-a975-67b9d7b45d56-000000@email.amazonses.com>
- **Website:** https://iea-etudes.com/
- **Suggested angle:** test whether username discovery can reduce the manual first-pass work in a media-intelligence or brand-research workflow. Ask for one narrow workflow and do not imply the API replaces their existing research process.
- **Status:** CONTACTED — awaiting reply.

### 2. IMMAR Media — Algerian media monitoring and e-reputation

- **Why:** its public site describes social-media monitoring, e-reputation, media monitoring, and audience measurement in Algeria.
- **Contact:** contact@immar-media.net
- **Phone:** +213 23 31 20 80
- **Outreach:** sent 2026-10-25 from api-pilot@agentmail.to; message ID: <010001a170eb2dfd-e52f41e6-fe70-48e7-9ddf-6e07583f708a-000000@email.amazonses.com>
- **Website:** https://immar-media.com/home/
- **Suggested angle:** a small analyst-assist trial for discovering public profiles from a supplied username during an e-reputation investigation. Be explicit that this endpoint is not a full social-listening product.
- **Status:** CONTACTED — awaiting reply.

### 3. Linkiw — Algerian B2B prospecting platform

- **Why:** its site describes B2B prospecting in Algeria, automatic enrichment, and an AI prospecting agent. Username discovery may be an adjacent enrichment signal, but product overlap and usefulness must be confirmed.
- **Contact route:** official site contact form at https://linkiw.app/en
- **Suggested angle:** ask whether an optional username-to-public-profile lookup would add value to a specific enrichment workflow. Do not pitch it as contact-data verification.
- **Status:** not contacted.

### 4. B2B Lead Generation Agency — global outbound operator

- **Why:** its site says it builds and runs B2B lead-generation systems for SaaS, agencies, and service businesses, including audience mapping and prospect enrichment.
- **Contact:** hello@b2bleadgenerationagency.com
- **Website/contact:** https://b2bleadgenerationagency.com/contact
- **Suggested angle:** test username discovery as a narrowly scoped research signal for a client-approved prospect list, not as a source of private contact data.
- **Status:** not contacted.

### 5. Veydan — OSINT/investigation workflow product (lower priority; potential overlap)

- **Why:** its site describes evidence-led OSINT workflows, public-source collection, and early access. It may be more likely to build this capability internally, so qualify before spending time.
- **Contact:** bc@veydan.app
- **Website:** https://veydan.app/
- **Suggested angle:** ask whether a lightweight external username-discovery endpoint is useful for a specific prototype or overflow workflow. Acknowledge that its existing product may already cover the use case.
- **Status:** not contacted.

## First outreach message — English

**Subject:** Small pilot: username research API for analyst workflows

Hello,

I saw that your team works on [specific service from the prospect's public site]. I'm testing a small API that takes a supplied username and returns public-profile discovery evidence that can be reviewed in an analyst or enrichment workflow.

The endpoint is live, and customer-specific API keys, request quotas, and revocation have been tested in production. It is deliberately narrow: a username lookup, not a full social-listening platform, not private contact-data enrichment, and not identity verification.

Would a seven-day pilot of up to 25 request attempts be useful for one concrete workflow on your side? If so, I can share the request example and agree the scope and one-time pilot price before issuing a dedicated key. Provider failures can consume a request from the quota, and every finding remains subject to human review.

If this is outside your current priorities, no problem.

Best,
Salamou

## First outreach message — French (Algeria)

**Objet : Petit pilote API pour la recherche de profils publics à partir d’un nom d’utilisateur**

Bonjour,

J’ai vu que votre équipe travaille sur [service précis présenté sur votre site]. Je teste une API ciblée qui reçoit un nom d’utilisateur et renvoie des indices de présence sur des profils publics, à examiner ensuite par un analyste ou dans un flux d’enrichissement.

L’endpoint est en production. Les clés API propres à chaque client, les quotas et la révocation ont été testés. Le périmètre reste volontairement limité : recherche de profils publics, sans données privées, sans garantie d’identité et sans remplacer une plateforme complète de veille sociale.

Un pilote de sept jours, limité à 25 tentatives, pourrait-il être utile pour un cas d’usage précis chez vous ? Si oui, je peux partager un exemple de requête et convenir du périmètre et du prix forfaitaire avant d’activer une clé dédiée. Une panne du fournisseur peut consommer une tentative ; les résultats doivent donc rester soumis à une vérification humaine.

Merci,
Salamou

## Qualification questions

Ask these before issuing a key:
1. What exact workflow would the pilot improve?
2. Who will review the returned evidence, and what decision will it inform?
3. Is 25 request attempts enough to validate usefulness?
4. What coverage gaps or false positives would make the result unusable?
5. Who approves the pilot and payment?
6. Which lawful use case and data-handling expectations apply?

## Evidence and conversion tracking

Maintain one row per prospect with: company, public source URL, contact channel, outreach date, response, stated use case, pilot scope, quoted price, payment status, key ID (never raw key), quota, activation date, usage evidence, outcome, and next action.

Allowed stages:
- RESEARCHED
- CONTACTED (only after an actual message is sent)
- REPLIED
- QUALIFIED
- OFFER_SENT
- PAYMENT_CONFIRMED
- KEY_ISSUED
- CUSTOMER_ACTION_OBSERVED
- PILOT_COMPLETED
- REVENUE_OBSERVED (only after real payment evidence)

Do not skip stages or mark outreach, customer use, or revenue based on this prospect list alone.

## Public-source notes

- IEA — https://iea-etudes.com/
- IMMAR Media — https://immar-media.com/home/
- Linkiw — https://linkiw.app/en
- B2B Lead Generation Agency — https://b2bleadgenerationagency.com/contact
- Veydan — https://veydan.app/
