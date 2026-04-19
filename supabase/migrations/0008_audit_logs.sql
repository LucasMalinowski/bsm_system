create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references public.companies(id) on delete set null,
  user_id       uuid references public.profiles(id) on delete set null,
  action        text not null,          -- 'create' | 'update' | 'delete'
  resource_type text not null,          -- 'equipment' | 'ticket' | 'document' | 'user' | 'company'
  resource_id   uuid,
  resource_name text,
  old_data      jsonb,
  new_data      jsonb,
  ip_address    text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_logs_company_id   on public.audit_logs(company_id);
create index if not exists idx_audit_logs_user_id      on public.audit_logs(user_id);
create index if not exists idx_audit_logs_resource_type on public.audit_logs(resource_type);
create index if not exists idx_audit_logs_created_at   on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

-- Super admin sees everything
create policy "super_admin full access on audit_logs"
  on public.audit_logs for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Company admins see their company's logs
create policy "admins can view their company audit logs"
  on public.audit_logs for select
  using (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'admin'
  );

-- Any authenticated user can insert (service inserts on their behalf)
create policy "authenticated users can insert audit logs"
  on public.audit_logs for insert
  with check (auth.uid() is not null);
