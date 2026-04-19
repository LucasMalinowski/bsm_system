-- Enable RLS on all tenant tables
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.user_permissions enable row level security;

-- Helper: get current user's role
create or replace function public.current_user_role()
returns public.user_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: get current user's company_id
create or replace function public.current_user_company_id()
returns uuid language sql security definer stable as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- Helper: check if current user is super_admin
create or replace function public.is_super_admin()
returns boolean language sql security definer stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

-- Helper: check if current user has a specific permission
create or replace function public.user_has_permission(p_permission text)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.user_permissions
    where user_id = auth.uid() and permission = p_permission
  ) or public.is_super_admin();
$$;

-- ============================================
-- COMPANIES POLICIES
-- ============================================
create policy "super_admin can do everything on companies"
  on public.companies for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "users can view their own company"
  on public.companies for select
  using (id = public.current_user_company_id());

-- ============================================
-- PROFILES POLICIES
-- ============================================
create policy "super_admin can do everything on profiles"
  on public.profiles for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "users can view profiles in their company"
  on public.profiles for select
  using (company_id = public.current_user_company_id() or id = auth.uid());

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admins can manage profiles in their company"
  on public.profiles for all
  using (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'admin'
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'admin'
  );

-- ============================================
-- USER PERMISSIONS POLICIES
-- ============================================
create policy "super_admin can do everything on user_permissions"
  on public.user_permissions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "users can view their own permissions"
  on public.user_permissions for select
  using (user_id = auth.uid());

create policy "admins can manage permissions in their company"
  on public.user_permissions for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_permissions.user_id
        and p.company_id = public.current_user_company_id()
    )
    and public.current_user_role() = 'admin'
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = user_permissions.user_id
        and p.company_id = public.current_user_company_id()
    )
    and public.current_user_role() = 'admin'
  );
