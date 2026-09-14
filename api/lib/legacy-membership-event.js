const TYPES = new Set(['invoice.paid', 'invoice.payment_failed', 'customer.subscription.updated', 'customer.subscription.deleted']);
const objectId = value => typeof value === 'string' ? value : value?.id;
const commerceOwned = metadata => Boolean(metadata?.no3d_offer_key || metadata?.no3d_order_id || metadata?.no3d_resource_type);

// Stripe account webhooks receive Commerce invoices too. Customer identity alone
// must never turn a finite collection payment into a full-library subscription.
export async function legacyMembershipEvent(event, { stripe, supabase, priceId }) {
  if (!TYPES.has(event.type)) return { owned: false };
  const object = event.data?.object;
  if (commerceOwned(object?.metadata) || commerceOwned(object?.subscription_details?.metadata) ||
      commerceOwned(object?.parent?.subscription_details?.metadata)) return { owned: false };
  const subscriptionEvent = event.type.startsWith('customer.subscription.');
  const subscriptionId = objectId(subscriptionEvent ? object : object?.subscription || object?.parent?.subscription_details?.subscription);
  if (!subscriptionId) return { owned: false };
  const subscription = subscriptionEvent ? object : await stripe.subscriptions.retrieve(subscriptionId);
  if (commerceOwned(subscription.metadata)) return { owned: false };
  if (priceId && subscription.items?.data?.some(item => objectId(item.price) === priceId)) {
    return { owned: true, subscriptionId };
  }
  // Keep servicing historical legacy prices, but only for an already registered
  // subscription ID. A shared Stripe customer is not an ownership contract.
  const existing = await supabase.from('subscriptions').select('stripe_sub_id').eq('stripe_sub_id', subscriptionId).neq('tier', 'free').limit(1);
  if (existing.error) throw Error('legacy_subscription_ownership_unavailable');
  if (existing.data?.length) return { owned: true, subscriptionId };
  if (!priceId) throw Error('legacy_membership_price_not_configured');
  return { owned: false };
}
