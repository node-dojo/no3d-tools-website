/**
 * Retired-behaviour guard.
 *
 * License keys are an artifact of the previous add-on and site version. The
 * current add-on connects a customer account; there is no key to enter. These
 * AI-facing files are read by assistants that then instruct visitors, so stale
 * key instructions here become real support load.
 *
 * The retired/current split is declared in
 * docs/deployment/current-vs-retired.json - update that manifest first when the
 * customer journey changes again.
 *
 * Commercial-use licence TERMS are not affected and must remain.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const load = (path) => readFile(new URL(path, root), 'utf8');

const RETIRED_KEY_FLOW = [
  /license key/i,
  /NO3D-XXXX/i,
  /Your License Key/i,
  /Enter Your License Key/i,
];

// Statements that explicitly deny the retired flow are allowed.
const ALLOWED_NEGATIONS = [
  /no license keys? to enter/i,
  /not a license key/i,
  /there is no key to reissue/i,
];

const appearsStale = (text, pattern) =>
  RETIRED_KEY_FLOW.some((rule) => rule.test(text)) &&
  !ALLOWED_NEGATIONS.some((allowed) => allowed.test(text));

test('AI-facing docs do not instruct visitors to use license keys', async () => {
  for (const file of ['llms.txt', 'llms-full.txt']) {
    const text = await load(file);
    for (const line of text.split('\n')) {
      assert.ok(
        !appearsStale(line, null),
        `${file} still describes the retired license key flow: ${line.trim()}`,
      );
    }
  }
});

test('AI-facing docs describe the current account-based access model', async () => {
  const llms = await load('llms.txt');
  assert.match(llms, /sign in with your account/i);
  assert.match(llms, /no license keys to enter/i);

  const full = await load('llms-full.txt');
  assert.match(full, /Connect Account/i);
  assert.doesNotMatch(full, /## Enter Your License Key/i);
});

test('commercial use licence terms are preserved', async () => {
  const full = await load('llms-full.txt');
  assert.ok(
    full.split('\n').filter((line) => line.trim() === '## License').length >= 20,
    'per-product commercial licence sections must not be removed',
  );
  assert.match(full, /Commercial use license included/i);
});

test('the current-vs-retired manifest exists and names the V3 journey', async () => {
  const manifest = JSON.parse(
    await load('docs/deployment/current-vs-retired.json'),
  );
  assert.equal(manifest.current.journey, 'V3');
  assert.equal(manifest.retired.licenseKeyEntry.status, 'retired');
  assert.ok(manifest.current.customerRoutes.includes('/v3/account/'));
});

test('every retired legacy endpoint named in the manifest still exists', async () => {
  const manifest = JSON.parse(
    await load('docs/deployment/current-vs-retired.json'),
  );
  // Guards the manifest against drifting from reality in either direction.
  for (const file of manifest.retired.legacyEndpoints.files) {
    const text = await load(file);
    assert.ok(text.length > 0, `${file} listed as retired but not found`);
  }
});
