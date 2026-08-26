import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

import puppeteer from 'puppeteer';
import { acceptanceBaseUrl } from './lib/v3-acceptance-target.mjs';

const apply = process.argv.includes('--apply');
const baseUrl = acceptanceBaseUrl();
const email = process.env.NO3D_E2E_EMAIL?.trim();
const password = process.env.NO3D_E2E_PASSWORD;
const outputDir = process.env.NO3D_V3_MATRIX_OUTPUT || '/tmp/no3d-v3-account-matrix';

if (!apply) throw new Error('This signs into the staging acceptance account. Re-run with --apply.');
if (!email || !password) throw new Error('NO3D_E2E_EMAIL and NO3D_E2E_PASSWORD are required.');
await mkdir(outputDir, { recursive: true });

async function facts(page) {
  return page.evaluate(() => ({
    accountIdentity: document.querySelector('[data-account-email]')?.textContent?.trim() || '',
    libraryCount: document.querySelector('[data-library-count]')?.textContent?.trim() || '',
    membership: document.querySelector('[data-account-membership]')?.textContent?.trim() || '',
    fileRows: document.querySelectorAll('[data-account-file]').length,
    folderRows: document.querySelectorAll('[data-account-folders] .folder-entry').length,
    revokedRows: [...document.querySelectorAll('[data-account-file]')].filter((row) => /revoked|refunded/i.test(row.textContent || '')).length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    signInVisible: [...document.querySelectorAll('button,a')].some((node) => /sign in/i.test(node.textContent || '') && getComputedStyle(node).display !== 'none'),
  }));
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
try {
  const signedOut = await browser.newPage();
  await signedOut.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await signedOut.goto(`${baseUrl}/v3/account/`, { waitUntil: 'networkidle2' });
  const signedOutFacts = await facts(signedOut);
  assert.equal(signedOutFacts.horizontalOverflow, false, 'Signed-out mobile account has horizontal overflow');
  assert.equal(signedOutFacts.signInVisible, true, 'Signed-out account does not expose sign in');
  await signedOut.screenshot({ path: join(outputDir, 'signed-out-mobile.png'), fullPage: true });
  await signedOut.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await signedOut.reload({ waitUntil: 'networkidle2' });
  await signedOut.screenshot({ path: join(outputDir, 'signed-out-desktop.png'), fullPage: true });
  await signedOut.close();

  const account = await browser.newPage();
  await account.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await account.goto(`${baseUrl}/v3/access/`, { waitUntil: 'domcontentloaded' });
  const signIn = await account.evaluate(async ({ emailAddress, passwordValue }) => {
    const response = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, mode: 'signin', next: '/v3/account/', password: passwordValue }),
    });
    return { status: response.status, payload: await response.json() };
  }, { emailAddress: email, passwordValue: password });
  assert.equal(signIn.status, 200, signIn.payload.error || 'Matrix account sign-in failed');
  assert.equal(signIn.payload.authenticated, true);

  await account.goto(`${baseUrl}/v3/account/`, { waitUntil: 'networkidle2' });
  await account.waitForSelector('[data-account-file]', { timeout: 20_000 });
  const desktop = await facts(account);
  assert.equal(desktop.horizontalOverflow, false, 'Authenticated desktop account has horizontal overflow');
  assert.ok(desktop.fileRows > 0, 'Authenticated desktop account rendered no files');
  await account.screenshot({ path: join(outputDir, 'authenticated-desktop.png'), fullPage: true });

  await account.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await account.reload({ waitUntil: 'networkidle2' });
  await account.waitForSelector('[data-account-file]', { timeout: 20_000 });
  const mobile = await facts(account);
  assert.equal(mobile.horizontalOverflow, false, 'Authenticated mobile account has horizontal overflow');
  assert.equal(mobile.fileRows, desktop.fileRows, 'Desktop/mobile effective-library rows diverged');
  await account.screenshot({ path: join(outputDir, 'authenticated-mobile.png'), fullPage: true });

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    outputDir,
    signedOut: { mobile: signedOutFacts },
    authenticated: { desktop, mobile },
  })}\n`);
} finally {
  await browser.close();
}
