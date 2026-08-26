import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import process from 'node:process';

import puppeteer from 'puppeteer';
import Stripe from 'stripe';
import { acceptanceBaseUrl } from './lib/v3-acceptance-target.mjs';

const apply = process.argv.includes('--apply');
const baseUrl = acceptanceBaseUrl();
const email = process.env.NO3D_E2E_EMAIL?.trim();
const password = process.env.NO3D_E2E_PASSWORD;
const permanentHandle = process.env.NO3D_E2E_HANDLE?.trim() || 'apple-magsafe-charger';
const exactArtifactHandle = process.env.NO3D_EXACT_ARTIFACT_HANDLE?.trim() || '';
const exactArtifactChecksum = process.env.NO3D_EXACT_ARTIFACT_CHECKSUM?.trim() || '';
const captureDir = '/tmp/no3d-v3-account-matrix';

if (!apply) throw new Error('This creates and cancels a Stripe test subscription. Re-run with --apply.');
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('NO3D_E2E_EMAIL is required.');
if (!password || password.length < 20) throw new Error('NO3D_E2E_PASSWORD is required.');
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('A Stripe test secret is required.');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const browser = await puppeteer.launch({ headless: true });
let subscriptionId = null;
let subscriptionCancelled = false;

async function pageFetch(page, path, init) {
  return page.evaluate(async ({ requestPath, requestInit }) => {
    const response = await fetch(requestPath, requestInit);
    return { status: response.status, payload: await response.json() };
  }, { requestPath: path, requestInit: init });
}

async function waitFor(check, message, { attempts = 45, interval = 1_000 } = {}) {
  let result;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(message);
}

async function createDeviceGrant(page) {
  const start = await pageFetch(page, '/api/addon/connect/start', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceLabel: 'V3 membership staging acceptance' }),
  });
  assert.equal(start.status, 201, start.payload.error || 'Device grant did not start');
  const approve = await pageFetch(page, '/api/addon/connect/approve', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceCode: start.payload.deviceCode }),
  });
  assert.equal(approve.status, 200, approve.payload.error || 'Device grant approval failed');
  const exchange = await pageFetch(page, '/api/addon/connect/exchange', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceCode: start.payload.deviceCode, exchangeSecret: start.payload.exchangeSecret }),
  });
  assert.equal(exchange.status, 200, exchange.payload.error || 'Device grant exchange failed');
  return exchange.payload.accessToken;
}

