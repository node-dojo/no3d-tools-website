import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyMembershipEvent } from '../api/lib/legacy-membership-event.js';
const subscription = (overrides = {}) => ({ id: 'sub_legacy', metadata: {}, items: { data: [{ price: { id: 'price_legacy' } }] }, ...overrides });
const event = (object, type = 'invoice.paid') => ({ type, data: { object } });
const forbiddenDb = { from() { throw Error('Unowned event must not inspect or provision the legacy library'); } };
const forbiddenStripe = { subscriptions: { retrieve() { throw Error('Unnecessary subscription read'); } } };
const deps = (sub = subscription()) => ({ priceId: 'price_legacy', supabase: forbiddenDb, stripe: { subscriptions: { retrieve: async () => sub } } });

test('Commerce checkout, invoice and subscription lifecycle metadata cannot grant or revoke legacy membership', async () => {
  for (const type of ['invoice.paid', 'invoice.payment_failed', 'customer.subscription.updated', 'customer.subscription.deleted']) {
    for (const marker of [{ metadata: { no3d_offer_key: 'no3dtools.collection.no3d-chrome.pay-over-time' } }, { subscription_details: { metadata: { no3d_order_id: 'order' } } }, { parent: { subscription_details: { metadata: { no3d_resource_type: 'no3dtools_collection' } } } }]) {
      assert.equal((await legacyMembershipEvent(event({ ...subscription(), ...marker }, type), { ...deps(), stripe: forbiddenStripe })).owned, false);
    }
  }
});
test('invoice without copied metadata still resolves the owning subscription before granting access', async () => {
  const result = await legacyMembershipEvent(event({ subscription: 'sub_collection' }), deps(subscription({ metadata: { no3d_offer_key: 'no3dtools.collection.no3d-chrome.pay-over-time' } })));
  assert.equal(result.owned, false);
});
test('the configured legacy price remains eligible for invoice and cancellation processing', async () => {
  for (const object of [{ subscription: 'sub_legacy' }, { parent: { subscription_details: { subscription: 'sub_legacy' } } }]) {
    assert.deepEqual(await legacyMembershipEvent(event(object), deps()), { owned: true, subscriptionId: 'sub_legacy' });
  }
  assert.equal((await legacyMembershipEvent(event(subscription(), 'customer.subscription.deleted'), { ...deps(), stripe: forbiddenStripe })).owned, true);
});
test('one-off invoices and unrelated event types do not create membership', async () => {
  assert.equal((await legacyMembershipEvent(event({ customer: 'cus_shared' }), { ...deps(), stripe: forbiddenStripe })).owned, false);
  assert.equal((await legacyMembershipEvent(event({}, 'checkout.session.completed'), { ...deps(), stripe: forbiddenStripe })).owned, false);
});
test('historical prices require the exact stored subscription, never just the customer', async () => {
  let requestedId;
  const query = { select() { return this; }, eq(column, value) { assert.equal(column, 'stripe_sub_id'); requestedId = value; return this; }, neq() { return this; }, async limit() { return { data: [{ stripe_sub_id: 'sub_legacy' }], error: null }; } };
  const options = { ...deps(subscription({ items: { data: [{ price: { id: 'price_historical' } }] } })), supabase: { from: () => query } };
  assert.equal((await legacyMembershipEvent(event({ subscription: 'sub_legacy' }), options)).owned, true);
  assert.equal(requestedId, 'sub_legacy');
  query.limit = async () => ({ data: [], error: null });
  assert.equal((await legacyMembershipEvent(event({ subscription: 'sub_unrelated' }), options)).owned, false);
  query.limit = async () => ({ data: null, error: { message: 'unavailable' } });
  await assert.rejects(legacyMembershipEvent(event({ subscription: 'sub_legacy' }), options), /ownership_unavailable/);
});
