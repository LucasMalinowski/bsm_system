-- NI-3: "users can view profiles in their company" (0003_rls_policies.sql) only
-- allows company_id = current_user_company_id() or id = auth.uid(). super_admin
-- profiles have company_id = null by design, so they never match the first
-- clause — any cross-role join (uploader, ticket creator/assignee, etc.) that
-- resolves a super_admin's profile from a company user's session silently
-- returns null instead of erroring. super_admin identities aren't sensitive
-- (their name/role/avatar are already shown whenever they act in the app), so
-- allow any authenticated user to view a super_admin's profile row.
drop policy if exists "users can view profiles in their company" on public.profiles;
create policy "users can view profiles in their company"
  on public.profiles for select
  using (
    company_id = public.current_user_company_id()
    or id = auth.uid()
    or role = 'super_admin'
  );
