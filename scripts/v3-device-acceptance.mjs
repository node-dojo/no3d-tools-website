import assert from 'node:assert/strict';
import process from 'node:process';

import puppeteer from 'puppeteer';

const apply = process.argv.includes('--apply');
const baseUrl = (process.env.NO3D_V3_ACCEPTANCE_URL || 'https://v3.no3dtools.com').replace(/\/$/, '');
const email = process.env.NO3D_E2E_EMAIL?.trim();
const password = process.env.NO3D_E2E_PASSWORD;
const handle = process.env.NO3D_E2E_HANDLE?.trim() || 'apple-magsafe-charger';

if (!apply) throw new Error('This creates a staging device grant. Re-run with --apply.');
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('NO3D_E2E_EMAIL is required.');
if (!password || password.length < 20) throw new Error('NO3D_E2E_PASSWORD is required.');

const browser = await puppeteer.launch({ headless: true });

try {
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
  assert.equal(signIn.payload.authenticated, true);
  assert.equal(signIn.payload.claimStatus, 'no_guest');

  const account = await page.evaluate(async () => {
    const response = await fetch('/api/commerce/account');
    return { status: response.status, payload: await response.json() };
  });
  assert.equal(account.status, 200, account.payload.error || 'Acceptance account lookup failed');
  assert.equal(account.payload.products?.some((product) => product.handle === handle && product.owned && product.permanent), true);

  const start = await page.evaluate(async () => {
    const response = await fetch('/api/addon/connect/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceLabel: 'V3 automated staging acceptance' }),
    });
    return { status: response.status, payload: await response.json() };
  });
  assert.equal(start.status, 201, start.payload.error || 'Device grant did not start');
  assert.equal(typeof start.payload.deviceCode, 'string');
  assert.equal(typeof start.payload.exchangeSecret, 'string');

  const approve = await page.evaluate(async (deviceCode) => {
    const response = await fetch('/api/addon/connect/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode }),
    });
    return { status: response.status, payload: await response.json() };
  }, start.payload.deviceCode);
  assert.equal(approve.status, 200, approve.payload.error || 'Device grant approval failed');
  assert.equal(approve.payload.approved, true);

  const exchange = await page.evaluate(async ({ deviceCode, exchangeSecret }) => {
    const response = await fetch('/api/addon/connect/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode, exchangeSecret }),
    });
    return { status: response.status, payload: await response.json() };
  }, { deviceCode: start.payload.deviceCode, exchangeSecret: start.payload.exchangeSecret });
  assert.equal(exchange.status, 200, exchange.payload.error || 'Device grant exchange failed');
  assert.equal(typeof exchange.payload.accessToken, 'string');
  assert.equal(typeof exchange.payload.refreshToken, 'string');

  const manifestResponse = await fetch(`${baseUrl}/api/manifest`, {
    headers: { 'X-NO3D-Device-Token': exchange.payload.accessToken },
  });
  const manifest = await manifestResponse.json();
  assert.equal(manifestResponse.status, 200, manifest.error || 'Device manifest failed');
  assert.equal(manifest.assets?.[handle]?.access_source, 'purchase');

  const downloadResponse = await fetch(`${baseUrl}/api/download/${encodeURIComponent(handle)}`, {
    headers: { 'X-NO3D-Device-Token': exchange.payload.accessToken },
  });
  const download = await downloadResponse.json();
  assert.equal(downloadResponse.status, 200, download.error || 'Device product download failed');
  assert.equal(download.handle, handle);
  const assetResponse = await fetch(download.url, { headers: { Range: 'bytes=0-0' } });
  assert.ok([200, 206].includes(assetResponse.status), `Device asset delivery returned ${assetResponse.status}`);
  await assetResponse.body?.cancel();

  const refresh = await page.evaluate(async (refreshToken) => {
    const response = await fetch('/api/addon/connect/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return { status: response.status, payload: await response.json() };
  }, exchange.payload.refreshToken);
  assert.equal(refresh.status, 200, refresh.payload.error || 'Device token refresh failed');
  assert.notEqual(refresh.payload.refreshToken, exchange.payload.refreshToken);

  const refreshedManifestResponse = await fetch(`${baseUrl}/api/manifest`, {
    headers: { 'X-NO3D-Device-Token': refresh.payload.accessToken },
  });
  const refreshedManifest = await refreshedManifestResponse.json();
  assert.equal(refreshedManifestResponse.status, 200, refreshedManifest.error || 'Refreshed device manifest failed');
  assert.equal(refreshedManifest.assets?.[handle]?.access_source, 'purchase');

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    product: handle,
    accountLibrary: 'owned',
    deviceGrant: 'approved',
    manifestAccess: refreshedManifest.assets[handle].access_source,
    downloadStatus: assetResponse.status,
    refreshRotation: 'passed',
  })}\n`);
} finally {
  await browser.close();
}