try {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/v3/access/`, { waitUntil: 'domcontentloaded' });

  const signIn = await pageFetch(page, '/api/auth/password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mode: 'signin', next: '/v3/account/', password }),
  });
  if (signIn.status === 429) {
    const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const session = await response.json();
    assert.equal(response.status, 200, session.error || 'Direct staging acceptance sign-in failed');
    const domain = new URL(baseUrl).hostname;
    await page.setCookie(
      { name: 'no3d_auth_access', value: session.access_token, domain, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
      { name: 'no3d_auth_refresh', value: session.refresh_token, domain, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    );
  } else {
    assert.equal(signIn.status, 200, signIn.payload.error || 'Acceptance account sign-in failed');
    assert.equal(signIn.payload.authenticated, true);
  }

  const baselineAccount = await pageFetch(page, '/api/commerce/account');
  assert.equal(baselineAccount.status, 200, baselineAccount.payload.error || 'Commerce account lookup failed');
  assert.equal(
    baselineAccount.payload.products?.some((product) => product.handle === permanentHandle && product.owned && product.permanent),
    true,
    'Permanent purchase is missing before membership activation',
  );
  const baselineMembership = await pageFetch(page, '/api/membership/account');
  assert.equal(baselineMembership.status, 200, baselineMembership.payload.error || 'Membership lookup failed');
  assert.equal(baselineMembership.payload.active, false, 'Acceptance account already has an active membership');

  const checkout = await pageFetch(page, '/api/create-checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnTarget: 'v3' }),
  });
  assert.equal(checkout.status, 200, checkout.payload.error || 'Membership Checkout did not start');
  assert.match(checkout.payload.id, /^cs_test_/);
  assert.equal(new URL(checkout.payload.checkout_url || checkout.payload.url).hostname, 'checkout.stripe.com');

  await page.goto(checkout.payload.checkout_url || checkout.payload.url, { waitUntil: 'networkidle2' });
  const emailInput = await page.$('input[name=email]');
  if (emailInput) {
    const currentEmail = await emailInput.evaluate((input) => input.value);
    if (!currentEmail) await emailInput.type(email, { delay: 15 });
  }
  await page.$eval('button[aria-label="Pay with card"]', (element) => element.click());
  await page.waitForSelector('input[name=cardNumber]', { timeout: 10_000 });
  await page.type('input[name=cardNumber]', '4242424242424242', { delay: 15 });
  await page.type('input[name=cardExpiry]', '1234', { delay: 15 });
  await page.type('input[name=cardCvc]', '123', { delay: 15 });
  await page.type('input[name=billingName]', 'NO3D V3 Membership Acceptance', { delay: 15 });
  const postalCode = await page.$('input[name=billingPostalCode]');
  if (postalCode) await postalCode.type('80202', { delay: 15 });
  const stripePass = await page.$('#enableStripePass');
  if (stripePass) await stripePass.evaluate((element) => { if (element.checked) element.click(); });
  await page.$$eval('input[type=checkbox]', (checkboxes) => {
    const disclosure = checkboxes.find((checkbox) => !checkbox.name);
    if (disclosure && !disclosure.checked) disclosure.click();
  });
  await page.click('button[type=submit]');
  await page.waitForFunction((host) => location.hostname === host, { timeout: 45_000 }, new URL(baseUrl).hostname);
  await page.goto(`${baseUrl}/v3/access/`, { waitUntil: 'domcontentloaded' });

  const checkoutSession = await stripe.checkout.sessions.retrieve(checkout.payload.id, { expand: ['subscription'] });
  subscriptionId = typeof checkoutSession.subscription === 'string'
    ? checkoutSession.subscription
    : checkoutSession.subscription?.id || null;
  assert.match(subscriptionId, /^sub_/);

  await waitFor(async () => {
    const response = await fetch(`${baseUrl}/api/get-license-by-session?session_id=${encodeURIComponent(checkout.payload.id)}`);
    const payload = await response.json();
    return response.ok && ['active', 'grace'].includes(payload.status) ? payload : null;
  }, 'Membership fulfillment did not complete');

  const activeMembership = await waitFor(async () => {
    const result = await pageFetch(page, '/api/membership/account');
    return result.status === 200 && result.payload.active ? result.payload : null;
  }, 'Membership did not become active');
  assert.equal(activeMembership.status, 'active');

  const catalog = await pageFetch(page, '/api/products');
  assert.equal(catalog.status, 200, catalog.payload.error || 'Catalog lookup failed');
  const eligibleCatalogCount = (catalog.payload.products || []).filter((product) => product.releaseStatus !== 'archived').length;
  assert.ok(eligibleCatalogCount > 1, 'Staging catalog must contain multiple membership products');

  const activeAccount = await pageFetch(page, '/api/commerce/account');
  assert.equal(activeAccount.status, 200, activeAccount.payload.error || 'Active account lookup failed');
  const effectiveLibraryCount = (activeAccount.payload.products || []).filter((product) => product.owned).length;
  assert.ok(effectiveLibraryCount > 1, 'Active membership did not expand the account library');

  await page.goto(`${baseUrl}/v3/account/?membership=active`, { waitUntil: 'networkidle2' });
  await page.waitForFunction((expected) => document.querySelectorAll('.library-card').length >= expected, { timeout: 20_000 }, effectiveLibraryCount);
  const renderedLibraryCount = await page.$$eval('.library-card', (cards) => cards.length);
  assert.ok(renderedLibraryCount >= effectiveLibraryCount, 'Account page did not render the effective membership library');
  if (exactArtifactHandle) {
    const folderSelected = await page.$$eval('[data-account-folders] button', (buttons) => {
      const folder = buttons.find((button) => button.textContent?.toLowerCase().includes('generators'));
      folder?.click();
      return Boolean(folder);
    });
    assert.equal(folderSelected, true, 'Exact acceptance artifact folder did not render');
    await page.waitForSelector(`[data-account-file="${exactArtifactHandle}"]`, { timeout: 20_000 });
  }
  await mkdir(captureDir, { recursive: true });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.screenshot({ path: `${captureDir}/active-membership-desktop.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.screenshot({ path: `${captureDir}/active-membership-mobile.png`, fullPage: true });

  const portal = await pageFetch(page, '/api/membership/portal', { method: 'POST' });
  assert.equal(portal.status, 200, portal.payload.error || 'Membership billing portal failed');
  assert.equal(new URL(portal.payload.url).hostname, 'billing.stripe.com');

  const deviceToken = await createDeviceGrant(page);
  const activeManifestResponse = await fetch(`${baseUrl}/api/manifest`, {
    headers: { 'X-NO3D-Device-Token': deviceToken },
  });
  const activeManifest = await activeManifestResponse.json();
  assert.equal(activeManifestResponse.status, 200, activeManifest.error || 'Active member manifest failed');
  assert.equal(activeManifest.assets?.[permanentHandle]?.access_source, 'membership_and_purchase');
  if (exactArtifactHandle) {
    assert.equal(activeManifest.assets?.[exactArtifactHandle]?.access_source, 'membership');
    if (exactArtifactChecksum) assert.equal(activeManifest.assets[exactArtifactHandle].checksum, exactArtifactChecksum);
  }
  const membershipOnlyHandle = Object.keys(activeManifest.assets || {}).find((handle) => handle !== permanentHandle);
  assert.ok(membershipOnlyHandle, 'Active membership did not add any Blender-library assets');
  const memberDownload = await fetch(`${baseUrl}/api/download/${encodeURIComponent(membershipOnlyHandle)}`, {
    headers: { 'X-NO3D-Device-Token': deviceToken },
  });
  assert.equal(memberDownload.status, 200, 'Membership-only Blender download was denied');
  let exactArtifactDownload = null;
  if (exactArtifactHandle) {
    const response = await fetch(`${baseUrl}/api/download/${encodeURIComponent(exactArtifactHandle)}`, {
      headers: { 'X-NO3D-Device-Token': deviceToken },
    });
    assert.equal(response.status, 200, 'Exact acceptance artifact download was denied');
    const download = await response.json();
    assert.match(download.url || '', /^https:\/\//, 'Exact acceptance artifact did not return a signed URL');
    if (exactArtifactChecksum) assert.equal(download.checksum, exactArtifactChecksum, 'Download receipt checksum differs from the authoring source');
    const artifactResponse = await fetch(download.url);
    assert.equal(artifactResponse.status, 200, 'Signed artifact download failed');
    const bytes = Buffer.from(await artifactResponse.arrayBuffer());
    const checksum = createHash('sha256').update(bytes).digest('hex');
    if (exactArtifactChecksum) assert.equal(checksum, exactArtifactChecksum, 'Downloaded artifact checksum differs from the authoring source');
    exactArtifactDownload = { handle: exactArtifactHandle, bytes: bytes.length, checksum, matchedSource: checksum === exactArtifactChecksum };
  }

  await stripe.subscriptions.cancel(subscriptionId);
  subscriptionCancelled = true;

  const expiredMembership = await waitFor(async () => {
    const result = await pageFetch(page, '/api/membership/account');
    return result.status === 200 && !result.payload.active && result.payload.status === 'expired' ? result.payload : null;
  }, 'Cancellation did not expire the membership', { attempts: 60 });
  assert.equal(expiredMembership.active, false);

  const canceledManifest = await waitFor(async () => {
    const response = await fetch(`${baseUrl}/api/manifest`, { headers: { 'X-NO3D-Device-Token': deviceToken } });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.assets?.[permanentHandle]?.access_source === 'purchase' ? payload : null;
  }, 'Blender library did not fall back to permanent purchases', { attempts: 60 });
  assert.equal(canceledManifest.assets?.[membershipOnlyHandle], undefined);
  if (exactArtifactHandle) assert.equal(canceledManifest.assets?.[exactArtifactHandle], undefined);

  const removedDownload = await fetch(`${baseUrl}/api/download/${encodeURIComponent(membershipOnlyHandle)}`, {
    headers: { 'X-NO3D-Device-Token': deviceToken },
  });
  assert.equal(removedDownload.status, 403, 'Canceled membership retained a membership-only download');
  const permanentDownload = await fetch(`${baseUrl}/api/download/${encodeURIComponent(permanentHandle)}`, {
    headers: { 'X-NO3D-Device-Token': deviceToken },
  });
  assert.equal(permanentDownload.status, 200, 'Cancellation removed a permanent purchase');

  const finalAccount = await pageFetch(page, '/api/commerce/account');
  assert.equal(finalAccount.status, 200);
  assert.equal(
    finalAccount.payload.products?.some((product) => product.handle === permanentHandle && product.owned && product.permanent),
    true,
    'Permanent purchase did not survive membership cancellation',
  );

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    membership: { checkout: 'cs_test', activated: true, portal: true, canceled: true, expired: true },
    account: { expandedCatalog: renderedLibraryCount, permanentPurchaseSurvived: permanentHandle, visualCaptures: 2 },
    blender: { activeCatalog: activeManifest.asset_count, fallbackCatalog: canceledManifest.asset_count, membershipDownloadRemoved: true },
    exactArtifact: exactArtifactDownload,
  })}\n`);
} finally {
  if (subscriptionId && !subscriptionCancelled) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!['canceled', 'incomplete_expired'].includes(subscription.status)) await stripe.subscriptions.cancel(subscriptionId);
    } catch {
      // Best-effort staging cleanup; the primary test error remains authoritative.
    }
  }
  await browser.close();
}
