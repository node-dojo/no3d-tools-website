import assert from 'node:assert/strict';
import test from 'node:test';
import checkout from '../api/commerce/checkout.js';
import { getPrintDelivery } from '../api/prints/lib/catalog.js';
import { accountFileView } from '../v3/js/account-library.js';

test('Prints checkout uses the existing Commerce order boundary and ignores browser pricing', async () => {
  const keys = ['COMMERCE_API_URL', 'COMMERCE_SITE_BACKEND_SECRET', 'COMMERCE_SITE_KEY', 'COMMERCE_INDIVIDUAL_PRODUCTS_ENABLED'];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const oldFetch = globalThis.fetch;
  Object.assign(process.env, { COMMERCE_API_URL: 'https://commerce.example.test', COMMERCE_SITE_BACKEND_SECRET: 'fixture-only', COMMERCE_SITE_KEY: 'no3dtools', COMMERCE_INDIVIDUAL_PRODUCTS_ENABLED: 'true' });
  let called = 0;
  globalThis.fetch = async (url, options) => {
    called++;
    assert.equal(url, 'https://commerce.example.test/api/checkout');
    assert.deepEqual(JSON.parse(options.body), { attemptToken: 'fixture-attempt-12345', offerKey: 'no3dtools.product.mace-and-chain', returnTarget: 'product' });
    assert.ok(options.headers['X-NO3D-Guest-Token']);
    assert.equal(options.headers['X-NO3D-Identity'], undefined);
    return new Response(JSON.stringify({ checkoutUrl: 'https://checkout.stripe.com/c/pay/fixture', orderId: 'fixture-order' }), { status: 200 });
  };
  try {
    const res = { headers: {}, getHeader(k) { return this.headers[k]; }, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await checkout({ method: 'POST', headers: { 'x-no3d-identity': 'forged' }, body: { attemptToken: 'fixture-attempt-12345', handle: 'mace-and-chain', price: 0, checkoutUrl: 'https://gumroad.com/checkout', file_url: 'other.zip' } }, res);
    assert.equal(res.code, 200);
    assert.equal(called, 1);
    assert.equal(res.body.orderId, 'fixture-order');
    assert.equal(new URL(res.body.checkoutUrl).hostname, 'checkout.stripe.com');
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys) if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
  }
});

test('Prints account files use ZIP delivery, preserve purchase recovery, and never offer Blender installation', () => {
  const product = { productType: 'Prints', workbench: { filename: 'spike-planter-01.zip', folder: 'Prints' } };
  const member = accountFileView({ handle: 'spike-planter-01', owned: true, membership: true }, product);
  assert.equal(member.filename, 'spike-planter-01.zip');
  assert.equal(member.sync, 'Manual');
  assert.equal(member.action.href, '/api/prints/download?handle=spike-planter-01');
  const owned = accountFileView({ handle: 'spike-planter-01', owned: true, permanent: true, orderId: 'paid-order' }, product);
  assert.equal(owned.action.href, '/api/commerce/download/paid-order');
  const refunded = accountFileView({ handle: 'spike-planter-01', owned: false, paymentStatus: 'refunded', orderId: 'paid-order' }, product);
  assert.equal(refunded.action.href, '/v3/prints/?product=spike-planter-01&details=1');
  assert.equal(getPrintDelivery('spikey-chain-and-mace'), null);
  assert.equal(getPrintDelivery('__proto__'), null);
  assert.equal(getPrintDelivery(['mace-and-chain']), null);
});
