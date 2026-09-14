import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';
import { acceptanceBaseUrl } from './lib/v3-acceptance-target.mjs';

const baseUrl = acceptanceBaseUrl();
const email = process.env.NO3D_E2E_EMAIL;
const password = process.env.NO3D_E2E_PASSWORD;
const control = process.env.NO3D_E2E_HANDLE || 'dojo-bolt-gen-v05';
const collectionHandle = 'no3d-chrome-tools';
const scope = 'no3dtools.membership.no3d-chrome';
const selectedSchedule = process.env.NO3D_COLLECTION_SCHEDULE;
if (selectedSchedule && !['pay_now', 'pay_over_time'].includes(selectedSchedule)) throw Error('Invalid collection acceptance schedule');
if (!process.argv.includes('--apply')) throw Error('This buys and refunds both Chrome collection schedules in Stripe test mode; use --apply.');
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw Error('Stripe test credentials required');
if (!email || !password) throw Error('Isolated non-member acceptance identity required');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const browser = await puppeteer.launch({ headless: true });
const receipts = [];
async function pageFetch(page, path, init) {
  return page.evaluate(async ({ path, init }) => {
    const response = await fetch(path, init);
    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { throw Error(`Non-JSON ${path.split('?')[0]} HTTP ${response.status}`); }
    return { status: response.status, payload };
  }, { path, init });
}
async function waitFor(check, message) {
  for (let attempt = 0; attempt < 90; attempt++) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw Error(message);
}
async function createDeviceGrant(page) {
  const start = await pageFetch(page, '/api/addon/connect/start', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceLabel: 'V3 collection staging acceptance' }),
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

