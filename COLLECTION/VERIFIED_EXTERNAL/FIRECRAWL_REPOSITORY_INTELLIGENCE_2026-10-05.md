# Firecrawl Repository Intelligence — 2026-10-05

## Purpose

Reviewed Firecrawl's public repository ecosystem as a **Collection source**, not as a new project. The useful output is the reusable architecture and license-safe components that can strengthen Salamou-31, SOAT, Elite, and research/evidence workflows.

## Scope

Firecrawl currently exposes a large repository ecosystem. This artifact records the repositories/components that were inspected in this pass and are materially relevant to our operating system.

### P0 — directly reusable architecture

| Repository | License | Reuse decision | Why |
|---|---|---|---|
| `firecrawl/cli` | ISC | Adopt patterns, do not vendor blindly | Agent-facing CLI + skill installation/routing; separates core, build, and workflow skills |
| `firecrawl/skills` | ISC | Use as a source catalog | Clear separation of core/build/workflow skills and distribution via CI |
| `firecrawl/firecrawl-workflows` | ISC | Adopt workflow-authoring pattern | Outcome-focused skills rather than tool-only wrappers |
| `firecrawl/firecrawl-mcp-server` | MIT | Adopt architecture/patterns | MCP tool registration, schemas, structured outputs, retries/rate limits, server profiles |
| `firecrawl/pdf-inspector` | MIT | Candidate for local document path | Detects text/scanned/mixed PDFs and routes selectively to OCR |
| `firecrawl/anydoc` | MIT | Candidate for local document normalization | Converts common office/PDF formats to consistent Markdown locally |

### P1 — useful integration patterns

| Repository | Decision |
|---|---|
| `firecrawl/dsh-firecrawl` | Study provider-boundary pattern for search/fetch without enabling unsafe local model-chosen network access |
| `firecrawl/agent-browser-plugin-firecrawl` | Study browser capability boundary and evidence capture |
| `firecrawl/benchmark-devdex` | Study benchmark/evidence methodology |
| `firecrawl/last30flames` | Study freshness/research workflow patterns |
| `firecrawl/firecrawl-convex` | Study persistence/integration boundary only if a concrete need appears |

## Architecture extracted for Salamou-31

### 1. Capability layers

Keep these boundaries separate:

1. **Discovery** — search/map/index.
2. **Acquisition** — scrape/fetch/interact.
3. **Normalization** — clean structured content / Markdown.
4. **Evidence** — preserve source, timestamp, scope, and provenance.
5. **Verification** — validate required fields and freshness.
6. **Decision** — route only when evidence gates pass.
7. **Action** — SOAT/API Factory/Elite execution.

This matches the existing Salamou-31 evidence-first boundary: external collection must feed evidence, not silently become runtime truth.

### 2. Skill distribution pattern

Firecrawl separates:
- core operational skills;
- build/integration skills;
- outcome-focused workflow skills;
- a read-only catalog synchronized from source repositories.

Adopt this separation in our Collection/AI-API-HUB structure. Do not copy an entire external catalog into production.

### 3. MCP contract pattern

The Firecrawl MCP server uses explicit tool schemas, structured outputs, server profiles, credential/session boundaries, retries and rate limiting. The important reusable idea is **contract-first tool exposure**: each capability has a defined input/output boundary and failure behavior.

For Salamou-31, external research tools should produce a bounded evidence record before their result can influence SOAT/Elite planning.

### 4. Local-first document path

`pdf-inspector` and `anydoc` provide a strong zero/low-cost pattern:
- inspect/classify locally first;
- extract locally when possible;
- invoke OCR/hosted processing only when classification says it is necessary;
- preserve provenance and routing reason.

This is especially relevant to the Collection → evidence pipeline and reduces unnecessary paid API usage.

## License boundary

- MIT / ISC / Apache-2.0 components are preferred candidates for direct technical reuse subject to normal attribution/compliance review.
- Firecrawl's main `firecrawl` repository is AGPL-3.0; do **not** copy AGPL runtime code into closed/commercial services merely because the code is useful.
- Prefer adopting interfaces, schemas, workflow ideas, and independently implemented equivalents where license compatibility is uncertain.

## Concrete adoption plan

### SOAT

Do not change the SOAT runtime contract. Add external research/document inputs upstream of SOAT as evidence-bearing records. SOAT remains the execution/verification boundary.

### Elite

Use the extracted capability model to distinguish:
- research acquisition;
- evidence validation;
- planning;
- invocation;
- post-invocation verification.

An external web result must not be treated as successful execution evidence.

### Collection

Firecrawl becomes a **verified external source family**. Each imported finding must record:
- repository/source;
- exact component;
- license;
- observed capability;
- reuse decision;
- date researched;
- whether runtime adoption is actually verified.

### Revenue / API Factory

Prefer free/local extraction and classification before paid providers. No provider is considered free-capacity truth until current terms and runtime behavior are independently verified.

## Evidence boundary

This artifact is research intelligence, not production proof. It does not claim that any Firecrawl component has been installed, deployed, or invoked inside Salamou-31.

## Source repositories

- https://github.com/firecrawl
- https://github.com/firecrawl/cli
- https://github.com/firecrawl/skills
- https://github.com/firecrawl/firecrawl-workflows
- https://github.com/firecrawl/firecrawl-mcp-server
- https://github.com/firecrawl/pdf-inspector
- https://github.com/firecrawl/anydoc
- https://github.com/firecrawl/dsh-firecrawl

## Next execution gate

Only promote a Firecrawl-derived component from Collection intelligence to production implementation after:
1. license compatibility is confirmed;
2. the exact required code path is inspected;
3. an isolated test exists;
4. CI evidence passes;
5. deployment/runtime evidence exists where applicable.
