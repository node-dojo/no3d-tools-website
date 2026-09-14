# V3 analytics operations

## Where to look

- Audience estimates, page views and public referrers: [Vercel Analytics](https://vercel.com/node-dojos-projects/no3dtoolssite/analytics). Use its date selector; historical V3 coverage is incomplete.
- Business and journey observations: the NO3D SITE `Business Dashboard` in Vault_001. Its local import is a projection and can be stale while the Mac is unavailable.
- Collector and delivery evidence: the private `site_events`, `analytics_monitor_runs`, `analytics_monitor_state`, and `analytics_notifications` tables in the website Supabase project `cjkcwtcqswxtbfmtdyjr`.
- Independent missed-run evidence: `analytics_watchdog_state`, `analytics_watchdog_alerts`, and the `no3d-analytics-watchdog` job in Supabase Cron.

Vercel visitors, first-party sessions and Commerce sales are different measures. Do not sum them or infer a website conversion from an unrelated sale. Synthetic probes are excluded from first-party business totals.

## Runtime responsibilities

The authenticated Vercel `/api/cron/analytics-monitor` job runs every five minutes. It tests synthetic ingestion plus database read-back, reads Vercel production aggregates, checks failed or uncertain notification deliveries, and dispatches queued health notices. It records completion even when an observed source is unavailable; a completed check means the monitor ran, not that every source is healthy.

Supabase Cron runs `public.no3d_analytics_watchdog()` every minute. It detects the absence of a completed Vercel check for 15 minutes and sends a warning directly through pg_net to the existing ntfy warning channel. Recovery generates one further notice. Neither hosted job invokes the Mac's dashboard process.

The watchdog copies pg_net responses into durable alert records before the default six-hour response expiry. A valid provider receipt marks `sent`; this does not prove display on a phone. Definite HTTP 429 rejection can retry up to three attempts, at least a minute apart. Missing responses, timeouts and interrupted requests remain `uncertain` and are not automatically resent. Other rejections remain `failed` for operator inspection.

The private ntfy topic and optional token are stored in Supabase Vault under `no3d_analytics_watchdog_ntfy`. The narrowly scoped service-role RPC `no3d_configure_watchdog` rotates this configuration. Never put its values in SQL files, cron commands, logs or Vault documents. Watchdog table access and RPC execution are denied to anonymous and ordinary authenticated roles.

The two runtimes share Supabase and ntfy as dependencies. This detects a stopped Vercel schedule, not every possible simultaneous database/provider outage. The local dashboard continues its separate deduplicated journey-warning policy; it does not duplicate hosted source-health transitions.

## Read-only verification

Run in the website project's SQL editor as an operator:

```sql
select id, started_at, finished_at, status, sources
from public.analytics_monitor_runs
order by started_at desc limit 12;

select * from public.analytics_monitor_state;
select * from public.analytics_watchdog_state;
select id, name, state, created_at, status, attempts, provider_receipt, error_code
from public.analytics_watchdog_alerts order by created_at desc limit 20;

select j.jobname, j.active, r.status, r.start_time, r.end_time
from cron.job j join cron.job_run_details r on r.jobid=j.jobid
where j.jobname='no3d-analytics-watchdog'
order by r.start_time desc limit 12;
```

Do not interpret silence as health. Check completion timestamps, each source status and delivery receipts. A 48-hour release observation must cover all expected schedule intervals and identify gaps; current configuration alone is insufficient.

## Controlled acceptance

`tests/sql/analytics-watchdog-acceptance.sql` tests silent healthy initialization, failure/recovery deduplication, private permissions and rejection of production heartbeat overrides. The transaction rolls back, so pg_net never publishes its queued test requests.

For an explicitly authorized real notification test, call `no3d_analytics_watchdog(true, now()-interval '20 minutes')`, then `no3d_analytics_watchdog(true, now())` in separate committed transactions. These use the isolated `acceptance` namespace and titles beginning `TEST:`. Read the two durable receipts after the next minute's scheduled run. Do not change production monitor receipts to manufacture a failure.

September 14 acceptance produced one missed-run alert (`cszINce9mbpa`) and one recovery alert (`eD5vgF1oLzPa`), both acknowledged by ntfy on the first attempt. Phone display of these two warning-channel messages has not been separately confirmed. The real Chrome Crayon visits-channel notification was confirmed by Joe earlier that day.

## Rollback

When rolling the website back to a release without the five-minute monitor, pause the watchdog first to avoid a predictable missed-run warning:

```sql
select cron.unschedule('no3d-analytics-watchdog');
```

Retain tables and delivery receipts. Restore the recorded Vercel rollback deployment using the release plan. When the monitored release is restored, resume the independent job:

```sql
select cron.schedule('no3d-analytics-watchdog','* * * * *',
  'select public.no3d_analytics_watchdog();');
```

Verify new completion and cron receipts after resuming; a resumed configuration is not proof that execution succeeded.


## Sales notification boundary

Sales follow Commerce provider fulfillment → `COMMERCE_NOTIFICATION_URL` → `no3d-pageview-pings/api/sale` → ntfy. They are separate from page visits and source-health alerts. The relay accepts only bounded product handles or the four registered collection offer keys; collection links resolve to their canonical V3 pages.

Production authentication remains `COMMERCE_NOTIFICATION_SECRET`. Dedicated staging Commerce uses a separate relay-side `COMMERCE_ACCEPTANCE_NOTIFICATION_SECRET`; the matched credential forces TEST labeling. Do not place a live credential in a sandbox or trust caller-supplied test flags. Keep all credential values and private topic URLs out of receipts.

The relay requires a provider receipt before reporting successful delivery. September 14 sandbox acceptance: Dojo Knob order `7af191d9-e89e-449c-90df-69e078640b51`, ntfy receipt `zNWZjA5Og60k`, refunded/revoked cleanup with the independent purchase preserved. This confirms provider acknowledgment, not independent phone display.

Relay deployed artifact: `dpl_BngwbhYX4hWDsJyittLHEPVyHSta`; rollback artifact: `dpl_74ri2BujvDJJNN94TFK9NqCFuHYZ`. The relay checkout is not Git-backed; its pre-change source backup is `/tmp/no3d-final-sales-relay-baseline/`. Original visit Unicode serialization and provider-failure behavior are covered by `tests/sale.test.mjs` in that checkout.
