alter table public.tickets
  add column if not exists finalization_reason text,
  add column if not exists finalization_notes  text,
  add column if not exists budget_url          text;

insert into public.role_default_permissions (role, permission) values
  ('super_admin', 'ticket:comment'),
  ('admin',       'ticket:comment'),
  ('employee',    'ticket:comment')
on conflict do nothing;

insert into public.user_permissions (user_id, permission)
select p.id, 'ticket:comment'
from public.profiles p
where p.role <> 'super_admin'
  and not exists (
    select 1 from public.user_permissions up
    where up.user_id = p.id and up.permission = 'ticket:comment'
  );
