-- Root cause of the RLS/permission-sync gap: role_default_permissions was meant
-- to be copied into user_permissions "at invitation time" (per its own comment in
-- 0002_auth_profiles.sql) but nothing ever did that copy. user_has_permission()
-- only checks literal rows in user_permissions, with no role-based fallback, so any
-- admin/employee whose user_permissions was never populated is silently blocked by
-- RLS on every table even though the app layer (get-session.ts) optimistically
-- falls back to DEFAULT_PERMISSIONS_BY_ROLE and shows them as fully permitted.

-- 1. Keep user_permissions in sync with role_default_permissions whenever a
--    profile is created or its role changes. A role change resets to that role's
--    defaults (consistent with "applied at invitation time"); RoleManager
--    overrides made afterwards are untouched as long as the role doesn't change
--    again, since this only fires on insert or on an actual role change.
create or replace function public.sync_user_permissions_from_role()
returns trigger language plpgsql security definer as $$
begin
  if new.role = 'super_admin' then
    return new;
  end if;

  if tg_op = 'INSERT' or old.role is distinct from new.role then
    delete from public.user_permissions where user_id = new.id;

    insert into public.user_permissions (user_id, permission)
    select new.id, permission
    from public.role_default_permissions
    where role = new.role;
  end if;

  return new;
end;
$$;

create or replace trigger profiles_sync_permissions
  after insert or update on public.profiles
  for each row execute function public.sync_user_permissions_from_role();

-- 2. One-time backfill for existing profiles whose user_permissions is empty
--    (every admin/employee invited before this fix). Skips anyone who already
--    has rows, so genuine RoleManager overrides are preserved.
insert into public.user_permissions (user_id, permission)
select p.id, rdp.permission
from public.profiles p
join public.role_default_permissions rdp on rdp.role = p.role
where p.role <> 'super_admin'
  and not exists (
    select 1 from public.user_permissions up where up.user_id = p.id
  );
