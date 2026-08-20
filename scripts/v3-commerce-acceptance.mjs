import assert from 'node:assert/strict';
import process from 'node:process';

import puppeteer from 'puppeteer';

const apply = process.argv.includes('--apply');
const baseUrl = (process.env.NO3D_V3_ACCEPTANCE_URL || 'https://v3.no3dtools.com').replace(/\/$/, '');
const email = process.env.NO3D_E2E_EMAIL?.trim();
const handle = process.env.NO3D_E2E_HANDLE?.trim() || 'dojo-knob';
const expectedUnitAmount = handle === 'chrome-crayon' ? 2222 : 777;

if (!apply) throw new Error('This creates a Stripe test order. Re-run with --apply.');
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('NO3D_E2E_EMAIL is required.');

const priceResponse = await fetch(`${baseUrl}/api/get-subscription-price`);
const price = await priceResponse.json();
assert.equal(price.environment, 'test', 'V3 membership must be bound to Stripe test mode');

const commerceResponse = await fetch(`${baseUrl}/api/commerce/config`);
const commerce = await commerceResponse.json();
assert.equal(commerce.individualProductsEnabled, true, 'Individual product Checkout must be enabled');

const offerResponse = await fetch(`${baseUrl}/api/commerce/offer?handle=${encodeURIComponent(handle)}`);
const publicOffer = await offerResponse.json();
assert.equal(offerResponse.status, 200, publicOffer.error || 'Commerce offer lookup failed');
assert.equal(publicOffer.offer?.resourceId, handle);
assert.equal(publicOffer.offer?.unitAmount, expectedUnitAmount);
assert.equal(publicOffer.offer?.currency, 'usd');
assert.equal('priceId' in publicOffer.offer, false, 'Public offer must not expose a Stripe Price ID');

const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/v3/access/`, { waitUntil: 'domcontentloaded' });

  const checkout = await page.evaluate(async (productHandle) => {
    const response = await fetch('/api/commerce/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptToken: crypto.randomUUID(), handle: productHandle }),
    });
    return { status: response.status, payload: await response.json() };
  }, handle);

  assert.equal(checkout.status, 200, checkout.payload.error || 'Product Checkout did not start');
  assert.match(checkout.payload.orderId, /^[0-9a-f-]{36}$/i);
  assert.equal(new URL(checkout.payload.checkoutUrl).hostname, 'checkout.stripe.com');

  await page.goto(checkout.payload.checkoutUrl, { waitUntil: 'networkidle2' });
  await page.type('input[name=email]', email, { delay: 20 });
  await page.$eval('button[aria-label="Pay with card"]', (element) => element.click());
  await page.waitForSelector('input[name=cardNumber]', { timeout: 10_000 });
  await page.type('input[name=cardNumber]', '4242424242424242', { delay: 20 });
  await page.type('input[name=cardExpiry]', '1234', { delay: 20 });
  await page.type('input[name=cardCvc]', '123', { delay: 20 });
  await page.type('input[name=billingName]', 'NO3D V3 Acceptance', { delay: 20 });
  const postalCode = await page.$('input[name=billingPostalCode]');
  if (postalCode) await postalCode.type('80202', { delay: 20 });
  await page.$eval('#enableStripePass', (element) => {
    if (element.checked) element.click();
  });
  await page.$$eval('input[type=checkbox]', (checkboxes) => {
    const agentDisclosure = checkboxes.find((checkbox) => !checkbox.name);
    if (agentDisclosure && !agentDisclosure.checked) agentDisclosure.click();
  });

  await page.click('button[type=submit]');
  await page.waitForFunction(
    (host) => location.hostname === host,
    { timeout: 45_000 },
    new URL(baseUrl).hostname,
  );

  let order;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    order = await page.evaluate(async (orderId) => {
      const response = await fetch(`/api/commerce/order/${orderId}`);
      return { status: response.status, payload: await response.json() };
    }, checkout.payload.orderId);
    if (order.payload?.paymentStatus === 'paid' && order.payload?.fulfillmentStatus === 'fulfilled') break;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  assert.equal(order?.status, 200);
  assert.equal(order.payload.paymentStatus, 'paid');
  assert.equal(order.payload.fulfillmentStatus, 'fulfilled');
  assert.equal(order.payload.resourceId, handle);
  assert.equal(order.payload.recovery?.kind, 'no3dtools_product_download');

  const cookies = await page.cookies(baseUrl);
  const cookie = cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
  const downloadResponse = await fetch(`${baseUrl}/api/commerce/download/${checkout.payload.orderId}`, {
    headers: { Cookie: cookie },
  });
  const download = await downloadResponse.json();
  assert.equal(downloadResponse.status, 200, download.error || 'Download grant failed');
  assert.equal(download.handle, handle);
  assert.equal(download.expiresIn, 900);
  assert.equal(new URL(download.url).protocol, 'https:');

  const assetResponse = await fetch(download.url, { headers: { Range: 'bytes=0-0' } });
  assert.ok([200, 206].includes(assetResponse.status), `Asset delivery returned ${assetResponse.status}`);
  await assetResponse.body?.cancel();

  const membershipResponse = await fetch(`${baseUrl}/api/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnTarget: 'v3' }),
  });
  const membership = await membershipResponse.json();
  assert.equal(membershipResponse.status, 200, membership.error || 'Membership Checkout did not start');
  assert.match(membership.id, /^cs_test_/);
  assert.equal(new URL(membership.checkout_url || membership.url).hostname, 'checkout.stripe.com');

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    environment: price.environment,
    product: {
      handle,
      unitAmount: publicOffer.offer.unitAmount,
      paymentStatus: order.payload.paymentStatus,
      fulfillmentStatus: order.payload.fulfillmentStatus,
      downloadStatus: assetResponse.status,
    },
    membership: { checkout: 'cs_test' },
  })}\n`);
} finally {
  await browser.close();
}
