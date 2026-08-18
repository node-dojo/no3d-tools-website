/**
 * GET /api/download/:handle
 * Auth: X-License-Key, Authorization: Bearer, or ?license_key=
 * Returns a short-lived presigned URL for the product .blend on R2 (products.file_url).
 */

import { getSupabaseServiceClient } from '../lib/supabaseAdmin.js';
import {
  computeAccessState,
  fetchSubscriptionByLicenseKey
} from '../lib/subscriptionAccess.js';
import { getLicenseKeyFromRequest } from '../lib/licenseRequest.js';
import { isR2Configured, presignGetObject } from '../lib/r2.js';
import { commerceFetch } from '../commerce/lib/client.js';

const PRESIGN_TTL_SECONDS = 900;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key, X-NO3D-Device-Token, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const handleRaw = req.query?.handle;
  const handle = typeof handleRaw === 'string' ? handleRaw.trim() : '';
  if (!handle) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'handle required' });
  }

  const licenseKey = getLicenseKeyFromRequest(req);
  const deviceToken = req.headers['x-no3d-device-token'];
  if (!licenseKey && typeof deviceToken !== 'string') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'license key required (X-License-Key or ?license_key=)' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Server misconfigured: Supabase service role missing' });
  }

  const row = licenseKey ? await fetchSubscriptionByLicenseKey(supabase, licenseKey) : null;
  const access = computeAccessState(row);
  let purchased = false;
  if (typeof deviceToken === 'string' && deviceToken.length >= 32) {
    try {
      const { response, payload } = await commerceFetch(req, res, '/api/devices/entitlements', {
        headers: { 'X-NO3D-Device-Token': deviceToken }
      });
      purchased = response.ok && Array.isArray(payload?.products) && payload.products.some((product) => product?.handle === handle);
    } catch (e) {
      console.error('purchase entitlement lookup failed:', e?.message || e);
    }
  }
  if (!access.allowed && !purchased) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(403).json({ error: 'No active membership or purchased product', status: access.effectiveStatus });
  }

  if (!isR2Configured()) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({ error: 'Download storage not configured (R2_* env)' });
  }

  const { data: product, error } = await supabase
    .from('products')
    .select('handle, file_url, checksum, status')
    .eq('handle', handle)
    .maybeSingle();

  if (error) {
    console.error('products lookup error:', error.message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Database error' });
  }

  if (!product || product.status !== 'active') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({ error: 'Product not found' });
  }

  const objectKey = product.file_url;
  if (!objectKey || typeof objectKey !== 'string') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({ error: 'Asset not available for this product' });
  }

  try {
    const url = await presignGetObject(objectKey.trim(), PRESIGN_TTL_SECONDS);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      url,
      expires_in: PRESIGN_TTL_SECONDS,
      handle: product.handle,
      checksum: product.checksum ?? null
    });
  } catch (e) {
    console.error('presign error:', e?.message || e);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to create download URL' });
  }
}
