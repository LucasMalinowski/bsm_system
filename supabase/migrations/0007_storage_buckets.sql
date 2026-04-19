-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('equipment-images', 'equipment-images', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('documents', 'documents', false, 52428800, null),
  ('company-assets', 'company-assets', true, 2097152, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- Storage RLS policies for equipment-images
create policy "company members can view equipment images"
  on storage.objects for select
  using (
    bucket_id = 'equipment-images'
    and (storage.foldername(name))[1] = public.current_user_company_id()::text
  );

create policy "users with equipment:create can upload equipment images"
  on storage.objects for insert
  with check (
    bucket_id = 'equipment-images'
    and (storage.foldername(name))[1] = public.current_user_company_id()::text
    and public.user_has_permission('equipment:create')
  );

create policy "users with equipment:delete can delete equipment images"
  on storage.objects for delete
  using (
    bucket_id = 'equipment-images'
    and (storage.foldername(name))[1] = public.current_user_company_id()::text
    and public.user_has_permission('equipment:delete')
  );

-- Storage RLS policies for documents bucket
create policy "company members can view documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_user_company_id()::text
    and public.user_has_permission('document:read')
  );

create policy "users with document:upload can upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_user_company_id()::text
    and public.user_has_permission('document:upload')
  );

create policy "users with document:delete can delete documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_user_company_id()::text
    and public.user_has_permission('document:delete')
  );

-- Company assets (logos etc) — public bucket, write restricted to admins
create policy "admins can upload company assets"
  on storage.objects for insert
  with check (
    bucket_id = 'company-assets'
    and public.current_user_role() in ('admin', 'super_admin')
  );

create policy "admins can delete company assets"
  on storage.objects for delete
  using (
    bucket_id = 'company-assets'
    and public.current_user_role() in ('admin', 'super_admin')
  );
