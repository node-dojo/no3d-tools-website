import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FALLBACK_PRODUCTS, normalizeProduct, resolveMedia } from '../v3/js/api.js';

const root = new URL('../', import.meta.url);
const load = path => readFile(new URL(path, root), 'utf8');

test('normalizes live catalog records without forking commerce identifiers', () => {
  const product = normalizeProduct({
    id: 'resource-id',
    handle: 'sample-tool',
    title: 'Sample Tool',
    variants: [{ price: '7.77' }],
    product_type: 'Geometry Nodes',
    hosted_media: { 'hero.gif': { secure_url: 'https://media.example/hero.gif' } },
    main_image: 'hero.gif',
  });
  assert.equal(product.id, 'resource-id');
  assert.equal(product.handle, 'sample-tool');
  assert.equal(product.price, '7.77');
  assert.equal(product.image, 'https://media.example/hero.gif');
});

test('keeps the approved Chain Generator presentation alias local to V3', () => {
  const product = normalizeProduct({ handle: 'chrome-crayon', title: 'Chrome Crayon' });
  assert.equal(product.title, 'Chain Generator');
  assert.equal(product.handle, 'chrome-crayon');
});

test('resolves hosted media shapes and ships a canonical paid-product fallback', () => {
  assert.equal(resolveMedia({ secure_url: 'https://media.example/a.gif' }), 'https://media.example/a.gif');
  const bolt = FALLBACK_PRODUCTS.map(normalizeProduct).find(product => product.handle === 'dojo-bolt-gen-v05-obj');
  assert.equal(bolt.image, '/v3/assets/dojo-bolt-disassembly.gif');
  assert.equal(bolt.price, '7.77');
});

test('all adjacent route documents use the shared V3 stylesheet', async () => {
  for (const path of ['v3/index.html', 'v3/product/index.html', 'v3/account/index.html', 'v3/type/index.html']) {
    const html = await load(path);
    assert.match(html, /\/v3\/styles\/v3\.css/);
    assert.doesNotMatch(html, /(?:color\s*=\s*["']blue|#0000ff|#00f\b)/i);
  }
});

test('ASCII parameter plate is fixed width with boundary-centered sockets', async () => {
  const html = await load('v3/product/index.html');
  const plate = html.match(/<pre data-ascii-plate>([\s\S]*?)<\/pre>/)?.[1].replaceAll('&gt;', '>');
  assert.ok(plate);
  const lines = plate.split('\n');
  assert.deepEqual([...new Set(lines.map(line => line.length))], [48]);
  assert.ok(lines.filter(line => line.startsWith('o ')).length >= 10);
  assert.ok(lines.filter(line => line.endsWith('o')).length >= 8);
  assert.ok(lines.filter(line => line.includes('[^]')).length >= 6);
});

test('V3 reuses existing catalog, commerce, auth, account, recovery, and download endpoints', async () => {
  const api = await load('v3/js/api.js');
  const account = await load('v3/js/account.js');
  for (const endpoint of ['/api/get-all-products', '/api/products', '/api/commerce/config', '/api/commerce/checkout', '/api/create-checkout', '/api/auth/session', '/api/commerce/account', '/api/auth/request-link', '/api/auth/recovery-link']) {
    assert.ok(`${api}\n${account}`.includes(endpoint), endpoint);
  }
  assert.match(account, /\/api\/commerce\/download\//);
});

test('Vercel keeps V3 adjacent behind explicit routes', async () => {
  const config = JSON.parse(await load('vercel.json'));
  const rewrites = new Map(config.rewrites.map(rule => [rule.source, rule.destination]));
  assert.equal(rewrites.get('/v3'), '/v3/index.html');
  assert.equal(rewrites.get('/v3/product'), '/v3/product/index.html');
  assert.equal(rewrites.get('/v3/account'), '/v3/account/index.html');
  assert.equal(rewrites.get('/v3/type'), '/v3/type/index.html');
  assert.ok(config.rewrites.some(rule => rule.source === '/account'));
});
