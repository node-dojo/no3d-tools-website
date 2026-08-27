#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const apply = process.argv.includes('--apply');
const updatePublished = process.argv.includes('--update-published');
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex >= 0
  ? new Set(String(process.argv[onlyIndex + 1] || '').split(',').map(value => value.trim()).filter(Boolean))
  : null;
const sourceUrl = process.env.NO3D_CATALOG_URL || 'https://no3dtools.com/api/products?limit=100';

function gumroad(args) {
  const output = execFileSync('gumroad', [...args, '--json', '--no-input', '--quiet'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output);
}

async function mutate(args) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = gumroad(args);
      await delay(750);
      return result;
    } catch (error) {
      const output = String(error?.stdout || error?.message || '');
      if (!output.includes('rate_limited') || attempt === 4) throw error;
      await delay(15000);
    }
  }
}

function normalized(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function plainSummary(description) {
  return String(description || '')
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

const response = await fetch(sourceUrl, { headers: { 'user-agent': 'NO3D-Gumroad-flagship-sync/1.0' } });
if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
const payload = await response.json();
const catalog = Array.isArray(payload) ? payload : payload.products;
if (!Array.isArray(catalog)) throw new Error('Catalog response did not contain products');

const flagships = catalog
  .filter(product => product.release_status !== 'archived' && product.presentation?.mode === 'flagship')
  .filter(product => !only || only.has(product.handle))
  .sort((a, b) => String(a.title).localeCompare(String(b.title)));

const existing = gumroad(['products', 'list']).products || [];
const knownProducts = ['mJrZte8Vf4ube7CFyzgQUg=='];
for (const id of knownProducts) {
  if (!existing.some(product => product.id === id)) {
    const product = gumroad(['products', 'view', id]).product;
    if (product) existing.push(product);
  }
}
const byPermalink = new Map(existing.filter(product => product.custom_permalink).map(product => [normalized(product.custom_permalink), product]));
const byName = new Map(existing.map(product => [normalized(product.name), product]));
const actions = [];

for (const product of flagships) {
  const handle = product.handle;
  const match = byPermalink.get(normalized(handle)) || byName.get(normalized(product.title));
  const sourcePrice = product.access_policy === 'free' ? 0 : Number(product.price || 7.77);
  const price = sourcePrice === 0 ? 0 : Math.max(0.99, sourcePrice);
  const description = String(product.description || '').trim();
  const summary = plainSummary(description) || `${product.title} for Blender.`;

  if (match) {
    const priceDiffers = Number(match.price || 0) !== Math.round(price * 100);
    actions.push({
      action: match.published && !updatePublished ? 'preserve_live' : 'update',
      handle,
      name: product.title,
      gumroadId: match.id,
      published: Boolean(match.published),
      sitePrice: price,
      gumroadPrice: Number(match.price || 0) / 100,
      priceDiffers,
    });
    if (!apply || (match.published && !updatePublished)) continue;
    await mutate([
      'products', 'update', match.id,
      '--name', product.title,
      '--price', price.toFixed(2),
      '--description', description,
      '--custom-summary', summary,
    ]);
    continue;
  }

  actions.push({
    action: apply ? 'create_draft' : 'would_create_draft',
    handle,
    name: product.title,
    price,
    sourcePrice,
    platformPriceFloorApplied: price !== sourcePrice,
  });
  if (!apply) continue;
  const created = (await mutate([
    'products', 'create',
    '--name', product.title,
    '--type', 'digital',
    '--price', price.toFixed(2),
    '--description', description,
    '--custom-summary', summary,
    '--custom-permalink', handle,
    '--tag', 'blender',
    '--tag', 'no3d-tools',
  ])).product;
  actions[actions.length - 1].gumroadId = created?.id || null;
  actions[actions.length - 1].published = Boolean(created?.published);
  console.error(JSON.stringify({ created: product.title, id: created?.id || null, published: Boolean(created?.published) }));
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry_run',
  sourceUrl,
  flagshipCount: flagships.length,
  existingMatchCount: actions.filter(action => ['preserve_live', 'update'].includes(action.action)).length,
  draftCreateCount: actions.filter(action => /create_draft$/.test(action.action)).length,
  actions,
}, null, 2));
