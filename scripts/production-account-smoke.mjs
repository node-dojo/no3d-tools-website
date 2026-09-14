#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://no3dtools.com';
const QA_EMAIL = 'account-acceptance@no3dtools.test';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${SITE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function requireStatus(result, expected, label) {
  if (result.response.status !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${result.response.status}`);
  }
}

if (!process.argv.includes('--live')) {
  throw new Error('Refusing production acceptance without --live');
}

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
    user_metadata: { no3d_account_acceptance: true },
  });
  if (error) throw error;
  qaUser = data.user;
}

const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: QA_EMAIL,
  options: { redirectTo: `${SITE_URL}/api/auth/callback` },
});
if (linkError) throw linkError;
const tokenHash = linkData.properties?.hashed_token;
if (!tokenHash) throw new Error('Supabase did not return a hashed acceptance token');

const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
  token_hash: tokenHash,
  type: 'magiclink',
});
if (verifyError) throw verifyError;
if (!verified.session?.access_token || !verified.session?.refresh_token) {
  throw new Error('Supabase did not return an authenticated acceptance session');
}
const cookie = [
  `no3d_auth_access=${encodeURIComponent(verified.session.access_token)}`,
  `no3d_auth_refresh=${encodeURIComponent(verified.session.refresh_token)}`,
].join('; ');
const authHeaders = { Cookie: cookie };

try {
  const session = await jsonRequest('/api/auth/session', { headers: authHeaders });
  requireStatus(session, 200, 'authenticated session');
  if (session.payload.authenticated !== true || session.payload.email !== QA_EMAIL) {
    throw new Error('Website did not resolve the verified QA session');
  }

  const firstAccount = await jsonRequest('/api/commerce/account', { headers: authHeaders });
  requireStatus(firstAccount, 200, 'first account lookup');
  const accountId = firstAccount.payload.account?.id;
  if (typeof accountId !== 'string' || !Array.isArray(firstAccount.payload.products)) {
    throw new Error('Commerce returned an invalid account summary');
  }
  const secondAccount = await jsonRequest('/api/commerce/account', { headers: authHeaders });
  requireStatus(secondAccount, 200, 'repeat account lookup');
  if (secondAccount.payload.account?.id !== accountId) {
    throw new Error('Verified identity did not resolve to the same Commerce account');
  }

  const deviceStart = await jsonRequest('/api/addon/connect/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceLabel: 'Production account acceptance' }),
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

  const manifest = await jsonRequest('/api/manifest', {
    headers: { 'X-NO3D-Device-Token': deviceToken },
  });
  requireStatus(manifest, 200, 'managed free device manifest');
  const catalog = await jsonRequest('/api/products?limit=500');
  requireStatus(catalog, 200, 'catalog access-policy read');
  const expectedFree = (catalog.payload.products || []).filter(product => product.access_policy === 'free').map(product => product.handle).sort();
  assert.ok(expectedFree.length > 0, 'free catalog expectation must not be empty');
  assert.equal(firstAccount.payload.products.length, 0, 'QA account must have no purchases');
  const assets = manifest.payload.assets;
  assert.ok(assets && typeof assets === 'object', 'manifest must contain assets');
  assert.deepEqual(Object.keys(assets).sort(), expectedFree, 'managed free account receives exactly the designated free set');
  assert.ok(Object.values(assets).every(asset => asset.access_source === 'free'), 'every delivered asset must have free provenance');
  assert.equal(manifest.payload.asset_count, expectedFree.length);
  const protectedProduct = catalog.payload.products.find(product => product.access_policy !== 'free' && product.handle);
  assert.ok(protectedProduct, 'catalog must provide a protected asset for denial acceptance');
  const deniedDownload = await jsonRequest(`/api/download/${encodeURIComponent(protectedProduct.handle)}`, {
    headers: { 'X-NO3D-Device-Token': deviceToken },
  });
  requireStatus(deniedDownload, 403, 'unentitled protected download');
  assert.ok(!deniedDownload.payload.url && !deniedDownload.payload.download_url && !deniedDownload.response.headers.get('location'), 'denial must not disclose a download URL');
  requireStatus(await jsonRequest('/api/manifest'), 401, 'anonymous manifest');
  console.log('PRODUCTION_ACCOUNT_SESSION_OK');
  console.log('PRODUCTION_ACCOUNT_CONTINUITY_OK');
  console.log('PRODUCTION_CONNECT_PURCHASES_OK');
  console.log('PRODUCTION_MANAGED_FREE_MANIFEST_OK');
  console.log('PRODUCTION_PROTECTED_DOWNLOAD_DENIAL_OK');
} finally {
  const logout = await jsonRequest('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders,
  });
  requireStatus(logout, 200, 'logout');
  const cleared = logout.response.headers.getSetCookie?.() || [logout.response.headers.get('set-cookie') || ''];
  for (const cookieName of ['no3d_auth_access', 'no3d_auth_refresh', 'no3d_auth_pkce', 'no3d_commerce_guest']) {
    if (!cleared.some((value) => value.includes(`${cookieName}=`) && value.includes('Max-Age=0'))) {
      throw new Error(`Logout did not clear ${cookieName}`);
    }
  }

  console.log('PRODUCTION_LOGOUT_OK');
}
