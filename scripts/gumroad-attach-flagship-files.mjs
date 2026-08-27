#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const apply = process.argv.includes('--apply');
const libraryRoot = process.env.NO3D_GUMROAD_LIBRARY_ROOT
  || '/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/solvet-global/no3d-tools-library/library';
const catalogUrl = process.env.NO3D_CATALOG_URL || 'https://no3dtools.com/api/products?limit=100';

function gumroad(args) {
  return JSON.parse(execFileSync('gumroad', [...args, '--json', '--no-input', '--quiet'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }));
}

async function mutate(args) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      gumroad([...args, '--dry-run']);
      if (!apply) return null;
      const result = gumroad(args);
      await delay(1200);
      return result;
    } catch (error) {
      const output = String(error?.stdout || error?.message || '');
      if (!output.includes('rate_limited') || attempt === 5) throw error;
      await delay(15000);
    }
  }
}

function canonicalArtifacts() {
  const found = new Map();
  for (const entry of readdirSync(libraryRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(libraryRoot, entry.name);
    for (const filename of readdirSync(directory).filter(name => name.endsWith('.json'))) {
      try {
        const product = JSON.parse(readFileSync(path.join(directory, filename), 'utf8'));
        if (!product.handle) continue;
        const blendName = product.metafields?.find(field => field.namespace === 'no3d_tools' && field.key === 'blend_file')?.value;
        const blendPath = blendName ? path.join(directory, blendName) : '';
        const candidate = {
          blendName,
          blendPath,
          exists: Boolean(blendPath && existsSync(blendPath)),
        };
        const current = found.get(product.handle);
        if (!current?.exists || candidate.exists) found.set(product.handle, candidate);
      } catch {}
    }
  }
  return found;
}

async function allGumroadProducts() {
  const configPath = path.join(homedir(), '.config/gumroad/config.json');
  const { access_token: accessToken } = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!accessToken) throw new Error('Gumroad CLI session is missing an access token');
  let url = 'https://api.gumroad.com/v2/products';
  const products = [];
  while (url) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Gumroad product inventory failed: ${response.status}`);
    const payload = await response.json();
    products.push(...(payload.products || []));
    url = payload.next_page_url ? new URL(payload.next_page_url, 'https://api.gumroad.com').href : '';
    if (url) await delay(200);
  }
  return { products, accessToken };
}

async function productDetail(id, accessToken) {
  const response = await fetch(`https://api.gumroad.com/v2/products/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Gumroad product ${id} failed: ${response.status}`);
  return (await response.json()).product;
}

const catalogResponse = await fetch(catalogUrl, { headers: { 'user-agent': 'NO3D-Gumroad-attachment-sync/1.0' } });
if (!catalogResponse.ok) throw new Error(`Catalog request failed: ${catalogResponse.status}`);
const catalogPayload = await catalogResponse.json();
const catalog = Array.isArray(catalogPayload) ? catalogPayload : catalogPayload.products;
const flagships = catalog.filter(product => product.release_status !== 'archived' && product.presentation?.mode === 'flagship');
const canonical = canonicalArtifacts();
const { products: gumroadProducts, accessToken } = await allGumroadProducts();
const byPermalink = new Map(gumroadProducts.filter(product => product.custom_permalink).map(product => [product.custom_permalink, product]));
const byName = new Map(gumroadProducts.map(product => [String(product.name || '').toLowerCase(), product]));
const actions = [];

for (const product of flagships) {
  const gumroadProduct = byPermalink.get(product.handle) || byName.get(String(product.title || '').toLowerCase());
  const artifact = canonical.get(product.handle);
  if (!gumroadProduct) {
    actions.push({ handle: product.handle, name: product.title, action: 'missing_gumroad_product' });
    continue;
  }
  if (!artifact?.exists) {
    actions.push({ handle: product.handle, name: product.title, gumroadId: gumroadProduct.id, action: 'missing_canonical_blend' });
    continue;
  }

  const detail = await productDetail(gumroadProduct.id, accessToken);
  const existingFiles = detail.files || [];
  if (existingFiles.length) {
    actions.push({
      handle: product.handle,
      name: product.title,
      gumroadId: gumroadProduct.id,
      action: existingFiles.some(file => file.name === path.parse(artifact.blendName).name || file.name === artifact.blendName)
        ? 'already_attached'
        : 'existing_file_conflict',
      files: existingFiles.map(file => file.name),
    });
    continue;
  }

  const bytes = statSync(artifact.blendPath).size;
  const sha256 = createHash('sha256').update(readFileSync(artifact.blendPath)).digest('hex');
  actions.push({
    handle: product.handle,
    name: product.title,
    gumroadId: gumroadProduct.id,
    action: apply ? 'attach' : 'would_attach',
    filename: artifact.blendName,
    bytes,
    sha256,
  });
  await mutate([
    'products', 'update', gumroadProduct.id,
    '--file', artifact.blendPath,
    '--file-name', artifact.blendName,
  ]);
  if (apply) console.error(JSON.stringify({ attached: product.handle, filename: artifact.blendName, bytes }));
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry_run',
  flagshipCount: flagships.length,
  gumroadProductCount: gumroadProducts.length,
  attachCount: actions.filter(action => action.action === (apply ? 'attach' : 'would_attach')).length,
  actions,
}, null, 2));
