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
  { id: 'bolt', handle: 'dojo-bolt-gen-v05', title: 'Dojo Bolt Gen V05', description: 'A live Geometry Nodes tool for printable bolts.', price: '7.77', product_type: 'Geometry Nodes', tags: ['Geometry', 'Node edition'], release_status: 'stable', release_version: '05.3', image: '/assets/product-images/Dojo Bolt Gen v05.gif', thumbnail_image: '/assets/product-images/icon_Dojo Bolt Gen v05.png' },
  { id: 'knob', handle: 'dojo-knob', title: 'Dojo Knob', description: 'A flexible parametric knob generator.', price: '7.77', product_type: 'Geometry Nodes', tags: ['Geometry', 'Generator'], release_status: 'stable', image: '/assets/product-images/Dojo Knob.gif', thumbnail_image: '/assets/product-images/icon_Dojo Knob.png' },
  { id: 'chrome', handle: 'chrome-crayon', title: 'Chrome Crayon', description: 'A linked-form generator for procedural chain studies.', price: '', product_type: 'Geometry Nodes', tags: ['Geometry', 'Generator'], release_status: 'stable', image: '/assets/product-images/icon_Dojo Crv Wrapper v4.png', thumbnail_image: '/assets/product-images/icon_Dojo Crv Wrapper v4.png' },
  { id: 'bench-grid', handle: 'dojo-bounding-grid', title: 'Dojo Bounding Grid', description: 'A living workbench utility.', product_type: 'Geometry Nodes', tags: ['Utilities'], release_status: 'experimental', presentation: { mode: 'workbench' }, workbench: { filename: 'dojo_bounding_grid.no3d', folder: 'Utilities', maturity: 'experimental', kind: 'Geometry Nodes asset', modified_at: '2026-08-22T00:00:00Z' } },
];

const accountEmail = 'v3-acceptance-owner-with-long-address@no3dtools.com';

function accountPayload(authenticated) {
  return {
    session: authenticated ? { authenticated: true, email: accountEmail } : { authenticated: false },
    summary: authenticated ? { account: { contactEmail: accountEmail }, memberships: [{ status: 'active' }], products: [
      { handle: 'dojo-bolt-gen-v05-obj', orderId: '11111111-1111-4111-8111-111111111111', owned: true, permanent: true, purchasedAt: '2026-08-01T00:00:00Z' },
      { handle: 'dojo-bolt-gen-v05-obj', orderId: '33333333-3333-4333-8333-333333333333', owned: false, permanent: true, paymentStatus: 'refunded', purchasedAt: '2026-08-20T00:00:00Z' },
      { handle: 'dojo-knob', orderId: '22222222-2222-4222-8222-222222222222', owned: true, permanent: false, purchasedAt: '2026-07-01T00:00:00Z' },
    ] } : null,
  };
}

async function installMocks(page, { authenticated = false, membershipActive = false } = {}) {
  const account = accountPayload(authenticated);
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) return request.continue();
    let payload = {};
    if (url.pathname === '/api/get-all-products') payload = products;
    else if (url.pathname === '/api/products') payload = { products };
    else if (url.pathname.startsWith('/api/products/')) {
      const handle = url.pathname.split('/').pop();
      payload = { product: products.find(product => product.handle === handle) };
    }
    else if (url.pathname === '/api/commerce/offer') {
      const handle = url.searchParams.get('handle');
      payload = { offer: { currency: 'usd', offerKey: `no3dtools.product.${handle}`, resourceId: handle, unitAmount: handle === 'chrome-crayon' ? 2222 : 777 } };
    }
    else if (url.pathname === '/api/commerce/config') payload = { individualProductsEnabled: true };
    else if (url.pathname === '/api/get-subscription-price') payload = { formatted: '$22.22' };
    else if (url.pathname === '/api/auth/session') payload = account.session;
    else if (url.pathname === '/api/commerce/account') payload = account.summary || { error: 'not_authenticated' };
    else if (url.pathname === '/api/membership/account') payload = membershipActive
      ? { active: true, status: 'active', expiresAt: '2026-09-20T00:00:00Z', graceUntil: null }
      : { active: false, status: 'invalid', expiresAt: null, graceUntil: null };
    else if (url.pathname.startsWith('/api/commerce/order/')) payload = { orderId: url.pathname.split('/').pop(), resourceId: 'dojo-bolt-gen-v05-obj', paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', recovery: true };
    else if (url.pathname === '/api/commerce/checkout') payload = { checkoutUrl: `${origin}/v3/product/?checkout=individual`, orderId: '11111111-1111-4111-8111-111111111111' };
    else if (url.pathname === '/api/create-checkout') payload = { checkout_url: `${origin}/v3/?checkout=membership` };
    else if (url.pathname === '/api/onboarding/desktop-link') payload = { sent: true };
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
  if (label.includes('workbench')) assert.match(result.headingFont, /DotoV3/);
  else assert.match(result.headingFont, /(?:DrukV3|SilkaV3)/);
}

