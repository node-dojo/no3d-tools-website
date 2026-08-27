#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const scope = 'no3dtools.membership.no3d-chrome';
const productId = 'vsJ1mPZL95AqiQBOIr75FA==';
const sourcePath = process.env.NO3D_COLLECTIONS_PATH || '/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/solvet-global/no3d-tools-library/collections.json';
const siteUrl = process.env.NO3D_COLLECTION_URL || 'https://no3dtools.com/api/collections/no3d-chrome-tools';
const expectedTitles = new Map([
  ['chrome-crayon', 'Chrome Crayon'], ['no3d-pixel-markers', 'NO3D Pixel Markers'],
  ['dojo-spiro-curve', 'Dojo Spiro Curve'], ['flat-stickie-pack', 'Flat Stickie Pack'],
  ['image-pixel-stippler', 'Image Pixel Stippler'], ['periodic-brush', 'Periodic Brush'],
  ['type-pixel-brush', 'Type Pixel Brush'], ['spikey-chain-and-mace', 'Spikey Chain and Mace'],
]);
const expectedFiles = new Set([
  'Chrome Crayon.blend', 'NO3D Pixel Markers.blend', 'Dojo Spiro Curve.blend',
  'Flat Stickie Pack.blend', 'Image Pixel Stippler.blend', 'Periodic Brush.blend',
  'Type Pixel Brush.blend', 'Spikey Chain and Mace.blend',
]);
const categoryId = '2OF2LJgAFsmjTKhD9-rLMQ==';
const variantId = 'm7oNK-Y4sQOZw5TJLZPoxg==';
function gumroad(args) {
  return JSON.parse(execFileSync('gumroad', [...args, '--json', '--no-input', '--quiet'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
}
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const handles = source?.collections?.[scope] || [];
const gumroadProduct = gumroad(['products', 'view', productId]).product;
const description = String(gumroadProduct.description || '').toLowerCase();
const gumroadMissing = handles.filter(handle => !description.includes(expectedTitles.get(handle).toLowerCase()));
const content = gumroad(['products', 'content', 'get', productId, '--variant', variantId, '--category', categoryId]);
const embeddedIds = new Set();
function collectIds(value) {
  if (Array.isArray(value)) return value.forEach(collectIds);
  if (!value || typeof value !== 'object') return;
  if (typeof value.id === 'string') embeddedIds.add(value.id);
  Object.values(value).forEach(collectIds);
}
collectIds(content);
const deliveredFiles = (gumroadProduct.files || []).filter(file => embeddedIds.has(file.id)).map(file => file.name).sort();
const expectedDeliveredFiles = [...expectedFiles].sort();
const gumroadDeliveryMatches = JSON.stringify(deliveredFiles) === JSON.stringify(expectedDeliveredFiles);
let site = null;
let siteError = null;
try {
  const response = await fetch(siteUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  site = await response.json();
} catch (error) {
  siteError = error instanceof Error ? error.message : 'unknown_error';
}
const siteHandles = site?.products?.map(product => product.handle) || [];
const sourceMatchesSite = Boolean(site) && JSON.stringify(handles) === JSON.stringify(siteHandles);
const valid = handles.length === 8 && gumroadMissing.length === 0 && gumroadDeliveryMatches && sourceMatchesSite;
console.log(JSON.stringify({ valid, source: { scope, count: handles.length, handles }, gumroad: { productId, name: gumroadProduct.name, declaredMissing: gumroadMissing, deliveryMatches: gumroadDeliveryMatches, deliveredFiles, expectedDeliveredFiles }, site: { url: siteUrl, title: site?.title || null, count: site?.productCount || 0, sourceMatchesSite, error: siteError } }, null, 2));
if (!valid) process.exitCode = 1;
