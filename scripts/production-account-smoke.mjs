#!/usr/bin/env node

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
requireStatus(manifest, 403, 'unentitled device manifest');
if (manifest.payload.error !== 'No active membership or purchased products') {
  throw new Error('Unentitled device did not receive the expected access denial');
}

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

console.log('PRODUCTION_ACCOUNT_SESSION_OK');
console.log('PRODUCTION_ACCOUNT_CONTINUITY_OK');
console.log('PRODUCTION_CONNECT_PURCHASES_OK');
console.log('PRODUCTION_UNENTITLED_DEVICE_DENIAL_OK');
console.log('PRODUCTION_LOGOUT_OK');
