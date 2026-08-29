import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import { getLicenseKeyFromRequest } from '../api/lib/licenseRequest.js';
import { hasCheckoutReceipt, setCheckoutReceipt } from '../api/lib/checkoutReceipt.js';

const root = new URL('../', import.meta.url);
const load = (path) => fs.readFile(new URL(path, root), 'utf8');

test('checkout receipt binds one session to a short-lived signed HttpOnly cookie', () => {
  const previous = process.env.CHECKOUT_RECEIPT_SECRET;
  process.env.CHECKOUT_RECEIPT_SECRET = 'test-checkout-receipt-secret';
  try {
    const headers = new Map();
    const response = {
      getHeader(name) { return headers.get(name); },
      setHeader(name, value) { headers.set(name, value); },
    };
    const now = Date.UTC(2026, 7, 27, 20, 0, 0);
    setCheckoutReceipt(response, 'cs_test_owned_session', now);
    const setCookie = headers.get('Set-Cookie')[0];
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Secure/);
    assert.match(setCookie, /SameSite=Lax/);
    const cookie = setCookie.split(';')[0];
    assert.equal(hasCheckoutReceipt({ headers: { cookie } }, 'cs_test_owned_session', now + 1_000), true);
    assert.equal(hasCheckoutReceipt({ headers: { cookie } }, 'cs_test_other_session', now + 1_000), false);
    assert.equal(hasCheckoutReceipt({ headers: { cookie } }, 'cs_test_owned_session', now + 3 * 60 * 60 * 1000), false);
  } finally {
    if (previous === undefined) delete process.env.CHECKOUT_RECEIPT_SECRET;
    else process.env.CHECKOUT_RECEIPT_SECRET = previous;
  }
});

test('license credentials are never accepted from a query string', () => {
  assert.equal(getLicenseKeyFromRequest({ headers: {}, query: { license_key: 'leaked' } }), null);
  assert.equal(getLicenseKeyFromRequest({ headers: { 'x-license-key': 'header-key' }, query: {} }), 'header-key');
});

test('legacy payment data routes enforce checkout ownership', async () => {
  for (const path of ['api/get-checkout-details.js', 'api/get-license-by-session.js', 'api/get-customer-portal-url.js']) {
    assert.match(await load(path), /checkoutSessionOwnedByRequest/);
  }
  const portal = await load('api/create-portal-session.js');
  assert.match(portal, /authenticatedSession/);
  assert.match(portal, /not_authenticated/);
  assert.doesNotMatch(portal, /req\.body\?\.email/);
});

test('global browser security headers are configured', async () => {
  const config = JSON.parse(await load('vercel.json'));
  const global = config.headers.find((entry) => entry.source === '/(.*)');
  const headers = new Map(global.headers.map(({ key, value }) => [key, value]));
  assert.match(headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.ok(headers.has('Permissions-Policy'));
});

test('high-abuse public endpoints use distributed rate limiting', async () => {
  for (const path of ['api/track.js', 'api/create-checkout.js', 'api/create-free-account.js', 'api/create-portal-session.js', 'api/auth/complete-link.js']) {
    assert.match(await load(path), /allowRequest/);
  }
});
