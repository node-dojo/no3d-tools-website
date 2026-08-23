#!/usr/bin/env node

/**
 * Launch-critical check #2 — free / per-product access isolation.
 *
 * Proves the SERVER half of "pair a clean Blender to a non-member account and
 * expect only the free set": a verified, non-member, zero-purchase account
 * paired as a Blender device must receive exactly the free-designated assets
 * and nothing else, and must be refused an individual catalog download.
 *
 * This is deliberately read-only against money and inventory. It creates one
 * reusable QA Auth user and one device grant. It never purchases, refunds,
 * mutates catalog policy, or touches the legacy ~/Documents/No3d Tools folder.
 *
 * Usage:
 *   doppler run --project no3dtools --config prd -- \
 *     node scripts/v3-free-isolation-acceptance.mjs --live
 */

import { createClient } from '@supabase/supabase-js';

const SITE_URL = (process.env.NO3D_ISOLATION_URL || 'https://no3dtools.com').replace(/\/$/, '');
const QA_EMAIL = (process.env.NO3D_ISOLATION_EMAIL || 'free-isolation-acceptance@no3dtools.test').toLowerCase();

if (!process.argv.includes('--live')) {
  throw new Error('Refusing to run against a live site without --live');
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${SITE_URL}${path}`, { redirect: 'manual', ...options });
  const text = await response.text();
  let payload = {};
  try { payload = JSON.parse(text); } catch { payload = {}; }
  return { response, payload, text };
}

function requireStatus(result, expected, label) {
  if (result.response.status !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${result.response.status} — ${result.text.slice(0, 300)}`);
  }
}

function sortedList(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

const failures = [];
function check(condition, label, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log(`\nV3 free/per-product isolation acceptance`);
console.log(`target: ${SITE_URL}`);
console.log(`account: ${QA_EMAIL}\n`);

// ---------------------------------------------------------------------------
// 1. Canonical expectation, read from the live catalog rather than hard-coded.
// ---------------------------------------------------------------------------
const catalog = await jsonRequest('/api/products?limit=500');
requireStatus(catalog, 200, 'catalog read');
const catalogProducts = Array.isArray(catalog.payload?.products) ? catalog.payload.products : [];
if (catalogProducts.length === 0) throw new Error('Catalog returned no products; cannot establish expectation');

const expectedFree = new Set(
  catalogProducts.filter((p) => p.access_policy === 'free' && p.handle).map((p) => p.handle)
);
const catalogOnly = catalogProducts
  .filter((p) => p.access_policy !== 'free' && p.handle)
  .map((p) => p.handle);

console.log(`catalog: ${catalogProducts.length} products — ${expectedFree.size} free, ${catalogOnly.length} catalog-only`);
console.log(`expected free set: ${sortedList(expectedFree).join(', ')}\n`);
if (expectedFree.size === 0) throw new Error('No free products designated; isolation check is meaningless');

// ---------------------------------------------------------------------------
// 2. A verified, non-member, zero-purchase managed identity.
// ---------------------------------------------------------------------------
const supabaseUrl = requiredEnv('SUPABASE_URL');
const admin = createClient(supabaseUrl, requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(supabaseUrl, requiredEnv('SUPABASE_ANON_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});

let qaUser;
for (let page = 1; page <= 10 && !qaUser; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  qaUser = data.users.find((user) => user.email?.toLowerCase() === QA_EMAIL);
  if (data.users.length < 100) break;
}
if (!qaUser) {
  const { data, error } = await admin.auth.admin.createUser({
    email: QA_EMAIL,
    email_confirm: false,
    user_metadata: { no3d_free_isolation_acceptance: true },
  });
  if (error) throw error;
  qaUser = data.user;
  console.log(`created QA identity ${qaUser.id}`);
} else {
  console.log(`reusing QA identity ${qaUser.id}`);
}

const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: QA_EMAIL,
  options: { redirectTo: `${SITE_URL}/api/auth/callback` },
});
if (linkError) throw linkError;
const tokenHash = linkData.properties?.hashed_token;
if (!tokenHash) throw new Error('Supabase did not return a hashed acceptance token');

const { data: verified, error: verifyError } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
if (verifyError) throw verifyError;
if (!verified.session?.access_token) throw new Error('Supabase did not return an authenticated acceptance session');

const authHeaders = {
  Cookie: [
    `no3d_auth_access=${encodeURIComponent(verified.session.access_token)}`,
    `no3d_auth_refresh=${encodeURIComponent(verified.session.refresh_token)}`,
  ].join('; '),
};

const session = await jsonRequest('/api/auth/session', { headers: authHeaders });
requireStatus(session, 200, 'authenticated session');
check(session.payload.authenticated === true && session.payload.email === QA_EMAIL, 'website resolves the verified QA session');

// ---------------------------------------------------------------------------
// 3. Confirm the fixture really is a non-member with no purchases.
// ---------------------------------------------------------------------------
const account = await jsonRequest('/api/commerce/account', { headers: authHeaders });
requireStatus(account, 200, 'commerce account summary');
const ownedProducts = Array.isArray(account.payload?.products) ? account.payload.products : [];
const ownedHandles = new Set(ownedProducts.map((p) => p?.handle).filter(Boolean));
check(ownedHandles.size === 0, 'fixture account holds no permanent purchases', `owns ${sortedList(ownedHandles).join(', ') || 'nothing'}`);
const membership = account.payload?.membership || account.payload?.subscription;
check(!membership || membership.status !== 'active', 'fixture account holds no active membership');

// ---------------------------------------------------------------------------
// 4. Pair it as a Blender device.
// ---------------------------------------------------------------------------
const deviceStart = await jsonRequest('/api/addon/connect/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceLabel: 'Free isolation acceptance' }),
});
requireStatus(deviceStart, 201, 'device start');
const { deviceCode, exchangeSecret } = deviceStart.payload;
if (!deviceCode || !exchangeSecret) throw new Error('Device start returned incomplete credentials');

const deviceApprove = await jsonRequest('/api/addon/connect/approve', {
  method: 'POST',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceCode }),
});
requireStatus(deviceApprove, 200, 'device approval');

