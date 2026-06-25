-- C3: storage policies compare the object path's company-id folder against the
-- CALLER's own current_user_company_id(), but super_admin's company_id is always
-- null (by design — they aren't scoped to one company). Every one of these
-- policies blocks super_admin from operating on any company's folder, including
-- the one company picked in the UI for the operation, since null never equals a
-- real company_id. super_admin already passes user_has_permission() via its
-- is_super_admin() short-circuit, so the folder check is the only thing blocking
-- them — add an is_super_admin() bypass alongside the existing per-company check.

drop policy if exists "company members can view equipment images" on storage.objects;
create policy "company members can view equipment images"
  on storage.objects for select
  using (
    bucket_id = 'equipment-images'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_user_company_id()::text)
  );

drop policy if exists "users with equipment:create can upload equipment images" on storage.objects;
create policy "users with equipment:create can upload equipment images"
  on storage.objects for insert
  with check (
    bucket_id = 'equipment-images'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_user_company_id()::text)
    and public.user_has_permission('equipment:create')
  );

drop policy if exists "users with equipment:delete can delete equipment images" on storage.objects;
create policy "users with equipment:delete can delete equipment images"
  on storage.objects for delete
  using (
    bucket_id = 'equipment-images'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_user_company_id()::text)
    and public.user_has_permission('equipment:delete')
  );

drop policy if exists "company members can view documents" on storage.objects;
create policy "company members can view documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_user_company_id()::text)
    and public.user_has_permission('document:read')
  );

drop policy if exists "users with document:upload can upload documents" on storage.objects;
create policy "users with document:upload can upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_user_company_id()::text)
    and public.user_has_permission('document:upload')
  );

drop policy if exists "users with document:delete can delete documents" on storage.objects;
create policy "users with document:delete can delete documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_user_company_id()::text)
    and public.user_has_permission('document:delete')
  );
