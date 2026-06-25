-- 1. role_default_permissions: was created without RLS
alter table public.role_default_permissions enable row level security;

create policy "super_admin full access on role_default_permissions"
  on public.role_default_permissions for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Read-only for authenticated users (invitation flow seeds user_permissions from here)
create policy "authenticated can read role_default_permissions"
  on public.role_default_permissions for select
  using (auth.uid() is not null);

-- 2. document_versions: INSERT was missing for non-super_admin users.
-- Documents upload is currently super_admin-only, but add the policy now
-- so it won't silently break if that changes.
create policy "users with permission can insert document versions"
  on public.document_versions for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and d.company_id = public.current_user_company_id()
    )
    and public.user_has_permission('document:create')
  );

-- 3. notifications INSERT: was `with check (true)` — allows unauthenticated inserts.
-- Replace with a policy that requires an authenticated caller.
drop policy if exists "service can insert notifications" on public.notifications;

create policy "authenticated can insert notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);
