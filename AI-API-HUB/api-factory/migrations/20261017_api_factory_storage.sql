-- API Factory durable state schema.
-- Run only in a dedicated Supabase project for Salamou-31; do not run in EASY's project.
create table if not exists public.api_factory_registry (
  id text primary key check (id = 'singleton'),
  payload jsonb not null default '{"apis":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.api_factory_registry enable row level security;
revoke all on table public.api_factory_registry from anon, authenticated;
grant all on table public.api_factory_registry to service_role;

insert into storage.buckets (id, name, public)
values ('api-factory-artifacts', 'api-factory-artifacts', false)
on conflict (id) do update set public = false;
