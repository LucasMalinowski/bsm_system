create type public.ticket_type as enum ('maintenance', 'calibration', 'repair', 'inspection', 'other');

alter table public.tickets
  add column if not exists type public.ticket_type not null default 'maintenance';
