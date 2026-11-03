import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createPrintsPreviewServer } from './prints-preview-server.mjs';

const output = '/tmp/no3d-product-landing-acceptance';
await mkdir(output, { recursive: true });
const server = createPrintsPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const checkouts = [];
const downloads = [];
const report = { boundary: 'Local browser fixtures. No real accounts, payments, email, or private downloads.', checks: [] };
let mode = 'guest';
let toolFree = false;
const tool = { handle: 'chrome-crayon', title: 'Chrome Crayon', description: 'Draw chrome forms in Blender.', status: 'active', image: '/v3/assets/shared-source-folder-black.png' };
page.on('pageerror', error => errors.push(error.message));
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  const json = (value, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(value) });
  if (url.pathname === '/api/prints/access') {
    if (mode === 'error') return json({ error: 'access_unavailable' }, 503);
    return json({ handle: url.searchParams.get('handle'), authenticated: ['member', 'owner', 'unavailable'].includes(mode),
      mode: mode === 'unavailable' ? 'unavailable' : ['member', 'owner'].includes(mode) ? 'download' : 'purchase',
      entitlement: mode === 'member' ? 'member' : mode === 'owner' ? 'owned' : undefined });
  }
  if (url.pathname === '/api/commerce/offer') return mode === 'price-error' ? json({ error: 'unavailable' }, 503) : json({ offer: { resourceId: url.searchParams.get('handle'), currency: 'usd', unitAmount: mode === 'free' ? 0 : 1111 } });
  if (url.pathname === '/api/commerce/checkout') { checkouts.push(JSON.parse(request.postData())); return json({ checkoutUrl: 'https://checkout.stripe.com/c/pay/landing-fixture' }); }
  if (url.pathname === '/api/prints/download' || url.pathname.startsWith('/api/commerce/download/')) { downloads.push(url.pathname); return json({ url: 'https://files.example.test/download.zip' }); }
  if (url.hostname === 'checkout.stripe.com') return request.respond({ status: 200, contentType: 'text/html', body: '<h1>Checkout fixture</h1>' });
  if (url.hostname === 'files.example.test') return request.respond({ status: 200, contentType: 'application/zip', headers: { 'Content-Disposition': 'attachment; filename="fixture.zip"' }, body: 'PK fixture only' });
  if (url.pathname === '/api/products/chrome-crayon') return json({ product: { ...tool, access_policy: toolFree ? 'free' : 'paid' } });
  if (url.pathname === '/api/auth/session') return json({ authenticated: mode === 'tool-owner' });
  if (url.pathname === '/api/commerce/account') return json({ products: [{ handle: 'chrome-crayon', owned: true, permanent: true, orderId: '11111111-1111-4111-8111-111111111111' }], entitlements: [], memberships: [] });
  if (url.origin !== origin && !url.href.startsWith('data:')) return request.abort();
  return request.continue();
});
async function open(handle = 'mace-and-chain') {
  await page.goto(`${origin}/p/${handle}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#product[aria-busy="false"]');
  await page.evaluate(() => document.fonts.ready);
}
async function clickAction() { await page.click('[data-acquire]'); }
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['narrow', 320, 740]]) {
    await page.setViewport({ width, height }); await open();
    assert.equal(await page.$eval('[data-price]', el => el.textContent), '$11.11');
    assert.equal(await page.$eval('[data-product-title]', el => el.textContent), 'Mace and Chain Lighter Keeper');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await page.$eval('.landing-print-backdrop', el => el.getBoundingClientRect().left === 0 && el.getBoundingClientRect().width === innerWidth));
    assert.deepEqual(await page.$eval('[data-product-title]', el => { const style = getComputedStyle(el); return [style.opacity, style.textShadow, style.mixBlendMode, style.filter]; }), ['1', 'none', 'normal', 'none']);
    assert.equal(await page.$eval('[data-signin]', el => new URL(el.href).searchParams.get('next')), '/p/mace-and-chain');
    assert.equal(await page.$eval('[data-next]', el => el.disabled), false);
    await page.click('[data-next]');
    await page.waitForFunction(() => document.querySelector('[data-position]').textContent === '02 / 03');
    await page.waitForFunction(() => { const video = document.querySelector('[data-gallery] video'); return video && !video.paused && video.currentTime > .05; });
    assert.deepEqual(await page.$eval('[data-gallery] video', video => [video.muted, video.loop, video.playsInline, video.controls, video.autoplay]), [true, true, true, false, true]);
    await page.focus('[data-gallery]'); await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('[data-position]').textContent === '03 / 03');
    assert.equal(await page.$eval('[data-next]', el => el.disabled), true);
    assert.equal(await page.$eval('[data-gallery] video', video => video.paused && !video.autoplay), true);
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('[data-position]').textContent === '01 / 03');
    await page.click('[data-product-title]');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${output}/${name}-full-bleed.png` });
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    report.checks.push(`${name}: full-bleed photo, opaque type, no overflow, gallery arrows and keyboard, sign-in return`);
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await open();
  await Promise.all([page.waitForNavigation(), page.$eval('[data-acquire]', button => { button.click(); button.click(); })]);
  assert.equal(checkouts.length, 1); assert.equal(checkouts[0].handle, 'mace-and-chain');
  assert.deepEqual(Object.keys(checkouts[0]).sort(), ['attemptToken', 'handle']);
  assert.match(page.url(), /^https:\/\/checkout.stripe.com\//);
  report.checks.push('Guest: existing Commerce checkout, handle-only pricing authority');
  for (const entitled of ['member', 'owner']) {
    mode = entitled; await open();
    if (entitled === 'member') {
      assert.equal(await page.$eval('[data-price] s', el => el.textContent), '$11.11');
      assert.equal(await page.$eval('.print-member-price-note', el => el.textContent), 'free for members');
      await page.screenshot({ path: `${output}/desktop-member.png`, fullPage: true });
    } else assert.equal(await page.$eval('[data-price-label]', el => el.textContent), 'Already owned');
    await clickAction();
    await page.waitForFunction(() => document.querySelector('[data-status]').textContent === 'Your download is ready.');
    assert.equal(checkouts.length, 1);
  }
  assert.equal(downloads.length, 2);
  report.checks.push('Member and existing owner: direct download, no checkout');
  mode = 'guest'; await open(); mode = 'member';
  await clickAction(); await page.waitForFunction(() => document.querySelector('[data-status]').textContent === 'Your download is ready.');
  assert.equal(checkouts.length, 1); assert.equal(downloads.length, 3);
  report.checks.push('Membership gained after page load: access rechecked before acquisition');
  for (const failed of ['error', 'price-error', 'unavailable']) {
    mode = failed; await open(); await clickAction();
    await page.waitForFunction(() => !document.querySelector('[data-acquire]').disabled);
    assert.equal(checkouts.length, 1); assert.equal(downloads.length, 3);
  }
  report.checks.push('Access/price/delivery outages never fall through into purchase or download');
  mode = 'free'; await open(); assert.equal(await page.$eval('[data-price]', el => el.textContent), 'Free');
  await Promise.all([page.waitForNavigation(), clickAction()]);
  assert.equal(checkouts.length, 2);
  report.checks.push('Zero-price print: same email/checkout handoff');
  mode = 'guest'; await open('spike-planter-01');
  assert.match(await page.$eval('[data-file-notes]', el => el.textContent), /142 mm/);
  await open('not-a-real-product');
  assert.equal(await page.$eval('[data-product-title]', el => el.textContent), 'Product unavailable');
  assert.equal(await page.$eval('.landing-acquire', el => el.hidden), true);
  report.checks.push('Second print reuses template; unknown links cannot substitute another product');
  await open('chrome-crayon');
  assert.equal(await page.$eval('[data-product-title]', el => el.textContent), 'Chrome Crayon');
  mode = 'tool-owner'; await open('chrome-crayon'); await clickAction();
  await page.waitForFunction(() => document.querySelector('[data-status]').textContent === 'Your download is ready.');
  assert.equal(downloads.at(-1), '/api/commerce/download/11111111-1111-4111-8111-111111111111');
  mode = 'guest'; toolFree = true; await open('chrome-crayon');
  assert.equal(await page.$eval('[data-price]', el => el.textContent), 'Free');
  await Promise.all([page.waitForNavigation(), clickAction()]);
  assert.match(page.url(), /\/v3\/onboarding\/create-account\//);
  assert.equal(new URL(page.url()).searchParams.get('next'), '/p/chrome-crayon');
  report.checks.push('Tools: same template; owner download and free signup return reuse native account flow');
  assert.deepEqual(errors, []);
  report.passed = true; await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  // Close the fixture server even when Chromium keeps a download window alive.
  const serverClosed = new Promise(resolve => server.close(resolve));
  server.closeAllConnections();
  await serverClosed;
  const shutdown = setTimeout(() => browser.process()?.kill('SIGKILL'), 5000);
  try { await browser.close(); } finally { clearTimeout(shutdown); }
}
