#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const PRIORITY = [
  't-slot-utilities',
  'chrome-crayon',
  'dojo-calipers',
  'dojo-squircle-v45-obj',
  'dojo-knob-obj',
  'dojo-bool-v5',
  'dojo-bolt-gen-v05-obj',
  'dojo-bolt-gen-v05',
];

const FLAGSHIP = [
  'dojo-device-mount-generator',
  'cylinder-from-crv-lathe',
  'apple-magsafe-charger',
  'corner-mounted-skadis',
  'dojo-gridfinity-bins',
  'usb-c-cable',
  'battery-pack',
  'vase-ribbed',
  'bubble-putty-generator',
  'dojo-plywood-generator',
  'dojo-gluefinity-grid',
  'spike-ball-simple-v1',
  'tarot-stipple-material',
  'print-bed-preview-obj',
  'dojo-squircle-v45',
  'dojo-print-viz-v45',
  'dojo-mesh-repair',
  'dojo-gluefinity-grid-obj',
  'dojo-crv-wrapper-v4',
];

const WORKBENCH = [
  'print-settings',
  'dojo-support-bracket',
  'threaded-insert',
  'nylon-bolt',
  'base-nut',
  'arduino-nano',
  'simple-bin-generator',
  'putty-flange-generator',
  'voronoi-putty-1',
  'spike-putty-1',
  'screwdriver',
  'no3d-knurler',
  'gabor-pattern-airpod-case',
  'driver-shank',
  'bic-lighter',
  'dowel-shelf-generator',
  'separate-half',
  'select-by-bounding-face',
  'flat-color-material',
  'view-crv-points',
  'apple-watch-charger',
  'dojo-fillet-by-length',
  'dojo-curvature-lines',
  'no3d-pixel-markers',
  'set-holdout-material',
  'dojo-knob',
];

const OPERATION_ID = 'live-catalog-sort-2026-08-24';
const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const outputIndex = argv.indexOf('--output');
const output = outputIndex >= 0 ? argv[outputIndex + 1] : '';
const digestIndex = argv.indexOf('--expect-digest');
const expectedDigest = digestIndex >= 0 ? argv[digestIndex + 1] : '';

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}

const intended = new Map([
  ...PRIORITY.map((handle, index) => [handle, { mode: 'flagship', priority: index + 1 }]),
  ...FLAGSHIP.map(handle => [handle, { mode: 'flagship', priority: null }]),
  ...WORKBENCH.map(handle => [handle, { mode: 'workbench', priority: null }]),
]);

if (intended.size !== 53) throw new Error(`Expected 53 unique intended records, found ${intended.size}`);

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(sorted(value))).digest('hex');
}

function nextMetadata(metadata, intent) {
  const next = structuredClone(metadata || {});
  next.presentation = { ...(next.presentation || {}), mode: intent.mode };
  const catalog = { ...(next.catalog || {}) };
  if (intent.priority == null) delete catalog.priority;
  else catalog.priority = intent.priority;
  if (Object.keys(catalog).length) next.catalog = catalog;
  else delete next.catalog;
  return next;
}

const { data: rows, error: readError } = await client
  .from('products')
  .select('id,title,handle,status,metadata,created_at,updated_at')
  .in('handle', [...intended.keys()]);
if (readError) throw readError;

const byHandle = new Map(rows.map(row => [row.handle, row]));
const missing = [...intended.keys()].filter(handle => !byHandle.has(handle));
if (missing.length) throw new Error(`Missing intended handles: ${missing.join(', ')}`);
if (rows.length !== intended.size) throw new Error(`Expected ${intended.size} rows, received ${rows.length}`);

const snapshot = [...intended.keys()].map(handle => {
  const row = byHandle.get(handle);
  return { id: row.id, handle, updated_at: row.updated_at, metadata: row.metadata || {} };
});
const sourceDigest = digest(snapshot);
if (apply && !expectedDigest) throw new Error('--apply requires --expect-digest from a reviewed dry run');
if (apply && expectedDigest !== sourceDigest) {
  throw new Error(`Stale plan: expected ${expectedDigest}, current ${sourceDigest}`);
}

const changes = [...intended].map(([handle, intent]) => {
  const row = byHandle.get(handle);
  const before = row.metadata || {};
  const after = nextMetadata(before, intent);
  return {
    id: row.id,
    title: row.title,
    handle,
    intent,
    changed: JSON.stringify(sorted(before)) !== JSON.stringify(sorted(after)),
    before: {
      presentation: before.presentation || null,
      catalog: before.catalog || null,
    },
    after: {
      presentation: after.presentation || null,
      catalog: after.catalog || null,
    },
    originalMetadata: before,
    nextMetadata: after,
  };
});

const receipt = {
  schema: 'no3d.catalog-sort-operation/v1',
  operationId: OPERATION_ID,
  mode: apply ? 'apply' : 'plan',
  sourceDigest,
  generatedAt: new Date().toISOString(),
  counts: {
    intended: intended.size,
    changed: changes.filter(change => change.changed).length,
    priority: PRIORITY.length,
    flagship: FLAGSHIP.length,
    workbench: WORKBENCH.length,
  },
  untouchedActiveRecord: 'xyz-dims',
  changes,
};

if (apply) {
  const applied = [];
  try {
    for (const change of changes.filter(change => change.changed)) {
      const { data, error } = await client
        .from('products')
        .update({ metadata: change.nextMetadata })
        .eq('id', change.id)
        .select('id,handle,metadata')
        .single();
      if (error) throw error;
      if (JSON.stringify(sorted(data.metadata || {})) !== JSON.stringify(sorted(change.nextMetadata))) {
        throw new Error(`Post-update mismatch for ${change.handle}`);
      }
      applied.push(change);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const change of applied.reverse()) {
      const { error: rollbackError } = await client
        .from('products')
        .update({ metadata: change.originalMetadata })
        .eq('id', change.id);
      if (rollbackError) rollbackErrors.push(`${change.handle}: ${rollbackError.message}`);
    }
    throw new Error(`Apply failed and rollback was attempted: ${error.message}${rollbackErrors.length ? `; rollback errors: ${rollbackErrors.join('; ')}` : ''}`);
  }

  const { data: verified, error: verifyError } = await client
    .from('products')
    .select('handle,metadata')
    .in('handle', [...intended.keys()]);
  if (verifyError) throw verifyError;
  for (const row of verified) {
    const expected = nextMetadata(byHandle.get(row.handle).metadata || {}, intended.get(row.handle));
    if (JSON.stringify(sorted(row.metadata || {})) !== JSON.stringify(sorted(expected))) {
      throw new Error(`Final verification mismatch for ${row.handle}`);
    }
  }
  receipt.appliedAt = new Date().toISOString();
  receipt.verified = true;
}

if (output) await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });

const summary = {
  operationId: receipt.operationId,
  mode: receipt.mode,
  sourceDigest,
  counts: receipt.counts,
  verified: receipt.verified || false,
  output: output || null,
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
