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
import https from 'node:https';
import { getManifestObjectKey, isR2Configured, presignGetObject } from './lib/r2.js';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const licenseKey = getLicenseKeyFromRequest(req);
  if (!licenseKey) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'license key required (X-License-Key or ?license_key=)' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Server misconfigured: Supabase service role missing' });
  }

  const row = await fetchSubscriptionByLicenseKey(supabase, licenseKey);
  const access = computeAccessState(row);
  if (!access.allowed) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(403).json({ error: 'Subscription not active', status: access.effectiveStatus });
  }

  const redirect = req.query?.redirect === '1' || req.query?.redirect === 'true';

  const inlineFallback = process.env.NO3D_MANIFEST_JSON;
  if (!isR2Configured()) {
    if (typeof inlineFallback === 'string' && inlineFallback.trim()) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(inlineFallback);
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({
      error: 'Manifest storage not configured (set R2_* or NO3D_MANIFEST_JSON for development)'
    });
  }

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
    return res.status(200).send(body);
  } catch (e) {
    console.error('manifest fetch error:', e?.message || e);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to read manifest from storage' });
  }
}
