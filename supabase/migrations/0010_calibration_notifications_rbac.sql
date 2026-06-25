-- Migration 0010: Calibration system, notifications, RBAC enhancements, document visibility

-- ============================================
-- 1. New columns on existing tables
-- ============================================

-- equipment: calibration control fields
alter table public.equipment
  add column if not exists requires_calibration boolean not null default true,
  add column if not exists calibration_periodicity text
    check (calibration_periodicity in ('semestral','anual','bi_anual','tri_anual','outro'));

-- documents: employee visibility control
alter table public.documents
  add column if not exists visible_to_employees boolean not null default false;

-- tickets: photo attachment + support request flag
alter table public.tickets
  add column if not exists photo_url text,
  add column if not exists is_support_request boolean not null default false;

-- ============================================
-- 2. Calibration documents (SA templates)
-- ============================================
create table if not exists public.calibration_documents (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  storage_path    text not null,
  current_version integer not null default 1,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger calibration_documents_updated_at
  before update on public.calibration_documents
  for each row execute function public.set_updated_at();

create index if not exists idx_calibration_docs_created on public.calibration_documents(created_at desc);

-- ============================================
-- 3. Calibration document versions
-- ============================================
create table if not exists public.calibration_document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.calibration_documents(id) on delete cascade,
  version      integer not null,
  storage_path text not null,
  file_size    bigint not null default 0,
  notes        text,
  uploaded_by  uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  unique(document_id, version)
);

create index if not exists idx_cal_doc_versions_doc on public.calibration_document_versions(document_id);

-- ============================================
-- 4. Equipment calibration points (multi-row table per equipment)
-- ============================================
create table if not exists public.equipment_calibration_points (
  id              uuid primary key default gen_random_uuid(),
  equipment_id    uuid not null references public.equipment(id) on delete cascade,
  point_value     text not null,
  criterion       text not null,
  error_tolerance numeric,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_cal_points_equipment on public.equipment_calibration_points(equipment_id, sort_order);

-- ============================================
-- 5. Calibration records
-- ============================================
create table if not exists public.calibration_records (
  id                       uuid primary key default gen_random_uuid(),
  equipment_id             uuid not null references public.equipment(id) on delete cascade,
  company_id               uuid not null references public.companies(id) on delete cascade,
  performed_by             uuid not null references public.profiles(id),
  template_doc_id          uuid references public.calibration_documents(id) on delete set null,
  child_storage_path       text,
  certificate_storage_path text,
  performed_at             date not null default current_date,
  notes                    text,
  created_at               timestamptz not null default now()
);

create index if not exists idx_cal_records_equipment   on public.calibration_records(equipment_id);
create index if not exists idx_cal_records_company     on public.calibration_records(company_id);
create index if not exists idx_cal_records_performed   on public.calibration_records(performed_at desc);

-- ============================================
-- 6. Notifications
-- ============================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null,
  metadata   jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user    on public.notifications(user_id);
create index if not exists idx_notifications_unread  on public.notifications(user_id) where read_at is null;
create index if not exists idx_notifications_created on public.notifications(created_at desc);

-- ============================================
-- 7. Company role permissions (per-company configurable role defaults)
-- ============================================
create table if not exists public.company_role_permissions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  role        public.user_role not null,
  permission  text not null,
  enabled     boolean not null default true,
  unique(company_id, role, permission)
);

create index if not exists idx_company_role_perms on public.company_role_permissions(company_id, role);

-- ============================================
-- 8. RLS Policies
-- ============================================

-- calibration_documents (SA write, all auth read)
alter table public.calibration_documents enable row level security;

create policy "super_admin full access on calibration_documents"
  on public.calibration_documents for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "authenticated can view calibration_documents"
  on public.calibration_documents for select
  using (auth.uid() is not null);

-- calibration_document_versions
alter table public.calibration_document_versions enable row level security;

create policy "super_admin full access on cal_doc_versions"
  on public.calibration_document_versions for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "authenticated can view cal_doc_versions"
  on public.calibration_document_versions for select
  using (auth.uid() is not null);

-- equipment_calibration_points (company scoped)
alter table public.equipment_calibration_points enable row level security;

create policy "super_admin full access on cal_points"
  on public.equipment_calibration_points for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "company users can view cal_points"
  on public.equipment_calibration_points for select
  using (
    exists (
      select 1 from public.equipment e
      where e.id = equipment_calibration_points.equipment_id
        and e.company_id = public.current_user_company_id()
    )
  );

create policy "company users with equipment update can manage cal_points"
  on public.equipment_calibration_points for all
  using (
    exists (
      select 1 from public.equipment e
      where e.id = equipment_calibration_points.equipment_id
        and e.company_id = public.current_user_company_id()
    )
    and public.user_has_permission('equipment:update')
  )
  with check (
    exists (
      select 1 from public.equipment e
      where e.id = equipment_calibration_points.equipment_id
        and e.company_id = public.current_user_company_id()
    )
    and public.user_has_permission('equipment:update')
  );

-- calibration_records
alter table public.calibration_records enable row level security;

create policy "super_admin full access on cal_records"
  on public.calibration_records for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "company users can view cal_records"
  on public.calibration_records for select
  using (company_id = public.current_user_company_id());

-- notifications (own only)
alter table public.notifications enable row level security;

create policy "users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "service can insert notifications"
  on public.notifications for insert
  with check (true);

-- company_role_permissions
alter table public.company_role_permissions enable row level security;

create policy "super_admin full access on company_role_permissions"
  on public.company_role_permissions for all
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "admins can manage their company role permissions"
  on public.company_role_permissions for all
  using (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'admin'
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'admin'
  );

create policy "users can view their company role permissions"
  on public.company_role_permissions for select
  using (company_id = public.current_user_company_id());

-- ============================================
-- 9. Storage buckets
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('calibration-docs', 'calibration-docs', false, 52428800,
   array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel']),
  ('calibration-records', 'calibration-records', false, 52428800,
   array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('ticket-photos', 'ticket-photos', false, 10485760,
   array['image/jpeg','image/png','image/webp']),
  ('equipment-photos', 'equipment-photos', true, 5242880,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Storage policies for calibration-docs bucket
create policy "super_admin can manage calibration-docs"
  on storage.objects for all
  using (bucket_id = 'calibration-docs' and public.is_super_admin())
  with check (bucket_id = 'calibration-docs' and public.is_super_admin());

create policy "authenticated can download calibration-docs"
  on storage.objects for select
  using (bucket_id = 'calibration-docs' and auth.uid() is not null);

-- Storage policies for calibration-records bucket
create policy "super_admin can manage calibration-records"
  on storage.objects for all
  using (bucket_id = 'calibration-records' and public.is_super_admin())
  with check (bucket_id = 'calibration-records' and public.is_super_admin());

create policy "company users can view calibration-records"
  on storage.objects for select
  using (bucket_id = 'calibration-records' and auth.uid() is not null);

-- Storage policies for ticket-photos bucket
create policy "users can upload ticket photos"
  on storage.objects for insert
  with check (bucket_id = 'ticket-photos' and auth.uid() is not null);

create policy "company users can view ticket photos"
  on storage.objects for select
  using (bucket_id = 'ticket-photos' and auth.uid() is not null);

-- Storage policies for equipment-photos bucket (public bucket)
create policy "authenticated can upload equipment photos"
  on storage.objects for insert
  with check (bucket_id = 'equipment-photos' and auth.uid() is not null);
