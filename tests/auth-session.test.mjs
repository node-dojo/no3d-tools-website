import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { exchangeAuthCode, identityAssertion, isAuthEmailDeliveryError, isAuthRateLimitError, oauthAuthorizationUrl, openAuthEmailGrant, passwordSignUp, readAuthNext, requestSignInLink, safeAuthNext, verifyAuthEmailGrant } from '../api/auth/lib/session.js';
import { claimPurchasingGuest } from '../api/auth/lib/claim.js';
import { purchaseOrderIdFromNext } from '../api/auth/password.js';

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

test('isAuthRateLimitError recognizes Supabase resend cooldowns without classifying ordinary auth failures', () => {
  assert.equal(isAuthRateLimitError(new Error('For security purposes, you can only request this after 26 seconds.')), true);
  assert.equal(isAuthRateLimitError(new Error('Email rate limit exceeded')), true);
  assert.equal(isAuthRateLimitError(new Error('Invalid login credentials')), false);
});

test('auth email delivery failures stay distinguishable from identity lookup failures', () => {
  assert.equal(isAuthEmailDeliveryError(new Error('auth_email_delivery_failed')), true);
  assert.equal(isAuthEmailDeliveryError(new Error('User not found')), false);
});

test('an authenticated owner of the requested order ignores an unrelated stale guest cookie', async () => {
  process.env.COMMERCE_API_URL = 'https://commerce.example';
  process.env.COMMERCE_SITE_BACKEND_SECRET = 'backend-secret';
  process.env.COMMERCE_SITE_KEY = 'no3dtools-v3-staging';
  process.env.COMMERCE_IDENTITY_ASSERTION_KID = 'sandbox-v1';
  process.env.COMMERCE_IDENTITY_ASSERTION_SECRET = 'sandbox-identity-secret-at-least-32-characters';
  process.env.NO3D_AUTH_ISSUER = 'https://v3.no3dtools.com';
  const orderId = '22222222-2222-4222-8222-222222222222';
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async (url, options) => {
    calls += 1;
    assert.equal(url, `https://commerce.example/api/orders/${orderId}`);
    assert.match(options.headers['X-NO3D-Identity'], /^ey/);
    return new Response(JSON.stringify({ id: orderId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const result = await claimPurchasingGuest(
      { headers: { cookie: `no3d_commerce_guest=${'G'.repeat(43)}` } },
      { id: 'site-user-123', email: 'buyer@example.com', email_confirmed_at: '2026-08-28T20:00:00.000Z' },
      { next: `/v3/account/orders/${orderId}` },
    );
    assert.equal(result.status, 'already_claimed');
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test('post-purchase signup recognizes only the canonical exact order route', () => {
  const orderId = '22222222-2222-4222-8222-222222222222';
  assert.equal(purchaseOrderIdFromNext(`/v3/account/orders/${orderId}`), orderId);
  assert.equal(purchaseOrderIdFromNext(`/v3/account/orders/${orderId}/`), orderId);
  assert.equal(purchaseOrderIdFromNext(`/v3/account/orders/${orderId}?claim=review`), null);
  assert.equal(purchaseOrderIdFromNext('/v3/account/'), null);
});

test('post-purchase email confirmation carries order-bound proof independent of browser cookies', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'sandbox-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sandbox-service-role-key';
  process.env.RESEND_API_KEY = 'sandbox-resend-key';
  process.env.NO3D_SITE_URL = 'https://no3dtools.com';
  process.env.NO3D_AUTH_STATE_SECRET = 'sandbox-auth-state-secret-at-least-32-characters';
  const headers = new Map();
  const response = {
    getHeader: name => headers.get(name),
    setHeader: (name, value) => headers.set(name, value),
  };
  let continueUrl;
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url).endsWith('/auth/v1/admin/generate_link')) {
      const body = JSON.parse(options.body);
      assert.equal(body.type, 'signup');
      assert.equal(body.email, 'buyer@example.com');
      assert.equal(body.password, 'a-long-test-password');
      return new Response(JSON.stringify({
        id: 'pending-user',
        email: 'buyer@example.com',
        hashed_token: 'H'.repeat(64),
        verification_type: 'signup',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    assert.equal(url, 'https://api.resend.com/emails');
    const email = JSON.parse(options.body);
    continueUrl = email.text.trim().split('\n').at(-1);
    return new Response(JSON.stringify({ id: 'email-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    await passwordSignUp(
      { headers: {} },
      response,
      'buyer@example.com',
      'a-long-test-password',
      {
        next: '/v3/account/orders/22222222-2222-4222-8222-222222222222',
        recoveryToken: 'R'.repeat(43),
      },
    );
  } finally {
    global.fetch = originalFetch;
  }
  const bridge = new URL(continueUrl);
  assert.equal(bridge.pathname, '/v3/auth/continue/');
  const grant = openAuthEmailGrant(bridge.searchParams.get('grant'));
  assert.equal(grant.recoveryToken, 'R'.repeat(43));
  assert.equal(grant.next, '/v3/account/orders/22222222-2222-4222-8222-222222222222');
  assert.equal(grant.kind, 'signup');
  assert.equal(grant.tokenHash, 'H'.repeat(64));
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

test('email sign-in uses a scanner-safe encrypted bridge and completes a browser session', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'sandbox-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sandbox-service-role-key';
  process.env.RESEND_API_KEY = 'sandbox-resend-key';
  process.env.NO3D_SITE_URL = 'https://no3dtools.com';
  process.env.NO3D_AUTH_STATE_SECRET = 'sandbox-auth-state-secret-at-least-32-characters';
  const requestHeaders = new Map();
  const requestResponse = {
    getHeader: name => requestHeaders.get(name),
    setHeader: (name, value) => requestHeaders.set(name, value),
  };
  let continueUrl;
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url).endsWith('/auth/v1/admin/generate_link')) {
      const body = JSON.parse(options.body);
      assert.equal(body.type, 'magiclink');
      assert.equal(body.email, 'buyer@example.com');
      return new Response(JSON.stringify({
        id: 'site-user-123',
        email: 'buyer@example.com',
        hashed_token: 'M'.repeat(64),
        verification_type: 'magiclink',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const email = JSON.parse(options.body);
    continueUrl = email.text.trim().split('\n').at(-1);
    return new Response(JSON.stringify({ id: 'email-2' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
  const grant = openAuthEmailGrant(new URL(continueUrl).searchParams.get('grant'));
  assert.equal(grant.kind, 'signin');
  assert.equal(grant.next, '/v3/account/?state=install');

  const callbackHeaders = new Map();
  const callbackResponse = {
    getHeader: name => callbackHeaders.get(name),
    setHeader: (name, value) => callbackHeaders.set(name, value),
  };
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.token_hash, 'M'.repeat(64));
    assert.equal(body.type, 'magiclink');
    return new Response(JSON.stringify({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'site-user-123', email: 'buyer@example.com' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await verifyAuthEmailGrant(callbackResponse, grant);
    assert.equal(result.user.email, 'buyer@example.com');
  } finally {
    global.fetch = originalFetch;
  }
});