const deviceExchange = await jsonRequest('/api/addon/connect/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceCode, exchangeSecret }),
});
requireStatus(deviceExchange, 200, 'device exchange');
const deviceToken = deviceExchange.payload.accessToken;
if (!deviceToken) throw new Error('Device exchange returned no access token');
const deviceHeaders = { 'X-NO3D-Device-Token': deviceToken };

// ---------------------------------------------------------------------------
// 5. The manifest this device receives must be exactly the free set.
// ---------------------------------------------------------------------------
const manifest = await jsonRequest('/api/manifest', { headers: deviceHeaders });
requireStatus(manifest, 200, 'device manifest');
const manifestAssets = manifest.payload?.assets || {};
const deliveredHandles = new Set(Object.keys(manifestAssets));

const unexpected = sortedList([...deliveredHandles].filter((h) => !expectedFree.has(h)));
const missing = sortedList([...expectedFree].filter((h) => !deliveredHandles.has(h)));

console.log(`\ndelivered: ${deliveredHandles.size} assets`);
check(unexpected.length === 0, 'no unentitled asset reaches a non-member device', unexpected.join(', '));
check(missing.length === 0, 'every designated free asset reaches the device', missing.join(', '));
check(
  Object.values(manifestAssets).every((asset) => asset?.access_source === 'free'),
  'every delivered asset is labelled access_source: free'
);
check(
  manifest.payload?.asset_count === deliveredHandles.size,
  'asset_count matches the filtered set',
  `asset_count=${manifest.payload?.asset_count} keys=${deliveredHandles.size}`
);

// ---------------------------------------------------------------------------
// 6. The closed raw-manifest escape hatch (launch-critical #1).
// ---------------------------------------------------------------------------
const legacyRedirect = await jsonRequest('/api/manifest?redirect=1', { headers: deviceHeaders });
check(legacyRedirect.response.status !== 302, 'legacy ?redirect=1 no longer presigns the raw manifest', `status ${legacyRedirect.response.status}`);
check(!legacyRedirect.response.headers.get('location'), 'legacy ?redirect=1 sets no Location header');
if (legacyRedirect.response.status === 200) {
  const legacyHandles = new Set(Object.keys(legacyRedirect.payload?.assets || {}));
  const legacyLeak = sortedList([...legacyHandles].filter((h) => !expectedFree.has(h)));
  check(legacyLeak.length === 0, 'legacy ?redirect=1 returns the same entitlement-filtered set', legacyLeak.join(', '));
}

// ---------------------------------------------------------------------------
// 7. Per-asset authorization is independent of the manifest.
// ---------------------------------------------------------------------------
const freeHandle = sortedList(expectedFree)[0];
const deniedHandle = catalogOnly.find((h) => !expectedFree.has(h));

const freeDownload = await jsonRequest(`/api/download/${encodeURIComponent(freeHandle)}`, { headers: deviceHeaders });
check(freeDownload.response.status === 200, `free asset "${freeHandle}" is downloadable`, `status ${freeDownload.response.status}`);

if (deniedHandle) {
  const deniedDownload = await jsonRequest(`/api/download/${encodeURIComponent(deniedHandle)}`, { headers: deviceHeaders });
  check(deniedDownload.response.status === 403, `catalog-only asset "${deniedHandle}" is refused`, `status ${deniedDownload.response.status}`);
  check(!deniedDownload.text.includes('http'), `refusal for "${deniedHandle}" leaks no URL`);
}

const anonymousManifest = await jsonRequest('/api/manifest');
check(anonymousManifest.response.status === 401, 'an unauthenticated manifest request is refused', `status ${anonymousManifest.response.status}`);

// ---------------------------------------------------------------------------
// 8. Close the session.
// ---------------------------------------------------------------------------
const logout = await jsonRequest('/api/auth/logout', { method: 'POST', headers: authHeaders });
check(logout.response.status === 200, 'session closes cleanly');

console.log('');
if (failures.length > 0) {
  console.log(`FREE_ISOLATION_FAILED — ${failures.length} check(s)`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
} else {
  console.log('FREE_ISOLATION_OK');
  console.log(`  free assets delivered: ${deliveredHandles.size}`);
  console.log(`  catalog assets withheld: ${catalogOnly.length}`);
}
