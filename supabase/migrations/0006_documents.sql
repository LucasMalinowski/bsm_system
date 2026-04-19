create table if not exists public.document_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_document_categories_company on public.document_categories(company_id);

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  category_id   uuid references public.document_categories(id) on delete set null,
  equipment_id  uuid references public.equipment(id) on delete set null,
  name          text not null,
  description   text,
  storage_path  text not null,
  mime_type     text not null default 'application/octet-stream',
  file_size     bigint not null default 0,
  version       integer not null default 1,
  uploaded_by   uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create index if not exists idx_documents_company_id on public.documents(company_id);
create index if not exists idx_documents_category on public.documents(category_id);
create index if not exists idx_documents_equipment on public.documents(equipment_id);
create index if not exists idx_documents_updated_at on public.documents(updated_at desc);

create table if not exists public.document_versions (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  version       integer not null,
  storage_path  text not null,
  file_size     bigint not null default 0,
  uploaded_by   uuid not null references public.profiles(id),
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_document_versions_document on public.document_versions(document_id);

-- RLS
alter table public.document_categories enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;

create policy "super_admin full access on document_categories"
  on public.document_categories for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users can view their company document categories"
  on public.document_categories for select
  using (company_id = public.current_user_company_id());

create policy "admin can manage document categories"
  on public.document_categories for all
  using (company_id = public.current_user_company_id() and public.current_user_role() = 'admin')
  with check (company_id = public.current_user_company_id() and public.current_user_role() = 'admin');

create policy "super_admin full access on documents"
  on public.documents for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users can view their company documents"
  on public.documents for select
  using (company_id = public.current_user_company_id() and public.user_has_permission('document:read'));

create policy "users with permission can upload documents"
  on public.documents for insert
  with check (company_id = public.current_user_company_id() and public.user_has_permission('document:upload') and uploaded_by = auth.uid());

create policy "users with permission can update documents"
  on public.documents for update
  using (company_id = public.current_user_company_id() and public.user_has_permission('document:update'));

create policy "users with permission can delete documents"
  on public.documents for delete
  using (company_id = public.current_user_company_id() and public.user_has_permission('document:delete'));

create policy "super_admin full access on document_versions"
  on public.document_versions for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users can view versions of their company documents"
  on public.document_versions for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and d.company_id = public.current_user_company_id()
    )
  );
