import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrintHandler } from '../api/prints/lib/access.js';

const handle = 'spike-planter-01';
const verified = { user: { id: 'test-member', email: 'MEMBER@example.test', email_confirmed_at: '2026-01-01' } };
const fullLibrary = { key: 'no3dtools.membership.full-library', scopeType: 'solvet_collection', scopeId: 'no3dtools.membership.full-library', status: 'active' };
function fixture(overrides = {}) {
  const signed = [];
  const dependencies = {
    authenticate: async () => verified,
    subscription: async email => { assert.equal(email, 'member@example.test'); return null; },
    account: async () => ({ entitlements: [], products: [] }),
    product: async value => ({ handle: value, status: 'active', file_url: 'private/planter.zip', checksum: 'test-checksum' }),
    deliveryReady: () => true,
    sign: async (key, ttl) => { signed.push({ key, ttl }); return 'https://download.example.test/signed'; },
    now: () => new Date('2026-10-28T12:00:00Z'),
    ...overrides,
  };
  return { dependencies, signed };
}
async function invoke(dependencies, { download = false, slug = handle, method = 'GET', query = {} } = {}) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  await createPrintHandler({ download, dependencies })({ method, query: { handle: slug, ...query }, headers: {} }, res);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  return res;
}

test('guests get the fixed product checkout and cannot download or forge membership', async () => {
  const f = fixture({ authenticate: async () => null, product: async () => assert.fail('Guest must not inspect private assets') });
  const access = await invoke(f.dependencies, { query: { member: 'true', price: '0', file_url: 'private/other.zip' } });
  assert.deepEqual(access.body, { handle, authenticated: false, mode: 'purchase', checkoutUrl: 'https://nodedojo.gumroad.com/l/spike-planter-01?wanted=true' });
  assert.equal((await invoke(f.dependencies, { download: true })).code, 403);
  assert.deepEqual(f.signed, []);
});

test('active paid legacy membership skips checkout; only download request signs the private asset', async () => {
  const f = fixture({ subscription: async () => ({ tier: 'subscriber', status: 'active' }), account: async () => assert.fail('Legacy membership is already authoritative') });
  const access = await invoke(f.dependencies);
  assert.deepEqual(access.body, { handle, authenticated: true, entitlement: 'member', mode: 'download' });
  assert.deepEqual(f.signed, []);
  const download = await invoke(f.dependencies, { download: true });
  assert.equal(download.code, 200);
  assert.deepEqual(f.signed, [{ key: 'private/planter.zip', ttl: 900 }]);
  assert.equal(JSON.stringify(access.body).includes('private/'), false);
});

test('full-library scope grants Prints but Chrome and revoked or future scopes do not', async () => {
  for (const [entitlement, expected] of [
    [fullLibrary, 'download'],
    [{ ...fullLibrary, key: 'no3dtools.membership.no3d-chrome', scopeId: 'no3dtools.membership.no3d-chrome' }, 'purchase'],
    [{ ...fullLibrary, status: 'revoked' }, 'purchase'],
    [{ ...fullLibrary, endsAt: '2026-10-27T12:00:00Z' }, 'purchase'],
    [{ ...fullLibrary, startsAt: '2026-10-29T12:00:00Z' }, 'purchase'],
    [{ ...fullLibrary, scopeId: null }, 'purchase'],
  ]) {
    const f = fixture({ account: async () => ({ entitlements: [entitlement], products: [] }) });
    assert.equal((await invoke(f.dependencies)).body.mode, expected);
  }
});

test('owners download; refunded, unfulfilled and wrong-product orders do not grant access', async () => {
  const purchased = { handle, owned: true, permanent: true, entitlementStatus: 'active', fulfillmentStatus: 'fulfilled', paymentStatus: 'paid' };
  for (const [order, expected] of [
    [purchased, 'download'],
    [{ ...purchased, paymentStatus: 'refunded' }, 'purchase'],
    [{ ...purchased, entitlementStatus: 'revoked' }, 'purchase'],
    [{ ...purchased, fulfillmentStatus: 'pending' }, 'purchase'],
    [{ ...purchased, handle: 'spikey-chain-and-mace' }, 'purchase'],
  ]) {
    const f = fixture({ account: async () => ({ entitlements: [], products: [order] }) });
    assert.equal((await invoke(f.dependencies)).body.mode, expected);
  }
});

test('revocation between access check and download is enforced', async () => {
  let active = true;
  const f = fixture({ subscription: async () => ({ tier: 'subscriber', status: active ? 'active' : 'expired' }) });
  assert.equal((await invoke(f.dependencies)).body.mode, 'download');
  active = false;
  assert.equal((await invoke(f.dependencies, { download: true })).code, 403);
  assert.deepEqual(f.signed, []);
});

test('missing, retired or mismatched delivery blocks members without a checkout fallback', async () => {
  for (const product of [null, { handle, status: 'draft', file_url: 'private/planter.zip' }, { handle: 'wrong-product', status: 'active', file_url: 'private/other.zip' }, { handle, status: 'active', file_url: '' }]) {
    const f = fixture({ subscription: async () => ({ tier: 'subscriber', status: 'active' }), product: async () => product });
    const access = await invoke(f.dependencies);
    assert.equal(access.body.mode, 'unavailable');
    assert.equal(access.body.entitlement, 'member');
    assert.equal(access.body.checkoutUrl, undefined);
    assert.equal((await invoke(f.dependencies, { download: true })).code, 503);
    assert.deepEqual(f.signed, []);
  }
});

test('lookup failures fail closed; unverified email and free subscriptions cannot grant access', async () => {
  const f = fixture({ account: async () => { throw new Error('upstream details must remain private'); } });
  assert.deepEqual((await invoke(f.dependencies)).body, { error: 'print_access_unavailable' });
  const unverified = fixture({ authenticate: async () => ({ user: { ...verified.user, email_confirmed_at: null } }) });
  assert.equal((await invoke(unverified.dependencies, { download: true })).code, 403);
  const free = fixture({ subscription: async () => ({ tier: 'free', status: 'active' }) });
  assert.equal((await invoke(free.dependencies, { download: true })).code, 403);
});

test('only known print handles and GET are accepted', async () => {
  const f = fixture({ authenticate: async () => assert.fail('Must reject before auth') });
  for (const slug of ['spikey-chain-and-mace', '../products', '__proto__', ['spike-planter-01']]) assert.equal((await invoke(f.dependencies, { slug })).code, 404);
  assert.equal((await invoke(f.dependencies, { method: 'POST' })).code, 405);
});
