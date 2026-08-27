#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const apply = process.argv.includes('--apply');
const finalize = process.argv.includes('--finalize');
const productId = 'vsJ1mPZL95AqiQBOIr75FA==';
const variantCategoryId = '2OF2LJgAFsmjTKhD9-rLMQ==';
const variantId = 'm7oNK-Y4sQOZw5TJLZPoxg==';
const productName = 'NO3D CHROME — Blender Asset Membership';
const libraryRoot = process.env.NO3D_GUMROAD_LIBRARY_ROOT
  || '/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/solvet-global/no3d-tools-library/library';
const catalogUrl = process.env.NO3D_CATALOG_URL || 'https://no3dtools.com/api/products?limit=100';

function gumroad(args) {
  const output = execFileSync('gumroad', [...args, '--json', '--no-input', '--quiet'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(output);
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
        const candidate = { blendName, blendPath, exists: Boolean(blendPath && existsSync(blendPath)) };
        const current = found.get(product.handle);
        if (!current?.exists || candidate.exists) found.set(product.handle, candidate);
      } catch {}
    }
  }
  return found;
}

const catalogResponse = await fetch(catalogUrl, { headers: { 'user-agent': 'NO3D-Chrome-Gumroad-refresh/1.0' } });
if (!catalogResponse.ok) throw new Error(`Catalog request failed: ${catalogResponse.status}`);
const catalogPayload = await catalogResponse.json();
const catalog = Array.isArray(catalogPayload) ? catalogPayload : catalogPayload.products;
const flagships = catalog
  .filter(product => product.release_status !== 'archived' && product.presentation?.mode === 'flagship')
  .sort((a, b) => String(a.title).localeCompare(String(b.title)));
const canonical = canonicalArtifacts();
const attachments = [];
const blocked = [];

for (const product of flagships) {
  const artifact = canonical.get(product.handle);
  if (!artifact?.exists) {
    blocked.push({ handle: product.handle, name: product.title, reason: 'missing_canonical_blend' });
    continue;
  }
  attachments.push({
    handle: product.handle,
    name: product.title,
    path: artifact.blendPath,
    filename: artifact.blendName,
    bytes: statSync(artifact.blendPath).size,
    sha256: createHash('sha256').update(readFileSync(artifact.blendPath)).digest('hex'),
  });
}

if (!attachments.length) throw new Error('No flagship attachments resolved');
const current = gumroad(['products', 'view', productId]).product;
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const deliveredFiles = (current.files || [])
  .map(file => file.name)
  .sort((a, b) => a.localeCompare(b));
const previewFigures = [...String(current.description || '').matchAll(/<figure>[\s\S]*?<\/figure>/g)]
  .map(match => match[0])
  .join('');
const description = [
  '<h2>NO3D CHROME</h2>',
  '<p>A monthly Blender asset membership. This page documents the files currently included and how to use them.</p>',
  '<h3>Membership contents</h3>',
  `<p>The current download contains ${deliveredFiles.length} individual <code>.blend</code> files:</p>`,
  `<ul>${deliveredFiles.map(filename => `<li><code>${escapeHtml(filename)}</code></li>`).join('')}</ul>`,
  '<h3>Using the files</h3>',
  '<ol><li>Open a downloaded file directly in Blender to inspect the included objects, materials, modifiers, or Geometry Nodes.</li><li>To use part of a file in another project, choose <strong>File → Append</strong>, select the downloaded <code>.blend</code>, and append the required collection, object, material, or node group.</li><li>Keep the original download unchanged when possible and save project-specific edits into your own working file.</li></ol>',
  '<h3>Downloads and updates</h3>',
  '<p>Each tool is supplied as a separate file so you can download only what you need. The file list above is generated from the membership’s current Gumroad delivery contents. Active members receive access to later file revisions and additions through their Gumroad library.</p>',
  '<h3>NO3D Tools documentation</h3>',
  '<p>Browse the <a href="https://no3dtools.com/v3/">NO3D Tools catalog</a> for individual tool documentation and diagrams. For NO3D Tools installation and Blender library setup, use the <a href="https://no3dtools.com/guide.html">setup guide</a>.</p>',
  previewFigures ? `<h3>Previews</h3>${previewFigures}` : '',
].join('');
const args = finalize
  ? [
      'products', 'update', productId,
      '--name', productName,
      '--description', description,
      '--yes',
    ]
  : [
      'variants', 'update', variantId,
      '--product', productId,
      '--category', variantCategoryId,
    ];
if (!finalize) {
  for (const attachment of attachments) {
    args.push('--file', attachment.path, '--file-name', attachment.filename);
  }
}
const preview = gumroad([...args, '--dry-run']);
let result = null;
if (apply) result = gumroad(args);

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry_run',
  productId,
  previousName: current.name,
  nextName: productName,
  stage: finalize ? 'publish_documentation_and_neutral_product_name' : 'add_flagship_files_to_membership_variant',
  previousFiles: (current.files || []).map(file => ({ id: file.id, name: file.name, size: file.size })),
  attachmentCount: attachments.length,
  totalBytes: attachments.reduce((sum, attachment) => sum + attachment.bytes, 0),
  blocked,
  previewAccepted: Boolean(preview),
  applied: apply ? Boolean(result?.success ?? result) : false,
  attachments,
}, null, 2));
