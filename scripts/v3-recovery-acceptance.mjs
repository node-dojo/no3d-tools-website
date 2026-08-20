import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';

import { identityAssertion } from '../api/auth/lib/session.js';

const apply = process.argv.includes('--apply');
const baseUrl = (process.env.NO3D_V3_ACCEPTANCE_URL || 'https://v3.no3dtools.com').replace(/\/$/, '');
const commerceUrl = process.env.COMMERCE_API_URL?.replace(/\/$/, '');
const handle = process.env.NO3D_RECOVERY_HANDLE?.trim() || 'dojo-bolt-gen-v05-obj';

if (!apply) throw new Error('This creates, recovers, and refunds a Stripe test order. Re-run with --apply.');
for (const name of ['COMMERCE_API_URL', 'COMMERCE_SITE_BACKEND_SECRET', 'COMMERCE_SITE_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('A Stripe test secret is required.');

const browser = await puppeteer.launch({ headless: true });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const recoveryEmail = `v3-recovery-${Date.now()}@no3dtools.com`;
const recoveryPassword = crypto.randomBytes(32).toString('base64url');
let authUserId = null;
let authUserDeleted = false;
let paymentIntent = null;
let refunded = false;

async function waitFor(check, message, { attempts = 60, interval = 1_000 } = {}) {
  let result;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(message);
}

async function pageFetch(page, path, init) {
  return page.evaluate(async ({ requestPath, requestInit }) => {
    const response = await fetch(requestPath, requestInit);
    return { status: response.status, payload: await response.json() };
  }, { requestPath: path, requestInit: init });
}

async function commerceFetch(path, { identity, guestToken, method = 'GET', body } = {}) {
  const response = await fetch(`${commerceUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.COMMERCE_SITE_BACKEND_SECRET}`,
      'Content-Type': 'application/json',
      'X-NO3D-Site': process.env.COMMERCE_SITE_KEY,
      ...(identity ? { 'X-NO3D-Identity': identity } : {}),
      ...(guestToken ? { 'X-NO3D-Guest-Token': guestToken } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, payload: await response.json() };
}

try {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: recoveryEmail,
    email_confirm: true,
    password: recoveryPassword,
  });
  if (createError) throw createError;
  authUserId = created.user.id;

  const page = await browser.newPage();
  await page.goto(`${baseUrl}/v3/access/`, { waitUntil: 'domcontentloaded' });
  const checkout = await pageFetch(page, '/api/commerce/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptToken: crypto.randomUUID(), handle }),
  });
  assert.equal(checkout.status, 200, checkout.payload.error || 'Guest Checkout did not start');
  assert.match(checkout.payload.orderId, /^[0-9a-f-]{36}$/i);

  await page.goto(checkout.payload.checkoutUrl, { waitUntil: 'networkidle2' });
  const emailInput = await page.$('input[name=email]');
  assert.ok(emailInput, 'Guest Checkout did not request an email');
  await emailInput.type(recoveryEmail, { delay: 15 });
  await page.$eval('button[aria-label="Pay with card"]', (element) => element.click());
  await page.waitForSelector('input[name=cardNumber]', { timeout: 10_000 });
  await page.type('input[name=cardNumber]', '4242424242424242', { delay: 15 });
  await page.type('input[name=cardExpiry]', '1234', { delay: 15 });
  await page.type('input[name=cardCvc]', '123', { delay: 15 });
  await page.type('input[name=billingName]', 'NO3D V3 Recovery Acceptance', { delay: 15 });
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

  const fulfilled = await waitFor(async () => {
    const order = await pageFetch(page, `/api/commerce/order/${checkout.payload.orderId}`);
    return order.status === 200 && order.payload.paymentStatus === 'paid' && order.payload.fulfillmentStatus === 'fulfilled'
      ? order.payload
      : null;
  }, 'Guest order did not fulfill');
  assert.equal(fulfilled.resourceId, handle);

  const guestCookie = (await page.cookies(baseUrl)).find((cookie) => cookie.name === 'no3d_commerce_guest');
  assert.ok(guestCookie?.value, 'Guest purchase proof cookie is missing');
  const issued = await commerceFetch('/api/recovery/issue', {
    guestToken: guestCookie.value,
    method: 'POST',
    body: { orderId: checkout.payload.orderId },
  });
  assert.equal(issued.status, 201, issued.payload.error || 'Recovery grant was not issued');
  assert.equal(issued.payload.contactEmail, recoveryEmail);
  assert.match(issued.payload.token, /^[A-Za-z0-9_-]{43}$/);

  const assertion = identityAssertion({
    id: authUserId,
    email: recoveryEmail,
    email_confirmed_at: new Date().toISOString(),
  });
  const redeemed = await commerceFetch('/api/recovery/redeem', {
    identity: assertion,
    method: 'POST',
    body: { token: issued.payload.token },
  });
  assert.equal(redeemed.status, 200, redeemed.payload.error || 'Recovery grant was not redeemed');
  assert.equal(redeemed.payload.claimed, true);

  const account = await commerceFetch('/api/account', { identity: identityAssertion({
    id: authUserId,
    email: recoveryEmail,
    email_confirmed_at: new Date().toISOString(),
  }) });
  assert.equal(account.status, 200, account.payload.error || 'Recovered account lookup failed');
  assert.equal(account.payload.products?.some((product) => product.handle === handle && product.owned && product.permanent), true);

  const replay = await commerceFetch('/api/recovery/redeem', {
    identity: identityAssertion({ id: authUserId, email: recoveryEmail, email_confirmed_at: new Date().toISOString() }),
    method: 'POST',
    body: { token: issued.payload.token },
  });
  assert.equal(replay.status, 404, 'Consumed recovery token was accepted twice');

  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const checkoutSession = sessions.data.find((session) => session.client_reference_id === checkout.payload.orderId);
  assert.ok(checkoutSession, 'Recovery Checkout session was not found');
  paymentIntent = typeof checkoutSession.payment_intent === 'string'
    ? checkoutSession.payment_intent
    : checkoutSession.payment_intent?.id;
  assert.match(paymentIntent, /^pi_/);
  await stripe.refunds.create({ payment_intent: paymentIntent });
  refunded = true;

  await waitFor(async () => {
    const order = await commerceFetch(`/api/orders/${checkout.payload.orderId}`, {
      identity: identityAssertion({ id: authUserId, email: recoveryEmail, email_confirmed_at: new Date().toISOString() }),
    });
    return order.status === 200 && order.payload.paymentStatus === 'refunded' && order.payload.fulfillmentStatus === 'revoked';
  }, 'Recovered fixture refund did not revoke fulfillment');

  const { error: deleteError } = await supabase.auth.admin.deleteUser(authUserId);
  if (deleteError) throw deleteError;
  authUserDeleted = true;
  authUserId = null;

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    purchase: { guest: true, paymentStatus: 'paid', fulfillmentStatus: 'fulfilled' },
    recovery: { issued: true, verifiedIdentity: true, claimed: true, replayRejected: true },
    cleanup: { paymentStatus: 'refunded', fulfillmentStatus: 'revoked', authUserDeleted },
  })}\n`);
} finally {
  if (paymentIntent && !refunded) {
    try { await stripe.refunds.create({ payment_intent: paymentIntent }); } catch {}
  }
  if (authUserId) await supabase.auth.admin.deleteUser(authUserId).catch(() => null);
  await browser.close();
}
