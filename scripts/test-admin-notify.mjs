#!/usr/bin/env node
/**
 * Smoke-test ADMIN_NOTIFY_EMAIL via Resend (same path as production).
 *
 * Usage (from repo root):
 *   doppler run -- node no3d-tools-website/scripts/test-admin-notify.mjs
 *   doppler run -- node no3d-tools-website/scripts/test-admin-notify.mjs --all
 */

import { notifyAdminAcquisition } from '../api/lib/email.js';

const all = process.argv.includes('--all');
const types = all
  ? ['free_license', 'email_list', 'newsletter', 'paid_subscriber']
  : ['paid_subscriber'];

for (const type of types) {
  await notifyAdminAcquisition({
    type,
    subscriberEmail: 'test-smoke@no3dtools.invalid',
    detail: { note: 'scripts/test-admin-notify.mjs — safe to ignore' },
  });
}

console.log(
  'Done. Sent',
  types.length,
  'test notification(s) to ADMIN_NOTIFY_EMAIL (if set) and RESEND_API_KEY is present.'
);
