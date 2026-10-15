# Provider verification setup

A green GitHub Actions workflow does **not** mean a provider is verified if its live-probe step was skipped. Each P1 provider workflow now writes an explicit **NOT VERIFIED** summary when required credentials are absent.

## Add credentials securely

In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**. Add only the secrets for providers you intend to test:

| Provider | Required repository secrets |
|---|---|
| Cloudflare Workers AI | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` |
| Hugging Face Inference | `HF_TOKEN` |
| Mistral | `MISTRAL_API_KEY` |
| NVIDIA NIM | `NVIDIA_NIM_API_KEY` |

Do not commit keys to source code, workflow files, issues, or chat messages.

## Run and verify

1. Open **Actions** in the repository.
2. Select the matching **P1 … Real Probe** workflow.
3. Choose **Run workflow** on `main`.
4. Open the run summary and artifact.
5. Count the provider as verified only when the real probe and evidence-validation steps both pass and the artifact records a successful real completion. A skipped probe means **NOT VERIFIED**, not success.

## Cost and status policy

- Free-provider probes may call the selected provider and are still subject to that provider's rate limits.
- OpenAI paid probes are not automatically run on pushes unless repository variable `ENABLE_PAID_PROVIDER_PROBES=true` is explicitly enabled. Manual dispatch remains available.
- A provider must not be promoted to production routing based only on a successful CI job when its real probe was skipped.
