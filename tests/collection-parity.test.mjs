import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import handler from '../api/collections/[handle].js';
import { collectionDefinitions } from '../lib/collection-definitions.js';
import { renderCollectionPage } from '../scripts/render-v3-collection-pages.mjs';

const expected = [
  'chrome-crayon',
  'dojo-spiro-curve',
  'flat-stickie-pack',
  'image-pixel-stippler',
  'no3d-pixel-markers',
  'periodic-brush',
  'spikey-chain-and-mace',
  'type-pixel-brush',
];

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('No3D Chrome site projection preserves SOLVET collection order and scope', async () => {
  const originalFetch = globalThis.fetch;
  const originalManifest = process.env.NO3D_MANIFEST_JSON;
  process.env.NO3D_MANIFEST_JSON = JSON.stringify({ collections: { 'no3dtools.membership.no3d-chrome': expected } });
  globalThis.fetch = async url => {
    return { ok: true, json: async () => ({ products: [{ handle: 'chrome-crayon', title: 'Chrome Crayon' }] }) };
  };
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { handle: 'no3d-chrome-tools' }, headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.title, 'No3D Chrome tools');
    assert.equal(res.body.thumbnail, '/v3/assets/no3d-chrome-hero-static.webp');
    assert.equal(res.body.productUrl, '/v3/collections/no3d-chrome-tools/');
    assert.equal(res.body.scope, 'no3dtools.membership.no3d-chrome');
    assert.equal(res.body.mode, 'expanding_lifetime_collection');
    assert.deepEqual(res.body.pricing.payNow, { amount: 6666, currency: 'usd', formatted: '$66.66', schedule: 'pay_now' });
    assert.deepEqual(res.body.pricing.payOverTime, { amount: 1111, currency: 'usd', formatted: '$11.11', installments: 6, schedule: 'pay_over_time' });
    assert.equal(res.body.productCount, 8);
    assert.deepEqual(res.body.products.map(product => product.handle), expected);
    assert.equal(res.body.products[0].catalogAvailable, true);
    assert.equal(res.body.products[1].catalogAvailable, false);
    assert.equal(res.body.acquisition.channel, 'no3d_commerce');
    assert.equal(res.body.acquisition.status, 'offer_pending');
    assert.equal(res.body.acquisition.enabled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalManifest === undefined) delete process.env.NO3D_MANIFEST_JSON;
    else process.env.NO3D_MANIFEST_JSON = originalManifest;
  }
});

test('No3D Chrome accepts later SOLVET-authored additions to the expanding collection', async () => {
  const originalFetch = globalThis.fetch;
  const originalManifest = process.env.NO3D_MANIFEST_JSON;
  const expanded = [...expected, 'later-addition'];
  process.env.NO3D_MANIFEST_JSON = JSON.stringify({ collections: { 'no3dtools.membership.no3d-chrome': expanded } });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ products: [] }) });
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { handle: 'no3d-chrome-tools' }, headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.productCount, 9);
    assert.deepEqual(res.body.products.map(product => product.handle), expanded);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalManifest === undefined) delete process.env.NO3D_MANIFEST_JSON;
    else process.env.NO3D_MANIFEST_JSON = originalManifest;
  }
});

