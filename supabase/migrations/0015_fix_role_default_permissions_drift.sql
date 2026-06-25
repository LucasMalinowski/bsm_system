-- role_default_permissions (seeded in 0002) had drifted from the actual source of
-- truth, DEFAULT_PERMISSIONS_BY_ROLE in src/lib/auth/permissions.ts: it was missing
-- calibration:read/calibration:manage for admin and calibration:read for employee,
-- and incorrectly included document:upload for admin (admin upload is hard-blocked
-- at the app layer per FEATURES.md, so this never mattered until 0014 made
-- user_permissions authoritative for RLS — now it would matter if that app-layer
-- gate is ever relaxed). Reconcile the seed table, then re-sync everyone so the
-- correction takes effect immediately rather than waiting for a future role change.

insert into public.role_default_permissions (role, permission) values
  ('admin', 'calibration:read'),
  ('admin', 'calibration:manage'),
  ('employee', 'calibration:read')
on conflict do nothing;

delete from public.role_default_permissions
where role = 'admin' and permission = 'document:upload';

-- Re-sync every non-SA profile to the corrected defaults. This intentionally
-- overwrites any existing RoleManager overrides with role defaults — acceptable
-- here since this runs once, immediately after correcting the source data it's
-- based on; from this point on the 0014 trigger only resyncs on an actual role
-- change, so future RoleManager overrides are preserved as intended.
do $$
declare
  r record;
begin
  for r in select id, role from public.profiles where role <> 'super_admin' loop
    delete from public.user_permissions where user_id = r.id;
    insert into public.user_permissions (user_id, permission)
    select r.id, permission from public.role_default_permissions where role = r.role;
  end loop;
end $$;
