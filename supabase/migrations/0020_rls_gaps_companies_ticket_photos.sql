-- Gap 1: companies had a SELECT policy for non-SA users but no UPDATE policy.
-- PATCH /api/companies/[id] runs through the RLS-bound client for company
-- admins (only the DELETE route uses the admin client) — without this policy,
-- every admin's company-settings save (theme colors, name, cnpj) silently
-- fails with a Postgres RLS error.
create policy "admins can update their own company"
  on public.companies for update
  using (id = public.current_user_company_id() and public.current_user_role() = 'admin')
  with check (id = public.current_user_company_id() and public.current_user_role() = 'admin');

-- Gap 2: ticket-photos storage policies (0010) never got the per-company
-- folder scoping that equipment-images/documents got in 0016 — any
-- authenticated user, from any company, could read or write any path in
-- this bucket. Storage path convention is `${company_id ?? user_id}/...`
-- (see src/app/api/tickets/photo/route.ts), matching the pattern already
-- used by the other scoped buckets.
drop policy if exists "users can upload ticket photos" on storage.objects;
create policy "users can upload ticket photos"
  on storage.objects for insert
  with check (
    bucket_id = 'ticket-photos'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_user_company_id()::text)
  );

drop policy if exists "company users can view ticket photos" on storage.objects;
create policy "company users can view ticket photos"
  on storage.objects for select
  using (
    bucket_id = 'ticket-photos'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_user_company_id()::text)
  );
