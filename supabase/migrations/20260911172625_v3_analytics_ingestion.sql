-- Independent analytics policy; authentication RPC and limits remain unchanged.
create table if not exists public.analytics_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);
create index if not exists analytics_rate_limits_window on public.analytics_rate_limits (window_started_at);
alter table public.analytics_rate_limits enable row level security;
revoke all on public.analytics_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.analytics_rate_limits to service_role;
create or replace function public.no3d_consume_analytics_rate_limit(p_bucket_key text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_attempts integer;
begin
  if p_bucket_key !~ '^[a-f0-9]{64}$' then raise exception 'invalid analytics bucket'; end if;
  delete from public.analytics_rate_limits where window_started_at < now() - interval '24 hours';
  insert into public.analytics_rate_limits as limits (bucket_key, window_started_at, attempts)
  values (p_bucket_key, now(), 1)
  on conflict (bucket_key) do update set
    window_started_at = case when limits.window_started_at <= now() - interval '60 seconds' then now() else limits.window_started_at end,
    attempts = case when limits.window_started_at <= now() - interval '60 seconds' then 1 else limits.attempts + 1 end
  returning attempts into v_attempts;
  return v_attempts <= 120;
end; $$;
revoke all on function public.no3d_consume_analytics_rate_limit(text) from public, anon, authenticated;
grant execute on function public.no3d_consume_analytics_rate_limit(text) to service_role;
-- Receipts also carry the ID in properties; old historical rows remain untouched.
create unique index if not exists site_events_browser_event_id_unique
on public.site_events ((properties->>'event_id'))
where properties->>'schema_version' = '2' and properties->>'source_kind' = 'browser';
