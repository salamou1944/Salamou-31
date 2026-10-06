# WORK-READY EXECUTION — msajja5/supplymind-sales-outreach

Date: 2026-10-06
Source account: msajja5
Repository: msajja5/supplymind-sales-outreach
Default branch: main

## Objective
Operationalize the P0 revenue candidate identified by Collection without spending money and without claiming runtime proof that has not been performed.

## Source evidence inspected
- README.md @ blob 758d2ae6fe9dc0a09f10f9c50efbdcfc84d4fc9b
- package.json @ blob bbdb0cc9d548cc563e71631fb4292132132351f3
- Relevant implementation history:
  - 0106b6aa37fe28aade78436066fb1ef96a830c56 — full build
  - b7b64d48f67d16ca1dbf48c993b32ebe875373e3 — Generate.tsx rewrite
  - 507cccee410d76ab5342eb2bd228023d646e8710 — switch to Groq generate-message endpoint

## Classification
- Axis 1: VERY HIGH — sales/outreach automation.
- Axis 2: VERY HIGH — independently productizable B2B outreach workflow.
- Collection priority: P0 REVENUE ASSET.
- Current promotion state: BLOCKED_PENDING_RUNTIME_PROOF.

## Implementation requirements
Stack:
- React 18 + TypeScript + Vite
- Supabase PostgreSQL + RLS + Auth
- Supabase Edge Function: generate-message
- Vercel deployment path
- Required public frontend variables:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
- README identifies the Supabase project URL and an ACTIVE generate-message Edge Function.

## Free-first execution assessment
The frontend build itself has no paid runtime requirement.
The AI generation path depends on the deployed Supabase Edge Function and its provider configuration. The repository history shows the generation endpoint was switched to Groq, so provider configuration must be verified before claiming real generation.

## Evidence gate
PASS:
- Repository exists and contains a concrete full-stack implementation.
- package.json exposes build and typecheck scripts.
- README documents runtime/deployment architecture and environment contract.
- Git history contains implementation/fix commits for the AI generation path.

NOT YET PROVEN:
- npm install/build/typecheck execution in an isolated runtime.
- Supabase Auth/database/RLS runtime.
- generate-message real provider invocation.
- production Vercel deployment and public smoke test.
- end-to-end generation of a real outreach message.

## Exact blocker
The available GitHub connector can inspect and modify repository files, but no verified local runtime execution result has been produced in this pass. Therefore this candidate MUST NOT be promoted to READY_TO_USE or PRODUCTION_VERIFIED yet.

## Next executable action
Run the repository's real build/typecheck and then perform an authenticated end-to-end generate-message smoke test against the configured Supabase project. If provider credentials/quota are missing, record the provider as BLOCKED and keep the rest of the frontend path independently validated.

## Promotion rule
- Build + typecheck pass: READY_TO_USE for frontend code only.
- Real Supabase + Edge Function generation pass: READY_TO_DEPLOY.
- Public deployed end-to-end smoke pass: PRODUCTION_VERIFIED.
- Missing provider credentials/quota: BLOCKED with exact missing input.

## Spending rule
No paid service should be enabled solely to complete this gate. Prefer the existing Supabase/Vercel free path and the already-selected provider configuration.
