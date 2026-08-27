#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const apply = process.argv.includes('--apply');
const productId = 'vsJ1mPZL95AqiQBOIr75FA==';
const categoryId = '2OF2LJgAFsmjTKhD9-rLMQ==';
const variantId = 'm7oNK-Y4sQOZw5TJLZPoxg==';
const keepIds = new Set([
  'FZPQNFUXbZ3r1CWSgg2BJg==', // Chrome Crayon
  'd44uB_Z_XWWtHfNdAghOXA==', // NO3D Pixel Markers
  'uWF4CBg7CZpaFomwFqNIKw==', // Dojo Spiro Curve
  'wrlGAVRF6jgtljAG5h6seA==', // Flat Stickie Pack
  'qVK2uKnsVjwdQF0ctVKO0Q==', // Image Pixel Stippler
  'y8BYALsmIKXfjHCXHi928g==', // Periodic Brush
  'Yp92LmEE7Z9UXo_PGdvb5Q==', // Type Pixel Brush
  'Sn-_icQWujItdulituFyqQ==', // Spikey Chain and Mace
]);

function gumroad(args) {
  return JSON.parse(execFileSync('gumroad', [...args, '--json', '--no-input', '--quiet'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }));
}

function filterNode(node) {
  if (!node || typeof node !== 'object') return node;
  if (node.type === 'fileEmbed') return keepIds.has(node.attrs?.id) ? node : null;
  if (!Array.isArray(node.content)) return node;
  return { ...node, content: node.content.map(filterNode).filter(Boolean) };
}

function embeddedFileIds(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach(item => embeddedFileIds(item, found));
  else if (value && typeof value === 'object') {
    if (value.type === 'fileEmbed' && typeof value.attrs?.id === 'string') found.add(value.attrs.id);
    Object.values(value).forEach(item => embeddedFileIds(item, found));
  }
  return found;
}

const before = gumroad(['products', 'content', 'get', productId, '--variant', variantId, '--category', categoryId]);
const candidate = before.map(page => ({ ...page, description: filterNode(page.description) }));
const beforeIds = [...embeddedFileIds(before)].sort();
const candidateIds = [...embeddedFileIds(candidate)].sort();
if (candidateIds.length !== keepIds.size || candidateIds.some(id => !keepIds.has(id))) {
  throw new Error('Candidate does not contain exactly the eight approved NO3D Chrome attachments');
}

const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
const receiptRoot = path.resolve('.no3d-publish-plans', `gumroad-no3d-chrome-scope-fix-${stamp}`);
mkdirSync(receiptRoot, { recursive: true });
const beforePath = path.join(receiptRoot, 'before.json');
const candidatePath = path.join(receiptRoot, 'candidate.json');
writeFileSync(beforePath, `${JSON.stringify(before, null, 2)}\n`);
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);

const targetArgs = ['products', 'content', 'set', productId, candidatePath, '--variant', variantId, '--category', categoryId];
gumroad([...targetArgs, '--dry-run']);
let after = null;
if (apply) {
  gumroad([...targetArgs, '--yes']);
  after = gumroad(['products', 'content', 'get', productId, '--variant', variantId, '--category', categoryId]);
  const afterIds = [...embeddedFileIds(after)].sort();
  if (JSON.stringify(afterIds) !== JSON.stringify(candidateIds)) throw new Error('Live Gumroad readback did not match the reviewed candidate');
  writeFileSync(path.join(receiptRoot, 'after.json'), `${JSON.stringify(after, null, 2)}\n`);
}

console.log(JSON.stringify({
  mode: apply ? 'applied_and_verified' : 'dry_run',
  productId,
  categoryId,
  variantId,
  beforeCount: beforeIds.length,
  afterCount: after ? [...embeddedFileIds(after)].length : candidateIds.length,
  removedCount: beforeIds.length - candidateIds.length,
  preservedAttachmentIds: candidateIds,
  receiptRoot,
}, null, 2));
