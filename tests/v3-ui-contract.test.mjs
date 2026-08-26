import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FALLBACK_PRODUCTS, normalizeProduct, resolveMedia, selectWorkbenchInventory, sortCatalogProducts } from '../v3/js/api.js';

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

test('catalog priority raises reviewed products without reordering unranked products', () => {
  const products = [
    normalizeProduct({ handle: 'unchanged-a' }),
    normalizeProduct({ handle: 'priority-b', catalog: { priority: 2 } }),
    normalizeProduct({ handle: 'unchanged-b' }),
    normalizeProduct({ handle: 'priority-a', metadata: { catalog: { priority: 1 } } }),
  ];
  assert.deepEqual(
    sortCatalogProducts(products).map(product => product.handle),
    ['priority-a', 'priority-b', 'unchanged-a', 'unchanged-b'],
  );
});

test('home fingerprints the single-page directory composition', async () => {
  assert.match(await load('v3/index.html'), /home\.js\?v=home-directory-composition-20260824/);
});

test('resolves hosted media shapes and ships a canonical paid-product fallback', () => {
  assert.equal(resolveMedia({ secure_url: 'https://media.example/a.gif' }), 'https://media.example/a.gif');
  const bolt = FALLBACK_PRODUCTS.map(normalizeProduct).find(product => product.handle === 'dojo-bolt-gen-v05-obj');
  assert.equal(bolt.image, '/v3/assets/dojo-bolt-disassembly.webp?v=perf-20260820');
  assert.equal(bolt.video, '/v3/assets/dojo-bolt-disassembly.webm?v=perf-20260820');
  assert.equal(bolt.price, '7.77');
});

