import assert from 'node:assert/strict';
import test from 'node:test';

import { filterEffectiveManifest } from '../api/lib/effectiveManifest.js';

const manifest = JSON.stringify({
  version: 'test',
  assets: {
    purchased: { checksum: 'purchase' },
    membership: { checksum: 'membership' },
  },
});

test('purchase-only access returns only permanently owned products', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, false, new Set(['purchased'])));
  assert.deepEqual(Object.keys(result.assets), ['purchased']);
  assert.equal(result.assets.purchased.access_source, 'purchase');
});

test('membership access returns the full active library', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, true, new Set()));
  assert.equal(result.asset_count, 2);
  assert.equal(result.assets.membership.access_source, 'membership');
});

test('combined access preserves purchase source on the membership union', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, true, new Set(['purchased'])));
  assert.equal(result.asset_count, 2);
  assert.equal(result.assets.purchased.access_source, 'membership_and_purchase');
  assert.equal(result.assets.membership.access_source, 'membership');
});
