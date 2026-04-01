/**
 * GET /api/download-addon
 *
 * Returns a presigned R2 URL for the latest no3d_tools_membership.zip.
 * Redirects the browser directly to trigger a download.
 *
 * No license key required — the addon itself validates the license on use.
 */

import { isR2Configured, presignGetObject } from './lib/r2.js';
import { createClient } from '@supabase/supabase-js';

const R2_KEY = 'no3d-tools-library/addon/no3d_tools_membership.zip';
const PRESIGN_TTL = 300; // 5 minutes

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isR2Configured()) {
    return res.status(503).json({ error: 'Download storage not configured' });
  }

  try {
    const url = await presignGetObject(R2_KEY, PRESIGN_TTL);

    // Log every actual download — fire and forget
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('site_events').insert({
          event: 'addon_downloaded',
          properties: { source: req.headers.referer || 'direct' },
          page: '/api/download-addon',
          referrer: req.headers.referer || null,
        });
      } catch (_) { /* never block download on analytics */ }
    }

    // Redirect to trigger browser download
    res.setHeader('Location', url);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(302).end();
  } catch (err) {
    console.error('Addon download presign error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to generate download URL' });
  }
}
