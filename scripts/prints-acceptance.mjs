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
      heroContentCount: document.querySelectorAll('.print-slide h1,.print-slide h2,.print-slide button,.print-slide a,.print-copy').length,
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
    assert.equal(await page.$eval('[data-print-next]', el => el.disabled), true);
    await page.click('[data-go-product="mace-and-chain"]');
    await page.waitForFunction(() => document.querySelector('.print-slide:not([inert])').dataset.product === 'mace-and-chain');
    assert.equal(await page.$eval('#print-info-planter', el => el.hidden), true);
    assert.equal(await page.$eval('#print-info-mace', el => el.hidden), false);
    await page.click('[data-go-product="spike-planter-01"]');
    await page.waitForFunction(() => document.querySelector('.print-slide:not([inert])').dataset.product === 'spike-planter-01');
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('.print-slide:not([inert])', el => el.dataset.product), 'spike-planter-01');
    await page.click('[data-details="spike-planter-01"]');
    assert.equal(await page.$eval('dialog', el => el.open), true);
    assert.match(await page.$eval('[data-details-body]', el => el.textContent), /Wall-mount hanger/);
    assert.equal(await page.$eval('[data-details-link]', el => el.href), 'https://nodedojo.gumroad.com/l/spike-planter-01');
    await page.keyboard.press('Escape');
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
  await writeFile(`${output}/results.json`, JSON.stringify({ status: 'passed', result, errors, printsExternalRequests }, null, 2));
  console.log(`Prints acceptance passed. Screenshots and results: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
