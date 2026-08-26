import assert from 'node:assert/strict';
import test from 'node:test';

import { acceptanceBaseUrl } from '../scripts/lib/v3-acceptance-target.mjs';

test('mutable acceptance requires an explicit target', () => {
  assert.throws(() => acceptanceBaseUrl({}), /NO3D_V3_ACCEPTANCE_URL is required/);
});

test('mutable acceptance refuses every public NO3D host', () => {
  for (const host of ['no3dtools.com', 'www.no3dtools.com', 'v3.no3dtools.com']) {
    assert.throws(
      () => acceptanceBaseUrl({ NO3D_V3_ACCEPTANCE_URL: `https://${host}` }),
      /Refusing to run mutable acceptance against public host/,
    );
  }
});

test('mutable acceptance accepts an explicit local or staging target', () => {
  assert.equal(
    acceptanceBaseUrl({ NO3D_V3_ACCEPTANCE_URL: 'http://127.0.0.1:3417/' }),
    'http://127.0.0.1:3417',
  );
  assert.equal(
    acceptanceBaseUrl({ NO3D_V3_ACCEPTANCE_URL: 'https://staging.example.test/' }),
    'https://staging.example.test',
  );
});
