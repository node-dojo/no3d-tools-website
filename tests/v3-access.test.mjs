import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import middleware from '../middleware.js';
import { v3OwnerAllowed, v3OwnerGateEnabled } from '../api/auth/lib/v3-access.js';

const originalFetch = globalThis.fetch;
const originalMode = process.env.V3_ACCESS_MODE;
const originalEmails = process.env.V3_OWNER_EMAILS;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalMode === undefined) delete process.env.V3_ACCESS_MODE;
  else process.env.V3_ACCESS_MODE = originalMode;
  if (originalEmails === undefined) delete process.env.V3_OWNER_EMAILS;
  else process.env.V3_OWNER_EMAILS = originalEmails;
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalSupabaseUrl;
  if (originalSupabaseAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
  else process.env.SUPABASE_ANON_KEY = originalSupabaseAnonKey;
});

test('owner allowlist is disabled unless explicitly configured', () => {
  assert.equal(v3OwnerGateEnabled({}), false);
  assert.equal(v3OwnerAllowed('anyone@example.com', {}), true);
});

test('owner allowlist compares normalized exact email addresses', () => {
  const env = { V3_ACCESS_MODE: 'owner', V3_OWNER_EMAILS: ' Owner@Example.com,second@example.com ' };
  assert.equal(v3OwnerAllowed('owner@example.com', env), true);
  assert.equal(v3OwnerAllowed('unknown@example.com', env), false);
  assert.equal(v3OwnerAllowed(undefined, env), false);
});

test('middleware leaves the public production V3 unchanged when the gate is disabled', async () => {
  delete process.env.V3_ACCESS_MODE;
  const response = await middleware(new Request('https://no3dtools.com/v3/'));
  assert.equal(response.headers.get('x-middleware-next'), '1');
});

test('private staging root enters the guarded V3 route while production root remains unchanged', async () => {
  delete process.env.V3_ACCESS_MODE;
  const production = await middleware(new Request('https://no3dtools.com/'));
  assert.equal(production.headers.get('x-middleware-next'), '1');

  process.env.V3_ACCESS_MODE = 'owner';
  const staging = await middleware(new Request('https://v3.no3dtools.com/'));
  assert.equal(staging.status, 307);
  assert.equal(new URL(staging.headers.get('location')).pathname, '/v3/');
});

test('middleware permits gate assets and redirects an unauthenticated V3 request', async () => {
  process.env.V3_ACCESS_MODE = 'owner';
  process.env.V3_OWNER_EMAILS = 'owner@example.com';
  const asset = await middleware(new Request('https://v3.no3dtools.com/v3/styles/v3.css'));
  assert.equal(asset.headers.get('x-middleware-next'), '1');

  globalThis.fetch = async () => Response.json({ authenticated: false });
  const response = await middleware(new Request('https://v3.no3dtools.com/v3/product/?handle=bolt'));
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get('location'));
  assert.equal(location.pathname, '/v3/access/');
  assert.equal(location.searchParams.get('access'), 'required');
  assert.equal(location.searchParams.get('next'), '/v3/product/?handle=bolt');
});

test('middleware admits only the authenticated owner', async () => {
  process.env.V3_ACCESS_MODE = 'owner';
  process.env.V3_OWNER_EMAILS = 'owner@example.com';
  globalThis.fetch = async () => Response.json({ authenticated: true, email: 'owner@example.com' });
  const owner = await middleware(new Request('https://v3.no3dtools.com/v3/account/'));
  assert.equal(owner.headers.get('x-middleware-next'), '1');

  globalThis.fetch = async () => Response.json({ authenticated: true, email: 'other@example.com' });
  const denied = await middleware(new Request('https://v3.no3dtools.com/v3/account/'));
  assert.equal(new URL(denied.headers.get('location')).searchParams.get('access'), 'denied');
});

test('middleware preserves blog social previews alongside the V3 gate', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'public-test-key';
  globalThis.fetch = async () => Response.json([{
    title: '<Future & Old School>',
    excerpt: 'A V3 field note.',
    featured_image: 'https://no3dtools.com/assets/og-default.png',
  }]);

  const response = await middleware(new Request('https://no3dtools.com/blog/v3-field-note', {
    headers: { 'user-agent': 'Slackbot-LinkExpanding 1.0' },
  }));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /&lt;Future &amp; Old School&gt;/);
  assert.match(html, /og:title/);
});
