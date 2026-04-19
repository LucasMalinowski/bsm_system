-- Profiles table (extends auth.users)
create type public.user_role as enum ('super_admin', 'admin', 'employee');

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete set null,
  role        public.user_role not null default 'employee',
  name        text not null default '',
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_profiles_role on public.profiles(role);

-- User permissions table (granular)
create table if not exists public.user_permissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  permission  text not null,
  created_at  timestamptz not null default now(),
  unique(user_id, permission)
);

create index if not exists idx_user_permissions_user_id on public.user_permissions(user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to get all resolved permissions for a user
create or replace function public.get_user_permissions(p_user_id uuid)
returns text[] language sql security definer stable as $$
  select coalesce(array_agg(permission), '{}')
  from public.user_permissions
  where user_id = p_user_id;
$$;

-- Default permissions per role (applied at invitation time)
create table if not exists public.role_default_permissions (
  id          uuid primary key default gen_random_uuid(),
  role        public.user_role not null,
  permission  text not null,
  unique(role, permission)
);

-- Insert default permission sets
insert into public.role_default_permissions (role, permission) values
  -- admin gets everything
  ('admin', 'equipment:read'),
  ('admin', 'equipment:create'),
  ('admin', 'equipment:update'),
  ('admin', 'equipment:delete'),
  ('admin', 'ticket:read'),
  ('admin', 'ticket:create'),
  ('admin', 'ticket:update'),
  ('admin', 'ticket:delete'),
  ('admin', 'ticket:assign'),
  ('admin', 'document:read'),
  ('admin', 'document:upload'),
  ('admin', 'document:update'),
  ('admin', 'document:delete'),
  ('admin', 'user:read'),
  ('admin', 'user:invite'),
  ('admin', 'user:update'),
  ('admin', 'user:delete'),
  ('admin', 'company:read'),
  ('admin', 'company:update'),
  ('admin', 'company:settings'),
  ('admin', 'report:view'),
  -- employee gets read + basic create
  ('employee', 'equipment:read'),
  ('employee', 'ticket:read'),
  ('employee', 'ticket:create'),
  ('employee', 'ticket:update'),
  ('employee', 'document:read'),
  ('employee', 'company:read')
on conflict do nothing;
