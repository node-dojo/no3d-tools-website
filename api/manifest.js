/**
 * GET /api/manifest
 * Auth: X-License-Key header, Authorization: Bearer, or ?license_key=
 * Returns manifest JSON (from R2). Align NO3D_LIBRARY_VERSION with manifest.version when publishing.
 */

import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';
import {
  computeAccessState,
  fetchSubscriptionByLicenseKey
} from './lib/subscriptionAccess.js';
import { getLicenseKeyFromRequest } from './lib/licenseRequest.js';
import { commerceFetch } from './commerce/lib/client.js';
import https from 'node:https';
import { filterEffectiveManifest } from './lib/effectiveManifest.js';

/** Fetch a URL using node:https with zero auto-added headers (avoids undici/fetch
 *  adding accept-encoding etc. that break R2 presigned URL signature validation). */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: {} }, (resp) => {
      const chunks = [];
      resp.on('data', (c) => chunks.push(c));
      resp.on('end', () => resolve({ status: resp.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('error', reject);
    req.end();
  });
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
  let purchasedHandles = new Set();
  if (typeof deviceToken === 'string' && deviceToken.length >= 32) {
    try {
      const { response, payload } = await commerceFetch(req, res, '/api/devices/entitlements', {
        headers: { 'X-NO3D-Device-Token': deviceToken },
      });
      if (response.ok && Array.isArray(payload?.products)) {
        purchasedHandles = new Set(payload.products.map((product) => product?.handle).filter(Boolean));
      }
    } catch (error) {
      console.error('purchase entitlement lookup failed:', error?.message || error);
    }
  }
  if (!access.allowed && purchasedHandles.size === 0) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(403).json({ error: 'No active membership or purchased products', status: access.effectiveStatus });
  }

  const redirect = req.query?.redirect === '1' || req.query?.redirect === 'true';

  const inlineFallback = process.env.NO3D_MANIFEST_JSON;
  const r2Configured = Boolean(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
  if (!r2Configured) {
    if (typeof inlineFallback === 'string' && inlineFallback.trim()) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(filterEffectiveManifest(inlineFallback, access.allowed, purchasedHandles));
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({
      error: 'Manifest storage not configured (set R2_* or NO3D_MANIFEST_JSON for development)'
    });
  }

  const { getManifestObjectKey, presignGetObject } = await import('./lib/r2.js');
  const key = getManifestObjectKey();

  if (redirect) {
    try {
      const url = await presignGetObject(key, 600);
      res.setHeader('Location', url);
      return res.status(302).end();
    } catch (e) {
      console.error('manifest presign error:', e?.message || e);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ error: 'Failed to create manifest URL' });
    }
  }

  try {
    // Use presigned URL + node:https (not fetch) to avoid undici adding
    // unsigned headers (accept-encoding, etc.) that R2 rejects with 400.
    const url = await presignGetObject(key, 60);
    const { status, body } = await httpsGet(url);
    if (status < 200 || status >= 300) {
      console.error('manifest R2 resp:', status, body.slice(0, 500));
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ error: `R2 returned ${status}` });
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(filterEffectiveManifest(body, access.allowed, purchasedHandles));
  } catch (e) {
    console.error('manifest fetch error:', e?.message || e);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to read manifest from storage' });
  }
}
