import assert from 'node:assert/strict';
import process from 'node:process';

import puppeteer from 'puppeteer';
import Stripe from 'stripe';

const apply = process.argv.includes('--apply');
const requireRepeat = process.argv.includes('--require-repeat');
const baseUrl = (process.env.NO3D_V3_ACCEPTANCE_URL || 'https://v3.no3dtools.com').replace(/\/$/, '');
const email = process.env.NO3D_E2E_EMAIL?.trim();
const password = process.env.NO3D_E2E_PASSWORD;
const handle = process.env.NO3D_REFUND_HANDLE?.trim() || 'dojo-knob';
const permanentHandle = process.env.NO3D_E2E_HANDLE?.trim() || 'apple-magsafe-charger';

if (!apply) throw new Error('This creates and fully refunds a Stripe test order. Re-run with --apply.');
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('NO3D_E2E_EMAIL is required.');
if (!password || password.length < 20) throw new Error('NO3D_E2E_PASSWORD is required.');
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('A Stripe test secret is required.');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const browser = await puppeteer.launch({ headless: true });

async function pageFetch(page, path, init) {
  return page.evaluate(async ({ requestPath, requestInit }) => {
    const response = await fetch(requestPath, requestInit);
    return { status: response.status, payload: await response.json() };
  }, { requestPath: path, requestInit: init });
}

async function waitFor(check, message, { attempts = 60, interval = 1_000 } = {}) {
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
    body: JSON.stringify({ deviceLabel: 'V3 refund staging acceptance' }),
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
  assert.equal(signIn.status, 200, signIn.payload.error || 'Acceptance account sign-in failed');

  const membership = await pageFetch(page, '/api/membership/account');
  assert.equal(membership.status, 200);
  assert.equal(membership.payload.active, false, 'Refund fixture must not have active membership access');

  const baseline = await pageFetch(page, '/api/commerce/account');
  assert.equal(baseline.status, 200, baseline.payload.error || 'Commerce account lookup failed');
  assert.equal(
    baseline.payload.products?.some((product) => product.handle === permanentHandle && product.owned && product.permanent),
    true,
    'Permanent control purchase is missing',
  );
  assert.equal(
    baseline.payload.products?.some((product) => product.handle === handle && product.owned),
    false,
    'Disposable refund product is already owned',
  );
  const priorRefund = baseline.payload.products?.some(
    (product) => product.handle === handle && product.paymentStatus === 'refunded' && product.entitlementStatus === 'revoked',
  ) === true;
  if (requireRepeat) assert.equal(priorRefund, true, 'No prior refunded order exists for the repeat-purchase check');

  const checkout = await pageFetch(page, '/api/commerce/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptToken: crypto.randomUUID(), handle }),
  });
  assert.equal(checkout.status, 200, checkout.payload.error || 'Product Checkout did not start');
  assert.match(checkout.payload.orderId, /^[0-9a-f-]{36}$/i);

  await page.goto(checkout.payload.checkoutUrl, { waitUntil: 'networkidle2' });
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
  await page.type('input[name=billingName]', 'NO3D V3 Refund Acceptance', { delay: 15 });
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

  const paidOrder = await waitFor(async () => {
    const order = await pageFetch(page, `/api/commerce/order/${checkout.payload.orderId}`);
    return order.status === 200 && order.payload.paymentStatus === 'paid' && order.payload.fulfillmentStatus === 'fulfilled'
      ? order.payload
      : null;
  }, 'Disposable order did not fulfill');
  assert.equal(paidOrder.resourceId, handle);

  const owned = await pageFetch(page, '/api/commerce/account');
  assert.equal(owned.payload.products?.some((product) => product.handle === handle && product.owned && product.permanent), true);
  const deviceToken = await createDeviceGrant(page);
  const ownedManifestResponse = await fetch(`${baseUrl}/api/manifest`, { headers: { 'X-NO3D-Device-Token': deviceToken } });
  const ownedManifest = await ownedManifestResponse.json();
  assert.equal(ownedManifestResponse.status, 200);
  assert.equal(ownedManifest.assets?.[handle]?.access_source, 'purchase');

  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const checkoutSession = sessions.data.find((session) => session.client_reference_id === checkout.payload.orderId);
  assert.ok(checkoutSession, 'Stripe Checkout session for disposable order was not found');
  const paymentIntent = typeof checkoutSession.payment_intent === 'string'
    ? checkoutSession.payment_intent
    : checkoutSession.payment_intent?.id;
  assert.match(paymentIntent, /^pi_/);
  const refund = await stripe.refunds.create({ payment_intent: paymentIntent });
  assert.match(refund.id, /^re_/);

  const refundedOrder = await waitFor(async () => {
    const order = await pageFetch(page, `/api/commerce/order/${checkout.payload.orderId}`);
    return order.status === 200 && order.payload.paymentStatus === 'refunded' && order.payload.fulfillmentStatus === 'revoked'
      ? order.payload
      : null;
  }, 'Refund did not revoke durable fulfillment');
  assert.equal(refundedOrder.resourceId, handle);

  const revokedAccount = await pageFetch(page, '/api/commerce/account');
  const revokedProduct = revokedAccount.payload.products?.find((product) => product.handle === handle);
  assert.ok(revokedProduct, 'Refunded product record disappeared from account history');
  assert.equal(revokedProduct.owned, false);
  assert.equal(revokedProduct.entitlementStatus, 'revoked');
  assert.equal(
    revokedAccount.payload.products?.some((product) => product.handle === permanentHandle && product.owned && product.permanent),
    true,
    'Refund of one source order removed the separate permanent control purchase',
  );

  const revokedManifestResponse = await fetch(`${baseUrl}/api/manifest`, { headers: { 'X-NO3D-Device-Token': deviceToken } });
  const revokedManifest = await revokedManifestResponse.json();
  assert.equal(revokedManifestResponse.status, 200);
  assert.equal(revokedManifest.assets?.[handle], undefined);
  assert.equal(revokedManifest.assets?.[permanentHandle]?.access_source, 'purchase');
  const revokedDownload = await fetch(`${baseUrl}/api/download/${encodeURIComponent(handle)}`, {
    headers: { 'X-NO3D-Device-Token': deviceToken },
  });
  assert.equal(revokedDownload.status, 403, 'Refunded product remained downloadable');

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    product: handle,
    purchase: { paymentStatus: 'paid', fulfillmentStatus: 'fulfilled', deviceAccess: 'purchase' },
    refund: { stripe: 'succeeded', paymentStatus: 'refunded', fulfillmentStatus: 'revoked', downloadRemoved: true },
    repeatPurchaseAfterRefund: priorRefund,
    control: { permanentPurchaseSurvived: permanentHandle },
  })}\n`);
} finally {
  await browser.close();
}
