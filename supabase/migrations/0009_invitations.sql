-- Invitations table
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete cascade not null,
  email       text not null,
  role        user_role not null default 'employee',
  token       text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_invitations_token      on public.invitations(token);
create index if not exists idx_invitations_company_id on public.invitations(company_id);

alter table public.invitations enable row level security;

-- Super admin has full access
create policy "super_admin full access on invitations"
  on public.invitations for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Admins manage their company's invitations
create policy "admin can manage company invitations"
  on public.invitations for all
  using (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'admin'
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_role() = 'admin'
  );

-- Public read by token (for unauthenticated accept flow via service-role in API)
-- No open RLS needed — accept flow uses admin client (service_role)

-- Avatars storage bucket (public reads, upload via API)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
