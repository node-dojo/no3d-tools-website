import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeAnalyticsPage,
  sanitizeAnalyticsProperties,
  sanitizeAnalyticsReferrer,
} from '../api/lib/analytics.js';

test('analytics keeps useful route context while removing secrets and click identifiers', () => {
  assert.equal(
    sanitizeAnalyticsPage('/v3/product/?handle=dojo-calipers&utm_source=instagram&code=secret&session_id=checkout'),
    '/v3/product/?handle=dojo-calipers',
  );
  assert.equal(
    sanitizeAnalyticsPage('/v3/account/?state=connect&code=one-time-blender-code&auth=signed-in'),
    '/v3/account/?state=connect&auth=signed-in',
  );
  assert.equal(
    sanitizeAnalyticsPage('/v3/onboarding/create-account/?next=%2Fv3%2Faccount%2Forders%2Fprivate-order'),
    '/v3/onboarding/create-account/',
  );
});

test('analytics strips all external referrer queries and sanitizes internal ones', () => {
  assert.equal(
    sanitizeAnalyticsReferrer('https://www.google.com/search?q=private+query&gclid=click'),
    'https://www.google.com/search',
  );
  assert.equal(
    sanitizeAnalyticsReferrer('https://no3dtools.com/v3/product/?handle=dojo-calipers&token=secret'),
    'https://no3dtools.com/v3/product/?handle=dojo-calipers',
  );
});

test('analytics properties reject credential-like keys and complex payloads', () => {
  assert.deepEqual(sanitizeAnalyticsProperties({
    handle: 'dojo-calipers',
    source: 'product',
    session_id: 'secret',
    email: 'person@example.com',
    nested: { token: 'secret' },
  }), { handle: 'dojo-calipers', source: 'product' });
});
