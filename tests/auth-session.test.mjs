import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { identityAssertion, oauthAuthorizationUrl, safeAuthNext } from '../api/auth/lib/session.js';

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

test('oauthAuthorizationUrl starts Google PKCE without exposing the verifier', () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.NO3D_SITE_URL = 'https://no3dtools.com';
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
  assert.doesNotMatch(url.toString(), /no3d_auth_pkce/);
  assert.match(String(headers.get('Set-Cookie')), /no3d_auth_pkce=/);
});

test('oauthAuthorizationUrl rejects providers outside the approved account methods', () => {
  assert.throws(() => oauthAuthorizationUrl({ headers: {} }, { getHeader: () => null, setHeader: () => {} }, 'unknown'), /Unsupported OAuth provider/);
});
