begin;
create extension if not exists pg_cron;

create table public.analytics_watchdog_state (
  name text primary key check (name in ('production','acceptance')),
  status text not null check (status in ('current','unavailable')),
  checked_at timestamptz not null default now(),
  last_success_at timestamptz,
  changed_at timestamptz not null default now()
);
create table public.analytics_watchdog_alerts (
  id uuid primary key default gen_random_uuid(),
  name text not null references public.analytics_watchdog_state(name),
  state text not null check (state in ('current','unavailable')),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','uncertain')),
  request_id bigint,
  attempts integer not null default 0,
  updated_at timestamptz not null default now(),
  provider_receipt text,
  error_code text
);
alter table public.analytics_watchdog_state enable row level security;
alter table public.analytics_watchdog_alerts enable row level security;
revoke all on public.analytics_watchdog_state,public.analytics_watchdog_alerts from public,anon,authenticated;
grant select on public.analytics_watchdog_state,public.analytics_watchdog_alerts to service_role;

-- Values are supplied through a service-role RPC, never embedded in a migration or cron command.
create function public.no3d_configure_watchdog(p_topic text, p_token text default null)
returns void language plpgsql security definer set search_path='' as $$
declare secret_id uuid; config text;
begin
  if p_topic is null or p_topic !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'invalid watchdog topic'; end if;
  config := jsonb_build_object('topic',p_topic,'token',p_token)::text;
  select id into secret_id from vault.secrets where name='no3d_analytics_watchdog_ntfy';
  if secret_id is null then
    perform vault.create_secret(config,'no3d_analytics_watchdog_ntfy','NO3D analytics missed-run warning delivery');
  else
    perform vault.update_secret(secret_id,config);
  end if;
end $$;
revoke all on function public.no3d_configure_watchdog(text,text) from public,anon,authenticated;
grant execute on function public.no3d_configure_watchdog(text,text) to service_role;

-- The acceptance namespace exercises the same detector using an isolated heartbeat.
-- It cannot change the production heartbeat or source-health state.
create function public.no3d_analytics_watchdog(p_acceptance boolean default false, p_last_success timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  watch_name text := case when p_acceptance then 'acceptance' else 'production' end;
  last_success timestamptz;
  next_status text;
  prior_status text;
  config jsonb;
  headers jsonb;
  alert record;
  response record;
  request bigint;
  receipt text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('no3d_analytics_watchdog',0));
  if p_acceptance then
    last_success := p_last_success;
  else
    if p_last_success is not null then raise exception 'production heartbeat cannot be overridden'; end if;
    select max(finished_at) into last_success from public.analytics_monitor_runs where status='complete';
  end if;
  next_status := case when last_success is not null and last_success >= now()-interval '15 minutes' then 'current' else 'unavailable' end;
  select status into prior_status from public.analytics_watchdog_state where name=watch_name;
  insert into public.analytics_watchdog_state(name,status,last_success_at)
    values(watch_name,next_status,last_success)
    on conflict(name) do update set status=excluded.status,checked_at=now(),last_success_at=excluded.last_success_at,
      changed_at=case when prior_status is distinct from next_status then now() else public.analytics_watchdog_state.changed_at end;
  if prior_status is distinct from next_status and (prior_status is not null or next_status='unavailable') then
    insert into public.analytics_watchdog_alerts(name,state) values(watch_name,next_status);
  end if;

  -- Copy asynchronous receipts into durable rows before pg_net's six-hour response expiry.
  -- Timeout/lost response is ambiguous: keep it visible and never blindly resend it.
  for alert in select * from public.analytics_watchdog_alerts where status='sending' for update loop
    select status_code,content,timed_out,error_msg into response from net._http_response where id=alert.request_id;
    if found then
      receipt := null;
      if response.status_code between 200 and 299 then
        begin receipt := (response.content::jsonb)->>'id'; exception when others then receipt := null; end;
      end if;
      update public.analytics_watchdog_alerts set
        status=case when response.timed_out or response.error_msg is not null then 'uncertain'
          when response.status_code between 200 and 299 and receipt is not null then 'sent'
          when response.status_code between 200 and 299 then 'uncertain'
          when response.status_code=429 and attempts<3 then 'pending' else 'failed' end,
        provider_receipt=receipt,
        error_code=case when receipt is not null then null when response.timed_out or response.error_msg is not null then 'transport_unconfirmed'
          else 'http_'||coalesce(response.status_code::text,'unknown') end,updated_at=now()
        where id=alert.id;
    elsif alert.updated_at < now()-interval '2 minutes' then
      update public.analytics_watchdog_alerts set status='uncertain',error_code='response_missing',updated_at=now() where id=alert.id;
    end if;
  end loop;
  select decrypted_secret::jsonb into config from vault.decrypted_secrets where name='no3d_analytics_watchdog_ntfy';
  if config is null then return jsonb_build_object('status',next_status,'delivery','not_configured'); end if;
  headers := jsonb_build_object('Content-Type','application/json');
  if nullif(config->>'token','') is not null then headers := headers||jsonb_build_object('Authorization','Bearer '||(config->>'token')); end if;
  for alert in select * from public.analytics_watchdog_alerts where status='pending' and attempts<3
    and (attempts=0 or updated_at<=now()-interval '1 minute') order by created_at for update limit 10 loop
    request := net.http_post(url:='https://ntfy.sh',headers:=headers,timeout_milliseconds:=8000,
      body:=jsonb_build_object('topic',config->>'topic',
        'title',case when alert.name='acceptance' then 'TEST: ' else '' end||case when alert.state='current' then 'NO3D monitoring recovered' else 'NO3D monitoring missed runs' end,
        'message',case when alert.name='acceptance' then 'Controlled acceptance heartbeat: ' else '' end||case when alert.state='current' then 'Scheduled analytics checks are completing again.' else 'No completed analytics check within 15 minutes. Supabase detected this independently of Vercel and your Mac.' end,
        'tags',jsonb_build_array(case when alert.state='current' then 'white_check_mark' else 'warning' end)));
    update public.analytics_watchdog_alerts set status='sending',request_id=request,attempts=attempts+1,updated_at=now() where id=alert.id;
  end loop;
  return jsonb_build_object('status',next_status,'last_success_at',last_success,'checked_at',now());
end $$;
revoke all on function public.no3d_analytics_watchdog(boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.no3d_analytics_watchdog(boolean,timestamptz) to service_role;

select cron.schedule('no3d-analytics-watchdog','* * * * *','select public.no3d_analytics_watchdog();');
commit;
