-- Product 001 customer API keys and durable quota accounting.
-- Apply only to the dedicated Salamou-31 Supabase project, never EASY.
create table if not exists public.api_factory_customer_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique check (key_hash ~ '^[a-f0-9]{64}$'),
  label text not null check (char_length(label) between 1 and 100),
  status text not null default 'active' check (status in ('active', 'revoked')),
  quota_limit bigint not null check (quota_limit between 1 and 100000),
  usage_count bigint not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.api_factory_customer_usage (
  id bigint generated always as identity primary key,
  customer_key_id uuid not null references public.api_factory_customer_keys(id),
  route text not null check (char_length(route) between 1 and 120),
  created_at timestamptz not null default now()
);

create index if not exists api_factory_customer_usage_key_created_idx
  on public.api_factory_customer_usage (customer_key_id, created_at desc);

alter table public.api_factory_customer_keys enable row level security;
alter table public.api_factory_customer_usage enable row level security;
revoke all on table public.api_factory_customer_keys from anon, authenticated;
revoke all on table public.api_factory_customer_usage from anon, authenticated;
grant all on table public.api_factory_customer_keys to service_role;
grant all on table public.api_factory_customer_usage to service_role;

create or replace function public.consume_api_factory_customer_key(
  p_key_hash text,
  p_route text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  key_row public.api_factory_customer_keys%rowtype;
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'CUSTOMER_API_KEY_INVALID');
  end if;
  if p_route is null or char_length(p_route) < 1 or char_length(p_route) > 120 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_USAGE_ROUTE');
  end if;

  select * into key_row
  from public.api_factory_customer_keys
  where key_hash = p_key_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'CUSTOMER_API_KEY_INVALID');
  end if;
  if key_row.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'CUSTOMER_API_KEY_REVOKED');
  end if;
  if key_row.usage_count >= key_row.quota_limit then
    return jsonb_build_object(
      'ok', false,
      'code', 'CUSTOMER_QUOTA_EXCEEDED',
      'keyId', key_row.id,
      'usageCount', key_row.usage_count,
      'quotaLimit', key_row.quota_limit,
      'remaining', 0
    );
  end if;

  update public.api_factory_customer_keys
  set usage_count = usage_count + 1
  where id = key_row.id
  returning * into key_row;

  insert into public.api_factory_customer_usage (customer_key_id, route)
  values (key_row.id, p_route);

  return jsonb_build_object(
    'ok', true,
    'keyId', key_row.id,
    'label', key_row.label,
    'usageCount', key_row.usage_count,
    'quotaLimit', key_row.quota_limit,
    'remaining', greatest(0, key_row.quota_limit - key_row.usage_count)
  );
end;
$$;

revoke all on function public.consume_api_factory_customer_key(text, text) from public, anon, authenticated;
grant execute on function public.consume_api_factory_customer_key(text, text) to service_role;
