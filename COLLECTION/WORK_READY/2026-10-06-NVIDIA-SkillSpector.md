# NVIDIA SkillSpector — Work-Ready Evidence — 2026-10-06

## Source
- Repository: NVIDIA/SkillSpector
- Ref: ef0f96d76f197b80a8e25c32dac39cc85b104e4d
- License: Apache-2.0
- Classification: P0 SECURITY GATE + READY PROJECT
- Axis 1: VERY HIGH
- Axis 2: VERY HIGH

## Exact implementation
- Python 3.12+.
- CLI entrypoint: `skillspector`.
- Static analysis plus optional LLM semantic analysis.
- Supports Git repositories, URLs, ZIPs, directories and individual skill files.
- Produces terminal, JSON, Markdown and SARIF output.
- Includes resource bounds and fail-closed ingest limits.
- Docker image and Docker smoke test are part of the upstream repository.
- Upstream CI defines unit, lint/format, OpenCode, and Docker smoke gates.

## Control-plane adaptation
A thin isolated runtime gate was added to Salamou-31:
`.github/workflows/collection-skillspector-runtime.yml`

Control-plane commit: `b422618b6ee3764048f610ba3acdd65cb9530220`

The gate pins the exact upstream commit and runs:
1. Python unit/static tests.
2. CLI version and a real scan against the upstream safe fixture.
3. Docker build and upstream Docker smoke test.
4. Evidence artifact emission only after all gates pass.

No upstream code is modified.

## Promotion boundary
Repository/README evidence is not runtime proof. This record remains provisional until a real GitHub Actions runner produces the evidence artifact.

## Current state
BLOCKED_RUNTIME_EXECUTION_PENDING_RUN

## Next action
Inspect the resulting GitHub Actions run. If all gates pass, promote to READY_TO_USE and then wire SkillSpector as the pre-install security gate for Collection/Elite skill assets.