test('all rendered adjacent route documents use the shared V3 stylesheet', async () => {
  for (const path of ['v3/index.html', 'v3/product/index.html', 'v3/account/index.html', 'v3/membership/index.html', 'v3/type/index.html', 'v3/workbench/index.html', 'v3/onboarding/create-account/index.html', 'v3/access/index.html']) {
    const html = await load(path);
    assert.match(html, /\/v3\/styles\/v3\.css/);
    assert.doesNotMatch(html, /(?:color\s*=\s*["']blue|#0000ff|#00f\b)/i);
  }
});

test('every V3 route records the page-view event that drives visit notifications', async () => {
  const api = await load('v3/js/api.js');
  const analytics = await load('v3/js/analytics.js');
  for (const client of ['home', 'product', 'account', 'membership', 'onboarding', 'workbench']) {
    assert.match(await load(`v3/js/${client}.js`), /from ['"]\.\/api\.js/);
  }
  assert.match(api, /import ['"]\.\/analytics\.js/);
  assert.match(analytics, /track\('page_view'/);
  assert.match(analytics, /fetch\('\/api\/track'/);
  assert.match(analytics, /page: window\.location\.pathname \+ window\.location\.search/);
  assert.match(analytics, /referrer: document\.referrer/);
});

test('Shared Source Folder is additive, filename-led, and reuses the existing product catalog', async () => {
  const home = await load('v3/index.html');
  const workbench = await load('v3/workbench/index.html');
  const client = await load('v3/js/workbench.js');
  const styles = await load('v3/styles/v3.css');
  const api = await load('v3/js/api.js');
  const catalog = await load('api/products.js');
  assert.match(home, /The Shared Source Folder/);
  assert.match(home, /home-shared-folder/);
  assert.match(home, /source-browser/);
  assert.doesNotMatch(home, /Open the Shared Source Folder/);
  assert.doesNotMatch(home, /data-product-count/);
  assert.doesNotMatch(home, /data-catalog-toggle/);
  assert.match(workbench, /mobile-directory/);
  assert.match(workbench, /One tool opens one product page for individual checkout/);
  assert.match(workbench, /full-catalog membership/);
  assert.match(workbench, /data-mobile-featured-empty/);
  assert.match(workbench, /data-mobile-files-empty/);
  assert.match(client, /direct-product-link/);
  assert.match(client, /\['All', 'Hardware', 'Generators', 'Primitives', 'Utilities', 'Brushes', 'Ready Mades', 'Assemblies', 'Lessons'\]/);
  assert.match(client, /mobileLoopWidth = loop\.scrollWidth \/ 3/);
  assert.match(client, /loop\.scrollLeft = mobileLoopWidth/);
  assert.match(client, /data-mobile-featured-empty/);
  assert.match(client, /data-mobile-files-empty/);
  assert.doesNotMatch(client, /type="checkbox"/);
  assert.match(styles, /\.file-label\{grid-template-columns:minmax\(200px,1fr\) 82px 68px 52px\}/);
  assert.match(styles, /\.mobile-home \.product-media\{position:relative;z-index:1;height:210px;aspect-ratio:auto;overflow:visible\}/);
  assert.match(styles, /\.mobile-home \.product-card h3\{position:relative;z-index:2;margin:-7px 0 10px;transform:none;background:transparent\}/);
  assert.match(styles, /\.mobile-home \.product-grid\{[^}]*scrollbar-width:none/);
  assert.match(styles, /\.mobile-home \.product-grid::\-webkit-scrollbar\{display:none\}/);
  assert.match(styles, /\.mobile-home \.home-shared-folder\{padding:34px 18px 100px 0;border-top:0\}/);
  assert.match(styles, /\.workbench-page \.catalog-rail,\.workbench-page \.shared-folder\{display:none\}/);
  assert.match(styles, /\.mobile-featured-tools\{display:grid;grid-template-rows:repeat\(2,250px\);grid-auto-flow:column;/);
  assert.match(styles, /\.mobile-featured-card>div\{[^}]*border-bottom:1px solid var\(--rule\)/);
  assert.doesNotMatch(styles, /\.mobile-featured-card\{[^}]*border:/);
  assert.match(workbench, /source-browser/);
  assert.match(client, /getCatalog\(\)/);
  assert.match(client, /selectWorkbenchInventory/);
  assert.match(client, /no3d_my_file_handles/);
  assert.match(api, /presentationMode: presentation\.mode \|\| 'flagship'/);
  assert.match(api, /presentationMode === 'workbench'/);
  assert.match(catalog, /presentation: p\.metadata\?\.presentation/);
  assert.match(catalog, /workbench: p\.metadata\?\.workbench/);
  assert.match(catalog, /catalog: p\.metadata\?\.catalog/);
});

test('account My Folder reuses Directory.001 without creating a second collection', async () => {
  const account = await load('v3/account/index.html');
  const client = await load('v3/js/account.js');
  const view = await load('v3/js/account-library.js');
  const preview = await load('v3/js/product-preview.js');
  const styles = await load('v3/styles/v3.css');
  assert.match(account, /<h2 id="library-title">My Folder<\/h2>/);
  assert.match(account, /source-window account-file-window/);
  assert.match(account, /source-browser account-file-browser/);
  assert.match(account, /Parent folders/);
  assert.match(account, /Downloaded/);
  assert.doesNotMatch(account, /Latest purchase/);
  assert.match(client, /payload\.url/);
  assert.match(client, /location\.assign\(target\.href\)/);
  assert.match(client, /action\.onclick = null/);
  assert.match(client, /action\.onclick = event =>/);
  assert.doesNotMatch(client, /action\.addEventListener\('click', event => void downloadAccountFile/);
  assert.match(client, /if \(outcome === 'fulfilled'\)/);
  assert.match(client, /location\.replace\('\/v3\/account\/\?purchase=ready'\)/);
  assert.match(client, /if \(outcome === 'terminal'\)/);
  assert.match(client, /state\.products\.map\(item =>/);
  assert.match(client, /summary\?\.products \|\| \[\]/);
  assert.match(client, /state\.member = member/);
  assert.match(client, /permanentCustomer \? 'Customer' : 'Free'/);
  assert.match(client, /'Inactive \/ Manual updates'/);
  assert.match(client, /accountStorageKey\('blender_connected'\)/);
  assert.match(client, /accountStorageKey\('downloaded', file\.handle\)/);
  assert.match(client, /pointerenter/);
  assert.match(client, /focusin/);
  assert.match(client, /restoreInspector\(\)/);
  assert.match(client, /preloadProductPreviews\(files\)/);
  assert.match(client, /localPreview === 'directory'/);
  assert.match(client, /local-directory-preview/);
  assert.match(preview, /product\.thumbnail \|\| product\.image/);
  assert.match(preview, /PRODUCT_PREVIEW_FALLBACK/);
  assert.match(preview, /image\.onerror/);
  assert.match(styles, /\.inspector-preview\{height:clamp\(/);
  assert.match(styles, /\.inspector-preview img\{width:150px;height:150px;flex:0 0 150px/);
  assert.match(styles, /-webkit-line-clamp:2/);
  assert.match(styles, /\.account-file-browser\{display:block;min-width:0;min-height:0\}/);
  assert.match(styles, /\.account-file-window \.account-file-row\{grid-template-columns:1fr;min-height:0\}/);
  assert.match(styles, /\.account-file-inspector\{display:none\}/);
  assert.match(client, /action\.textContent = 'Download started ✓'/);
  assert.match(client, /action\.removeAttribute\('aria-disabled'\)/);
  assert.ok(
    client.indexOf("action.textContent = 'Download started ✓'") < client.indexOf('location.assign(target.href)'),
    'the visible success state must replace Preparing before navigation starts',
  );
  assert.doesNotMatch(client, /no3d_my_file_handles|localStorage[^\n]*my_file/i);
  assert.doesNotMatch(account, /Add to My Folder/i);
  assert.doesNotMatch(view, /selected|inFile|localStorage/);
});

test('Workbench live inventory replaces previews and excludes archived records', () => {
  const preview = [{ handle: 'preview-only' }];
  const flagship = { handle: 'flagship', presentationMode: 'flagship', releaseStatus: 'stable' };
  const archived = { handle: 'old-file', presentationMode: 'workbench', releaseStatus: 'archived' };
  assert.deepEqual(selectWorkbenchInventory({ products: [flagship, archived] }, preview), { entries: preview, live: [], state: 'preview' });
  const live = { handle: 'real-file', presentationMode: 'workbench', releaseStatus: 'experimental' };
  const result = selectWorkbenchInventory({ products: [flagship, archived, live] }, preview);
  assert.deepEqual(result.entries, [live]);
  assert.equal(result.state, 'live');
  assert.equal(selectWorkbenchInventory({ products: [], error: 'offline' }, preview).state, 'offline-preview');
});

test('onboarding installs first and exposes connection only to a Blender-issued code', async () => {
  const createAccount = await load('v3/onboarding/create-account/index.html');
  const account = await load('v3/account/index.html');
  const accountScript = await load('v3/js/account.js');
  const desktopLink = await load('api/onboarding/desktop-link.js');
  assert.match(createAccount, /Create free account/i);
  assert.match(await load('v3/js/onboarding.js'), /Too many account attempts from this connection/);
  assert.match(createAccount, /Continue with Google/i);
  assert.match(createAccount, /Continue with GitHub/i);
  assert.match(account, /Continue to My Folder/i);
  assert.match(accountScript, /requestedStateParam === 'connect' && !params\.get\('code'\) \? 'ready'/);
  assert.match(account, /No license keys or folder setup/i);
  assert.match(account, /No added approval step/i);
  assert.doesNotMatch(account, /Establish sync|Approve this Blender|Pairing code/i);
  assert.match(account, /My Folder/i);
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

test('a paid-order return can request one recovery link without losing the order', async () => {
  const html = await load('v3/onboarding/create-account/index.html');
  const client = await load('v3/js/onboarding.js');
  assert.match(html, /data-purchase-recovery hidden/);
  assert.match(client, /const purchaseOrderId = next\.match/);
  assert.match(client, /await requestRecovery\(purchaseOrderId\)/);
  assert.match(client, /Your purchase remains attached/);
});

test('Home keeps a document heading and transparent square catalog media', async () => {
  const html = await load('v3/index.html');
  const css = await load('v3/styles/v3.css');
  assert.equal((html.match(/<h1[^>]*>/g) || []).length, 1);
  assert.match(css, /\.v3-page-title\{[^}]*var\(--display\)/);
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
  assert.match(api, /request\('\/api\/products\?limit=100'\)/);
  assert.match(account, /product\.accessPolicy !== 'free'/);
  assert.match(account, /free: true, owned: true/);
  assert.match(product, /Add to Library/);
  assert.match(product, /if \(free\)/);
  assert.match(await load('v3/js/home.js'), /product\.accessPolicy === 'free' \? 'FREE'/);
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
  assert.doesNotMatch(html, /data-product-video/);
  assert.match(html, /Main product thumbnail/);
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

test('the ASCII parameter panel ships empty and hidden, never a shared fixture', async () => {
  const html = await load('v3/product/index.html');
  // The template previously inlined one product's diagram, so every product
  // rendered Dojo Bolt's parameter map. The panel must now carry no diagram
  // of its own and must start hidden.
  const plate = html.match(/<pre data-ascii-plate>([\s\S]*?)<\/pre>/)?.[1];
  assert.equal(plate, '', 'the plate must ship empty');
  assert.match(html, /<section class="ascii-panel" data-ascii-panel hidden>/);
  assert.doesNotMatch(html, /DOJO BOLT GEN/i, 'no product-specific diagram may live in the template');
  assert.doesNotMatch(html, /Node instrument \/ Exposed parameter map/i, 'the diagram should not carry a redundant section heading');
});

test('a product renders only its own diagram, and none at all when it has none', async () => {
  const product = await load('v3/js/product.js');
  const api = await load('v3/js/api.js');
  // Absent is a supported outcome: static assets have no node graph. The panel
  // is removed outright rather than left as an empty frame, and there is no
  // fallback to another product's map.
  assert.match(product, /if \(product\.nodeDiagram\)/);
  assert.match(product, /asciiPanel\.remove\(\)/);
  // Diagram text is drawn characters, never markup.
  assert.match(product, /\[data-ascii-plate\]'\)\.textContent = product\.nodeDiagram/);
  assert.doesNotMatch(product, /data-ascii-plate'\)\.innerHTML/);
  // Editorial state must not reach a customer through the projection. Checked
  // against code with comments stripped, so the prose explaining *why* the
  // status field is never read does not itself trip the assertion.
  assert.match(api, /product\.metadata\?\.node_diagram\b/);
  const apiCode = api.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(apiCode, /node_diagram_status/);
});

test('product descriptions render one designed heading and use real prose for summaries', async () => {
  const html = await load('v3/product/index.html');
  const product = await load('v3/js/product.js');
  assert.equal((html.match(/<h2>Description<\/h2>/g) || []).length, 1);
  assert.match(html, /product\.js\?v=description-sections-20260824/);
  assert.match(product, /function descriptionContent\(text\)/);
  assert.match(product, /\^#\{1,6\}\\s\+description/);
  assert.match(product, /const summary = descriptionSummary\(product\.description\)/);
  assert.match(product, /\[data-product-lede\]'\)\.textContent = summary/);
  assert.match(product, /\[data-purpose\]'\)\.textContent = summary/);
  assert.doesNotMatch(product, /product\.description\.split\(\/\\n\\s\*\\n\/\)\[0\]/);
});

test('V3 reuses existing catalog, commerce, auth, account, recovery, and download endpoints', async () => {
  const api = await load('v3/js/api.js');
  const account = await load('v3/js/account.js');
  const callback = await load('api/auth/callback.js');
  const recoveryLink = await load('api/auth/recovery-link.js');
  const password = await load('api/auth/password.js');
  for (const endpoint of ['/api/get-all-products', '/api/products', '/api/commerce/config', '/api/commerce/checkout', '/api/commerce/portal', '/api/create-checkout', '/api/auth/session', '/api/auth/providers', '/api/commerce/account', '/api/membership/account', '/api/membership/portal', '/api/auth/password', '/api/auth/oauth', '/api/auth/recovery-link', '/api/addon/connect/approve', '/api/onboarding/desktop-link']) {
    assert.ok(`${api}\n${account}`.includes(endpoint), endpoint);
  }
  assert.match(account, /\/api\/commerce\/download\//);
  assert.match(callback, /\/v3\/onboarding\/create-account\/\?auth=invalid/);
  assert.match(recoveryLink, /next: `\/v3\/account\/orders\/\$\{orderId\}`/);
  assert.match(await load('api/auth/lib/session.js'), /auth_state/);
  assert.match(password, /claimPurchasingGuest/);
  assert.match(password, /account_claim_failed/);
  assert.match(password, /result\.accountExists/);
  assert.match(password, /account_unverified/);
  assert.match(password, /account_password_mismatch/);
  assert.match(await load('api/auth/lib/session.js'), /user\.identities\.length === 0/);
  const onboarding = await load('v3/js/onboarding.js');
  assert.match(onboarding, /there is no need to switch forms/);
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

test('the Home banner slot ships hidden and empty until a real banner exists', async () => {
  const html = await load('v3/index.html');
  const banner = html.match(/<section class="home-banner"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(banner, 'Home must keep an addressable banner slot');
  assert.match(banner[0], /\shidden(\s|>)/, 'the banner slot must ship hidden');
  assert.equal(banner[1].trim(), '', 'the banner slot must ship empty');
});

test('the retired home hero fixture cannot reach a customer', async () => {
  const html = await load('v3/index.html');
  assert.doesNotMatch(html, /Story fixture/i);
  assert.doesNotMatch(html, /Tools For the Future Old School/i);
  assert.doesNotMatch(html, /home-hero/);
  assert.doesNotMatch(html, /mace\.png/);
});

test('approved V3 customer terminology cannot drift back to My File or instrument copy', async () => {
  const customerFiles = [
    'v3/index.html',
    'v3/product/index.html',
    'v3/membership/index.html',
    'v3/account/index.html',
    'v3/workbench/index.html',
    'v3/js/home.js',
    'v3/js/product.js',
    'v3/js/account.js',
    'v3/js/workbench.js',
    'v3/js/shell.js',
    'v3/js/api.js',
  ];
  const customerCopy = (await Promise.all(customerFiles.map(load))).join('\n');
  assert.doesNotMatch(customerCopy, /\bMy File\b/i);
  assert.doesNotMatch(customerCopy, /\binstruments?\b/i);
  assert.match(customerCopy, /My Folder/);
  assert.match(customerCopy, /NO3D Tool/);
});
