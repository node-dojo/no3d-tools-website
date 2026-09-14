import test from 'node:test';
import assert from 'node:assert/strict';
import { productPreviewResponse } from '../api/lib/product-preview.js';
const request = new Request('https://staging.no3dtools.com/v3/product/?handle=chrome-crayon&private_token=hidden');
const product = { handle: 'chrome-crayon', title: 'Chrome Crayon', description: '<p>Draw <strong>chrome</strong> forms.</p>', preview: 'https://cdn.example.com/crayon.png' };
const fetcher = async url => { assert.equal(String(url), 'https://staging.no3dtools.com/api/products/chrome-crayon'); return Response.json({ product }); };
test('share crawlers receive the actual product identity without private query state', async () => {
  const response = await productPreviewResponse(request, { fetcher });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /property="og:title" content="Chrome Crayon"/);
  assert.match(html, /rel="canonical" href="https:\/\/no3dtools.com\/v3\/product\/\?handle=chrome-crayon"/);
  assert.match(html, /Draw chrome forms\./);
  assert.match(html, /https:\/\/cdn.example.com\/crayon.png/);
  assert.doesNotMatch(html, /private_token|hidden|<strong>/);
  assert.equal(response.headers.get('vary'), 'User-Agent');
});
test('catalog text cannot inject markup and unsafe media URLs use the default image', async () => {
  const response = await productPreviewResponse(request, { fetcher: async () => Response.json({ product: { ...product, title: '"><script>alert(1)</script>', preview: 'javascript:alert(1)', image: 'https://user:password@example.com/image.png' } }) });
  const html = await response.text();
  assert.doesNotMatch(html, /<script>|javascript:|password@/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /assets\/og-default.png/);
});
test('missing and failed sources cannot become an indexable successful product', async () => {
  assert.equal((await productPreviewResponse(request, { fetcher: async () => new Response('', { status: 404 }) })).status, 404);
  for (const fetcher of [async () => new Response('', { status: 500 }), async () => Response.json({ product: { ...product, handle: 'different-tool' } }), async () => { throw Error('timeout'); }]) {
    const response = await productPreviewResponse(request, { fetcher });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /noindex/);
  }
});
test('crawler responses cannot become shared human-page cache entries and unrelated routes are untouched', async () => {
  const response = await productPreviewResponse(request, { fetcher });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  for (const path of ['/v3/account/', '/v3/product/?handle=../private', '/v3/product/']) assert.equal(await productPreviewResponse(new Request(`https://no3dtools.com${path}`), { fetcher: () => { throw Error('Unexpected source fetch'); } }), null);
});
