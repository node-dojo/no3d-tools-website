import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const apply = process.argv.includes('--apply');
if (!apply) throw new Error('This updates branch-scoped Vercel Preview variables. Re-run with --apply.');

const branch = 'feat/v3-adjacent';
const productionSupabaseRef = 'cjkcwtcqswxtbfmtdyjr';
const stagingSupabaseRef = new URL(process.env.SUPABASE_URL || 'https://invalid.local').hostname.split('.')[0];
assert.notEqual(stagingSupabaseRef, productionSupabaseRef, 'Refusing to bind V3 Preview to production Supabase');
assert.equal(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'), true, 'Refusing to bind V3 Preview to live Stripe');

const names = [
  'COMMERCE_API_URL',
  'COMMERCE_COLLECTIONS_ENABLED',
  'COMMERCE_IDENTITY_ASSERTION_KID',
  'COMMERCE_IDENTITY_ASSERTION_SECRET',
  'COMMERCE_INDIVIDUAL_PRODUCTS_ENABLED',
  'COMMERCE_SITE_BACKEND_SECRET',
  'COMMERCE_SITE_KEY',
  'FROM_EMAIL',
  'NO3D_AUTH_COOKIE_SECURE',
  'NO3D_AUTH_ISSUER',
  'NO3D_AUTH_STATE_SECRET',
  'NO3D_SITE_URL',
  'R2_ACCESS_KEY_ID',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT',
  'R2_SECRET_ACCESS_KEY',
  'RESEND_API_KEY',
  'SITE_URL',
  'STAGING_EXPIRES_AT',
  'STRIPE_PRICE_ID',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'V3_ACCESS_MODE',
  'V3_OWNER_EMAILS',
];
const optionalNames = new Set(['FROM_EMAIL', 'RESEND_API_KEY']);

for (const name of names) {
  const value = process.env[name];
  if (!value && optionalNames.has(name)) {
    process.stdout.write(`skipped ${name} (not present in Doppler staging)\n`);
    continue;
  }
  if (!value) throw new Error(`${name} is required in the staging secret source`);
  const result = spawnSync('vercel', ['env', 'add', name, 'preview', branch, '--force'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: value,
  });
  if (result.status !== 0) throw new Error(`Failed to update ${name}: ${result.stderr.trim()}`);
  process.stdout.write(`updated ${name}\n`);
}

const useSupabase = spawnSync('vercel', ['env', 'add', 'USE_SUPABASE', 'preview', branch, '--force'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  input: 'true',
});
if (useSupabase.status !== 0) throw new Error(`Failed to update USE_SUPABASE: ${useSupabase.stderr.trim()}`);
process.stdout.write(`updated USE_SUPABASE\n`);
