import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createPrintsPreviewServer } from './prints-preview-server.mjs';
const output = '/tmp/no3d-print-parts-acceptance';
await mkdir(output, { recursive: true });
const server = createPrintsPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const errors = [], meshRequests = [], results = [];
let blockMesh = false;
page.on('pageerror', error => errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', request => {
  if (request.url().endsWith('.bin')) {
    meshRequests.push(request.url());
    if (blockMesh) return request.respond({ status: 503, body: 'preview unavailable' });
  }
  request.continue();
});
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const first = '.print-parts .part-stage';
const ready = selector => page.waitForFunction(s => document.querySelector(s)?.dataset.state === 'ready' && document.querySelector(s)?.dataset.view, {}, selector);
const state = selector => page.$eval(selector, el => el.dataset.view);
async function reveal(selector = '.print-parts') {
  await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
}
async function loadProduct(slug) {
  await page.goto(`${origin}/v3/prints/?product=${slug}&details=1`, { waitUntil: 'networkidle0' });
  await reveal(); await ready(first);
}
async function touchDrag(client, from, to) {
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 0 }] });
  for (let i=1; i<=8; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x+(to.x-from.x)*i/8, y: from.y+(to.y-from.y)*i/8, id: 0 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
try {
  await page.setViewport({ width: 1440, height: 1100 });
  await page.goto(`${origin}/v3/prints/`, { waitUntil: 'networkidle0' });
  assert.equal(meshRequests.length, 0, 'catalog does not load any 3D meshes');
  for (const slug of ['mace-and-chain', 'spike-planter-01']) {
    await loadProduct(slug);
    await page.waitForFunction(() => document.querySelectorAll('.print-parts [data-state=ready]').length === 3);
    assert.equal(await page.$eval('.print-parts-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 3);
    const before = await state(first);
    const pixelsBefore = await (await page.$(first)).screenshot();
    const rect = await (await page.$(first)).boundingBox();
    await page.mouse.move(rect.x+rect.width/2, rect.y+rect.height/2);
    await page.mouse.down(); await page.mouse.move(rect.x+rect.width/2+70, rect.y+rect.height/2+20, { steps: 8 }); await page.mouse.up();
    await page.waitForFunction((s,b) => document.querySelector(s).dataset.view !== b, {}, first, before);
    assert.equal(await page.$('.parts-expanded'), null, 'drag never opens the enlarged view');
    const pixelsAfter = await (await page.$(first)).screenshot();
    assert.notDeepEqual(pixelsBefore, pixelsAfter, 'rotation changes rendered pixels');
    await page.focus(first); await page.keyboard.press('Home');
    await page.waitForFunction((s,b) => document.querySelector(s).dataset.view === b, {}, first, before);
    await (await page.$('.print-parts')).screenshot({ path: `${output}/${slug}-desktop-grid.png` });
    await page.keyboard.press('Enter'); await ready('.parts-expanded .part-stage');
    await page.focus('.parts-expanded .part-stage'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('+');
    await page.waitForFunction(() => Number(document.querySelector('.parts-expanded .part-stage').dataset.view.split(',')[2]) > 1);
    await page.click('.parts-expanded-footer button:last-child');
    await page.waitForFunction(() => document.querySelector('.parts-expanded .part-stage').dataset.view === '-0.785,0.580,1.000');
    await page.screenshot({ path: `${output}/${slug}-expanded.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.parts-expanded'));
    assert.equal(await page.$eval('.print-details', el => el.open), true, 'Escape closes only the inner viewer');
    assert.equal(await page.$eval(first, el => document.activeElement === el), true, 'focus returns to the selected part');
    await page.evaluate(() => { window.__testContexts = [...document.querySelectorAll('.part-canvas')].map(canvas => canvas.getContext('webgl2') || canvas.getContext('webgl')); });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.print-details').open);
    await page.waitForFunction(() => window.__testContexts.every(gl => gl.isContextLost()));
    await page.evaluate(() => { delete window.__testContexts; });
    assert.equal(await page.$$eval('.part-canvas', els => els.length), 0, 'closing details disposes all viewers');
    results.push({ slug, desktop: 'render, rotation, pixels, reset, keyboard, modal focus and disposal passed' });
  }
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const client = await page.createCDPSession();
  await loadProduct('mace-and-chain'); await reveal(first); await ready(first);
  assert.equal(await page.$eval('.print-parts-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
  assert.equal(await page.$eval('.print-details', el => el.scrollWidth <= el.clientWidth), true);
  let rect = await (await page.$(first)).boundingBox();
  let initial = await state(first);
  await touchDrag(client, { x: rect.x+70, y: rect.y+rect.height/2 }, { x: rect.x+170, y: rect.y+rect.height/2 });
  await page.waitForFunction((s,b) => document.querySelector(s).dataset.view !== b, {}, first, initial);
  assert.equal(await page.$('.parts-expanded'), null);
  await reveal(first); rect = await (await page.$(first)).boundingBox();
  initial = await state(first);
  const scroll = await page.$eval('.print-details', el => el.scrollTop);
  await touchDrag(client, { x: rect.x+rect.width/2, y: rect.y+rect.height*.8 }, { x: rect.x+rect.width/2, y: rect.y+rect.height*.2 });
  await page.waitForFunction(s => document.querySelector('.print-details').scrollTop > s + 40, {}, scroll);
  assert.equal(await state(first), initial, 'vertical touch scroll does not rotate the model');
  await reveal(first);
  await page.tap(first); await ready('.parts-expanded .part-stage');
  const full = '.parts-expanded .part-stage';
  rect = await (await page.$(full)).boundingBox();
  const x = rect.x+rect.width/2, y=rect.y+rect.height/2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x:x-35,y,id:0 },{ x:x+35,y,id:1 }] });
  for (let i=1;i<=6;i++) await client.send('Input.dispatchTouchEvent', { type:'touchMove',touchPoints:[{x:x-35-i*6,y,id:0},{x:x+35+i*6,y,id:1}] });
  await client.send('Input.dispatchTouchEvent', { type:'touchEnd',touchPoints:[] });
  await page.waitForFunction(() => Number(document.querySelector('.parts-expanded .part-stage').dataset.view.split(',')[2]) > 1.5);
  await page.tap('.parts-expanded-footer button:last-child');
  await page.waitForFunction(() => document.querySelector('.parts-expanded .part-stage').dataset.view === '-0.785,0.580,1.000');
  await page.screenshot({ path: `${output}/mace-mobile-expanded.png` });
  await page.tap('.parts-expanded-header button'); await page.waitForFunction(() => !document.querySelector('.parts-expanded'));
  for (const slug of ['mace-and-chain','spike-planter-01']) {
    await loadProduct(slug);
    for (let i=0;i<3;i++) { const selector=`.print-part:nth-child(${i+1}) .part-stage`; await reveal(selector); await ready(selector); }
    await (await page.$('.print-parts')).screenshot({ path: `${output}/${slug}-mobile-grid.png` });
  }
  results.push({ mobile: 'native horizontal rotation, vertical scrolling, tap, two-finger pinch, reset and both responsive grids passed' });
  // A failed mesh or missing WebGL cannot block product content or checkout controls.
  blockMesh = true;
  await page.setViewport({ width: 1440, height: 1100 });
  await page.goto(`${origin}/v3/prints/?product=mace-and-chain&details=1`, { waitUntil: 'networkidle0' }); await reveal();
  await page.waitForFunction(() => document.querySelector('.print-parts .part-stage').dataset.state === 'error');
  assert.equal(await page.$eval('[data-details-download]', el => el.disabled), false);
  blockMesh = false; await page.click(first); await ready(first);
  assert.equal(await page.$('.parts-expanded'), null, 'retry stays in the grid');
  await page.goto(`${origin}/p/mace-and-chain`, { waitUntil: 'networkidle0' }); await reveal(); await ready(first);
  assert.equal(await page.$$eval('[data-thumbnails] button', els => els.length), 3);
  assert.equal(await page.evaluate(() => document.querySelector('.landing-media').getBoundingClientRect().bottom <= document.querySelector('.landing-files').getBoundingClientRect().top), true, 'photos never overlap the parts section');
  await page.screenshot({ path: `${output}/landing-grid.png` });
  const noGL = await browser.newPage();
  await noGL.evaluateOnNewDocument(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type,...args) { return type.includes('webgl') ? null : get.call(this,type,...args); };
  });
  await noGL.goto(`${origin}/v3/prints/?product=mace-and-chain&details=1`, { waitUntil:'networkidle0' });
  await noGL.$eval('.print-parts', el=>el.scrollIntoView());
  await noGL.waitForFunction(()=>document.querySelector('.part-stage').dataset.state==='error');
  assert.equal(await noGL.$eval('[data-details-download]',el=>el.disabled),false);
  assert.match(await noGL.$eval('.print-parts',el=>el.textContent),/111 mm Mace/);
  await noGL.close();
  assert.deepEqual(errors,[]);
  results.push({ resilience: 'failed mesh retry, no-WebGL fallback, acquisition available, shared campaign viewer and photo removal passed' });
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify({passed:true,output,results},null,2));
} finally {
  await browser.close(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));
}
