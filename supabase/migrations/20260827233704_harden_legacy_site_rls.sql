-- Remove anonymous mutation paths from catalog identity records.
drop policy if exists "Service role has full identity_history access"
  on public.product_identity_history;
revoke all on table public.product_identity_history from public, anon, authenticated;
grant all on table public.product_identity_history to service_role;
create policy "Service role has full identity_history access"
  on public.product_identity_history
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role has full redirects access"
  on public.product_handle_redirects;
drop policy if exists "Public can view redirects"
  on public.product_handle_redirects;
revoke all on table public.product_handle_redirects from public, anon, authenticated;
grant select on table public.product_handle_redirects to anon, authenticated;
grant all on table public.product_handle_redirects to service_role;
create policy "Public can view redirects"
  on public.product_handle_redirects
  for select
  to anon, authenticated
  using (true);
create policy "Service role has full redirects access"
  on public.product_handle_redirects
  for all
  to service_role
  using (true)
  with check (true);

-- These are operator projections. They must not run with their creator's
-- privileges or be directly exposed through the public Data API.
alter view public.analytics_daily set (security_invoker = true);
alter view public.migration_dashboard set (security_invoker = true);
revoke all on table public.analytics_daily from public, anon, authenticated;
revoke all on table public.migration_dashboard from public, anon, authenticated;
grant select on table public.analytics_daily to service_role;
grant select on table public.migration_dashboard to service_role;
