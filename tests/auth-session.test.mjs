import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { exchangeAuthCode, identityAssertion, oauthAuthorizationUrl, readAuthNext, requestSignInLink, safeAuthNext } from '../api/auth/lib/session.js';

test('identityAssertion signs a short-lived verified Supabase identity', () => {
  process.env.COMMERCE_IDENTITY_ASSERTION_KID = 'sandbox-v1';
  process.env.COMMERCE_IDENTITY_ASSERTION_SECRET = 'sandbox-identity-secret-at-least-32-characters';
  process.env.NO3D_AUTH_ISSUER = 'http://127.0.0.1:3001';
  const now = new Date('2026-08-11T18:00:00.000Z');
  const token = identityAssertion({
    id: 'site-user-123',
    email: 'Buyer@Example.com',
    email_confirmed_at: '2026-08-11T17:59:00.000Z',
  }, now);
  const [encodedHeader, encodedClaims, signature] = token.split('.');
  const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
  const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8'));
  const expected = crypto.createHmac('sha256', process.env.COMMERCE_IDENTITY_ASSERTION_SECRET)
    .update(`${encodedHeader}.${encodedClaims}`)
    .digest('base64url');

  assert.deepEqual(header, { alg: 'HS256', kid: 'sandbox-v1', typ: 'JWT' });
  assert.equal(claims.aud, 'no3d-commerce');
  assert.equal(claims.email, 'buyer@example.com');
  assert.equal(claims.email_verified, true);
  assert.equal(claims.exp - claims.iat, 120);
  assert.equal(signature, expected);
});

test('identityAssertion refuses an unverified email identity', () => {
  assert.throws(
    () => identityAssertion({ id: 'site-user-123', email: 'buyer@example.com' }),
    /not email verified/,
  );
});

test('safeAuthNext permits local post-purchase routes and rejects redirects', () => {
  assert.equal(
    safeAuthNext('/account/orders/22222222-2222-4222-8222-222222222222'),
    '/account/orders/22222222-2222-4222-8222-222222222222',
  );
  assert.equal(safeAuthNext('//attacker.example'), undefined);
  assert.equal(safeAuthNext('https://attacker.example'), undefined);
});

test('email confirmation preserves a safe intended destination in an HttpOnly cookie', () => {
  const request = { headers: { cookie: 'no3d_auth_next=%2Fv3%2Fproduct%2F%3Fhandle%3Ddojo-bolt-gen-v05-obj' } };
  assert.equal(readAuthNext(request), '/v3/product/?handle=dojo-bolt-gen-v05-obj');
  assert.equal(readAuthNext({ headers: { cookie: 'no3d_auth_next=https%3A%2F%2Fattacker.example' } }), undefined);
});

test('oauthAuthorizationUrl starts Google PKCE without exposing the verifier', () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.NO3D_SITE_URL = 'https://no3dtools.com';
  process.env.NO3D_AUTH_STATE_SECRET = 'sandbox-auth-state-secret-at-least-32-characters';
  const headers = new Map();
  const response = {
    getHeader: name => headers.get(name),
    setHeader: (name, value) => headers.set(name, value),
  };
  const url = new URL(oauthAuthorizationUrl({ headers: {} }, response, 'google', { next: '/v3/account/?state=install' }));
  assert.equal(url.pathname, '/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.ok(url.searchParams.get('code_challenge')?.length >= 43);
  assert.match(url.searchParams.get('redirect_to'), /\/api\/auth\/callback/);
  assert.match(url.searchParams.get('redirect_to'), /auth_state=/);
  assert.doesNotMatch(url.toString(), /no3d_auth_pkce/);
  assert.match(String(headers.get('Set-Cookie')), /no3d_auth_pkce=/);
  assert.match(String(headers.get('Set-Cookie')), /no3d_auth_next=/);
});

test('oauthAuthorizationUrl rejects providers outside the approved account methods', () => {
  assert.throws(() => oauthAuthorizationUrl({ headers: {} }, { getHeader: () => null, setHeader: () => {} }, 'unknown'), /Unsupported OAuth provider/);
});

test('encrypted PKCE state completes a sign-in after the email opens in another browser', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'sandbox-anon-key';
  process.env.NO3D_SITE_URL = 'https://no3dtools.com';
  process.env.NO3D_AUTH_STATE_SECRET = 'sandbox-auth-state-secret-at-least-32-characters';
  const requestHeaders = new Map();
  const requestResponse = {
    getHeader: name => requestHeaders.get(name),
    setHeader: (name, value) => requestHeaders.set(name, value),
  };
  const authorizationUrl = new URL(oauthAuthorizationUrl(
    { headers: {} },
    requestResponse,
    'google',
    { next: '/v3/account/' },
  ));
  const callbackUrl = new URL(authorizationUrl.searchParams.get('redirect_to'));
  const authState = callbackUrl.searchParams.get('auth_state');
  assert.ok(authState);

  const callbackHeaders = new Map();
  const callbackResponse = {
    getHeader: name => callbackHeaders.get(name),
    setHeader: (name, value) => callbackHeaders.set(name, value),
  };
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.auth_code, 'one-time-code');
    assert.match(body.code_verifier, /^[A-Za-z0-9_-]{43,128}$/);
    return new Response(JSON.stringify({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'site-user-123', email: 'buyer@example.com' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await exchangeAuthCode(
      { headers: {}, query: { auth_state: authState } },
      callbackResponse,
      'one-time-code',
    );
    assert.equal(result.user.id, 'site-user-123');
    assert.match(String(callbackHeaders.get('Set-Cookie')), /no3d_auth_access=/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('email sign-in carries encrypted PKCE state into a different browser', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'sandbox-anon-key';
  process.env.NO3D_SITE_URL = 'https://no3dtools.com';
  process.env.NO3D_AUTH_STATE_SECRET = 'sandbox-auth-state-secret-at-least-32-characters';
  const requestHeaders = new Map();
  const requestResponse = {
    getHeader: name => requestHeaders.get(name),
    setHeader: (name, value) => requestHeaders.set(name, value),
  };
  let emailRequestUrl;
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    emailRequestUrl = new URL(url);
    assert.equal(JSON.parse(options.body).email, 'buyer@example.com');
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    await requestSignInLink(
      { headers: {} },
      requestResponse,
      'buyer@example.com',
      { next: '/v3/account/?state=install' },
    );
  } finally {
    global.fetch = originalFetch;
  }
  const callbackUrl = new URL(emailRequestUrl.searchParams.get('redirect_to'));
  const authState = callbackUrl.searchParams.get('auth_state');
  assert.ok(authState);
  assert.equal(callbackUrl.searchParams.get('next'), '/v3/account/?state=install');

  const callbackHeaders = new Map();
  const callbackResponse = {
    getHeader: name => callbackHeaders.get(name),
    setHeader: (name, value) => callbackHeaders.set(name, value),
  };
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.auth_code, 'email-one-time-code');
    assert.match(body.code_verifier, /^[A-Za-z0-9_-]{43,128}$/);
    return new Response(JSON.stringify({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'site-user-123', email: 'buyer@example.com' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await exchangeAuthCode(
      { headers: {}, query: { auth_state: authState } },
      callbackResponse,
      'email-one-time-code',
    );
    assert.equal(result.user.email, 'buyer@example.com');
  } finally {
    global.fetch = originalFetch;
  }
});
