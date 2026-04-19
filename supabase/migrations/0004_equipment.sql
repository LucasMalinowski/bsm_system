-- Equipment categories
create table if not exists public.equipment_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger equipment_categories_updated_at
  before update on public.equipment_categories
  for each row execute function public.set_updated_at();

create index if not exists idx_equipment_categories_company on public.equipment_categories(company_id);

-- Equipment status enum
create type public.equipment_status as enum (
  'active', 'inactive', 'under_maintenance', 'calibration', 'retired'
);

-- Equipment main table
create table if not exists public.equipment (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  category_id       uuid references public.equipment_categories(id) on delete set null,
  internal_code     text not null,
  name              text not null,
  brand             text,
  model             text,
  serial_number     text,
  status            public.equipment_status not null default 'active',
  location          text,
  acquisition_date  date,
  last_calibration  date,
  next_calibration  date,
  notes             text,
  qr_code_token     text not null unique default gen_random_uuid()::text,
  image_url         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(company_id, internal_code)
);

create trigger equipment_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

create index if not exists idx_equipment_company_id on public.equipment(company_id);
create index if not exists idx_equipment_internal_code on public.equipment(internal_code);
create index if not exists idx_equipment_qr_token on public.equipment(qr_code_token);
create index if not exists idx_equipment_updated_at on public.equipment(updated_at desc);
create index if not exists idx_equipment_status on public.equipment(status);

-- Equipment history / audit
create table if not exists public.equipment_history (
  id            uuid primary key default gen_random_uuid(),
  equipment_id  uuid not null references public.equipment(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  action        text not null,
  description   text not null,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_equipment_history_equipment on public.equipment_history(equipment_id);
create index if not exists idx_equipment_history_created on public.equipment_history(created_at desc);

-- RLS
alter table public.equipment_categories enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_history enable row level security;

-- Equipment categories policies
create policy "super_admin full access on equipment_categories"
  on public.equipment_categories for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users can view their company categories"
  on public.equipment_categories for select
  using (company_id = public.current_user_company_id());

create policy "admin can manage categories"
  on public.equipment_categories for all
  using (company_id = public.current_user_company_id() and public.current_user_role() in ('admin'))
  with check (company_id = public.current_user_company_id() and public.current_user_role() in ('admin'));

-- Equipment policies
create policy "super_admin full access on equipment"
  on public.equipment for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users can view their company equipment"
  on public.equipment for select
  using (company_id = public.current_user_company_id() and public.user_has_permission('equipment:read'));

create policy "users with permission can create equipment"
  on public.equipment for insert
  with check (company_id = public.current_user_company_id() and public.user_has_permission('equipment:create'));

create policy "users with permission can update equipment"
  on public.equipment for update
  using (company_id = public.current_user_company_id() and public.user_has_permission('equipment:update'));

create policy "users with permission can delete equipment"
  on public.equipment for delete
  using (company_id = public.current_user_company_id() and public.user_has_permission('equipment:delete'));

-- Equipment history policies
create policy "super_admin full access on equipment_history"
  on public.equipment_history for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users can view history of their company equipment"
  on public.equipment_history for select
  using (
    exists (
      select 1 from public.equipment e
      where e.id = equipment_history.equipment_id
        and e.company_id = public.current_user_company_id()
    )
  );

create policy "users can insert history for their company equipment"
  on public.equipment_history for insert
  with check (
    exists (
      select 1 from public.equipment e
      where e.id = equipment_history.equipment_id
        and e.company_id = public.current_user_company_id()
    )
    and user_id = auth.uid()
  );
