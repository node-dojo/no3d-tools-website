import assert from 'node:assert/strict';
import test from 'node:test';
import { landingHandle, printLandingProduct } from '../v3/js/product-landing-model.js';
import { productPreviewResponse } from '../api/lib/product-preview.js';
import { publicPage, publicProperties } from '../v3/js/analytics-contract.js';
import { resetNext } from '../api/auth/lib/password-reset.js';
import { routeKind } from '../middleware.js';

test('campaign URLs resolve one exact product and preserve the native auth return', () => {
  for (const handle of ['mace-and-chain', 'spike-planter-01', 'chrome-crayon']) {
    assert.equal(landingHandle(`/p/${handle}?utm_source=email&private_token=hidden`), handle);
    assert.equal(resetNext(`/p/${handle}`), `/p/${handle}`);
    assert.equal(routeKind(`/p/${handle}`), 'v3');
  }
  for (const path of ['/p/', '/p/mace-and-chain/extra', '/p/../api/private', '/p/a%2fb', '/v3/account/']) assert.equal(landingHandle(path), null);
  for (const path of ['/p/../api/private', '/p/mace-and-chain?token=secret', '//evil.test/p/mace']) assert.equal(resetNext(path), '/v3/account/');
});

test('print pages reuse the authored description, file list, and expanded photography', () => {
  const mace = printLandingProduct('mace-and-chain');
  assert.equal(mace.title, 'Mace and Chain Lighter Keeper');
  assert.deepEqual(mace.included, ['111 mm Mace (.stl)', 'Big Chain (.stl)', 'Lighter Holding Haft (.stl)']);
  assert.equal(mace.format, 'STL');
  assert.equal(printLandingProduct('spike-planter-01').format, 'STL + Bambu Studio 3MF');
  assert.equal(mace.media.length, 5);
  assert.equal(mace.media[0].src, '/v3/assets/prints/mace-chain-background-v2.png');
  assert.equal(mace.media[2].type, 'video');
  assert.ok(mace.paragraphs[0].includes('An innovation in anti-theft decoration!'));
  assert.ok(printLandingProduct('spike-planter-01').notes.some(text => text.includes('142 mm')));
  assert.equal(printLandingProduct('not-a-print'), null);
});

test('campaign share previews identify the print without fetching a Blender product or leaking query state', async () => {
  const response = await productPreviewResponse(new Request('https://staging.no3dtools.com/p/mace-and-chain?email=private@example.test'), { fetcher: () => { throw Error('Unexpected catalog fetch'); } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /property="og:title" content="Mace and Chain Lighter Keeper"/);
  assert.match(html, /https:\/\/no3dtools.com\/p\/mace-and-chain/);
  assert.match(html, /mace-chain-background-v2.png/);
  assert.doesNotMatch(html, /private@example|staging.no3dtools|email=/);
});

test('campaign tool previews use the existing catalog and fail closed on unknown products', async () => {
  const request = new Request('https://no3dtools.com/p/chrome-crayon');
  const response = await productPreviewResponse(request, { fetcher: async () => Response.json({ product: { handle: 'chrome-crayon', title: 'Chrome Crayon' } }) });
  assert.match(await response.text(), /https:\/\/no3dtools.com\/p\/chrome-crayon/);
  assert.equal((await productPreviewResponse(request, { fetcher: async () => new Response('', { status: 404 }) })).status, 404);
});

test('landing analytics preserve product identity without email or arbitrary campaign query values', () => {
  assert.equal(publicPage('https://no3dtools.com/p/mace-and-chain/?email=person@example.test&utm_campaign=private'), '/p/mace-and-chain');
  assert.deepEqual(publicProperties({ handle: 'mace-and-chain', source: 'product_landing', email: 'person@example.test' }), { handle: 'mace-and-chain', source: 'product_landing' });
});
