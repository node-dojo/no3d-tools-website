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

test('all rendered adjacent route documents use the shared V3 stylesheet', async () => {
  for (const path of ['v3/index.html', 'v3/product/index.html', 'v3/account/index.html', 'v3/type/index.html', 'v3/onboarding/create-account/index.html', 'v3/access/index.html']) {
    const html = await load(path);
    assert.match(html, /\/v3\/styles\/v3\.css/);
    assert.doesNotMatch(html, /(?:color\s*=\s*["']blue|#0000ff|#00f\b)/i);
  }
});

test('onboarding follows account, install, automatic connection, and library without redundant consent', async () => {
  const createAccount = await load('v3/onboarding/create-account/index.html');
  const account = await load('v3/account/index.html');
  assert.match(createAccount, /Create free account/i);
  assert.match(createAccount, /Continue with Google/i);
  assert.match(createAccount, /Continue with GitHub/i);
  assert.match(account, /Connect My Library/i);
  assert.match(account, /No license keys or folder setup/i);
  assert.match(account, /No added approval step/i);
  assert.doesNotMatch(account, /Establish sync|Approve this Blender|Pairing code/i);
  assert.match(account, /My Library/i);
  assert.match(account, /Skip setup/i);
  assert.match(account, /updates automatically/i);
});

test('Home uses one story headline and transparent square catalog media', async () => {
  const html = await load('v3/index.html');
  const css = await load('v3/styles/v3.css');
  assert.equal((html.match(/Tools For the Future Old School/gi) || []).length, 1);
  assert.doesNotMatch(html, /<h2[^>]*>Tools for Old School of the Future/i);
  assert.match(css, /\.product-media\{[^}]*aspect-ratio:1[^}]*background:transparent/);
  assert.match(css, /\.product-card h3\{[^}]*transform:translateY\(-50%\)[^}]*background:transparent/);
});

test('acquisition language and yellow follow the library-first V3 decision', async () => {
  const html = await load('v3/product/index.html');
  const css = await load('v3/styles/v3.css');
  assert.match(html, />Add to Library</);
  assert.match(html, />Get Full Catalog</);
  assert.match(css, /--yellow:#f5ff00/);
});

test('component display rules cannot override the native hidden state', async () => {
  const css = await load('v3/styles/v3.css');
  assert.match(css, /html \[hidden\]\{display:none!important\}/);
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
  const callback = await load('api/auth/callback.js');
  const password = await load('api/auth/password.js');
  for (const endpoint of ['/api/get-all-products', '/api/products', '/api/commerce/config', '/api/commerce/checkout', '/api/commerce/portal', '/api/create-checkout', '/api/auth/session', '/api/auth/providers', '/api/commerce/account', '/api/auth/password', '/api/auth/oauth', '/api/auth/recovery-link', '/api/addon/connect/approve']) {
    assert.ok(`${api}\n${account}`.includes(endpoint), endpoint);
  }
  assert.match(account, /\/api\/commerce\/download\//);
  assert.match(callback, /\/v3\/onboarding\/create-account\/\?auth=invalid/);
  assert.match(password, /claimPurchasingGuest/);
  assert.match(password, /account_claim_failed/);
});

test('Vercel keeps V3 adjacent behind explicit routes', async () => {
  const config = JSON.parse(await load('vercel.json'));
  const rewrites = new Map(config.rewrites.map(rule => [rule.source, rule.destination]));
  assert.equal(rewrites.get('/v3'), '/v3/index.html');
  assert.equal(rewrites.get('/v3/access'), '/v3/access/index.html');
  assert.equal(rewrites.get('/v3/product'), '/v3/product/index.html');
  assert.equal(rewrites.get('/v3/account'), '/v3/account/index.html');
  assert.equal(rewrites.get('/v3/onboarding/create-account'), '/v3/onboarding/create-account/index.html');
  assert.equal(rewrites.get('/v3/onboarding/install'), '/v3/account/index.html?state=install');
  assert.equal(rewrites.get('/v3/onboarding/connect'), '/v3/account/index.html?state=connect');
  assert.equal(rewrites.get('/v3/type'), '/v3/type/index.html');
  assert.ok(config.rewrites.some(rule => rule.source === '/account'));
});

test('staging rollout expires and keeps the teaser outside the deployable repository', async () => {
  const staging = await load('docs/design/v3/STAGING-ROLLOUT.md');
  assert.match(staging, /2026-09-18/);
  assert.match(staging, /teaser prototype is stored in the Vault/i);
  assert.match(staging, /V3_ACCESS_MODE.*unset in production/i);
  assert.match(staging, /Stripe test Checkout/i);
  assert.match(staging, /Delete both Supabase branches/i);
});
