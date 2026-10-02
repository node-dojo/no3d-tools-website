import assert from 'node:assert/strict';
import test from 'node:test';

import { membershipExpectedEnvironment } from '../api/lib/payment-environment.js';
import { getCommerceConfig } from '../v3/js/api.js';

test('membership uses the configured payment environment, with owner staging restricted to test mode', () => {
  assert.equal(membershipExpectedEnvironment({ STRIPE_SECRET_KEY: 'sk_live_fixture' }), 'live');
  assert.equal(membershipExpectedEnvironment({ STRIPE_SECRET_KEY: 'sk_test_fixture' }), 'test');
  assert.equal(membershipExpectedEnvironment({ V3_ACCESS_MODE: 'owner', STRIPE_SECRET_KEY: 'sk_live_fixture' }), 'test');
  assert.equal(membershipExpectedEnvironment({}), 'unknown');
});

test('membership requires a price matching the server environment and closes safely on incomplete configuration', async t => {
  for (const [expected, actual, enabled] of [
    ['live', 'live', true],
    ['test', 'test', true],
    ['test', 'live', false],
    ['live', 'test', false],
    [undefined, 'live', false],
    ['live', undefined, false],
    ['unknown', 'unknown', false],
  ]) {
    await t.test(`${expected}/${actual}`, async t => {
      t.mock.method(globalThis, 'fetch', async path => Response.json(path === '/api/commerce/config'
        ? { individualProductsEnabled: true, membershipExpectedEnvironment: expected }
        : { formatted: '$11.11', environment: actual }));
      const config = await getCommerceConfig();
      assert.equal(config.membershipCheckoutEnabled, enabled);
      assert.equal(config.individualProductsEnabled, true);
      assert.equal(config.membershipPrice, '$11.11');
    });
  }
});

test('an unavailable price disables membership without disabling individual product checkout', async t => {
  t.mock.method(globalThis, 'fetch', async path => path === '/api/commerce/config'
    ? Response.json({ individualProductsEnabled: true, membershipExpectedEnvironment: 'live' })
    : Response.json({ error: 'price_unavailable' }, { status: 503 }));
  const config = await getCommerceConfig();
  assert.equal(config.membershipCheckoutEnabled, false);
  assert.equal(config.individualProductsEnabled, true);
});
