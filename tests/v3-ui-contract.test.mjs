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
  assert.equal(bolt.image, '/v3/assets/dojo-bolt-disassembly.webp?v=perf-20260820');
  assert.equal(bolt.video, '/v3/assets/dojo-bolt-disassembly.webm?v=perf-20260820');
  assert.equal(bolt.price, '7.77');
});

test('all rendered adjacent route documents use the shared V3 stylesheet', async () => {
  for (const path of ['v3/index.html', 'v3/product/index.html', 'v3/account/index.html', 'v3/membership/index.html', 'v3/type/index.html', 'v3/onboarding/create-account/index.html', 'v3/access/index.html']) {
    const html = await load(path);
    assert.match(html, /\/v3\/styles\/v3\.css/);
    assert.doesNotMatch(html, /(?:color\s*=\s*["']blue|#0000ff|#00f\b)/i);
  }
});

test('onboarding follows account, install, automatic connection, and library without redundant consent', async () => {
  const createAccount = await load('v3/onboarding/create-account/index.html');
  const account = await load('v3/account/index.html');
  const accountScript = await load('v3/js/account.js');
  const desktopLink = await load('api/onboarding/desktop-link.js');
  assert.match(createAccount, /Create free account/i);
  assert.match(createAccount, /Continue with Google/i);
  assert.match(createAccount, /Continue with GitHub/i);
  assert.match(account, /Connect My Library/i);
  assert.match(account, /No license keys or folder setup/i);
  assert.match(account, /No added approval step/i);
  assert.doesNotMatch(account, /Establish sync|Approve this Blender|Pairing code/i);
  assert.match(account, /My Library/i);
  assert.match(account, /Skip setup/i);
  assert.match(account, /Continue On Your Desktop/i);
  assert.match(account, /data-proceed-mobile>Proceed →/i);
  assert.doesNotMatch(account, /Send setup link again/i);
  assert.match(accountScript, /matchMedia\('\(max-width: 650px\)'\)/);
  assert.match(accountScript, /sendDesktopSetupLink/);
  assert.match(desktopLink, /authenticatedSession/);
  assert.match(desktopLink, /sendEmail/);
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
  const membership = await load('v3/membership/index.html');
  const css = await load('v3/styles/v3.css');
  assert.match(html, />Add to Library</);
  assert.match(html, />Get Full Catalog</);
  assert.match(css, /--yellow:#f5ff00/);
  assert.match(membership, /The Entire Library\. Always Current\./i);
  assert.match(membership, /Automatic Updates/i);
});

test('free catalog policy flows into account and product acquisition without Checkout', async () => {
  const api = await load('v3/js/api.js');
  const account = await load('v3/js/account.js');
  const product = await load('v3/js/product.js');
  const catalog = await load('api/products.js');
  const manifest = await load('api/manifest.js');
  const download = await load('api/download/[handle].js');
  assert.match(api, /accessPolicy: product\.access_policy/);
  assert.match(api, /pricingSource: 'free'/);
  assert.match(account, /product\.accessPolicy !== 'free'/);
  assert.match(account, /free: true, owned: true/);
  assert.match(product, /Add Free Tool/);
  assert.match(product, /if \(free\)/);
  assert.match(catalog, /access_policy/);
  assert.match(manifest, /accountAuthenticated/);
  assert.match(download, /product\.access_policy === 'free'/);
});

test('product detail uses a cached handle endpoint and defers commerce from identity rendering', async () => {
  const html = await load('v3/product/index.html');
  const productScript = await load('v3/js/product.js');
  const api = await load('v3/js/api.js');
  const endpoint = await load('api/products/[handle].js');
  assert.match(api, /api\/products\/\$\{encodeURIComponent\(handle\)\}/);
  assert.match(endpoint, /\.eq\('handle', handle\)/);
  assert.match(endpoint, /s-maxage=300/);
  assert.doesNotMatch(html, /data-product-hero[^>]+src=/);
  assert.match(html, /<video data-product-video/);
  assert.match(productScript, /const commercePromise = getCommerceConfig\(\)/);
  assert.match(productScript, /await getProduct\(handle\)/);
});

test('product detail price is resolved by Commerce and fails closed without it', async () => {
  const api = await load('v3/js/api.js');
  const productScript = await load('v3/js/product.js');
  const offerEndpoint = await load('api/commerce/offer.js');
  const commerceClient = await load('api/commerce/lib/client.js');
  assert.match(api, /\/api\/commerce\/offer\?handle=/);
  assert.match(api, /pricingSource: 'commerce'/);
  assert.match(api, /pricingSource: 'unavailable'/);
  assert.match(api, /purchasable: false/);
  assert.match(productScript, /dataset\.pricingSource = pricingSource/);
  assert.match(offerEndpoint, /commerceBackendFetch/);
  assert.match(offerEndpoint, /Cache-Control', 'private, no-store'/);
  assert.doesNotMatch(offerEndpoint, /priceId/);
  assert.match(commerceClient, /'X-NO3D-Site': commerceSiteKey\(\)/);
});

test('V3 static media, code, styles, fonts, and catalog data have explicit cache policy', async () => {
  const config = JSON.parse(await load('vercel.json'));
  const sources = config.headers.map(rule => rule.source);
  assert.ok(sources.some(source => source.startsWith('/v3/assets/')));
  assert.ok(sources.some(source => source.startsWith('/v3/(js|styles)/')));
  assert.ok(sources.some(source => source.startsWith('/fonts/')));
  const catalog = await load('api/get-all-products.js');
  assert.match(catalog, /s-maxage=300/);
});

test('V3 membership remains inside V3 and reads only verified account membership state', async () => {
  const api = await load('v3/js/api.js');
  const account = await load('api/membership/account.js');
  const portal = await load('api/membership/portal.js');
  const checkout = await load('api/create-checkout.js');
  const price = await load('api/get-subscription-price.js');
  assert.match(api, /JSON\.stringify\(\{ returnTarget: 'v3' \}\)/);
  assert.match(account, /authenticatedSession/);
  assert.match(account, /computeAccessState/);
  assert.match(portal, /authenticatedSession/);
  assert.match(portal, /stripe_customer_id/);
  assert.match(checkout, /membership_checkout=success/);
  assert.match(checkout, /\/v3\/membership\/\?checkout=cancelled/);
  assert.match(checkout, /V3 staging requires a Stripe test-mode membership price/);
  assert.match(price, /environment: price\.livemode \? 'live' : 'test'/);
});

test('Commerce site identity is environment-bound across checkout, claim, and recovery', async () => {
  const site = await load('api/lib/commerceSite.js');
  const client = await load('api/commerce/lib/client.js');
  const claim = await load('api/auth/lib/claim.js');
  const recovery = await load('api/auth/lib/recovery.js');
  assert.match(site, /process\.env\.COMMERCE_SITE_KEY/);
  assert.match(site, /\|\| 'no3dtools'/);
  for (const source of [client, claim, recovery]) {
    assert.match(source, /commerceSiteKey\(\)/);
    assert.doesNotMatch(source, /'X-NO3D-Site': 'no3dtools'/);
  }
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
  for (const endpoint of ['/api/get-all-products', '/api/products', '/api/commerce/config', '/api/commerce/checkout', '/api/commerce/portal', '/api/create-checkout', '/api/auth/session', '/api/auth/providers', '/api/commerce/account', '/api/membership/account', '/api/membership/portal', '/api/auth/password', '/api/auth/oauth', '/api/auth/recovery-link', '/api/addon/connect/approve', '/api/onboarding/desktop-link']) {
    assert.ok(`${api}\n${account}`.includes(endpoint), endpoint);
  }
  assert.match(account, /\/api\/commerce\/download\//);
  assert.match(callback, /\/v3\/onboarding\/create-account\/\?auth=invalid/);
  assert.match(password, /claimPurchasingGuest/);
  assert.match(password, /account_claim_failed/);
});

test('V3 catalog prefers live metadata and keeps unpriced studies out of Checkout', async () => {
  const api = await load('v3/js/api.js');
  const product = await load('v3/js/product.js');
  assert.ok(api.indexOf("request('/api/products?limit=100')") < api.indexOf("request('/api/get-all-products')"));
  assert.match(api, /product: product \? \{ \.\.\.product, price: '' \} : null/);
  assert.match(api, /purchasable: false/);
  assert.match(product, /get\('handle'\) \|\| 'chrome-crayon'/);
  assert.match(product, /This design study is not yet published for individual checkout/);
});

test('Vercel keeps V3 adjacent behind explicit routes', async () => {
  const config = JSON.parse(await load('vercel.json'));
  const rewrites = new Map(config.rewrites.map(rule => [rule.source, rule.destination]));
  assert.equal(rewrites.get('/v3'), '/v3/index.html');
  assert.equal(rewrites.get('/v3/access'), '/v3/access/index.html');
  assert.equal(rewrites.get('/v3/product'), '/v3/product/index.html');
  assert.equal(rewrites.get('/v3/membership'), '/v3/membership/index.html');
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
