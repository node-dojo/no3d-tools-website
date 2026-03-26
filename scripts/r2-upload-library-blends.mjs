#!/usr/bin/env node
/**
 * Upload .blend files from no3d-tools-library to Cloudflare R2, update Supabase products.file_url + checksum,
 * and publish manifest.json (version + per-asset checksums).
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_ENDPOINT, R2_ACCESS_KEY_ID,
 *           R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *
 * Usage (from no3d-tools-website/):
 *   doppler run -- npm run r2:upload -- --library ../../no3d-tools-library
 *   node scripts/r2-upload-library-blends.mjs --library /path/to/no3d-tools-library --dry-run
 *
 * Options:
 *   --library <path>   Path to no3d-tools-library root, or a single product folder (default: ../../no3d-tools-library from script)
 *   --prefix <keyPrefix>  R2 key prefix (default: no3d-tools-library)
 *   --version <semver>    manifest.version (default: NO3D_LIBRARY_VERSION or 0.0.0)
 *   --dry-run
 */

import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const quiet = { quiet: true };
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), ...quiet });
  dotenv.config({ path: path.resolve(__dirname, '../.env'), ...quiet });
}

function parseArgs(argv) {
  const out = {
    library: null,
    prefix: 'no3d-tools-library',
    version: process.env.NO3D_LIBRARY_VERSION || '0.0.0',
    dryRun: false
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--library') out.library = argv[++i];
    else if (a === '--prefix') out.prefix = argv[++i];
    else if (a === '--version') out.version = argv[++i];
  }
  return out;
}

function getR2Client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2_ENDPOINT, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY');
  }
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true
  });
}

async function readHandleFromProductJson(dir) {
  const names = await readdir(dir);
  const jsonFiles = names.filter(
    (f) => f.endsWith('.json') && !f.startsWith('.') && f !== 'package.json' && f !== 'package-lock.json'
  );
  for (const f of jsonFiles) {
    const p = path.join(dir, f);
    try {
      const raw = await readFile(p, 'utf8');
      const j = JSON.parse(raw);
      if (j && typeof j.handle === 'string' && j.handle.trim()) {
        return { handle: j.handle.trim(), jsonBase: path.basename(f, '.json') };
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

async function pickBlendFile(dir, jsonBase) {
  const names = await readdir(dir);
  const blends = names.filter((f) => f.endsWith('.blend'));
  if (blends.length === 0) return null;
  const exact = `${jsonBase}.blend`;
  if (blends.includes(exact)) return exact;
  const byHandleLike = blends.find((b) => b.toLowerCase().includes(jsonBase.toLowerCase().slice(0, 8)));
  if (byHandleLike) return byHandleLike;
  return blends[0];
}

async function sha256File(filePath) {
  const buf = await readFile(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);
  const defaultLibrary = path.resolve(__dirname, '../../no3d-tools-library');
  const libraryRoot = args.library || defaultLibrary;

  const bucket = process.env.R2_BUCKET_NAME;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`Library root: ${libraryRoot}`);
  console.log(`R2 prefix: ${args.prefix}/`);
  console.log(`Manifest version: ${args.version}`);

  const st = await stat(libraryRoot).catch(() => null);
  if (!st || !st.isDirectory()) {
    console.error(`Not a directory: ${libraryRoot}`);
    process.exit(1);
  }

  const isSingleProductRoot = Boolean(await readHandleFromProductJson(libraryRoot));

  /** @type {{ path: string, label: string }[]} */
  let productDirs;
  if (isSingleProductRoot) {
    productDirs = [{ path: libraryRoot, label: path.basename(libraryRoot) }];
  } else {
    const entries = await readdir(libraryRoot, { withFileTypes: true });
    productDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => ({ path: path.join(libraryRoot, e.name), label: e.name }));
  }

  const assets = [];
  let client = null;
  if (!args.dryRun) {
    if (!bucket) throw new Error('R2_BUCKET_NAME required');
    client = getR2Client();
    if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }

  const supabase =
    supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  for (const { path: dir, label } of productDirs) {
    const meta = await readHandleFromProductJson(dir);
    if (!meta) {
      console.warn(`Skip (no product JSON with handle): ${label}`);
      continue;
    }
    const blendName = await pickBlendFile(dir, meta.jsonBase);
    if (!blendName) {
      console.warn(`Skip (no .blend): ${label} (${meta.handle})`);
      continue;
    }
    const blendPath = path.join(dir, blendName);
    const checksum = args.dryRun ? 'dry-run' : await sha256File(blendPath);
    const normalizedPrefix = args.prefix.replace(/\/$/, '');
    const objectKey = `${normalizedPrefix}/${meta.handle}.blend`;

    console.log(`${meta.handle} <- ${blendName} -> ${objectKey}`);

    if (!args.dryRun && client && bucket) {
      const body = await readFile(blendPath);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: body,
          ContentType: 'application/octet-stream'
        })
      );
    }

    if (!args.dryRun && supabase) {
      const { error } = await supabase
        .from('products')
        .update({
          file_url: objectKey,
          checksum,
          updated_at: new Date().toISOString()
        })
        .eq('handle', meta.handle);

      if (error) {
        console.error(`Supabase update failed for ${meta.handle}:`, error.message);
      }
    }

    assets.push({
      handle: meta.handle,
      key: objectKey,
      checksum_sha256: checksum
    });
  }

  const manifest = {
    version: args.version,
    generated_at: new Date().toISOString(),
    assets: assets.sort((a, b) => a.handle.localeCompare(b.handle))
  };

  const manifestKey = `${args.prefix.replace(/\/$/, '')}/manifest.json`;
  const manifestBody = JSON.stringify(manifest, null, 2);

  if (args.dryRun) {
    console.log('\n[dry-run] manifest would be written to', manifestKey);
    console.log(manifestBody.slice(0, 500) + (manifestBody.length > 500 ? '\n...' : ''));
    return;
  }

  if (!client || !bucket) throw new Error('R2 client not initialized');

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: manifestKey,
      Body: manifestBody,
      ContentType: 'application/json; charset=utf-8'
    })
  );

  console.log(`\nUploaded manifest: ${manifestKey} (${assets.length} assets)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
