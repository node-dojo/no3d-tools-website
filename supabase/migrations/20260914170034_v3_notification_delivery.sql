begin;
create table if not exists public.analytics_notifications (
  id uuid primary key,
  dedupe_key text not null unique,
  channel text not null check (channel in ('visits','health')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','uncertain')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  provider_receipt text,
  error_code text
);
create index if not exists analytics_notifications_pending_idx on public.analytics_notifications(available_at) where status='pending';
alter table public.analytics_notifications enable row level security;
revoke all on public.analytics_notifications from public,anon,authenticated;
grant select,insert,update,delete on public.analytics_notifications to service_role;

-- One transaction persists the event and its notification. Repeated event IDs do neither twice.
create or replace function public.no3d_record_browser_event(p_event jsonb,p_notification jsonb default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare inserted_id bigint;
begin
  insert into public.site_events(event,page,referrer,session_id,properties)
  values (p_event->>'event',p_event->>'page',p_event->>'referrer',p_event->>'session_id',p_event->'properties')
  on conflict do nothing returning id into inserted_id;
  if inserted_id is null then return false; end if;
  if p_notification is not null then
    insert into public.analytics_notifications(id,dedupe_key,channel,payload)
    values ((p_event->'properties'->>'event_id')::uuid,p_notification->>'dedupe_key','visits',p_notification->'payload')
    on conflict(dedupe_key) do nothing;
  end if;
  return true;
end $$;
revoke all on function public.no3d_record_browser_event(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.no3d_record_browser_event(jsonb,jsonb) to service_role;

create or replace function public.no3d_claim_notifications(p_id uuid default null)
returns setof public.analytics_notifications language plpgsql security invoker set search_path='' as $$
begin
  -- A terminated sender may already have published. Do not automatically resend an ambiguous delivery.
  update public.analytics_notifications set status='uncertain',error_code='sender_interrupted',updated_at=now()
    where status='sending' and updated_at < now()-interval '2 minutes';
  return query
  update public.analytics_notifications n set status='sending',attempts=n.attempts+1,updated_at=now()
  where n.id in (select q.id from public.analytics_notifications q
    where q.status='pending' and q.available_at<=now() and q.attempts<3 and (p_id is null or q.id=p_id)
    order by q.created_at for update skip locked limit 10)
  returning n.*;
end $$;
revoke all on function public.no3d_claim_notifications(uuid) from public,anon,authenticated;
grant execute on function public.no3d_claim_notifications(uuid) to service_role;
create table if not exists public.analytics_monitor_state (
  source text primary key,
  status text not null,
  detail text not null,
  checked_at timestamptz not null default now(),
  last_success_at timestamptz,
  changed_at timestamptz not null default now()
);
alter table public.analytics_monitor_state enable row level security;
revoke all on public.analytics_monitor_state from public,anon,authenticated;
grant select,insert,update,delete on public.analytics_monitor_state to service_role;
create table if not exists public.analytics_monitor_runs (
  id uuid primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  sources jsonb
);
alter table public.analytics_monitor_runs enable row level security;
revoke all on public.analytics_monitor_runs from public,anon,authenticated;
grant select,insert,update,delete on public.analytics_monitor_runs to service_role;
create or replace function public.no3d_record_monitor_check(p_source text,p_status text,p_detail text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare prior_status text; changed boolean; notification_id uuid;
begin
  if p_source not in ('collector','vercel_reporting','notification_delivery') or p_status not in ('current','unavailable') then raise exception 'invalid monitor check'; end if;
  -- Serialize each source, including the initial insert.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('analytics_monitor:'||p_source,0));
  select status into prior_status from public.analytics_monitor_state where source=p_source;
  changed := prior_status is distinct from p_status;
  insert into public.analytics_monitor_state(source,status,detail,last_success_at)
  values (p_source,p_status,left(p_detail,300),case when p_status='current' then now() end)
  on conflict(source) do update set status=excluded.status,detail=excluded.detail,checked_at=now(),
    last_success_at=case when p_status='current' then now() else public.analytics_monitor_state.last_success_at end,
    changed_at=case when changed then now() else public.analytics_monitor_state.changed_at end;
  if changed and (prior_status is not null or p_status='unavailable') then
    notification_id := gen_random_uuid();
    insert into public.analytics_notifications(id,dedupe_key,channel,payload) values (
      notification_id,'health:'||notification_id::text,'health',jsonb_build_object(
        'title',case when p_status='current' then 'NO3D analytics recovered' else 'NO3D analytics needs attention' end,
        'message',p_source||': '||left(p_detail,300),'tags',jsonb_build_array(case when p_status='current' then 'white_check_mark' else 'warning' end)
      ));
  end if;
  return changed;
end $$;
revoke all on function public.no3d_record_monitor_check(text,text,text) from public,anon,authenticated;
grant execute on function public.no3d_record_monitor_check(text,text,text) to service_role;
commit;
