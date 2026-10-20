# API Factory SOAT runtime verification — 2026-10-19

## Result

**CI-pinned local-provider verification: PASS. Production readiness: NOT PROVEN.**

- Workflow: [SOAT Runtime Integration Smoke](https://github.com/salamou1944/Salamou-31/actions/runs/39179590053)
- Source commit: `bada4b0feede31853b4afd246deb0b514a5e1ed0`
- Pinned SOAT revision: `600721c1fa30de27c14f6da5e5917049a5339036`
- Provider backend: `local-ollama-ci`
- Real completion observed: `"4"` (one character; deterministic smoke output, not a quality benchmark)
- Verification artifact: [run artifact 12155088912](https://github.com/salamou1944/Salamou-31/actions/runs/39179590053/artifacts/12155088912)
- Artifact ZIP SHA-256: `4b7a721294b6e53086e2e89a65c71231906029487383ceeb6ce3dd79b7f0faf5`

## Gates observed PASS

- API Factory deterministic test suite
- SOAT system-message request mapping
- Pinned SOAT runtime start and health check
- Authenticated provider bootstrap and API Factory probe
- Real chat completion through SOAT and local Ollama
- Official SOAT smoke suite through the bounded evidence runner (exit code 0; no timeout)
- Execution-contract verification from SOAT evidence
- Persisted verification record and evidence consumption by API Factory
- Business-outcome evidence gate transitioned from `DISCOVERED` to `ENTRY_POINT_VERIFIED`
- Verification artifact uploaded; cleanup completed

The uploaded verification record uses `evidence_level: provider`, `scope: ci-pinned-local-runtime`, and explicitly records `production_status: not_proven`.

## Boundary and remaining blockers

This proves the intended local provider and evidence contract work inside the pinned CI runtime. It does **not** prove the Railway service is deployed or healthy, that Vercel is serving the current main branch, that registry/artifact writes survive a fresh process, that a production provider is configured, or that any customer/revenue event occurred.

Current external-runtime blockers remain:
1. Railway's latest API Factory deployment failed at image-build preparation; current service config has no service variable names.
2. Vercel's READY production-target artifact is built from feature branch `feat/api-factory-railway-deployable-2026-10-16`, while project metadata reports `live: false`.
3. Production readiness requires a configured API key and separate durable registry plus artifact storage. Do not reuse EASY's Supabase project or weaken fail-closed authentication.
4. A fresh authenticated smoke must target the actual deployed service and prove persistence across process/invocation boundaries before production status advances.

No production secrets are included in this record.



## Repeat verification on 2026-10-20

- Repeat run: [39483019962](https://github.com/salamou1944/Salamou-31/actions/runs/39483019962) — **completed success** on source commit `b4989d6ed19cd9a4d383f44b1cc14f5bcb239a89`.
- API Factory deterministic tests, SOAT request mapping, pinned SOAT health, authenticated local Ollama provider bootstrap, authenticated API Factory probe, real completion, official SOAT smoke, execution contract, evidence persistence/consumption, business-outcome gate, artifact upload and cleanup all passed.
- The observed completion was again `"4"` (`completionChars: 1`), which is correct for the deterministic prompt but is not a content-quality benchmark.
- The verification record explicitly remains `evidence_level: provider`, `scope: ci-pinned-local-runtime`, and `production_status: not_proven`.
- Live Railway connector inspection on 2026-10-20 found the existing `salamou31-api-factory` service inside `EASY Runtime Production`, with no service variables, no attached volume, and a failed deployment. The deployment diagnosis reports `BUILD_IMAGE` / `Railpack failed to prepare the build`. It is not a verified API Factory runtime; no production deploy was attempted.

## Repeat verification on the evidence-note commit

- Repeat run: [39186226159](https://github.com/salamou1944/Salamou-31/actions/runs/39186226159) — **completed success** on source commit `f2e0b8c73979189555a8583361a5f8d547766033`.
- The repeat run passed the same deterministic API Factory tests, SOAT request mapping, pinned runtime health, authenticated local Ollama bootstrap/probe, real completion, official SOAT smoke, execution-contract validation, evidence persistence/consumption, business-outcome gate, artifact upload and cleanup.
- Latest artifact: [12158456947](https://github.com/salamou1944/Salamou-31/actions/runs/39186226159/artifacts/12158456947), SHA-256 `e05b92477f7f4a3e8caea1a18db3c5c8758c2283181474349802e5de78f64d6a`.
- The repeat confirms the CI-local path remains reproducible after the documentation commit. It does not change the explicit `production_status: not_proven` boundary.
