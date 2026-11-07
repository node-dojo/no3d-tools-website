// Remove the authored whole-book pitch from the existing camera-space bake.
// The page meshes, UVs, topology, slide curve and temporal samples are retained.
// Usage: node scripts/flatten-sketchbook-poses.mjs INPUT_ASSETS OUTPUT_ASSETS
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { decodePoses, encodePoses } from '../v3/js/sketchbook/pose-codec.js';

const [input, output] = process.argv.slice(2);
assert.ok(input && output && path.resolve(input) !== path.resolve(output), 'Use a separate output directory.');
const bytes = await fs.readFile(path.join(input, 'manifest.json.gz'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),
  '2c89b170f3aa260c15a30158eaabfe8c22f48ef3aa369c43360fc62fe6e1679f',
  'This correction is calibrated to the original 201-pose bake only.');
const original = JSON.parse(gunzipSync(bytes));
const manifest = structuredClone(original);
const { sampleCount, parts } = manifest;

// Verified in Procedural Notebook Sketchbook 13AUG2025.blend, v5 book.001:
// Camera.001 has an identity rotation. The bake stores camera coordinates / 1000.
const source = {
  staticPitch: 0.2840636968612671,
  openingPitch: -0.5,
  openingProgress: 0.03790322691202164,
  lastKeyframe: 99,
  lastSampleFrame: 100,
  origin: [0.00146240234375, -0.0678758544921875, -2.317232391357422]
};
const positions = parts.map(p => new Float64Array(sampleCount * p.vertexCount * 3));
for (const chunk of manifest.poseChunks.chunks) {
  const packed = await fs.readFile(path.join(input, chunk.file));
  const decoded = gunzipSync(packed);
  assert.equal(decoded.length, chunk.bytes);
  const data = decodePoses(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength), parts, chunk.count);
  let offset = 0;
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p], stride = part.vertexCount * 3, dest = positions[p];
    for (let sample = 0; sample < chunk.count; sample++) {
      const frame = chunk.start + sample;
      const progress = Math.min(1, frame / (sampleCount - 1) * source.lastSampleFrame / source.lastKeyframe);
      const theta = source.staticPitch + source.openingPitch * Math.min(1, progress / source.openingProgress);
      const c = Math.cos(theta), s = Math.sin(theta);
      for (let j = 0; j < stride; j += 3) {
        const k = offset + sample * stride + j, out = frame * stride + j;
        const x = part.min[0] + data[k] / 65535 * part.span[0];
        const y = part.min[1] + data[k + 1] / 65535 * part.span[1] - source.origin[1];
        const z = part.min[2] + data[k + 2] / 65535 * part.span[2] - source.origin[2];
        dest[out] = x;
        dest[out + 1] = c * y + s * z + source.origin[1];
        dest[out + 2] = -s * y + c * z + source.origin[2];
      }
    }
    offset += chunk.count * stride;
  }
}
let maxError = 0;
const quantized = positions.map((points, index) => {
  const part = parts[index], min = [...part.min], max = [-Infinity, -Infinity, -Infinity];
  min[1] = min[2] = Infinity;
  for (let j = 0; j < points.length; j++) {
    const axis = j % 3;
    if (axis) min[axis] = Math.min(min[axis], points[j]);
    max[axis] = Math.max(max[axis], points[j]);
  }
  const span = [part.span[0], Math.max(max[1] - min[1], 1e-8), Math.max(max[2] - min[2], 1e-8)];
  const result = new Uint16Array(points.length);
  for (let j = 0; j < points.length; j++) {
    const axis = j % 3;
    result[j] = Math.round((points[j] - min[axis]) / span[axis] * 65535);
    maxError = Math.max(maxError, Math.abs(min[axis] + result[j] / 65535 * span[axis] - points[j]));
  }
  part.min = min; part.span = span;
  return result;
});
await fs.mkdir(path.join(output, 'poses'), { recursive: true });
const chunks = [];
for (const prior of original.poseChunks.chunks) {
  const { start, count } = prior;
  const data = new Uint16Array(prior.bytes / 2);
  let offset = 0;
  for (let p = 0; p < parts.length; p++) {
    const stride = parts[p].vertexCount * 3;
    data.set(quantized[p].subarray(start * stride, (start + count) * stride), offset);
    offset += count * stride;
  }
  const encoded = encodePoses(data, parts, count);
  const decoded = decodePoses(encoded.buffer, parts, count);
  assert.deepEqual(decoded, data, 'New chunks must round-trip without loss.');
  const hash = createHash('sha256').update(encoded).digest('hex').slice(0,12);
  const file = 'poses/' + String(chunks.length).padStart(3,'0') + '.' + hash + '.bin';
  const packed = gzipSync(encoded, { level: 9 });
  await fs.writeFile(path.join(output, file), packed);
  chunks.push({ file, start, count, bytes: prior.bytes, transferBytes: packed.length });
}
manifest.poseChunks.chunks = chunks;
manifest.bookOrientation = { flat: true, sourceCorrection: source };
await fs.writeFile(path.join(output, 'manifest.json.gz'), gzipSync(JSON.stringify(manifest), { level: 9 }));
console.log(JSON.stringify({ samples: sampleCount, parts: parts.length, maxQuantizationError: maxError,
  geometryMB: chunks.reduce((sum,c) => sum + c.transferBytes, 0) / 1048576, slide: 'X unchanged at every vertex and pose' }, null, 2));

