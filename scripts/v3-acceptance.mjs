import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const projectRoot = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const outputDir = process.env.NO3D_V3_ACCEPTANCE_OUTPUT || '/tmp/no3d-v3-acceptance';
await mkdir(outputDir, { recursive: true });

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.gif', 'image/gif'],
  ['.woff2', 'font/woff2'], ['.mp4', 'video/mp4'], ['.webm', 'video/webm'],
]);

const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = normalize(join(projectRoot, pathname));
    if (!target.startsWith(projectRoot)) throw new Error('invalid_path');
    const data = await readFile(target);
    response.writeHead(200, { 'Content-Type': mime.get(extname(target)) || 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end('{}');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const products = [
  { id: 'bolt-obj', handle: 'dojo-bolt-gen-v05-obj', title: 'Dojo Bolt Gen V05_Obj', description: 'The drag-and-drop object edition of the Dojo Bolt Generator, pre-configured with live parametric controls.', price: '7.77', product_type: 'Geometry Nodes', tags: ['Geometry', 'Object edition'], release_status: 'stable', release_version: '05.3', image: '/v3/assets/dojo-bolt-disassembly.gif', thumbnail_image: '/assets/product-images/icon_Dojo Bolt Gen v05_Obj.png' },
  { id: 'bolt', handle: 'dojo-bolt-gen-v05', title: 'Dojo Bolt Gen V05', description: 'A live node instrument for printable bolts.', price: '7.77', product_type: 'Geometry Nodes', tags: ['Geometry', 'Node edition'], release_status: 'stable', release_version: '05.3', image: '/assets/product-images/Dojo Bolt Gen v05.gif', thumbnail_image: '/assets/product-images/icon_Dojo Bolt Gen v05.png' },
  { id: 'knob', handle: 'dojo-knob', title: 'Dojo Knob', description: 'A flexible parametric knob generator.', price: '7.77', product_type: 'Geometry Nodes', tags: ['Geometry', 'Generator'], release_status: 'stable', image: '/assets/product-images/Dojo Knob.gif', thumbnail_image: '/assets/product-images/icon_Dojo Knob.png' },
  { id: 'chrome', handle: 'chrome-crayon', title: 'Chrome Crayon', description: 'A linked-form generator for procedural chain studies.', price: '', product_type: 'Geometry Nodes', tags: ['Geometry', 'Generator'], release_status: 'stable', image: '/assets/product-images/icon_Dojo Crv Wrapper v4.png', thumbnail_image: '/assets/product-images/icon_Dojo Crv Wrapper v4.png' },
];

function accountPayload(authenticated) {
  return {
    session: authenticated ? { authenticated: true, email: 'operator@example.com' } : { authenticated: false },
    summary: authenticated ? { account: { contactEmail: 'operator@example.com' }, memberships: [{ status: 'active' }], products: [
      { handle: 'dojo-bolt-gen-v05-obj', orderId: '11111111-1111-4111-8111-111111111111', owned: true, permanent: true, purchasedAt: '2026-08-01T00:00:00Z' },
      { handle: 'dojo-knob', orderId: '22222222-2222-4222-8222-222222222222', owned: true, permanent: false, purchasedAt: '2026-07-01T00:00:00Z' },
    ] } : null,
  };
}

async function installMocks(page, { authenticated = false } = {}) {
  const account = accountPayload(authenticated);
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) return request.continue();
    let payload = {};
    if (url.pathname === '/api/get-all-products') payload = products;
    else if (url.pathname === '/api/products') payload = { products };
    else if (url.pathname === '/api/commerce/config') payload = { individualProductsEnabled: true };
    else if (url.pathname === '/api/get-subscription-price') payload = { formatted: '$22.22' };
    else if (url.pathname === '/api/auth/session') payload = account.session;
    else if (url.pathname === '/api/commerce/account') payload = account.summary || { error: 'not_authenticated' };
    else if (url.pathname.startsWith('/api/commerce/order/')) payload = { orderId: url.pathname.split('/').pop(), resourceId: 'dojo-bolt-gen-v05-obj', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', recovery: true };
    else if (url.pathname === '/api/commerce/checkout') payload = { checkoutUrl: `${origin}/v3/product/?checkout=individual`, orderId: '11111111-1111-4111-8111-111111111111' };
    else if (url.pathname === '/api/create-checkout') payload = { checkout_url: `${origin}/v3/?checkout=membership` };
    request.respond({ status: account.summary === null && url.pathname === '/api/commerce/account' ? 401 : 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

async function structuralAudit(page, label) {
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => {
    const defaultBlue = new Set(['rgb(0, 0, 238)', 'rgb(0, 102, 204)', 'rgb(0, 0, 255)']);
    const blue = [...document.querySelectorAll('a,button')].filter(node => defaultBlue.has(getComputedStyle(node).color)).map(node => node.textContent.trim());
    return {
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      blue,
      bodyFont: getComputedStyle(document.body).fontFamily,
      headingFont: getComputedStyle(document.querySelector('h1,h2') || document.body).fontFamily,
    };
  });
  assert.ok(result.scrollWidth <= result.innerWidth, `${label}: horizontal overflow ${result.scrollWidth}/${result.innerWidth}`);
  assert.deepEqual(result.blue, [], `${label}: browser-blue controls`);
  assert.match(result.bodyFont, /DotoV3/);
  assert.match(result.headingFont, /(?:DrukV3|SilkaV3)/);
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
try {
  const page = await browser.newPage();
  await installMocks(page);

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${origin}/v3/`, { waitUntil: 'networkidle0' });
  await structuralAudit(page, 'home mobile');
  const closedTop = await page.$eval('.home-hero', node => node.getBoundingClientRect().top);
  await page.click('[data-catalog-toggle]');
  const openTop = await page.$eval('.home-hero', node => node.getBoundingClientRect().top);
  assert.ok(openTop > closedTop + 40, `mobile catalog must push content downward (${closedTop} -> ${openTop})`);
  await page.screenshot({ path: join(outputDir, 'home-mobile-open.png') });
  await page.click('[data-catalog-toggle]');
  const restoredTop = await page.$eval('.home-hero', node => node.getBoundingClientRect().top);
  assert.equal(restoredTop, closedTop, 'mobile catalog must restore document flow when closed');
  await page.screenshot({ path: join(outputDir, 'home-mobile.png') });

  await page.goto(`${origin}/v3/product/?handle=dojo-bolt-gen-v05-obj`, { waitUntil: 'networkidle0' });
  await structuralAudit(page, 'product paid mobile');
  const paid = await page.evaluate(() => {
    const title = document.querySelector('.product-title').getBoundingClientRect();
    const hero = document.querySelector('.product-hero').getBoundingClientRect();
    const lines = document.querySelector('[data-ascii-plate]').textContent.split('\n');
    const functions = getComputedStyle(document.querySelector('.product-functions'));
    return { titleBeforeHero: title.top < hero.top, widths: [...new Set(lines.map(line => line.length))], inputSockets: lines.filter(line => line.startsWith('o ')).length, outputSockets: lines.filter(line => line.endsWith('o')).length, price: document.querySelector('[data-price-block]')?.textContent, sideBorders: [functions.borderLeftWidth, functions.borderRightWidth], hero: document.querySelector('[data-product-hero]').getAttribute('src') };
  });
  assert.equal(paid.titleBeforeHero, true);
  assert.deepEqual(paid.widths, [48]);
  assert.ok(paid.inputSockets >= 10 && paid.outputSockets >= 8);
  assert.match(paid.price, /\$7\.77/);
  assert.deepEqual(paid.sideBorders, ['0px', '0px']);
  assert.equal(paid.hero, '/v3/assets/dojo-bolt-disassembly.gif');
  await page.screenshot({ path: join(outputDir, 'product-paid-mobile.png') });

  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  for (const [name, path] of [['home-desktop', '/v3/'], ['product-paid-desktop', '/v3/product/?handle=dojo-bolt-gen-v05-obj']]) {
    await page.goto(`${origin}${path}`, { waitUntil: 'networkidle0' });
    await structuralAudit(page, name);
    await page.screenshot({ path: join(outputDir, `${name}.png`) });
  }

  console.log(JSON.stringify({ status: 'passed', tranche: 'home-02d-and-product-04d', outputDir, routes: 2, viewports: ['390x844', '1440x1100'] }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
