/**
 * Catalog price display contract.
 *
 * Stripe Price lookup keys are the pricing source of truth. The V3 product page
 * reads the charged amount from /api/commerce/offer, but the catalog grid and
 * anything else rendering /api/get-all-products reads the `price` column from
 * the website catalog database.
 *
 * Those two are structurally independent: the website `products` table has no
 * stripe_price_id or any other Stripe linkage, so a display price can silently
 * disagree with the charged price and nothing in either system will notice.
 * That is exactly how a temporary test price ended up advertised at $0.50
 * while Stripe charged $7.77.
 *
 * This test does not compare prices (that needs live data and lives in
 * `npm run catalog:check:prices:live` in the commerce repo). It pins the
 * structural facts that make the drift possible and detectable.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const load = (path) => readFile(new URL(path, root), 'utf8');

test('the public catalog endpoint stays edge-cached briefly', async () => {
  const source = await load('api/get-all-products.js');
  // Pinned deliberately: short edge cache, long stale window. Any audit reading
  // this endpoint must cache-bust or it will report already-corrected prices
  // as drift. See check-catalog-price-integrity.mjs in the commerce repo.
  assert.match(
    source,
    /Cache-Control['"]\s*,\s*['"]public, s-maxage=\d+, stale-while-revalidate=\d+['"]/,
    'catalog caching is intentional; keep it short and document the audit implication',
  );
});

test('catalog listing price is display-only and never a checkout input', async () => {
  const checkout = await load('api/commerce/checkout.js');
  // Checkout sends only attemptToken + offerKey. The browser-supplied price is
  // deliberately not forwarded, so a wrong display price cannot change what a
  // customer is charged.
  assert.match(checkout, /offerKey/);
  assert.doesNotMatch(
    checkout,
    /body:\s*JSON\.stringify\(\{[^}]*\bprice\b/s,
    'checkout must not forward a price from the client',
  );
});

test('V3 product pages display the amount resolved from commerce, not the catalog', async () => {
  const api = await load('v3/js/api.js');
  assert.match(api, /\/api\/commerce\/offer\?handle=/);
  assert.match(
    api,
    /price:\s*\(pricing\.offer\.unitAmount \/ 100\)\.toFixed\(2\)/,
    'the displayed price must come from the resolved offer',
  );
});

test('individual checkout stays gated behind an explicit feature flag', async () => {
  const checkout = await load('api/commerce/checkout.js');
  assert.match(checkout, /commerce_not_ready/);
  const client = await load('api/commerce/lib/client.js');
  assert.match(client, /COMMERCE_INDIVIDUAL_PRODUCTS_ENABLED/);
});
