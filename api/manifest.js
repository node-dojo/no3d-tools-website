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
import { getManifestObjectKey, isR2Configured, presignGetObject } from './lib/r2.js';

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

  let presignedUrl;
  try {
    presignedUrl = await presignGetObject(key, 60);
    // Validate URL before passing to fetch
    const parsed = new URL(presignedUrl);
    console.log('manifest presign ok, host:', parsed.host, 'path:', parsed.pathname);
  } catch (e) {
    console.error('manifest presign/parse error:', e?.name, e?.message, e?.code);
    console.error('R2_ENDPOINT starts with:', (process.env.R2_ENDPOINT || '').slice(0, 30));
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to create manifest presigned URL' });
  }

  try {
    // Use minimal headers to avoid presigned signature mismatch on Vercel
    const resp = await fetch(presignedUrl, {
      method: 'GET',
      headers: {},
      redirect: 'follow',
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error('manifest R2 resp:', resp.status, resp.statusText);
      console.error('manifest R2 body:', body.slice(0, 500));
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ error: `R2 returned ${resp.status}` });
    }
    const raw = await resp.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(raw);
  } catch (e) {
    console.error('manifest fetch network error:', e?.name, e?.message, e?.cause);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to read manifest from storage' });
  }
}
