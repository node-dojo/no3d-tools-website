import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket } from '../api/lib/r2.js';

const directory = process.argv[2];
assert.ok(directory, 'Supply the private directory containing the verified ZIP packages');
const live = new URL(process.env.SITE_URL).hostname === 'no3dtools.com';
assert.ok(process.argv.includes('--apply'), 'Use --apply to publish verified private assets');
assert.ok(!live || process.argv.includes('--confirm-live'), 'Live storage requires --confirm-live');
const deliveries = JSON.parse(await readFile(new URL('../api/prints/lib/delivery.json', import.meta.url)));
const client = getR2Client();
const Bucket = getR2Bucket();
for (const product of deliveries) {
  const bytes = await readFile(join(directory, product.filename));
  assert.equal(bytes.length, product.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), product.checksum);
  let existing;
  try { existing = await client.send(new HeadObjectCommand({ Bucket, Key: product.file_url })); }
  catch (error) { if (error.$metadata?.httpStatusCode !== 404) throw Error('Storage preflight failed'); }
  if (existing) {
    assert.equal(existing.ContentLength, product.bytes);
    assert.equal(existing.Metadata?.sha256, product.checksum);
  } else {
    await client.send(new PutObjectCommand({ Bucket, Key: product.file_url, Body: bytes,
      ContentType: 'application/zip', ContentDisposition: `attachment; filename="${product.filename}"`,
      CacheControl: 'private, no-store', Metadata: { sha256: product.checksum } }));
  }
  const stored = await client.send(new GetObjectCommand({ Bucket, Key: product.file_url }));
  const hash = createHash('sha256');
  let count = 0;
  for await (const chunk of stored.Body) { hash.update(chunk); count += chunk.length; }
  assert.equal(count, product.bytes);
  assert.equal(hash.digest('hex'), product.checksum);
  console.log(JSON.stringify({ handle: product.handle, environment: live ? 'production' : 'staging', uploaded: !existing, verifiedBytes: count, checksum: product.checksum }));
}
