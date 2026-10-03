#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const websiteRoot = new URL('..', import.meta.url).pathname;
const solvetRoot = process.env.SOLVET_GLOBAL_ROOT || '/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/solvet-global';
const fixtureRoot = await mkdtemp(join(tmpdir(), 'solvet-site-editor-acceptance-'));
const entry = join(fixtureRoot, 'Chrome Crayon');
await mkdir(entry);
const intro = 'Chrome Crayon is a node-powered Blender utility that turns simple hand-drawn curves into cyber sigil 3D geometry.';
await writeFile(join(entry, 'Chrome Crayon.json'), `${JSON.stringify({
  handle: 'chrome-crayon', title: 'Chrome Crayon', thumbnail_image: 'first.png',
  hosted_media: {
    'first.png': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="black"/%3E%3C/svg%3E',
    'second.webp': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="yellow"/%3E%3C/svg%3E',
  },
}, null, 2)}\n`);
await writeFile(join(entry, 'desc_Chrome_Crayon.md'), `---\nhandle: chrome-crayon\ntitle: Chrome Crayon\n---\n\n## Description\n\n${intro}\n\n## Usage\n\nThis section must survive the inline edit.\n`);
const publisher = join(fixtureRoot, 'publisher.mjs');
await writeFile(publisher, `process.stdout.write('fixture projection applied\\n');\n`);
const readbackPort = 4681 + Math.floor(Math.random() * 300);
const readback = createServer(async (_req, res) => {
  const description = await readFile(join(entry, 'desc_Chrome_Crayon.md'), 'utf8');
  const product = JSON.parse(await readFile(join(entry, 'Chrome Crayon.json'), 'utf8'));
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ product: { description, thumbnail_media_id: product.thumbnail_media_id || null } }));
});
await new Promise((resolve, reject) => readback.once('error', reject).listen(readbackPort, '127.0.0.1', resolve));

