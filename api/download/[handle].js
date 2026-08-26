/**
 * GET /api/download/:handle
 * Auth: X-License-Key, Authorization: Bearer, or ?license_key=
 * Returns a short-lived presigned URL for the product .blend on R2 (products.file_url).
 */

import { getSupabaseServiceClient } from '../lib/supabaseAdmin.js';
import {
  computeAccessState,
  fetchSubscriptionByLicenseKey,
  fetchSubscriptionByVerifiedEmail
} from '../lib/subscriptionAccess.js';
import { getLicenseKeyFromRequest } from '../lib/licenseRequest.js';
import { isR2Configured, presignGetObject } from '../lib/r2.js';
import { commerceFetch } from '../commerce/lib/client.js';
import { collectionAllowsHandle } from '../lib/membershipCollections.js';
import https from 'node:https';

const PRESIGN_TTL_SECONDS = 900;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: {} }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    request.on('error', reject);
    request.end();
  });
}

async function scopedMembershipAllows(handle, membershipScopes) {
  if (!membershipScopes.length) return false;
  const inline = process.env.NO3D_MANIFEST_JSON;
  if (typeof inline === 'string' && inline.trim()) {
    return collectionAllowsHandle(inline, membershipScopes, handle);
  }
  if (!isR2Configured()) return false;
  const { getManifestObjectKey } = await import('../lib/r2.js');
  const url = await presignGetObject(getManifestObjectKey(), 60);
  const response = await httpsGet(url);
  if (response.status < 200 || response.status >= 300) return false;
  return collectionAllowsHandle(response.body, membershipScopes, handle);
}

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

  let row = licenseKey ? await fetchSubscriptionByLicenseKey(supabase, licenseKey) : null;
  let purchased = false;
  let membershipScopes = [];
  let deviceAuthenticated = false;
  if (typeof deviceToken === 'string' && deviceToken.length >= 32) {
    try {
      const { response, payload } = await commerceFetch(req, res, '/api/devices/entitlements', {
        headers: { 'X-NO3D-Device-Token': deviceToken }
      });
      deviceAuthenticated = response.ok;
      purchased = response.ok && Array.isArray(payload?.products) && payload.products.some((product) => product?.handle === handle);
      membershipScopes = response.ok && Array.isArray(payload?.membershipScopes)
        ? payload.membershipScopes.filter((scope) => typeof scope === 'string')
        : [];
      if (response.ok) row = await fetchSubscriptionByVerifiedEmail(supabase, payload?.account?.contactEmail);
    } catch (e) {
      console.error('purchase entitlement lookup failed:', e?.message || e);
    }
  }
  const access = computeAccessState(row);
  const accountAuthenticated = Boolean(row) || deviceAuthenticated;

  const { data: product, error } = await supabase
    .from('products')
    .select('handle, file_url, checksum, status, access_policy')
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

  const free = product.access_policy === 'free' && accountAuthenticated;
  let scopedMembership = false;
  try {
    scopedMembership = await scopedMembershipAllows(handle, membershipScopes);
  } catch (membershipError) {
    console.error('scoped membership lookup failed:', membershipError?.message || membershipError);
  }
  if (!access.allowed && !scopedMembership && !purchased && !free) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(403).json({ error: 'No free, membership, or purchased access to this product', status: access.effectiveStatus });
  }

  if (!isR2Configured()) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({ error: 'Download storage not configured (R2_* env)' });
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
