import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { filterEffectiveManifest } from '../api/lib/effectiveManifest.js';
import { collectionAllowsHandle } from '../api/lib/membershipCollections.js';

const manifestHandlerSource = readFileSync(
  fileURLToPath(new URL('../api/manifest.js', import.meta.url)),
  'utf-8'
);

const manifest = JSON.stringify({
  version: 'test',
  collections: {
    'no3dtools.membership.no3d-chrome': ['membership'],
    'no3dtools.membership.node-dojo': ['purchased', 'membership'],
  },
  assets: {
    purchased: { checksum: 'purchase' },
    membership: { checksum: 'membership' },
    free: { checksum: 'free', access_policy: 'free' },
  },
});

test('purchase-only access returns only permanently owned products', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, false, new Set(['purchased'])));
  assert.deepEqual(Object.keys(result.assets), ['purchased']);
  assert.equal(result.assets.purchased.access_source, 'purchase');
});

test('managed free accounts receive free assets without a purchase or membership', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, false, new Set(), true));
  assert.deepEqual(Object.keys(result.assets), ['free']);
  assert.equal(result.assets.free.access_source, 'free');
});

test('an unauthenticated request cannot use free policy as anonymous download access', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, false, new Set(), false));
  assert.equal(result.asset_count, 0);
});

test('membership access returns the full active library', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, true, new Set()));
  assert.equal(result.asset_count, 3);
  assert.equal(result.assets.membership.access_source, 'membership');
});

test('combined access preserves purchase source on the membership union', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, true, new Set(['purchased'])));
  assert.equal(result.asset_count, 3);
  assert.equal(result.assets.purchased.access_source, 'membership_and_purchase');
  assert.equal(result.assets.membership.access_source, 'membership');
});

test('scoped membership resolves only its SOLVET-authored collection', () => {
  const result = JSON.parse(filterEffectiveManifest(
    manifest,
    false,
    new Set(),
    true,
    ['no3dtools.membership.no3d-chrome'],
  ));
  assert.deepEqual(Object.keys(result.assets), ['membership', 'free']);
  assert.equal(result.assets.membership.access_source, 'membership');
});

test('an existing lifetime collection entitlement receives later authored additions', () => {
  const expandedManifest = JSON.parse(manifest);
  expandedManifest.collections['no3dtools.membership.no3d-chrome'].push('later-addition');
  expandedManifest.assets['later-addition'] = { checksum: 'later' };

  const before = JSON.parse(filterEffectiveManifest(
    manifest,
    false,
    new Set(),
    true,
    ['no3dtools.membership.no3d-chrome'],
  ));
  const after = JSON.parse(filterEffectiveManifest(
    JSON.stringify(expandedManifest),
    false,
    new Set(),
    true,
    ['no3dtools.membership.no3d-chrome'],
  ));

  assert.equal(before.assets['later-addition'], undefined);
  assert.equal(after.assets['later-addition'].access_source, 'membership');
});

test('unknown membership scopes fail closed', () => {
  const result = JSON.parse(filterEffectiveManifest(manifest, false, new Set(), true, ['unknown']));
  assert.deepEqual(Object.keys(result.assets), ['free']);
});

test('per-product download authorization uses the same authored collections', () => {
  assert.equal(collectionAllowsHandle(manifest, ['no3dtools.membership.no3d-chrome'], 'membership'), true);
  assert.equal(collectionAllowsHandle(manifest, ['no3dtools.membership.no3d-chrome'], 'purchased'), false);
  assert.equal(collectionAllowsHandle(manifest, ['unknown'], 'membership'), false);
});

test('the manifest route has no unfiltered escape hatch', () => {
  assert.doesNotMatch(manifestHandlerSource, /query\?\.redirect/);
  assert.doesNotMatch(manifestHandlerSource, /res\.setHeader\('Location'/);
  assert.doesNotMatch(manifestHandlerSource, /status\(302\)/);
});

test('every manifest success response is entitlement filtered', () => {
  const successes = manifestHandlerSource.match(/status\(200\)\.send\([^;]*/g) || [];
  assert.ok(successes.length > 0, 'expected at least one manifest success response');
  for (const success of successes) {
    assert.match(success, /filterEffectiveManifest\(/);
  }
});
