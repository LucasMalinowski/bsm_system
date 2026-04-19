create type public.ticket_status as enum ('open', 'in_progress', 'waiting', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'critical');

create table if not exists public.tickets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  title         text not null,
  description   text not null default '',
  status        public.ticket_status not null default 'open',
  priority      public.ticket_priority not null default 'medium',
  equipment_id  uuid references public.equipment(id) on delete set null,
  created_by    uuid not null references public.profiles(id),
  assigned_to   uuid references public.profiles(id) on delete set null,
  resolved_at   timestamptz,
  metadata      jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

create index if not exists idx_tickets_company_id on public.tickets(company_id);
create index if not exists idx_tickets_status on public.tickets(status);
create index if not exists idx_tickets_assigned_to on public.tickets(assigned_to);
create index if not exists idx_tickets_equipment_id on public.tickets(equipment_id);
create index if not exists idx_tickets_updated_at on public.tickets(updated_at desc);

create table if not exists public.ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger ticket_comments_updated_at
  before update on public.ticket_comments
  for each row execute function public.set_updated_at();

create index if not exists idx_ticket_comments_ticket on public.ticket_comments(ticket_id);

-- RLS
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

create policy "super_admin full access on tickets"
  on public.tickets for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users can view their company tickets"
  on public.tickets for select
  using (company_id = public.current_user_company_id() and public.user_has_permission('ticket:read'));

create policy "users with permission can create tickets"
  on public.tickets for insert
  with check (company_id = public.current_user_company_id() and public.user_has_permission('ticket:create') and created_by = auth.uid());

create policy "users with permission can update tickets"
  on public.tickets for update
  using (company_id = public.current_user_company_id() and public.user_has_permission('ticket:update'));

create policy "users with permission can delete tickets"
  on public.tickets for delete
  using (company_id = public.current_user_company_id() and public.user_has_permission('ticket:delete'));

-- Comments policies
create policy "super_admin full access on ticket_comments"
  on public.ticket_comments for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "users can view comments on their company tickets"
  on public.ticket_comments for select
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.company_id = public.current_user_company_id()
    )
  );

create policy "users can insert comments on their company tickets"
  on public.ticket_comments for insert
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.company_id = public.current_user_company_id()
    )
    and user_id = auth.uid()
  );

create policy "users can update their own comments"
  on public.ticket_comments for update
  using (user_id = auth.uid());
