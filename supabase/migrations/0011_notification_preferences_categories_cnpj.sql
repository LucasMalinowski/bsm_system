-- Migration 0011: Notification preferences, document_categories RLS fix, CNPJ on companies

-- ============================================
-- 1. Notification preferences (per-user toggles)
-- ============================================
create table if not exists public.notification_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade unique,
  cal_alert  boolean not null default true,
  unassigned boolean not null default true,
  weekly     boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "users can view their own notification preferences"
  on public.notification_preferences for select
  using (user_id = auth.uid());

create policy "users can upsert their own notification preferences"
  on public.notification_preferences for insert
  with check (user_id = auth.uid());

create policy "users can update their own notification preferences"
  on public.notification_preferences for update
  using (user_id = auth.uid());

create policy "service role can manage notification preferences"
  on public.notification_preferences for all
  using (true)
  with check (true);

-- ============================================
-- 2. CNPJ column on companies
-- ============================================
alter table public.companies
  add column if not exists cnpj text;