async function mobileMastAudit(page, label) {
  const result = await page.evaluate(() => {
    const wordmark = document.querySelector('.v3-wordmark').getBoundingClientRect();
    const status = document.querySelector('.v3-status').getBoundingClientRect();
    const mast = document.querySelector('.v3-mast').getBoundingClientRect();
    const account = document.querySelector('.v3-status [data-account-email]');
    return {
      overlaps: wordmark.left < status.right && wordmark.right > status.left && wordmark.top < status.bottom && wordmark.bottom > status.top,
      contained: status.left >= mast.left && status.right <= mast.right,
      textOverflow: account ? getComputedStyle(account).textOverflow : '',
      accountClamped: account ? account.scrollWidth > account.clientWidth : false,
    };
  });
  assert.equal(result.overlaps, false, `${label}: account status collides with wordmark`);
  assert.equal(result.contained, true, `${label}: account status escapes mast`);
  assert.equal(result.textOverflow, 'ellipsis', `${label}: long account identity is not safely clamped`);
  assert.equal(result.accountClamped, true, `${label}: acceptance identity must exercise the long-email clamp`);
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
try {
  const page = await browser.newPage();
  await installMocks(page, { authenticated: true });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${origin}/v3/`, { waitUntil: 'networkidle0' });
  await structuralAudit(page, 'home mobile');
  assert.equal(await page.$eval('.catalog-rail', node => getComputedStyle(node).display), 'none');
  assert.equal(await page.$eval('.catalog-section', node => getComputedStyle(node).display), 'none');
  assert.equal(await page.$eval('.home-mobile-directory', node => getComputedStyle(node).display), 'block');
  assert.equal(await page.$$eval('[data-mobile-category-loop] button', nodes => nodes.length), 27);
  await page.click('[data-mobile-category-menu]');
  assert.equal(await page.$eval('[data-mobile-category-overview]', node => node.hidden), false);
  await page.screenshot({ path: join(outputDir, 'home-mobile-open.png') });
  await page.screenshot({ path: join(outputDir, 'home-mobile.png') });

  await page.goto(`${origin}/v3/product/?handle=dojo-bolt-gen-v05-obj`, { waitUntil: 'networkidle0' });
  await structuralAudit(page, 'product paid mobile');
  const paid = await page.evaluate(() => {
    const title = document.querySelector('.product-title').getBoundingClientRect();
    const hero = document.querySelector('.product-hero').getBoundingClientRect();
    const plate = document.querySelector('[data-ascii-plate]');
    const panel = plate?.closest('.ascii-panel');
    const lines = plate?.textContent ? plate.textContent.split('\n') : [];
    const functions = getComputedStyle(document.querySelector('.product-functions'));
    const individualAction = document.querySelector('[data-download]');
    return { titleBeforeHero: title.top < hero.top, hasDiagram: lines.length > 0, panelPresent: Boolean(panel), panelHidden: panel?.hidden, widths: [...new Set(lines.map(line => line.length))], inputSockets: lines.filter(line => line.startsWith('o ')).length, outputSockets: lines.filter(line => line.endsWith('o')).length, price: document.querySelector('[data-price-block]')?.textContent, sideBorders: [functions.borderLeftWidth, functions.borderRightWidth], hero: document.querySelector('[data-product-hero]').getAttribute('src'), individualAction: individualAction.textContent.trim(), individualActionBackground: getComputedStyle(individualAction).backgroundColor, catalogAction: document.querySelector('[data-catalog-checkout]').textContent.trim() };
  });
  assert.equal(paid.titleBeforeHero, true);
  if (paid.hasDiagram) {
    assert.deepEqual(paid.widths, [48]);
    assert.ok(paid.inputSockets >= 1 || paid.outputSockets >= 1);
  } else {
    assert.ok(!paid.panelPresent || paid.panelHidden, 'a product without a diagram must remove or hide the ASCII panel');
  }
  assert.match(paid.price, /\$7\.77/);
  assert.deepEqual(paid.sideBorders, ['0px', '0px']);
  assert.equal(paid.hero, '/assets/product-images/icon_Dojo Bolt Gen v05_Obj.png');
  assert.match(paid.individualAction, /Add to Library/);
  assert.equal(paid.individualActionBackground, 'rgb(245, 255, 0)');
  assert.match(paid.catalogAction, /Get Full Catalog/);
  await page.screenshot({ path: join(outputDir, 'product-paid-mobile.png') });

  for (const [name, path] of [
    ['membership-mobile', '/v3/membership/'],
    ['onboarding-account-mobile', '/v3/onboarding/create-account/'],
    ['onboarding-install-mobile', '/v3/account/?state=install'],
    ['onboarding-connect-mobile', '/v3/account/?state=connect'],
    ['onboarding-complete-mobile', '/v3/account/?state=complete'],
    ['account-library-mobile', '/v3/account/'],
  ]) {
    await page.goto(`${origin}${path}`, { waitUntil: 'networkidle0' });
    await structuralAudit(page, name);
    if (name === 'onboarding-install-mobile') {
      assert.equal(await page.$eval('[data-wizard-slide="version"]', node => node.hidden), true);
      assert.equal(await page.$eval('[data-wizard-slide="mobile-handoff"]', node => node.hidden), false);
      assert.match(await page.$eval('[data-mobile-handoff-message]', node => node.textContent), new RegExp(`emailed to ${accountEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
      assert.equal(await page.$eval('[data-skip-setup]', node => getComputedStyle(node).display), 'none');
      assert.equal(await page.$eval('[data-proceed-mobile]', node => node.textContent.trim()), 'Proceed →');
      await page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: true });
      await page.click('[data-proceed-mobile]');
      assert.equal(await page.$eval('[data-setup-panel="install"]', node => node.hidden), true);
      assert.equal(await page.$eval('[data-ready-territory]', node => getComputedStyle(node).pointerEvents), 'auto');
      continue;
    }
    if (name === 'workbench-mobile') {
      const b4 = await page.evaluate(() => {
        const featured = document.querySelector('[data-mobile-featured-tools]');
        const firstCard = featured.querySelector('.mobile-featured-card');
        const sharedFolder = document.querySelector('.shared-folder');
        const directFile = document.querySelector('.mobile-working-link');
        return {
          categories: [...document.querySelectorAll('[data-mobile-category-overview] button')].map(node => node.textContent.trim()),
          loopButtons: document.querySelectorAll('[data-mobile-category-loop] button').length,
          activeFirst: document.querySelector('[data-mobile-category-loop] button')?.classList.contains('active'),
          activeLabel: document.querySelector('[data-mobile-category-loop] button')?.textContent.trim(),
          partialCard: firstCard.getBoundingClientRect().width < innerWidth,
          horizontalShelf: featured.scrollWidth > featured.clientWidth,
          directFileHref: directFile?.getAttribute('href'),
          sharedFolderHidden: getComputedStyle(sharedFolder).display === 'none',
          mobileToggles: document.querySelectorAll('[data-mobile-directory] input[type="checkbox"]').length,
          purchaseCopy: document.querySelector('.mobile-purchase-contract').textContent,
        };
      });
      assert.deepEqual(b4.categories, ['All', 'Hardware', 'Generators', 'Primitives', 'Utilities', 'Brushes', 'Ready Mades', 'Assemblies', 'Lessons']);
      assert.equal(b4.loopButtons, 27);
      assert.equal(b4.activeFirst, true);
      assert.equal(b4.activeLabel, 'All');
      assert.equal(b4.partialCard, true);
      assert.equal(b4.horizontalShelf, true);
      assert.match(b4.directFileHref, /^\/v3\/product\/\?handle=/);
      assert.equal(b4.sharedFolderHidden, true);
      assert.equal(b4.mobileToggles, 0);
      assert.match(b4.purchaseCopy, /one product page for individual checkout/i);
      assert.match(b4.purchaseCopy, /full-catalog membership/i);

      await page.click('[data-mobile-category-menu]');
      assert.equal(await page.$eval('[data-mobile-category-overview]', node => node.hidden), false);
      assert.equal(await page.$eval('[data-mobile-category-menu]', node => node.getAttribute('aria-expanded')), 'true');
      await page.click('[data-mobile-category-overview] button:nth-child(6)');
      assert.equal(await page.$eval('[data-mobile-category-loop] button', node => node.textContent.trim()), 'Brushes');
      assert.equal(await page.$eval('[data-mobile-featured-empty]', node => node.hidden), false);
      assert.equal(await page.$eval('[data-mobile-files-empty]', node => node.hidden), false);

      await page.click('[data-search-toggle]');
      assert.equal(await page.$eval('[data-search-region]', node => node.hidden), false);
      assert.equal(await page.$eval('[data-search-toggle]', node => node.getAttribute('aria-expanded')), 'true');
    }
    if (name === 'account-library-mobile') {
      await mobileMastAudit(page, name);
      assert.equal(await page.$$eval('[data-account-file]', nodes => new Set(nodes.map(node => node.dataset.accountFile)).size), await page.$$eval('[data-account-file]', nodes => nodes.length), 'selected My Folder category must not repeat an asset handle');
    }
    await page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: true });
  }

  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  for (const [name, path] of [
    ['home-desktop', '/v3/'],
    ['product-paid-desktop', '/v3/product/?handle=dojo-bolt-gen-v05-obj'],
    ['membership-desktop', '/v3/membership/'],
    ['onboarding-account-desktop', '/v3/onboarding/create-account/'],
    ['onboarding-install-desktop', '/v3/account/?state=install'],
    ['onboarding-connect-desktop', '/v3/account/?state=connect'],
    ['onboarding-complete-desktop', '/v3/account/?state=complete'],
    ['account-library-desktop', '/v3/account/'],
  ]) {
    await page.goto(`${origin}${path}`, { waitUntil: 'networkidle0' });
    await structuralAudit(page, name);
    if (name === 'onboarding-install-desktop') {
      assert.equal(await page.$eval('[data-wizard-slide="version"]', node => node.hidden), false);
      assert.equal(await page.$eval('[data-wizard-slide="mobile-handoff"]', node => node.hidden), true);
    }
    if (name === 'home-desktop') {
      const responsiveDirectory = await page.evaluate(() => {
        const shelf = document.querySelector('[data-product-grid]');
        const cards = [...shelf.querySelectorAll('.product-card')];
        const first = cards[0];
        const third = cards[2];
        const terminal = first?.querySelector('.product-meta');
        const firstStyle = getComputedStyle(first);
        return {
          sharedFolderVisible: getComputedStyle(document.querySelector('.home-shared-folder')).display !== 'none',
          catalogRailVisible: getComputedStyle(document.querySelector('.catalog-rail')).display !== 'none',
          desktopHamburgers: document.querySelectorAll('[data-catalog-toggle], .home-mobile-directory .mobile-category-menu:not(:where(.home-mobile-directory[style*="display: block"] *))').length,
          shelfDisplay: getComputedStyle(shelf).display,
          twoRows: Boolean(first && third && Math.abs(first.getBoundingClientRect().top - third.getBoundingClientRect().top) < 2),
          cardBorders: [firstStyle.borderTopWidth, firstStyle.borderRightWidth, firstStyle.borderBottomWidth, firstStyle.borderLeftWidth],
          terminalUnderline: getComputedStyle(terminal).borderBottomWidth,
          directoryColumns: document.querySelectorAll('.home-shared-folder .source-browser > *').length,
          sharedFolderLinks: [...document.querySelectorAll('.catalog-list a')].filter(node => /Shared Source Folder/i.test(node.textContent)).length,
          toolCounters: document.querySelectorAll('[data-product-count]').length,
        };
      });
      assert.equal(responsiveDirectory.sharedFolderVisible, true);
      assert.equal(responsiveDirectory.catalogRailVisible, true);
      assert.equal(responsiveDirectory.shelfDisplay, 'grid');
      assert.equal(responsiveDirectory.twoRows, true);
      assert.deepEqual(responsiveDirectory.cardBorders, ['0px', '0px', '0px', '0px']);
      assert.equal(responsiveDirectory.terminalUnderline, '1px');
      assert.equal(responsiveDirectory.directoryColumns, 3);
      assert.equal(responsiveDirectory.sharedFolderLinks, 0);
      assert.equal(responsiveDirectory.toolCounters, 0);
    }
    await page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: name.startsWith('onboarding') || name.startsWith('account-library') });
  }

  const memberPage = await browser.newPage();
  await installMocks(memberPage, { authenticated: true, membershipActive: true });
  await memberPage.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await memberPage.goto(`${origin}/v3/account/`, { waitUntil: 'networkidle0' });
  await structuralAudit(memberPage, 'account active member desktop');
  assert.match(await memberPage.$eval('[data-account-membership]', node => node.textContent), /Automatic updates/i);
  assert.match(await memberPage.$eval('[data-library-count]', node => node.textContent), new RegExp(`^0?${products.length} tools$`));
  assert.ok(await memberPage.$$eval('.library-card', nodes => nodes.length) > 0, 'selected My Folder category must render its effective assets');
  assert.ok(await memberPage.$$eval('[data-account-folders] .folder-entry', nodes => nodes.length) > 1, 'effective library must retain its catalog folders');
  await memberPage.screenshot({ path: join(outputDir, 'account-member-desktop.png'), fullPage: true });
  await memberPage.close();

  console.log(JSON.stringify({ status: 'passed', tranche: 'end-to-end-v3-customer-core', outputDir, routes: 8, viewports: ['390x844', '1440x1100'] }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
