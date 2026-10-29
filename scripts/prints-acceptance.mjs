import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createPrintsPreviewServer } from './prints-preview-server.mjs';

const output = process.env.PRINTS_ACCEPTANCE_OUTPUT || '/tmp/no3d-prints-acceptance';
await mkdir(output, { recursive: true });
const server = createPrintsPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const external = [];
page.on('request', request => { if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) external.push(request.url()); });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const result = [];
async function settled() {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
}
async function audit(label) {
  const state = await page.evaluate(() => {
    const slide = document.querySelector('.print-slide:not([inert]):not([hidden])');
    const selected = document.querySelector('[data-go-product][aria-current="true"]');
    const item = selected.closest('[data-print-item]');
    const title = selected.getBoundingClientRect();
    const panel = item.querySelector('.print-item-details');
    const panelRect = panel.getBoundingClientRect();
    return {
      width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      active: slide?.dataset.product,
      title: title && { left: title.left, right: title.right, top: title.top, bottom: title.bottom },
      images: [...document.querySelectorAll('.print-image img')].every(image => image.complete && image.naturalWidth > 0),
      position: document.querySelector('[data-print-position]').textContent,
      selected: item.dataset.printItem,
      expanded: [...document.querySelectorAll('[data-go-product][aria-expanded="true"]')].map(el => el.dataset.goProduct),
      openPanels: [...document.querySelectorAll('.print-item-details:not([hidden])')].map(el => el.closest('[data-print-item]').dataset.printItem),
      panel: { left: panelRect.left, right: panelRect.right, top: panelRect.top, bottom: panelRect.bottom },
      heroContentCount: document.querySelectorAll('.print-slide h1,.print-slide h2,.print-slide button:not(.print-hotspot),.print-slide a,.print-copy').length,
      hotspot: (() => { const r = slide.querySelector('.print-hotspot').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
      titleStyle: (() => { const s = getComputedStyle(selected); return { opacity: s.opacity, blend: s.mixBlendMode, shadow: s.textShadow, filter: s.filter }; })(),
      imageOverlay: getComputedStyle(slide.querySelector('.print-image'), '::after').content,
    };
  });
  assert.ok(state.scrollWidth <= state.width, `${label}: horizontal page overflow`);
  assert.ok(state.title.left >= 0 && state.title.right <= state.width + 1, `${label}: title overflow`);
  assert.ok(state.title.top > 80 && state.panel.bottom < state.height - 60, `${label}: selected product must fit between masthead and footer`);
  assert.ok(state.panel.left >= 0 && state.panel.right <= state.width, `${label}: selected product controls overflow`);
  assert.equal(state.selected, state.active, `${label}: list and photograph must agree`);
  assert.deepEqual(state.expanded, [state.active], `${label}: only the active list item expands`);
  assert.deepEqual(state.openPanels, [state.active], `${label}: inactive product actions must be hidden`);
  assert.equal(state.heroContentCount, 0, `${label}: photographs must have no large title or purchase overlay`);
  assert.ok(state.images, `${label}: images missing`);
  assert.deepEqual(state.titleStyle, { opacity: '1', blend: 'normal', shadow: 'none', filter: 'none' }, `${label}: titles must remain opaque without effects`);
  assert.equal(state.imageOverlay, 'none', `${label}: image composition supplies contrast, not an overlay`);
  result.push({ label, ...state });
  await page.screenshot({ path: `${output}/${label}.png` });
}
async function auditDetails(label) {
  const layout = await page.evaluate(() => {
    const dialog = document.querySelector('dialog');
    const assembly = dialog.querySelector('.print-document-assembly');
    const gallery = dialog.querySelector('[data-gallery]');
    return { width: innerWidth, dialogWidth: dialog.clientWidth, scrollWidth: dialog.scrollWidth,
      columns: getComputedStyle(assembly).gridTemplateColumns.split(' ').length,
      imageReady: [...gallery.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0),
      videoAutoplay: [...gallery.querySelectorAll('video')].some(video => video.autoplay),
    };
  });
  assert.equal(layout.dialogWidth, layout.width, `${label}: product page fills the viewport`);
  assert.equal(layout.scrollWidth, layout.dialogWidth, `${label}: detail content cannot overflow horizontally`);
  assert.equal(layout.columns, label.startsWith('mobile') ? 1 : 2, `${label}: matches Gumroad's responsive assembly`);
  assert.ok(layout.imageReady);
  assert.equal(layout.videoAutoplay, false);
  await page.screenshot({ path: `${output}/${label}.png` });
}
try {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    await page.setViewport(viewport);
    await page.goto(`${origin}/v3/prints/`, { waitUntil: 'networkidle0' });
    await settled();
    assert.equal(await page.$eval('[data-print-previous]', el => el.disabled), true);
    await audit(`${label}-mace`);
    await page.click('[data-print-next]');
    await page.waitForFunction(() => document.querySelector('[data-print-position]').textContent === '02 / 02');
    await settled();
    await audit(`${label}-planter`);
    assert.deepEqual(result.at(-1).hotspot, result.at(-2).hotspot, 'Both product photographs use the same centered hitbox');
    assert.equal(await page.$eval('[data-print-next]', el => el.disabled), true);
    await page.click('[data-go-product="mace-and-chain"]');
    await page.waitForFunction(() => document.querySelector('.print-slide:not([inert])').dataset.product === 'mace-and-chain');
    assert.equal(await page.$eval('#print-info-planter', el => el.hidden), true);
    assert.equal(await page.$eval('#print-info-mace', el => el.hidden), false);
    await page.click('[data-go-product="spike-planter-01"]');
    await page.waitForFunction(() => document.querySelector('.print-slide:not([inert])').dataset.product === 'spike-planter-01');
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('.print-slide:not([inert])', el => el.dataset.product), 'spike-planter-01');
    await page.click('.print-hotspot[data-details="spike-planter-01"]');
    assert.equal(await page.$eval('dialog', el => el.open), true);
    assert.match(await page.$eval('[data-details-body]', el => el.textContent), /Wall-mount hanger/);
    await page.waitForFunction(() => !document.querySelector('[data-details-download]').disabled);
    assert.equal(await page.$$eval('a', links => links.some(link => link.textContent.includes('View on Gumroad'))), false);
    assert.equal(await page.$$eval('[data-gallery-thumbnails] button', buttons => buttons.length), 5);
    assert.equal(await page.$eval('[data-gallery-position]', el => el.textContent), '1 / 5');
    await settled();
    await auditDetails(`${label}-planter-details`);
    await page.click('[data-gallery-thumbnails] button:last-child');
    await page.waitForFunction(() => document.querySelector('[data-gallery-position]').textContent === '5 / 5');
    assert.equal(await page.$eval('[data-gallery] figure:not([inert]) img', el => el.alt), 'Wall-mount hanger');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog').open);
    assert.equal(await page.$eval('.print-hotspot[data-details="spike-planter-01"]', el => el === document.activeElement), true);
    assert.equal(new URL(page.url()).searchParams.has('details'), false);
    await page.click('.print-item-actions [data-details="spike-planter-01"]');
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('dialog', el => el.open), true, 'Detail deep links survive refresh');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog').open);
    await page.click('[data-go-product="mace-and-chain"]');
    await page.click('.print-hotspot[data-details="mace-and-chain"]');
    await settled();
    await auditDetails(`${label}-mace-details`);
    const signInUrl = await page.$eval('[data-member-signin]', link => link.href);
    assert.equal(new URL(signInUrl).searchParams.get('mode'), 'signin');
    assert.equal(new URL(signInUrl).searchParams.get('next'), '/v3/prints/?product=mace-and-chain&details=1');
    assert.equal(await page.$$eval('[data-gallery-thumbnails] button', buttons => buttons.length), 4);
    await page.focus('[data-gallery]');
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('[data-gallery-position]').textContent === '4 / 4');
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('dialog').open);
    await page.goForward();
    await page.waitForFunction(() => document.querySelector('dialog').open);
    await page.click('[aria-label="Close product details"]');
    await page.waitForFunction(() => !document.querySelector('dialog').open);
    await page.click('.storefront-toggle');
    assert.equal(await page.$eval('.storefront-destinations', el => el.hidden), false);
    await page.screenshot({ path: `${output}/${label}-selector.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('.storefront-toggle', el => document.activeElement === el), true);
    await page.click('[data-prints-search-toggle]');
    await page.type('#print-search', 'zznomatch');
    assert.equal(await page.$eval('[data-prints-empty]', el => el.hidden), false);
    assert.equal(await page.$$eval('[data-print-item]:not([hidden]),.print-item-details:not([hidden])', els => els.length), 0);
    await page.$eval('#print-search', el => { el.value = 'mace'; el.dispatchEvent(new Event('input')); });
    assert.equal(await page.$$eval('.print-slide:not([hidden])', els => els.length), 1);
    assert.equal(await page.$eval('[data-print-position]', el => el.textContent), '01 / 01');
    await page.$eval('#print-search', el => { el.value = ''; el.dispatchEvent(new Event('input')); });
    await page.keyboard.press('Escape');
    await page.focus('[data-print-carousel]');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.$eval('.print-slide:not([inert])', el => el.dataset.product), 'spike-planter-01');
    await page.keyboard.press('Home');
    assert.equal(await page.$eval('.print-slide:not([inert])', el => el.dataset.product), 'mace-and-chain');
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, [], 'Prints must load entirely from local assets');
  const printsExternalRequests = [...external];
  assert.equal((await fetch(`${origin}/api/commerce/checkout`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${origin}/.git/config`)).status, 404);
  // Verify the new selector also attaches to the existing Tools landing page.
  await page.goto(`${origin}/v3/`, { waitUntil: 'networkidle0' });
  await page.click('.storefront-toggle');
  const printsLink = await page.$('.storefront-destinations a[href="/v3/prints/"]');
  assert.ok(printsLink);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), printsLink.click()]);
  assert.ok(page.url().includes('/v3/prints/'));
  await page.goBack({ waitUntil: 'networkidle0' });
  assert.equal(new URL(page.url()).pathname, '/v3/');
  await page.goto(`${origin}/v3/onboarding/create-account/?mode=signin&next=%2Fv3%2Fprints%2F%3Fproduct%3Dspike-planter-01%26details%3D1`, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('[data-auth-mode="signin"]', el => el.classList.contains('active')), true, 'Members arrive in sign-in mode');
  // Exercise the actual UI + HTTP handlers with isolated server identities.
  // External navigations are intercepted before they leave this test browser.
  const journeys = [];
  for (const scenario of ['guest', 'member', 'owned', 'unavailable', 'revoked']) {
    let activeMember = ['member', 'unavailable', 'revoked'].includes(scenario);
    let issued = 0;
    const printDependencies = {
      authenticate: async () => scenario === 'guest' ? null : ({ user: { id: 'fixture-user', email: 'fixture@example.test', email_confirmed_at: '2026-10-01' } }),
      subscription: async () => activeMember ? ({ tier: 'subscriber', status: 'active' }) : null,
      account: async () => ({ entitlements: [], products: scenario === 'owned' ? [{ handle: 'spike-planter-01', owned: true, permanent: true, entitlementStatus: 'active', fulfillmentStatus: 'fulfilled', paymentStatus: 'paid' }] : [] }),
      product: async handle => scenario === 'unavailable' ? null : ({ handle, status: 'active', file_url: 'fixtures/planter.zip' }),
      deliveryReady: () => true,
      sign: async () => { issued++; return 'https://downloads.example.test/fixture-planter.zip'; },
    };
    let checkouts = 0;
    const fixtureServer = createPrintsPreviewServer({ printDependencies, checkoutFixture: async body => {
      assert.equal(body.handle, 'spike-planter-01');
      assert.match(body.attemptToken, /^[a-z0-9-]{36}$/i);
      assert.deepEqual(Object.keys(body).sort(), ['attemptToken', 'handle']);
      checkouts++;
      return { orderId: '00000000-0000-4000-8000-000000000001', checkoutUrl: 'https://checkout.stripe.com/c/pay/fixture' };
    } });
    await new Promise(resolve => fixtureServer.listen(0, '127.0.0.1', resolve));
    const fixtureOrigin = `http://127.0.0.1:${fixtureServer.address().port}`;
    const journey = await browser.newPage();
    await journey.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const destinations = [];
    const requests = [];
    await journey.setRequestInterception(true);
    journey.on('request', req => {
      requests.push(req.url());
      if (req.url().startsWith(fixtureOrigin) || req.url().startsWith('data:')) return req.continue();
      destinations.push(req.url());
      return req.respond({ status: 200, contentType: 'text/html', body: '<title>Isolated handoff fixture</title>' });
    });
    try {
      await journey.goto(`${fixtureOrigin}/v3/prints/?product=spike-planter-01&details=1`, { waitUntil: 'networkidle0' });
      assert.equal(await journey.$eval('[data-details-price]', el => el.textContent), scenario === 'guest' ? '$11.11' : 'Free');
      if (scenario === 'unavailable') {
        assert.equal(await journey.$eval('[data-details-download]', el => el.disabled), true);
        assert.match(await journey.$eval('[data-download-status]', el => el.textContent), /not available yet/);
      } else if (scenario === 'revoked') {
        // A revocation on the signing request must fail closed even after the
        // button's fresh access request has succeeded.
        journey.on('request', req => { if (req.url().includes('/api/prints/download?')) activeMember = false; });
        await journey.click('[data-details-download]');
        await journey.waitForFunction(() => document.querySelector('[data-download-status]').textContent.includes('could not be opened'));
      } else {
        await Promise.all([journey.waitForNavigation(), journey.click('[data-details-download]')]);
        assert.deepEqual(destinations, [scenario === 'guest' ? 'https://checkout.stripe.com/c/pay/fixture' : 'https://downloads.example.test/fixture-planter.zip']);
      }
      assert.equal(issued, ['member', 'owned'].includes(scenario) ? 1 : 0);
      assert.equal(checkouts, scenario === 'guest' ? 1 : 0, 'Members and owners skip checkout');
      assert.equal(destinations.some(url => url.includes('gumroad.com')), false, 'Prints never hands off to Gumroad');
      journeys.push({ scenario, issued, handoff: destinations, downloadRequests: requests.filter(url => url.includes('/api/prints/download')).length });
    } finally {
      await journey.close();
      await new Promise(resolve => fixtureServer.close(resolve));
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify({ status: 'passed', result, journeys, errors, printsExternalRequests }, null, 2));
  console.log(`Prints acceptance passed. Screenshots and results: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
