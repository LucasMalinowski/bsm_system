-- Lightweight rate limiting backed by Postgres (Vercel functions are stateless/
-- multi-instance, so an in-memory counter wouldn't reliably hold across requests).
-- No public policies on purpose: the table is only ever touched through the
-- security definer function below, never queried directly by app code.
create table if not exists public.rate_limit_attempts (
  key          text primary key,
  count        integer not null default 1,
  window_start timestamptz not null default now()
);

alter table public.rate_limit_attempts enable row level security;

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limit_attempts (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
          when rate_limit_attempts.window_start < now() - (p_window_seconds || ' seconds')::interval
            then 1
          else rate_limit_attempts.count + 1
        end,
        window_start = case
          when rate_limit_attempts.window_start < now() - (p_window_seconds || ' seconds')::interval
            then now()
          else rate_limit_attempts.window_start
        end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;
