import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const base = 'https://staging.no3dtools.com';
assert.equal(process.env.SITE_URL, base);
assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
assert.ok(process.argv.includes('--apply'), 'Explicit sandbox purchase/refund flag required');
assert.ok(process.env.NO3D_E2E_EMAIL && process.env.NO3D_E2E_PASSWORD);
assert.equal(new URL(process.env.SUPABASE_URL).hostname, 'eydsnjawjhahtlbzwvlo.supabase.co');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
let membershipRows = [];
let membershipIsolated = false;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const products = JSON.parse(await readFile(new URL('../api/prints/lib/delivery.json', import.meta.url)));
const report = { target: base, startedAt: new Date().toISOString(), boundaries: ['Uses the existing sandbox account. Public signup, inbox delivery and verification email are unchanged and are not tested.', 'Hosted Stripe test payments only; no live charge.', 'Staging is owner-gated. The existing sandbox owner signs in through the UI. Only this sandbox account membership rows are temporarily expired for purchaser tests and restored afterward; guest UI checkout is covered locally.'], products: [] };
const browser = await puppeteer.launch({ headless: true });
const tracked = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function api(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { path, body });
}
async function wait(check, label) {
  for (let i = 0; i < 90; i++) { const result = await check(); if (result) return result; await pause(1000); }
  throw Error(label);
}
async function order(page, id, payment, fulfillment) {
  return wait(async () => { const r = await api(page, `/api/commerce/order/${id}`); return r.status === 200 && r.body.paymentStatus === payment && r.body.fulfillmentStatus === fulfillment && r.body; }, 'Order did not reach expected state');
}
async function signIn(page) {
  // The dedicated staging runner reuses one public IP; reset only its own
  // test bucket, never a global limiter or a production table.
  const address = (await (await fetch('https://api.ipify.org')).text()).trim();
  assert.match(address, /^[0-9a-f.:]+$/i);
  const bucket = createHash('sha256').update(`auth:${address}:${process.env.COMMERCE_SITE_BACKEND_SECRET}`).digest('hex');
  const cleared = await db.from('auth_rate_limits').delete().eq('bucket_key', bucket);
  assert.equal(cleared.error, null);
  console.log('signin_open');
  await page.goto(`${base}/v3/access/?mode=signin&next=%2Fv3%2Faccount%2F`, { waitUntil: 'networkidle2' });
  console.log('signin_loaded');
  await page.waitForSelector('[data-auth-mode="signin"]');
  await page.waitForFunction(() => document.querySelector('[data-auth-mode="signin"]').classList.contains('active')); 
  await page.type('input[name=email]', process.env.NO3D_E2E_EMAIL);
  await page.type('input[name=password]', process.env.NO3D_E2E_PASSWORD);
  console.log('signin_filled');
  const pending = page.waitForResponse(r => r.url().endsWith('/api/auth/password') && r.request().method() === 'POST');
  await page.click('[data-account-entry-form] button[type=submit]');
  const response = await pending; console.log('signin_status', response.status());
  assert.equal(response.status(), 200, 'UI sign-in failed');
  await page.waitForFunction(() => location.pathname === '/v3/account/');
}
async function showPrintsFolder(page, handle) {
  await page.waitForFunction(() => [...document.querySelectorAll('[data-account-folders] button strong')].some(el => el.textContent === 'Prints'));
  for (const button of await page.$$('[data-account-folders] button')) {
    if (await button.$eval('strong', el => el.textContent === 'Prints')) { await button.click(); break; }
  }
  await page.waitForSelector(`[data-account-file="${handle}"]`);
}
async function verifyDownload(result, product, full) {
  assert.equal(result.status, 200, 'Authorized download failed');
  assert.equal(result.body.checksum, product.checksum);
  const response = await fetch(result.body.url, full ? {} : { headers: { Range: 'bytes=0-255' } });
  assert.ok([200, 206].includes(response.status), 'Private artifact unavailable');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 2).toString(), 'PK');
  if (full) { assert.equal(bytes.length, product.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), product.checksum); }
}
async function fillCard(page) {
  await page.waitForSelector('button[aria-label="Pay with card"], input[name=cardNumber]', {timeout:30000});
  const email = await page.$('input[name=email]');
  if (email && !(await email.evaluate(el => el.value))) await email.type(process.env.NO3D_E2E_EMAIL);
  const button = await page.$('button[aria-label="Pay with card"]');
  const number = await page.$('input[name=cardNumber]');
  if (button && (!number || !await number.boundingBox())) await button.evaluate(el => el.click());
  await page.waitForSelector('input[name=cardNumber]', { timeout: 15000 });
  for (const [name, value] of Object.entries({ cardNumber: '4242424242424242', cardExpiry: '1234', cardCvc: '123', billingName: 'NO3D Prints Sandbox', billingPostalCode: '80202' })) {
    const input = await page.$(`input[name=${name}]`); if (!input || !await input.boundingBox()) continue;
    await input.focus(); await input.evaluate(el => el.select()); await input.press('Backspace'); await input.type(value, { delay: 10 });
  }
  await page.$$eval('input[type=checkbox]', boxes => { for (const box of boxes) { if (box.id === 'enableStripePass' && box.checked) box.click(); else if (!box.name && box.id !== 'enableStripePass' && !box.checked) box.click(); } });
}
try {
  console.log('sandbox_preflight');
  const config = await (await fetch(`${base}/api/commerce/config`)).json();
  assert.equal(config.membershipExpectedEnvironment, 'test');
  const before = await db.from('subscriptions').select('stripe_customer_id,status').eq('email', process.env.NO3D_E2E_EMAIL);
  assert.equal(before.error, null); membershipRows = before.data;
  const memberContext = await browser.createBrowserContext();
  const memberPage = await memberContext.newPage();
  await memberPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await signIn(memberPage);
  report.memberDownloads = [];
  for (const product of products) {
    await memberPage.goto(`${base}/v3/prints/?product=${product.handle}&details=1`, {waitUntil:'networkidle2'});
    await memberPage.waitForFunction(() => document.querySelector('[data-details-price] s')?.textContent === '$11.11' && document.querySelector('[data-details-price] .print-member-price-note')?.textContent === 'free for members');
    let checkouts = 0;
    const listener = r => { if (r.url().endsWith('/api/commerce/checkout')) checkouts++; };
    memberPage.on('request', listener);
    const pending = memberPage.waitForResponse(r => r.url().includes('/api/prints/download?'));
    await memberPage.click('[data-details-download]');
    const downloaded = await pending;
    await verifyDownload({status:downloaded.status(), body:await downloaded.json()}, product, false);
    assert.equal(checkouts, 0); memberPage.off('request', listener);
    const blocked = await api(memberPage, '/api/commerce/checkout', {handle:product.handle, attemptToken:crypto.randomUUID()});
    assert.equal(blocked.status, 409);
    report.memberDownloads.push({handle:product.handle, checkoutSkipped:true, directCheckoutBlocked:true});
  }
  console.log('sandbox_member_downloads_passed');
  await memberContext.close();
  membershipIsolated = true;
  const isolated = await db.from('subscriptions').update({status:'expired'}).eq('email', process.env.NO3D_E2E_EMAIL);
  assert.equal(isolated.error, null);
  for (const product of products) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    let handoffResolve;
    const handoff = new Promise(resolve => { handoffResolve = resolve; });
    await page.exposeFunction('printCheckoutResponse', result => handoffResolve(result));
    await page.evaluateOnNewDocument(() => {
      const original = window.fetch;
      window.fetch = async (...args) => {
        const response = await original(...args);
        if (new URL(response.url).pathname === '/api/commerce/checkout') await window.printCheckoutResponse({status:response.status,body:await response.clone().json()});
        return response;
      };
    });
    await signIn(page);
    const entry = { handle: product.handle }; report.products.push(entry);
    await page.goto(`${base}/v3/prints/?product=${product.handle}&details=1`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => !document.querySelector('[data-details-download]').disabled);
    assert.equal(await page.$eval('[data-details-price]', el => el.textContent), '$11.11');
    await page.click('[data-details-download]');
    const response = await handoff;
    assert.equal(response.status, 200, 'Native checkout failed');
    const checkout = response.body;
    entry.orderId = checkout.orderId;
    const sessionId = new URL(checkout.checkoutUrl).pathname.split('/').at(-1);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    assert.equal(session.livemode, false); assert.equal(session.amount_total, 1111);
    tracked.push({ sessionId, entry });
    await page.waitForFunction(() => location.hostname === 'checkout.stripe.com');
    console.log('sandbox_checkout_ready', product.handle);
    await fillCard(page);
    await page.click('button[type=submit]');
    await page.waitForFunction(() => location.hostname === 'staging.no3dtools.com', { timeout: 60000 });
    console.log('sandbox_payment_returned', product.handle);
    await order(page, entry.orderId, 'paid', 'fulfilled');
    entry.paymentAndFulfillment = true;
    const paid = await stripe.checkout.sessions.retrieve(sessionId);
    assert.equal(paid.payment_status, 'paid');
    entry.paymentIntent = typeof paid.payment_intent === 'string' ? paid.payment_intent : paid.payment_intent.id;
    await verifyDownload(await api(page, `/api/commerce/download/${entry.orderId}`), product, true);
    entry.downloadBytes = product.bytes;
    await page.goto(`${base}/v3/account/`, {waitUntil:'networkidle2'});
    await showPrintsFolder(page, product.handle);
    entry.accountLibrary = true;
    const account = await api(page, '/api/commerce/account');
    assert.ok(account.body.products.some(p => p.handle === product.handle && p.owned && p.permanent));
    const freshContext = await browser.createBrowserContext();
    const fresh = await freshContext.newPage();
    await fresh.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await signIn(fresh);
    await showPrintsFolder(fresh, product.handle);
    entry.freshBrowserRecovery = true;
    await fresh.goto(`${base}/v3/prints/?product=${product.handle}&details=1`, { waitUntil: 'networkidle2' });
    await fresh.waitForFunction(() => document.querySelector('[data-details-price]').textContent === 'Free');
    assert.equal(await fresh.$eval('[data-details-price]', el => el.textContent), 'Free');
    const access = await api(fresh, `/api/prints/access?handle=${product.handle}`);
    assert.equal(access.body.entitlement, 'owned');
    await verifyDownload(await api(fresh, `/api/prints/download?handle=${product.handle}`), product, false);
    entry.ownerBypassesPayment = true;
    const refund = await stripe.refunds.create({ payment_intent: entry.paymentIntent });
    entry.refundId = refund.id;
    await order(page, entry.orderId, 'refunded', 'revoked');
    assert.equal((await api(page, `/api/commerce/download/${entry.orderId}`)).status, 403);
    entry.refundRevokedOrder = true;
    assert.equal((await api(fresh, `/api/prints/access?handle=${product.handle}`)).body.mode, 'purchase');
    assert.equal((await api(fresh, `/api/prints/download?handle=${product.handle}`)).status, 403);
    entry.refundRevokedPrintDownload = true;
    await freshContext.close(); await context.close();
    console.log(JSON.stringify({ handle: product.handle, passed: true, orderId: entry.orderId }));
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  for (const page of await browser.pages()) {
    await page.screenshot({path:'/tmp/no3d-prints-commerce-failure.png'}).catch(()=>{});
    console.log('failure_surface', JSON.stringify(await page.evaluate(() => ({path:location.hostname === 'checkout.stripe.com' ? '/checkout' : location.pathname, text:document.querySelector('[data-auth-status]')?.textContent, buttons:[...document.querySelectorAll('form button')].map(b=>({text:b.textContent,disabled:b.disabled})), valid:document.querySelector('form')?.checkValidity()})).catch(()=>({}))));
  }
  report.stackLocation = error.stack?.split('\n').find(line => line.includes('prints-commerce-acceptance.mjs')) || ''; 
  report.failure = String(error.message).replaceAll(process.env.NO3D_E2E_EMAIL, '[test-email]').replaceAll(process.env.NO3D_E2E_PASSWORD, '[password]').slice(0, 300);
  process.exitCode = 1;
} finally {
  for (const { sessionId, entry } of tracked) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid' && !entry.refundId) {
      const payment_intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      if (payment_intent) entry.refundId = (await stripe.refunds.create({ payment_intent })).id;
    } else if (session.status === 'open') await stripe.checkout.sessions.expire(sessionId);
  }
  if (membershipIsolated) {
    for (const row of membershipRows) { const restored = await db.from('subscriptions').update({status:row.status}).eq('stripe_customer_id',row.stripe_customer_id).eq('email',process.env.NO3D_E2E_EMAIL); assert.equal(restored.error,null); }
    report.membershipFixtureRestored = true;
  }
  await browser.close();
  report.completedAt = new Date().toISOString();
  await writeFile('/tmp/no3d-prints-commerce-result.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, failure: report.failure, receipt: '/tmp/no3d-prints-commerce-result.json' }));
}
