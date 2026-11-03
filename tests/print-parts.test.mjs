import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { decodePreview } from '../v3/js/print-parts.js';
import { printProducts } from '../v3/data/prints/catalog.js';
const manifest = JSON.parse(await readFile(new URL('../docs/design/v3/print-preview-manifest.json', import.meta.url)));

test('every included part has a valid, reduced display mesh with recorded source provenance', async () => {
  assert.equal(manifest.length, 8);
  for (const product of printProducts) {
    assert.equal(product.previewParts.length, product.slug === 'spike-planter-01' ? 5 : 3);
    for (const part of product.previewParts) {
      const meta = manifest.find(item => item.id === part.id);
      assert.ok(meta); assert.ok(part.src.endsWith(meta.asset));
      const bytes = await readFile(new URL(`..${part.src}`, import.meta.url));
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const { positions, indices } = decodePreview(buffer);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), meta.sha256);
      assert.equal(bytes.length, meta.bytes);
      assert.equal(positions.length / 3, meta.vertices);
      assert.equal(indices.length / 3, meta.previewTriangles);
      assert.ok(meta.previewTriangles < meta.sourceTriangles);
      assert.ok(meta.bytes < 750000);
    }
  }
  assert.equal(printProducts[0].media.length, 3);
  assert.ok(!printProducts[0].media.some(item => item.src.includes('mace-detail-3')));
  assert.match(printProducts[1].previewNotes.join(' '), /3mf/);
  assert.doesNotMatch(printProducts[1].previewNotes.join(' '), /Also included:/);
  assert.deepEqual(printProducts[1].previewParts.slice(3).map(part => part.name), ['Free-standing main body', 'Free-standing screw-in drip tray']);
});

test('preview parser rejects truncated, oversized, non-finite and out-of-bounds geometry', () => {
  const buffer = new ArrayBuffer(60), view = new DataView(buffer);
  view.setUint32(0, 0x4e334450); view.setUint32(4, 3, true); view.setUint32(8, 1, true);
  new Float32Array(buffer, 12, 9).set([0,0,0,1,0,0,0,1,0]);
  new Uint32Array(buffer, 48, 3).set([0,1,2]);
  assert.equal(decodePreview(buffer).indices.length, 3);
  assert.throws(() => decodePreview(buffer.slice(0, 8)));
  assert.throws(() => decodePreview(buffer.slice(0, 59)));
  view.setUint32(4, 200001, true); assert.throws(() => decodePreview(buffer));
  view.setUint32(4, 3, true);
  view.setFloat32(12, NaN, true); assert.throws(() => decodePreview(buffer));
  view.setFloat32(12, 0, true);
  view.setUint32(48, 3, true); assert.throws(() => decodePreview(buffer));
});
