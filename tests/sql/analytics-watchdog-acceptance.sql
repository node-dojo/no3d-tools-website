-- Run as the database operator. Everything, including queued HTTP requests, rolls back.
begin;
delete from public.analytics_watchdog_alerts where name='acceptance';
delete from public.analytics_watchdog_state where name='acceptance';
do $$
begin
  perform public.no3d_analytics_watchdog(true,now());
  if exists(select 1 from public.analytics_watchdog_alerts where name='acceptance') then
    raise exception 'healthy baseline must be silent';
  end if;
  perform public.no3d_analytics_watchdog(true,now()-interval '16 minutes');
  perform public.no3d_analytics_watchdog(true,now()-interval '16 minutes');
  if (select count(*) from public.analytics_watchdog_alerts where name='acceptance' and state='unavailable')<>1 then
    raise exception 'failure must notify once';
  end if;
  perform public.no3d_analytics_watchdog(true,now());
  perform public.no3d_analytics_watchdog(true,now());
  if (select count(*) from public.analytics_watchdog_alerts where name='acceptance' and state='current')<>1 then
    raise exception 'recovery must notify once';
  end if;
  if has_function_privilege('anon','public.no3d_analytics_watchdog(boolean,timestamptz)','EXECUTE')
    or has_function_privilege('authenticated','public.no3d_configure_watchdog(text,text)','EXECUTE')
    or has_table_privilege('anon','public.analytics_watchdog_alerts','SELECT') then
    raise exception 'watchdog must be private';
  end if;
  begin
    perform public.no3d_analytics_watchdog(false,now());
    raise exception 'production override accepted';
  exception when others then
    if sqlerrm <> 'production heartbeat cannot be overridden' then raise; end if;
  end;
end $$;
select 'watchdog acceptance passed; rolling back' as result;
rollback;
