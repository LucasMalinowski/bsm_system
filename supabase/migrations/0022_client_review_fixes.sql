-- Migration 0022: Client review fixes
-- Adds cost fields, maintenance_records table, ticket tracking timestamps,
-- and locks document delete/version-upload to super_admin only.

-- ============================================
-- 1. Cost fields on existing tables
-- ============================================

alter table public.equipment
  add column if not exists acquisition_cost numeric(12,2);

alter table public.calibration_records
  add column if not exists cost numeric(12,2);

-- ============================================
-- 2. Ticket tracking timestamps
-- ============================================

alter table public.tickets
  add column if not exists picked_up_at  timestamptz,
  add column if not exists returned_at   timestamptz,
  add column if not exists closed_at     timestamptz;

-- ============================================
-- 3. Maintenance records (standalone table)
-- ============================================

create table if not exists public.maintenance_records (
  id            uuid        primary key default gen_random_uuid(),
  equipment_id  uuid        not null references public.equipment(id)  on delete cascade,
  company_id    uuid        not null references public.companies(id)   on delete cascade,
  performed_by  uuid        references public.profiles(id)            on delete set null,
  performed_at  date        not null,
  description   text        not null,
  cost          numeric(12,2),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_maintenance_equipment on public.maintenance_records(equipment_id);
create index if not exists idx_maintenance_company   on public.maintenance_records(company_id);
create index if not exists idx_maintenance_date      on public.maintenance_records(performed_at desc);

create trigger maintenance_records_updated_at
  before update on public.maintenance_records
  for each row execute function public.set_updated_at();

alter table public.maintenance_records enable row level security;

create policy "super_admin full access on maintenance_records"
  on public.maintenance_records for all
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- Admin: full access within their company
create policy "admin can manage maintenance_records in their company"
  on public.maintenance_records for all
  using  (company_id = public.current_user_company_id() and public.current_user_role() = 'admin')
  with check (company_id = public.current_user_company_id() and public.current_user_role() = 'admin');

-- Employees: read-only within their company
create policy "employees can view maintenance_records in their company"
  on public.maintenance_records for select
  using  (company_id = public.current_user_company_id());

-- ============================================
-- 4. Lock document delete + version-upload to SA only
--    Remove document:delete and document:update from admin defaults,
--    then re-sync existing admin user_permissions.
-- ============================================

-- Remove document:delete from admin role (version-upload is now SA-only at the API
-- layer directly; document:update stays so admins can still toggle visibility).
delete from public.role_default_permissions
where role = 'admin' and permission = 'document:delete';

-- Re-sync all admin users so the change takes immediate effect
do $$
declare
  r record;
begin
  for r in select id from public.profiles where role = 'admin' loop
    delete from public.user_permissions
    where user_id = r.id and permission = 'document:delete';
  end loop;
end $$;
