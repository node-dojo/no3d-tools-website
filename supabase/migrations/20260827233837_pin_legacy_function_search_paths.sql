alter function public.update_subscriptions_updated_at() set search_path = public, pg_temp;
alter function public.update_articles_updated_at() set search_path = public, pg_temp;
alter function public.set_articles_published_at() set search_path = public, pg_temp;
alter function public.set_articles_published_at_on_insert() set search_path = public, pg_temp;
alter function public.log_product_identity_change() set search_path = public, pg_temp;
alter function public.log_product_creation() set search_path = public, pg_temp;
alter function public.update_subscription_updated_at() set search_path = public, pg_temp;
