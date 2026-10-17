# API Factory persistence setup

The Vercel runtime uses ephemeral `/tmp` storage unless a dedicated external store is configured. Health can pass while the service is in a degraded state; the `/ready` response exposes `checks.registryPersistence`, `checks.artifactPersistence`, and `degraded`.

## Required configuration for durable state

Use a **dedicated Supabase project for Salamou-31**. Never point these variables at EASY's project.

- `FACTORY_REGISTRY_URL`: project URL, e.g. `https://PROJECT_REF.supabase.co`.
- `FACTORY_REGISTRY_SERVICE_ROLE_KEY`: Supabase service-role secret. Store only as a sensitive Vercel environment variable; never commit it or paste it into chat.
- `FACTORY_ARTIFACT_BUCKET`: optional; defaults to `api-factory-artifacts`.

Apply `migrations/20261017_api_factory_storage.sql` in that dedicated project's SQL editor. It creates the private artifact bucket and a singleton JSONB registry table with RLS enabled and no anon/authenticated access. The service-role key is required for server-to-server operations.

The registry adapter uses Supabase REST and the artifact adapter uses the private Supabase Storage API directly; no new npm dependency is required. Build and inspection use remote object storage when configured, while the registry row stores the artifact manifest. When remote configuration is partially present or remote requests fail, it fails closed rather than silently switching to ephemeral storage.

## Current limitation

The code supports durable state, but the deployment is **not durable until the environment variables point to a separately approved/dedicated project and the migration is applied**. The existing EASY project is intentionally excluded. No paid resource was created.