test('collection page presents equal-benefit lifetime payment choices without enabling checkout prematurely', () => {
  const html = readFileSync(fileURLToPath(new URL('../v3/collections/no3d-chrome-tools/index.html', import.meta.url)), 'utf8');
  assert.match(html, /No3D Chrome tools/);
  assert.match(html, /data-collection-products/);
  assert.match(html, /Chrome collection \/ Lifetime ownership/);
  assert.match(html, /Full collection available to you immediately/);
  assert.match(html, /href="\/v3\/onboarding\/install\/">NO3D Tools app/);
  assert.match(html, /\$66\.66 once/);
  assert.match(html, /\$11\.11 \/ month for 6 months/);
  assert.match(html, /<details class="collection-purchase-details">/);
  assert.match(html, /You’ll receive an email when your payments are complete/);
  assert.match(html, /Continuing is optional, and your access to the tools you’ve paid for will not be affected/);
  assert.match(html, /class="collection-status" data-collection-message aria-live="polite"><\/p>/);
  assert.match(html, /data-schedule="pay_now"/);
  assert.match(html, /data-schedule="pay_over_time"/);
  assert.match(html, /no3d-chrome-hero-static\.webp/);
  assert.match(html, /no3d-chrome-hero-animated\.webp/);
  assert.match(html, /shared-source-folder-black\.png/);
  assert.match(html, /data-collection-source-products/);
  assert.doesNotMatch(html, /\$9\.99 \/ month|Join on Gumroad|curated Blender membership/);
  assert.doesNotMatch(html, /Same collection \/ Two ways to pay|\$66\.66 lifetime|6 × \$11\.11/);
  assert.doesNotMatch(html, /data-membership-checkout|data-catalog-checkout/);
});

test('every collection page uses the shared immediate-access purchase format', () => {
  const collectionsRoot = fileURLToPath(new URL('../v3/collections/', import.meta.url));
  const handles = readdirSync(collectionsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  assert.deepEqual(handles, Object.keys(collectionDefinitions).sort());
  for (const handle of handles) {
    const html = readFileSync(`${collectionsRoot}/${handle}/index.html`, 'utf8');
    assert.equal(html, renderCollectionPage(handle, collectionDefinitions[handle]));
    assert.match(html, /membership-purchase collection-purchase-simplified/);
    assert.match(html, /Full collection available to you immediately/);
    assert.match(html, /href="\/v3\/onboarding\/install\/">NO3D Tools app/);
    assert.match(html, /data-pay-over-time-price data-price-format="monthly-duration"/);
    assert.match(html, /<details class="collection-purchase-details">/);
    assert.match(html, /You’ll receive an email when your payments are complete/);
    assert.match(html, /Continuing is optional, and your access to the tools you’ve paid for will not be affected/);
    assert.match(html, /class="collection-status" data-collection-message aria-live="polite"><\/p>/);
    assert.doesNotMatch(html, /Same (?:collection|library) \/ Two ways to pay/);
  }
});

test('full-library projection preserves the new canonical scope and approved prices', async () => {
  const originalFetch = globalThis.fetch;
  const originalManifest = process.env.NO3D_MANIFEST_JSON;
  const members = Array.from({ length: 54 }, (_, index) => `tool-${index + 1}`);
  process.env.NO3D_MANIFEST_JSON = JSON.stringify({ collections: { 'no3dtools.membership.full-library': members } });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ products: [] }) });
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { handle: 'full-library' }, headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.scope, 'no3dtools.membership.full-library');
    assert.equal(res.body.productCount, 54);
    assert.equal(res.body.pricing.payNow.amount, 17777);
    assert.equal(res.body.pricing.payOverTime.amount, 1555);
    assert.equal(res.body.pricing.payOverTime.installments, 12);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalManifest === undefined) delete process.env.NO3D_MANIFEST_JSON;
    else process.env.NO3D_MANIFEST_JSON = originalManifest;
  }
});

test('full-library projection remains available after future tools are added', async () => {
  const originalFetch = globalThis.fetch;
  const originalManifest = process.env.NO3D_MANIFEST_JSON;
  const members = Array.from({ length: 55 }, (_, index) => `tool-${index + 1}`);
  process.env.NO3D_MANIFEST_JSON = JSON.stringify({ collections: { 'no3dtools.membership.full-library': members } });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ products: [] }) });
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { handle: 'full-library' }, headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.productCount, 55);
    assert.equal(res.body.products.at(-1).handle, 'tool-55');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalManifest === undefined) delete process.env.NO3D_MANIFEST_JSON;
    else process.env.NO3D_MANIFEST_JSON = originalManifest;
  }
});
