#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Bucket, getR2Client } from '../api/lib/r2.js';

const EXTENSION_ID = 'no3d_tools';
const EXTENSION_PREFIX = 'no3d-tools-library/extensions/';
const INDEX_KEY = `${EXTENSION_PREFIX}index.json`;
const PUBLIC_INDEX = 'https://no3dtools.com/extensions/index.json';
const VERSIONED_ARCHIVE = /^no3d_tools-(\d+\.\d+\.\d+)\.zip$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const archiveArg = process.argv[2];
const publish = process.argv.includes('--publish');
if (!archiveArg) {
  fail('Usage: npm run r2:publish-extension -- /absolute/path/to/archive.zip [--publish]');
}

const archivePath = path.resolve(archiveArg);
const filename = path.basename(archivePath);
const match = filename.match(VERSIONED_ARCHIVE);
if (!match) {
  fail(`Archive must be named no3d_tools-X.Y.Z.zip; got ${filename}`);
}

const version = match[1];
const archive = await readFile(archivePath);
const archiveHash = `sha256:${createHash('sha256').update(archive).digest('hex')}`;
const archiveKey = `${EXTENSION_PREFIX}${filename}`;
const archiveUrl = `https://no3dtools.com/extensions/dl/${filename}`;

const indexResponse = await fetch(`${PUBLIC_INDEX}?release-source=${Date.now()}`, {
  headers: { 'cache-control': 'no-cache' },
});
if (!indexResponse.ok) {
  fail(`Could not read current extension index (${indexResponse.status})`);
}
const currentIndex = await indexResponse.json();
const entries = Array.isArray(currentIndex.data) ? currentIndex.data : [];
const previous = entries.find((entry) => entry.id === EXTENSION_ID)
  || (entries.length === 1 ? entries[0] : null);
if (!previous) {
  fail(`Current extension index has no unambiguous source entry for ${EXTENSION_ID}`);
}

const nextEntry = {
  ...previous,
  id: EXTENSION_ID,
  version,
  archive_url: archiveUrl,
  archive_size: archive.byteLength,
  archive_hash: archiveHash,
};
const nextIndex = {
  version: currentIndex.version || 'v1',
  blocklist: Array.isArray(currentIndex.blocklist) ? currentIndex.blocklist : [],
  data: [nextEntry],
};
const serializedIndex = `${JSON.stringify(nextIndex, null, 2)}\n`;

console.log(`Extension: ${EXTENSION_ID} ${version}`);
console.log(`Archive: ${filename} (${archive.byteLength} bytes)`);
console.log(`Hash: ${archiveHash}`);
if (!publish) {
  console.log('Dry run only. Re-run with --publish to upload the archive and index.');
  process.exit(0);
}

const client = getR2Client();
const bucket = getR2Bucket();
await client.send(new PutObjectCommand({
  Bucket: bucket,
  Key: archiveKey,
  Body: archive,
  ContentType: 'application/zip',
  CacheControl: 'public, max-age=31536000, immutable',
}));
const uploaded = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: archiveKey }));
if (Number(uploaded.ContentLength) !== archive.byteLength) {
  fail(`Uploaded archive size mismatch: expected ${archive.byteLength}, got ${uploaded.ContentLength}`);
}

await client.send(new PutObjectCommand({
  Bucket: bucket,
  Key: INDEX_KEY,
  Body: serializedIndex,
  ContentType: 'application/json; charset=utf-8',
  CacheControl: 'no-cache',
}));

console.log(`Published ${archiveUrl}`);
console.log(`Published ${PUBLIC_INDEX}`);
