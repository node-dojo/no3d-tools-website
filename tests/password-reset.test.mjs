import assert from 'node:assert/strict';
import test from 'node:test';
import handler, { sameOriginResetRequest } from '../api/auth/reset-password.js';
import { openAuthEmailGrant, sealPayload } from '../api/auth/lib/session.js';
import { openPasswordResetGrant, readPasswordReset, resetNext, sendPasswordReset, updateRecoveredPassword, verifyPasswordReset } from '../api/auth/lib/password-reset.js';

Object.assign(process.env, { SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_ANON_KEY: 'fixture-anon', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', NO3D_AUTH_STATE_SECRET: 'fixture-secret-for-unit-tests', NO3D_SITE_URL: 'https://no3dtools.test', RESEND_API_KEY: 'fixture-resend', V3_ACCESS_MODE: 'public' });
const user = { id: 'fixture-user', email: 'member@example.test', email_confirmed_at: '2026-10-29' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function response() {
  const headers = new Map();
  return { headers, getHeader: key => headers.get(key), setHeader: (key, value) => headers.set(key, value), status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
}
function cookie(res) { return res.getHeader('Set-Cookie')?.filter(value => value.startsWith('no3d_password_reset=')).at(-1)?.split(';')[0] || ''; }
function request(body, cookies = '') { return { method: 'POST', headers: { origin: process.env.NO3D_SITE_URL, 'content-type': 'application/json', cookie: cookies }, body }; }
async function mockFetch(fn, run) { const previous = global.fetch; global.fetch = fn; try { await run(); } finally { global.fetch = previous; } }

test('reset requests require JSON and the configured origin, without accepting a forged Host', () => {
  assert.equal(sameOriginResetRequest(request({})), true);
  assert.equal(sameOriginResetRequest({ headers: { origin: 'https://evil.test', host: 'no3dtools.test', 'content-type': 'application/json' } }), false);
  assert.equal(sameOriginResetRequest({ headers: { origin: process.env.NO3D_SITE_URL, 'content-type': 'text/plain' } }), false);
});

test('recovery destinations preserve products and orders but exclude external and API redirects', () => {
  for (const next of ['/v3/account/', '/v3/prints/?product=spike-planter-01&details=1', '/v3/account/orders/22222222-2222-4222-8222-222222222222']) assert.equal(resetNext(next), next);
  for (const next of ['https://evil.test', '//evil.test', '/api/auth/logout', '/v3/auth/reset-password/']) assert.equal(resetNext(next), '/v3/account/');
});

test('reset mail uses recovery proof in a fragment; it cannot be redeemed by ordinary sign-in', async () => {
  let link;
  await mockFetch(async (url, options) => {
    const body = JSON.parse(options.body);
    if (url.endsWith('/admin/generate_link')) {
      assert.equal(body.type, 'recovery');
      assert.equal(body.password, undefined);
      return json({ ...user, hashed_token: 'H'.repeat(64), verification_type: 'recovery' });
    }
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(body.subject, 'Reset your NO3D password');
    link = new URL(body.text.split('\n').at(-1));
    return json({ id: 'fixture-mail' });
  }, async () => sendPasswordReset(user.email, '/v3/prints/?product=spike-planter-01'));
  assert.equal(link.search, '');
  const value = new URLSearchParams(link.hash.slice(1)).get('grant');
  assert.equal(openPasswordResetGrant(value).userId, user.id);
  assert.equal(openAuthEmailGrant(value), null);
  assert.equal(openPasswordResetGrant(value + 'tampered'), null);
  assert.equal(openPasswordResetGrant(sealPayload({ ...openPasswordResetGrant(value), exp: Date.now() - 1 })), null);
});

test('verification sets only an encrypted HttpOnly recovery cookie, never a normal login session', async () => {
  const res = response();
  const grant = { userId: user.id, tokenHash: 'H'.repeat(64), exp: Date.now() + 600000, next: '/v3/account/' };
  await mockFetch(async (url, options) => {
    assert.ok(url.endsWith('/verify'));
    assert.deepEqual(JSON.parse(options.body), { token_hash: grant.tokenHash, type: 'recovery' });
    return json({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', user });
  }, async () => verifyPasswordReset(res, grant));
  assert.match(res.getHeader('Set-Cookie')[0], /HttpOnly; Secure; SameSite=Lax/);
  assert.doesNotMatch(res.getHeader('Set-Cookie').join(''), /no3d_auth_access|fixture-refresh|fixture-access/);
  assert.equal(readPasswordReset({ headers: { cookie: cookie(res) } }).userId, user.id);
});

test('normal login cookies cannot change a password; mismatched recovery identities are rejected', async () => {
  assert.equal(readPasswordReset({ headers: { cookie: 'no3d_auth_access=existing; no3d_auth_refresh=existing' } }), null);
  await mockFetch(async () => json({ access_token: 'access', refresh_token: 'refresh', user }), async () => {
    await assert.rejects(() => verifyPasswordReset(response(), { userId: 'somebody-else', tokenHash: 'H'.repeat(64) }), /invalid_recovery_identity/);
  });
});

test('password change refreshes recovery authority, preserves identity and revokes sessions', async () => {
  const calls = [];
  const res = response();
  await mockFetch(async (url, options) => {
    calls.push(url);
    if (url.includes('grant_type=refresh_token')) return json({ access_token: 'recovered-access', refresh_token: 'rotated-refresh', user });
    if (url.endsWith('/user')) {
      assert.equal(options.method, 'PUT');
      assert.deepEqual(JSON.parse(options.body), { password: 'new-fixture-password' });
      assert.equal(options.headers.Authorization, 'Bearer recovered-access');
      return json(user);
    }
    assert.ok(url.endsWith('/logout?scope=global'));
    return json({});
  }, async () => {
    const result = await updateRecoveredPassword(res, { kind: 'password-reset-session', userId: user.id, refreshToken: 'old-refresh', exp: Date.now() + 600000, next: '/v3/account/' }, 'new-fixture-password');
    assert.equal(result.user.id, user.id);
    assert.equal(result.sessionsRevoked, true);
  });
  assert.equal(calls.length, 3);
  assert.match(res.getHeader('Set-Cookie').at(-1), /Max-Age=0/);
});

test('unknown accounts receive the generic response without creating users or sending mail', async () => {
  let generation = 0;
  await mockFetch(async (url, options) => {
    if (url.includes('/rpc/')) return json(true);
    assert.ok(url.endsWith('/admin/generate_link'));
    assert.equal(JSON.parse(options.body).type, 'recovery'); generation++;
    return json({ code: 'user_not_found', msg: 'User not found' }, 404);
  }, async () => {
    const res = response(); await handler(request({ action: 'request', email: 'unknown@example.test' }), res);
    assert.equal(res.statusCode, 202); assert.deepEqual(res.body, { sent: true });
  });
  assert.equal(generation, 1);
});

test('a rejected password keeps the rotated recovery session available for a retry', async () => {
  const state = { kind: 'password-reset-session', userId: user.id, refreshToken: 'old-refresh', exp: Date.now() + 600000, next: '/v3/account/' };
  const res = response();
  await mockFetch(async (url) => {
    if (url.includes('/rpc/')) return json(true);
    if (url.includes('grant_type=refresh_token')) return json({ access_token: 'recovered-access', refresh_token: 'rotated-refresh', user });
    assert.ok(url.endsWith('/user'));
    return json({ code: 'same_password', msg: 'Password must be different' }, 422);
  }, async () => {
    await handler(request({ action: 'update', password: 'previous-fixture-password' }, `no3d_password_reset=${sealPayload(state)}`), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'same_password');
  });
  const retry = readPasswordReset({ headers: { cookie: cookie(res) } });
  assert.equal(retry.refreshToken, 'rotated-refresh');
  await mockFetch(async (url, options) => {
    if (url.includes('grant_type=refresh_token')) {
      assert.equal(JSON.parse(options.body).refresh_token, 'rotated-refresh');
      return json({ access_token: 'recovered-access', refresh_token: 'next-refresh', user });
    }
    return json(url.endsWith('/user') ? user : {});
  }, async () => assert.equal((await updateRecoveredPassword(response(), retry, 'new-fixture-password')).sessionsRevoked, true));
});

test('cross-site and invalid-password requests do not reach password mutation', async () => {
  const state = sealPayload({ kind: 'password-reset-session', userId: user.id, refreshToken: 'fixture-refresh', exp: Date.now() + 600000, next: '/v3/account/' });
  await mockFetch(async url => { assert.ok(url.includes('/rpc/')); return json(true); }, async () => {
    const cross = request({ action: 'update', password: 'long-fixture-password' }); cross.headers.origin = 'https://evil.test';
    const denied = response(); await handler(cross, denied); assert.equal(denied.statusCode, 403);
    const invalid = response(); await handler(request({ action: 'update', password: 'short' }, `no3d_password_reset=${state}`), invalid); assert.equal(invalid.statusCode, 400);
    const unauthenticated = response(); await handler(request({ action: 'update', password: 'long-fixture-password' }), unauthenticated); assert.equal(unauthenticated.statusCode, 401);
  });
});