const port = 4381 + Math.floor(Math.random() * 300);
const child = spawn(process.execPath, ['scripts/solvet-site-editor-server.mjs'], {
  cwd: websiteRoot,
  env: {
    ...process.env,
    SOLVET_GLOBAL_ROOT: solvetRoot,
    SOLVET_CATALOG_ROOT: fixtureRoot,
    SOLVET_SITE_EDITOR_PORT: String(port),
    SOLVET_SITE_EDITOR_ALLOW_PUBLISH: '1',
    SOLVET_SITE_EDITOR_PUBLISH_EXECUTABLE: process.execPath,
    SOLVET_SITE_EDITOR_PUBLISH_ARGUMENTS: JSON.stringify([publisher]),
    SOLVET_SITE_EDITOR_READBACK_ORIGIN: `http://127.0.0.1:${readbackPort}`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (output.includes('Solvet Site Editor:')) return;
    if (child.exitCode !== null) throw new Error(`Site Editor server exited early:\n${output}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for Site Editor server:\n${output}`);
}

const browser = await puppeteer.launch({ headless: true });
try {
  await waitForServer();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  const base = `http://127.0.0.1:${port}`;
  const unauthorized = await fetch(`${base}/__solvet-site-editor/session`);
  assert.equal(unauthorized.status, 403);
  await page.goto(`${base}/v3/product/?handle=chrome-crayon&edit=1`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-site-editor]');

  const idle = await page.evaluate(() => {
    const shell = document.querySelector('.v3-page').getBoundingClientRect();
    const lede = document.querySelector('[data-product-lede]');
    const rect = lede.getBoundingClientRect();
    return {
      shell: [shell.x, shell.y, shell.width, shell.height],
      lede: [rect.x, rect.y, rect.width, rect.height],
      editable: lede.hasAttribute('contenteditable'),
      decorations: getComputedStyle(lede).outlineStyle,
      overlayMinimized: document.querySelector('[data-editor-window]').hidden,
      text: lede.textContent,
    };
  });
  assert.equal(idle.editable, false);
  assert.equal(idle.decorations, 'none');
  assert.equal(idle.overlayMinimized, true);
  assert.equal(idle.text, intro);

  await page.click('[data-product-lede]');
  await page.waitForSelector('[data-editor-window]:not([hidden])');
  const beforeEdit = await page.$eval('[data-product-lede]', node => {
    const rect = node.getBoundingClientRect();
    return [rect.x, rect.y, rect.width, rect.height];
  });
  assert.deepEqual(beforeEdit, idle.lede);
  await page.$eval('[data-product-lede]', node => { node.textContent = 'Edited directly in the publishable layout.'; node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); });
  await page.click('[data-editor-review]');
  await page.waitForFunction(() => !document.querySelector('[data-editor-apply]').disabled);
  await page.click('[data-editor-apply]');
  await page.waitForFunction(() => document.querySelector('[data-editor-state]').textContent.includes('Source applied'));
  const afterEdit = await page.$eval('[data-product-lede]', node => {
    const rect = node.getBoundingClientRect();
    return [rect.x, rect.y, rect.width, rect.height];
  });
  assert.equal(afterEdit[0], beforeEdit[0]);
  assert.equal(afterEdit[2], beforeEdit[2]);
  const applied = await readFile(join(entry, 'desc_Chrome_Crayon.md'), 'utf8');
  assert.match(applied, /Edited directly in the publishable layout\.\n\n## Usage/);
  assert.match(applied, /This section must survive the inline edit\./);

  await page.click('.product-hero');
  await page.waitForSelector('[data-editor-media]:not([hidden])');
  await page.click('[data-editor-media-list] button:nth-child(2)');
  await page.click('[data-editor-review]');
  await page.waitForFunction(() => !document.querySelector('[data-editor-apply]').disabled);
  await page.click('[data-editor-apply]');
  await page.waitForFunction(() => document.querySelector('[data-editor-state]').textContent.includes('Thumbnail applied'));
  const product = JSON.parse(await readFile(join(entry, 'Chrome Crayon.json'), 'utf8'));
  assert.match(product.thumbnail_media_id, /^media_[a-f0-9]{16}$/);
  assert.equal(product.thumbnail_image, 'second.webp');
  assert.ok(product.media.some(item => item.id === product.thumbnail_media_id && item.source === 'second.webp'));
  await page.click('[data-editor-publish]');
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-editor-state]').textContent;
    return text.includes('public read-back verified') || (!text.includes('Publishing') && !text.includes('Thumbnail applied'));
  });
  assert.match(await page.$eval('[data-editor-state]', node => node.textContent), /public read-back verified/);

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-site-editor]');
  await page.click('[data-product-lede]');
  const mobile = await page.evaluate(() => {
    const pageRect = document.querySelector('.v3-page').getBoundingClientRect();
    const windowRect = document.querySelector('[data-editor-window]').getBoundingClientRect();
    return {
      pageWidth: pageRect.width,
      viewportWidth: innerWidth,
      overlay: { left: windowRect.left, right: windowRect.right, top: windowRect.top, bottom: windowRect.bottom },
      editable: document.querySelector('[data-product-lede]').isContentEditable,
    };
  });
  assert.equal(mobile.pageWidth, mobile.viewportWidth);
  assert.equal(mobile.editable, true);
  assert.ok(mobile.overlay.left >= 0 && mobile.overlay.right <= 390);
  assert.ok(mobile.overlay.top >= 0 && mobile.overlay.bottom <= 844);
  await page.click('[data-editor-minimize]');
  assert.equal(await page.$eval('[data-editor-window]', node => node.hidden), true);

  process.stdout.write(`${JSON.stringify({ status: 'passed', desktop: idle.shell, mobile })}\n`);
} finally {
  await browser.close();
  child.kill('SIGTERM');
  await new Promise(resolve => readback.close(resolve));
  await rm(fixtureRoot, { recursive: true, force: true });
}
