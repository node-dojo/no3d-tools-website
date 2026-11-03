import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createPrintsPreviewServer } from './prints-preview-server.mjs';
import { printProducts } from '../v3/data/prints/catalog.js';

const manifest = JSON.parse(await readFile(new URL('../docs/design/v3/prints-media-20261102.json', import.meta.url)));
const server = process.env.PRINTS_MEDIA_URL ? null : createPrintsPreviewServer();
if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = process.env.PRINTS_MEDIA_URL || `http://127.0.0.1:${server.address().port}`;
const output = process.env.PRINTS_MEDIA_OUTPUT || '/tmp/no3d-prints-media-acceptance';
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const results = [], errors = [];
try {
  for (const width of [1440, 390]) for (const product of printProducts) for (const route of ['catalog', 'campaign']) {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const gifRequests = [];
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('.gif')) gifRequests.push(request.url()); });
    await page.setViewport({ width, height: width === 390 ? 844 : 1100, isMobile: width === 390, hasTouch: width === 390 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const url = route === 'catalog' ? `/v3/prints/?product=${product.slug}&details=1` : `/p/${product.slug}`;
    await page.goto(origin + url, { waitUntil: 'networkidle2', timeout: 60000 });
    const thumb = route === 'catalog' ? '[data-gallery-thumbnails]' : '[data-thumbnails]';
    await page.waitForSelector(`${thumb} button`);
    assert.equal(await page.$$eval(`${thumb} button`, b => b.length), product.media.length);
    assert.equal(gifRequests.length, 0, 'Inactive animations must not download with the page or thumbnails');
    const checks = [];
    for (const entry of manifest.entries.filter(e => e.handle === product.slug)) {
      const index = product.media.findIndex(m => m.src === entry.src);
      assert.ok(index >= 0);
      await page.$eval(thumb, e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.click(`${thumb} button:nth-child(${index + 1})`);
      const selector = '[data-gallery] figure:not([inert])';
      if (entry.type === 'video') {
        await page.waitForFunction(src => { const v = document.querySelector('[data-gallery] figure:not([inert]) video'); return v?.getAttribute('src') === src && !v.paused && v.currentTime > .1 && Number.isFinite(v.duration); }, {}, entry.src);
        assert.deepEqual(await page.$eval(`${selector} video`, v => [v.muted, v.loop, v.playsInline, v.controls]), [true, true, true, false]);
        await page.$eval(`${selector} video`, v => { v.currentTime = Math.max(0, v.duration - .15); });
        await page.waitForFunction(() => { const v = document.querySelector('[data-gallery] figure:not([inert]) video'); return !v.paused && v.currentTime < 1; });
      } else {
        await page.waitForFunction(src => { const img = document.querySelector('[data-gallery] figure:not([inert]) img'); return img?.getAttribute('src') === src && img.complete && img.naturalWidth > 0; }, {}, entry.src);
        if (entry.animated) {
          // Element screenshots scroll nested snap containers back to slide 1.
          // Capture the gallery's visible rectangle without scrolling its child.
          await page.$eval('[data-gallery]', e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
          const clip = await page.$eval('[data-gallery]', e => {
            const r = e.getBoundingClientRect();
            return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
          });
          const capture = () => page.screenshot({ clip, captureBeyondViewport: false });
          const before = await capture();
          let changed = false;
          for (let attempt = 0; attempt < 5 && !changed; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 350));
            changed = !before.equals(await capture());
          }
          assert.ok(changed, 'GIF must visibly animate without a play action');
          assert.equal(await page.$eval(`${selector} img`, img => img.getAttribute('src')), entry.src, 'The selected GIF stays active');
        }
      }
      assert.equal(await page.$$eval('[data-gallery] figure[inert] video', videos => videos.every(v => v.paused && !v.autoplay)), true);
      assert.equal(await page.$$eval('[data-gallery] figure[inert] img[data-animation-src]', imgs => imgs.every(img => img.getAttribute('src') === img.dataset.animationPoster)), true);
      checks.push({ src: entry.src, type: entry.type, animated: Boolean(entry.animated), passed: true });
    }
    await page.screenshot({ path: `${output}/${product.slug}-${route}-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    results.push({ width, handle: product.slug, route, initialGifRequests: 0, checks });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, target: origin, views: results.length, mediaChecks: results.reduce((n, r) => n + r.checks.length, 0), output }));
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await writeFile(`${output}/results.json`, JSON.stringify({ target: origin, results, errors }, null, 2));
}
