import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import handler from '../api/collections/[handle].js';

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
    assert.equal(res.body.scope, 'no3dtools.membership.no3d-chrome');
    assert.equal(res.body.mode, 'one_time_purchase');
    assert.deepEqual(res.body.price, { amount: 6666, currency: 'usd', formatted: '$66.66' });
    assert.equal(res.body.productCount, 8);
    assert.deepEqual(res.body.products.map(product => product.handle), expected);
    assert.equal(res.body.products[0].catalogAvailable, true);
    assert.equal(res.body.products[1].catalogAvailable, false);
    assert.equal(res.body.acquisition.channel, 'no3d_commerce');
    assert.equal(res.body.acquisition.status, 'offer_pending');
    assert.equal(res.body.acquisition.url, null);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalManifest === undefined) delete process.env.NO3D_MANIFEST_JSON;
    else process.env.NO3D_MANIFEST_JSON = originalManifest;
  }
});

test('collection page presents a one-time purchase and does not expose checkout prematurely', () => {
  const html = readFileSync(fileURLToPath(new URL('../v3/collections/no3d-chrome-tools/index.html', import.meta.url)), 'utf8');
  assert.match(html, /No3D Chrome tools/);
  assert.match(html, /data-collection-products/);
  assert.match(html, /Chrome collection \/ One-time purchase/);
  assert.match(html, /\$66\.66 \/ one time/);
  assert.match(html, /Purchase setup in progress/);
  assert.match(html, /no3d-chrome-hero-static\.webp/);
  assert.match(html, /no3d-chrome-hero-animated\.webp/);
  assert.doesNotMatch(html, /\$9\.99 \/ month|Join on Gumroad|curated Blender membership/);
  assert.doesNotMatch(html, /data-membership-checkout|data-catalog-checkout/);
});
