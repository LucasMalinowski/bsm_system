-- Seed file: creates a super_admin user and a demo company
-- Run after migrations

-- Insert a demo company
insert into public.companies (id, name, slug, primary_color, secondary_color, accent_color)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Lab',
  'demo-lab',
  '#0363a9',
  '#008adb',
  '#e0f0fb'
) on conflict (slug) do nothing;

-- NOTE: Create users via Supabase Auth Dashboard or API, then update their profiles:
-- update public.profiles
--   set role = 'super_admin', company_id = null
--   where id = '<your-user-uuid>';
--
-- update public.profiles
--   set role = 'admin', company_id = '00000000-0000-0000-0000-000000000001'
--   where id = '<admin-user-uuid>';
