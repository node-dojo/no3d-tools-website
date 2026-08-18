import assert from 'node:assert/strict';
import test from 'node:test';

import { productTitle, purchaseView } from '../purchase-flow.js';

const fulfilled = {
  fulfillmentStatus: 'fulfilled',
  orderId: '22222222-2222-4222-8222-222222222222',
  paymentStatus: 'paid',
  resourceId: 'apple-magsafe-charger',
};

test('fulfilled signed-in purchases join the existing library', () => {
  assert.deepEqual(purchaseView(fulfilled, true), {
    state: 'existing',
    title: 'Apple Magsafe Charger',
  });
});

test('fulfilled guest purchases enter passwordless onboarding', () => {
  assert.deepEqual(purchaseView(fulfilled, false), {
    state: 'new',
    title: 'Apple Magsafe Charger',
  });
});

test('paid orders wait for durable fulfillment', () => {
  assert.deepEqual(purchaseView({ ...fulfilled, fulfillmentStatus: 'pending' }, false), {
    state: 'processing',
  });
});

test('productTitle presents a readable fallback title', () => {
  assert.equal(productTitle('bubble-putty-generator'), 'Bubble Putty Generator');
});
