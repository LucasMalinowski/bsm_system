
-- Companies table
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  primary_color   text not null default '#0363a9',
  secondary_color text not null default '#008adb',
  accent_color    text not null default '#e0f0fb',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- Helper to set company context for RLS
create or replace function public.set_company_context(p_company_id uuid)
returns void language sql security definer as $$
  select set_config('app.current_company_id', p_company_id::text, true);
$$;

-- Index on slug for tenant resolution
create index if not exists idx_companies_slug on public.companies(slug);
