import assert from 'node:assert/strict';
import process from 'node:process';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const apply = process.argv.includes('--apply');
const baseUrl = (process.env.NO3D_V3_ACCEPTANCE_URL || 'https://v3.no3dtools.com').replace(/\/$/, '');
const email = process.env.NO3D_E2E_EMAIL?.trim();
const password = process.env.NO3D_E2E_PASSWORD;
const handle = process.env.NO3D_FREE_ACCEPTANCE_HANDLE?.trim() || 'dojo-bolt-gen-v05-obj';
const manifestKey = process.env.R2_MANIFEST_KEY?.trim() || 'no3d-tools-library/manifest.json';

if (!apply) throw new Error('This temporarily marks one staging product free and restores it. Re-run with --apply.');
for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}
if (!email || !password) throw new Error('NO3D_E2E_EMAIL and NO3D_E2E_PASSWORD are required.');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});
const browser = await puppeteer.launch({ headless: true });
let originalManifest = null;
let originalPolicy = null;

try {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('handle,title,status,file_url,access_policy')
    .eq('handle', handle)
    .single();
  if (productError) throw productError;
  assert.equal(product.status, 'active');
  assert.equal(typeof product.file_url, 'string');
  originalPolicy = product.access_policy;
  assert.equal(originalPolicy, 'catalog', 'Free acceptance fixture must begin as catalog');

  const stored = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: manifestKey }));
  originalManifest = await stored.Body.transformToByteArray();
  const manifest = JSON.parse(Buffer.from(originalManifest).toString('utf8'));
  assert.ok(manifest.assets?.[handle], 'Free acceptance fixture is absent from the staged manifest');
  manifest.assets[handle].access_policy = 'free';

  const { error: updateError } = await supabase.from('products').update({ access_policy: 'free' }).eq('handle', handle);
  if (updateError) throw updateError;
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: manifestKey,
    Body: JSON.stringify(manifest, null, 2),
    ContentType: 'application/json',
  }));

  const page = await browser.newPage();
  await page.goto(`${baseUrl}/v3/access/`, { waitUntil: 'domcontentloaded' });
  const signIn = await page.evaluate(async ({ emailAddress, passwordValue }) => {
    const response = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, mode: 'signin', next: '/v3/account/', password: passwordValue }),
    });
    return { status: response.status, payload: await response.json() };
  }, { emailAddress: email, passwordValue: password });
  assert.equal(signIn.status, 200, signIn.payload.error || 'Acceptance account sign-in failed');

  const account = await page.evaluate(async () => {
    const response = await fetch('/api/commerce/account');
    return { status: response.status, payload: await response.json() };
  });
  assert.equal(account.status, 200, account.payload.error || 'Acceptance account lookup failed');
  assert.equal(account.payload.products?.some((item) => item.handle === handle && item.owned && item.entitlementStatus === 'active'), false);

  await page.goto(`${baseUrl}/v3/account/`, { waitUntil: 'networkidle2' });
  await page.waitForFunction((title) => [...document.querySelectorAll('.library-card h3')].some((node) => node.textContent === title), {}, product.title);

  const start = await page.evaluate(async () => {
    const response = await fetch('/api/addon/connect/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceLabel: 'V3 free-library acceptance' }),
    });
    return { status: response.status, payload: await response.json() };
  });
  assert.equal(start.status, 201, start.payload.error || 'Device grant did not start');
  const approve = await page.evaluate(async (deviceCode) => {
    const response = await fetch('/api/addon/connect/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode }),
    });
    return { status: response.status, payload: await response.json() };
  }, start.payload.deviceCode);
  assert.equal(approve.status, 200, approve.payload.error || 'Device grant approval failed');
  const exchange = await page.evaluate(async ({ deviceCode, exchangeSecret }) => {
    const response = await fetch('/api/addon/connect/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode, exchangeSecret }),
    });
    return { status: response.status, payload: await response.json() };
  }, { deviceCode: start.payload.deviceCode, exchangeSecret: start.payload.exchangeSecret });
  assert.equal(exchange.status, 200, exchange.payload.error || 'Device grant exchange failed');

  const manifestResponse = await fetch(`${baseUrl}/api/manifest`, { headers: { 'X-NO3D-Device-Token': exchange.payload.accessToken } });
  const effectiveManifest = await manifestResponse.json();
  assert.equal(manifestResponse.status, 200, effectiveManifest.error || 'Free device manifest failed');
  assert.equal(effectiveManifest.assets?.[handle]?.access_policy, 'free');
  assert.equal(effectiveManifest.assets?.[handle]?.access_source, 'free');

  const downloadResponse = await fetch(`${baseUrl}/api/download/${encodeURIComponent(handle)}`, {
    headers: { 'X-NO3D-Device-Token': exchange.payload.accessToken },
  });
  const download = await downloadResponse.json();
  assert.equal(downloadResponse.status, 200, download.error || 'Free device download failed');
  const assetResponse = await fetch(download.url, { headers: { Range: 'bytes=0-0' } });
  assert.ok([200, 206].includes(assetResponse.status));
  await assetResponse.body?.cancel();

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    fixture: handle,
    commercePurchase: false,
    accountLibrary: 'free',
    manifestAccess: 'free',
    downloadStatus: assetResponse.status,
    restorationPending: true,
  })}\n`);
} finally {
  if (originalPolicy) await supabase.from('products').update({ access_policy: originalPolicy }).eq('handle', handle);
  if (originalManifest) {
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: manifestKey,
      Body: Buffer.from(originalManifest),
      ContentType: 'application/json',
    }));
  }
  await browser.close();
}
