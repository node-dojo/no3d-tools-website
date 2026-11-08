import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {bookForProduct, bookNavigation, defaultBook} from '../v3/js/sketchbook/books.js';
import {printProducts} from '../v3/data/prints/catalog.js';
import {decodePoses, encodePoses} from '../v3/js/sketchbook/pose-codec.js';
import {createPrintsPreviewServer} from '../scripts/prints-preview-server.mjs';

test('only Spike Planter opts into the new book; missing and future products keep the original', () => {
  assert.equal(bookForProduct('spike-planter-01').id, 'spike-planter');
  for (const handle of [undefined, '', 'future-product', ...printProducts.filter(p=>p.slug!=='spike-planter-01').map(p=>p.slug)]) {
    assert.equal(bookForProduct(handle),defaultBook);
  }
  assert.deepEqual(bookNavigation({}),{pageStops:defaultBook.pageStops,initialProgress:defaultBook.initialProgress});
  assert.deepEqual(bookNavigation({}, {three:{manifest:'legacy.json'}}), bookNavigation({}));
  for (const pageStops of [[0, .5, .5], [0,1.1], [NaN,1], [], 'invalid']) {
    assert.throws(()=>bookNavigation({pageStops}), /navigation/);
  }
});

test('Spike package has all 27 faces, 14 ordered spreads and valid streamed poses', async () => {
  const folder=new URL('../v3/assets/sketchbook/books/spike-planter/v1/',import.meta.url);
  const manifest=JSON.parse(gunzipSync(await fs.readFile(new URL('manifest.json.gz',folder))));
  assert.equal(manifest.pageCount,27);
  assert.deepEqual(Object.keys(manifest.pageSpreads).map(Number),Array.from({length:27},(_,i)=>i));
  assert.deepEqual([...new Set(Object.values(manifest.pageSpreads))],Array.from({length:14},(_,i)=>i+1));
  const art=manifest.parts.filter(p=>p.material.artwork);
  assert.equal(art.length,14);
  assert.equal(new Set(art.map(p=>p.material.texture)).size,14);
  assert.equal(bookNavigation(manifest).initialProgress,.1);
  assert.equal(manifest.pageStops[0],0);
  assert.equal(manifest.pageStops.at(-1),1);
  for (const part of manifest.parts) {
    assert.equal(part.uv.length,part.vertexCount*2);
    assert.ok(part.uv.every(Number.isFinite));
    assert.ok(part.indices.every(i=>Number.isInteger(i)&&i>=0&&i<part.vertexCount));
    assert.ok([...part.min,...part.span].every(Number.isFinite));
    if(part.material.texture) assert.ok((await fs.stat(new URL(part.material.texture,folder))).size>0);
  }
  assert.ok((await fs.stat(new URL('open.webp',folder))).size>0);
  for(const chunk of manifest.poseChunks.chunks){
    const bytes=gunzipSync(await fs.readFile(new URL(chunk.file,folder)));
    assert.equal(bytes.byteLength,chunk.bytes);
    const data=decodePoses(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),manifest.parts,chunk.count);
    assert.deepEqual(Buffer.from(encodePoses(data,manifest.parts,chunk.count)),bytes);
  }
  const last=manifest.poseChunks.chunks.at(-1);
  assert.equal(last.start+last.count,manifest.sampleCount);
});

test('local server serves nested compressed book assets with browser-decodable headers', async () => {
  const server=createPrintsPreviewServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    for(const descriptor of [defaultBook,bookForProduct('spike-planter-01')]){
      const response=await fetch(base+descriptor.manifest);
      assert.equal(response.status,200);
      assert.equal(response.headers.get('content-encoding'),'gzip');
      const manifest=await response.json();
      const chunk=manifest.poseChunks.chunks[0];
      const pose=await fetch(new URL(chunk.file,base+descriptor.manifest));
      assert.equal(pose.headers.get('content-encoding'),'gzip');
      assert.equal((await pose.arrayBuffer()).byteLength,chunk.bytes);
    }
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