async function pay(page) {
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
  await page.type('input[name=billingName]', 'NO3D V3 Collection Acceptance', { delay: 15 });
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

}
const objectId = value => typeof value === 'string' ? value : value?.id;
try {
  const page = await browser.newPage();
  let checkoutCaptured;
  await page.exposeFunction('recordCollectionCheckout', result => checkoutCaptured?.(result));
  await page.evaluateOnNewDocument(() => {
    const nativeFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      if (new URL(response.url).pathname === '/api/commerce/collection-checkout') {
        await window.recordCollectionCheckout({ status: response.status, payload: await response.clone().json() });
      }
      return response;
    };
  });
  await page.goto(`${baseUrl}/v3/access/`, { waitUntil: 'domcontentloaded' });
  const signed = await pageFetch(page, '/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, mode: 'signin', next: '/v3/account/' }) });
  assert.equal(signed.status, 200, signed.payload.error);
  assert.equal(signed.payload.authenticated, true);
  const legacy = await pageFetch(page, '/api/membership/account');
  assert.equal(legacy.status, 200);
  assert.equal(legacy.payload.active, false, 'An unrelated legacy membership would mask collection delivery defects');
  const deviceToken = await createDeviceGrant(page);
  async function manifest() {
    const response = await fetch(`${baseUrl}/api/manifest`, { headers: { 'X-NO3D-Device-Token': deviceToken } });
    assert.equal(response.status, 200);
    return response.json();
  }
  const baseline = await manifest();
  assert.ok(baseline.assets?.[control], 'Permanent control must exist before collection acceptance');
  for (const schedule of selectedSchedule ? [selectedSchedule] : ['pay_now', 'pay_over_time']) {
    let paymentIntent = null, subscriptionId = null, refundId = null, checkoutId = null;
    try {
      await page.goto(`${baseUrl}/v3/collections/${collectionHandle}/`, { waitUntil: 'networkidle2' });
      const projection = await pageFetch(page, `/api/collections/${collectionHandle}`);
      assert.equal(projection.status, 200);
      assert.equal(projection.payload.acquisition.enabled, true);
      assert.equal(projection.payload.pricing.payNow.amount, 6666);
      assert.equal(projection.payload.pricing.payOverTime.amount, 1111);
      assert.equal(projection.payload.pricing.payOverTime.installments, 6);
      const handles = projection.payload.products.map(product => product.handle);
      assert.equal(handles.length, 8);
      const protectedHandle = handles.find(handle => !baseline.assets?.[handle]);
      assert.ok(protectedHandle, 'Collection must add a protected asset beyond baseline');
      await page.waitForSelector(`[data-collection-acquire][data-schedule="${schedule}"]:not([aria-disabled="true"])`);
      const [checkoutResponse] = await Promise.all([
        new Promise(resolve => { checkoutCaptured = resolve; }),
        page.click(`[data-collection-acquire][data-schedule="${schedule}"]`),
      ]);
      const checkout = checkoutResponse.payload;
      assert.ok([200, 201].includes(checkoutResponse.status), `Checkout HTTP ${checkoutResponse.status}: ${checkout.reason || checkout.error || 'unknown_error'}`);
      assert.match(checkout.orderId, /^[0-9a-f-]{36}$/);
      const sessions = await stripe.checkout.sessions.list({ limit: 100 });
      const initial = sessions.data.find(session => session.client_reference_id === checkout.orderId);
      assert.ok(initial, 'Checkout must have a provider session');
      checkoutId = initial.id;
      assert.match(checkoutId, /^cs_test_/);
      assert.equal(initial.livemode, false);
      assert.equal(initial.amount_total, schedule === 'pay_now' ? 6666 : 1111);
      assert.equal(initial.mode, schedule === 'pay_now' ? 'payment' : 'subscription');
      if (new URL(page.url()).hostname !== 'checkout.stripe.com') await page.waitForFunction(() => location.hostname === 'checkout.stripe.com');
      await page.waitForSelector('button[aria-label="Pay with card"]');
      await pay(page);
      const session = await stripe.checkout.sessions.retrieve(checkoutId);
      subscriptionId = objectId(session.subscription);
      paymentIntent = objectId(session.payment_intent);
      if (!paymentIntent && session.invoice) {
        const invoice = await stripe.invoices.retrieve(objectId(session.invoice));
        paymentIntent = objectId(invoice.payment_intent);
      }
      assert.match(paymentIntent, /^pi_/);
      const order = await waitFor(async () => {
        const result = await pageFetch(page, `/api/commerce/order/${checkout.orderId}`);
        return result.status === 200 && result.payload.paymentStatus === 'paid' && result.payload.fulfillmentStatus === 'fulfilled' ? result.payload : null;
      }, 'Collection order did not fulfill');
      assert.equal(order.resourceType, 'no3dtools_collection');
      let finiteScheduleId = null;
      if (schedule === 'pay_over_time') {
        const subscription = await waitFor(async () => {
          const result = await stripe.subscriptions.retrieve(subscriptionId);
          return result.schedule ? result : null;
        }, 'Finite payment schedule was not attached');
        finiteScheduleId = objectId(subscription.schedule);
        const finite = await stripe.subscriptionSchedules.retrieve(finiteScheduleId);
        assert.equal(finite.end_behavior, 'cancel');
        assert.equal(finite.metadata.no3d_installment_count, '6');
        assert.equal(finite.phases.length, 1);
        const expectedEnd = new Date(finite.phases[0].start_date * 1000);
        expectedEnd.setUTCMonth(expectedEnd.getUTCMonth() + 6);
        assert.equal(finite.phases[0].end_date, expectedEnd.getTime() / 1000);
      }
      const account = await pageFetch(page, '/api/commerce/account');
      const entitlement = account.payload.entitlements.find(item => item.scopeId === scope && item.status === 'active');
      assert.ok(entitlement);
      assert.equal(entitlement.permanent, schedule === 'pay_now');
      const legacyDuringCollection = await pageFetch(page, '/api/membership/account');
      assert.equal(legacyDuringCollection.status, 200);
      assert.equal(legacyDuringCollection.payload.active, false, 'A finite collection must not provision a legacy full-library subscription');
      const active = await manifest();
      assert.deepEqual(Object.keys(active.assets).sort(), [...new Set([...Object.keys(baseline.assets), ...handles])].sort());
      const grantResponse = await fetch(`${baseUrl}/api/download/${protectedHandle}`, { headers: { 'X-NO3D-Device-Token': deviceToken } });
      assert.equal(grantResponse.status, 200);
      const grant = await grantResponse.json();
      const artifact = await fetch(grant.url, { headers: { Range: 'bytes=0-0' } });
      assert.ok([200, 206].includes(artifact.status));
      await artifact.body?.cancel();
      await page.goto(`${baseUrl}/v3/account/`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('[data-account-folders] button');
      const rendered = new Set();
      const folderCount = await page.$$eval('[data-account-folders] button', buttons => buttons.length);
      for (let index = 0; index < folderCount; index++) {
        await page.$$eval('[data-account-folders] button', (buttons, index) => buttons[index].click(), index);
        for (const handle of await page.$$eval('[data-account-file]', rows => rows.map(row => row.dataset.accountFile))) rendered.add(handle);
      }
      for (const handle of handles) assert.ok(rendered.has(handle), `My Folder is missing ${handle}`);
      await mkdir('/tmp/no3d-v3-collection-acceptance', { recursive: true });
      for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
        await page.screenshot({ path: `/tmp/no3d-v3-collection-acceptance/${schedule}-${name}.png`, fullPage: true });
      }
      const refund = await stripe.refunds.create({ payment_intent: paymentIntent });
      refundId = refund.id;
      await waitFor(async () => {
        const result = await pageFetch(page, `/api/commerce/order/${checkout.orderId}`);
        return result.status === 200 && result.payload.paymentStatus === 'refunded' && result.payload.fulfillmentStatus === 'revoked';
      }, 'Collection refund did not revoke its source');
      await waitFor(async () => JSON.stringify(Object.keys((await manifest()).assets).sort()) === JSON.stringify(Object.keys(baseline.assets).sort()), 'Collection refund did not restore baseline access');
      if (subscriptionId) await waitFor(async () => (await stripe.subscriptions.retrieve(subscriptionId)).status === 'canceled', 'First-payment full refund did not cancel future collection billing');
      const denied = await fetch(`${baseUrl}/api/download/${protectedHandle}`, { headers: { 'X-NO3D-Device-Token': deviceToken } });
      assert.equal(denied.status, 403);
      receipts.push({ schedule, orderId: checkout.orderId, checkoutId, subscriptionId, finiteScheduleId, refundId, tools: handles.length, artifactStatus: artifact.status, sourceRevoked: true, controlPreserved: true });
      console.log(JSON.stringify({ stage: 'schedule_passed', ...receipts.at(-1) }));
    } finally {
      // Reconcile provider state even if the browser return or an assertion fails.
      if (checkoutId && !paymentIntent) {
        const session = await stripe.checkout.sessions.retrieve(checkoutId);
        subscriptionId ||= objectId(session.subscription);
        paymentIntent = objectId(session.payment_intent);
        if (!paymentIntent && session.invoice) {
          const invoice = await stripe.invoices.retrieve(objectId(session.invoice));
          paymentIntent = objectId(invoice.payment_intent);
        }
      }
      if (paymentIntent && !refundId) await stripe.refunds.create({ payment_intent: paymentIntent });
      if (checkoutId && !paymentIntent) {
        const session = await stripe.checkout.sessions.retrieve(checkoutId);
        if (session.status === 'open') await stripe.checkout.sessions.expire(checkoutId);
      }
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
          const scheduled = objectId(subscription.schedule);
          if (scheduled) await stripe.subscriptionSchedules.cancel(scheduled);
          else await stripe.subscriptions.cancel(subscriptionId);
        }
      }
    }
  }
  console.log(JSON.stringify({ status: 'passed', collection: collectionHandle, schedules: receipts }));
} finally { await browser.close(); }
