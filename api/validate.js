/**
 * POST /api/validate
 * Body: { license_key: string, machine_id?: string }
 * Returns subscription gate state for the Blender subscriber add-on.
 */

import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';
import {
  computeAccessState,
  fetchSubscriptionByLicenseKey,
  getLibraryVersionForApi
} from './lib/subscriptionAccess.js';

function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Server misconfigured: Supabase service role missing' });
  }

  const body = parseJsonBody(req);
  const licenseKey =
    (typeof body.license_key === 'string' && body.license_key.trim()) ||
    (typeof body.licenseKey === 'string' && body.licenseKey.trim()) ||
    null;

  const machineId =
    typeof body.machine_id === 'string'
      ? body.machine_id
      : typeof body.machineId === 'string'
        ? body.machineId
        : null;

  if (!licenseKey) {
    return res.status(400).json({ error: 'license_key required' });
  }

  const row = await fetchSubscriptionByLicenseKey(supabase, licenseKey);
  const access = computeAccessState(row);

  const library_version = getLibraryVersionForApi();

  return res.status(200).json({
    valid: access.allowed,
    status: access.effectiveStatus === 'invalid' ? 'expired' : access.effectiveStatus,
    library_version,
    expires_at: access.expires_at,
    grace_until: access.grace_until,
    email: row?.email ?? null,
    ...(machineId !== null ? { machine_id: machineId } : {})
  });
}
