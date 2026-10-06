# OpenShell — Work-Ready Evidence — 2026-10-06

## Source
- Repository: NVIDIA/OpenShell
- Ref: b7afc156137e7300c8fb266261c9f18a1a497ea9
- License: Apache-2.0
- Classification: P0 ELITE/ARMY-14 INFRA + READY PROJECT
- Axis 1: VERY HIGH
- Axis 2: VERY HIGH

## Exact implementation inspection
- Runtime: Rust workspace + Python SDK/CLI.
- Python requires >=3.11.
- Rust workspace requires Rust 1.94.
- Core isolation model: sandboxed agents, kernel-level enforcement, policy-controlled filesystem/syscall/network access, credential binding to approved endpoints, and policy-change verification.
- Runtime prerequisites: Linux, macOS Apple Silicon, or Windows/WSL2 experimental; Docker/Podman/host virtualization.
- Test commands documented upstream:
  - `mise run test`
  - `mise run test:python`
  - `mise run e2e`
  - `mise run e2e:docker`

## Adaptation decision
OpenShell is **not copied into Elite/ARMY-14** and upstream is not modified.
A thin isolated proof gate was added to Salamou-31:
`.github/workflows/collection-openshell-runtime.yml`
Commit: `47b0d7cd7b8319025a3052be517b7afec9f081c3`

The gate pins the exact upstream ref and attempts:
1. Python unit tests.
2. Docker-backed E2E.
3. Promotion evidence only after both pass.

## Runtime result
**NOT PROVEN YET.**

The new control-plane workflow was committed, but GitHub has not produced a workflow run for commit `47b0d7cd7b8319025a3052be517b7afec9f081c3` in the available Actions API view.

A second independent execution attempt from the available runtime environment also failed before checkout because external DNS/network access to `github.com` is unavailable:
`fatal: unable to access 'https://github.com/NVIDIA/OpenShell.git/': Could not resolve host: github.com`.

Therefore no Python test or Docker E2E result is being fabricated.

## Promotion
**BLOCKED_RUNTIME_EXECUTION**

Not READY_TO_USE and not PRODUCTION_VERIFIED.

## Next executable action
Obtain one real runner execution of the pinned proof workflow. Promotion can then proceed based on actual `test:python` + `e2e:docker` evidence.

## Relevance
If runtime proof passes, OpenShell becomes the preferred isolated execution/policy boundary candidate for Elite/ARMY-14, while remaining a separately preserved upstream project under Collection.
