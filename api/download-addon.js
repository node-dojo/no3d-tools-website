/**
 * GET /api/download-addon
 *
 * Resolves the current canonical Blender Extension archive from the published
 * extension index. This is the manual-install fallback; native repository
 * installation is the primary customer path.
 *
 * No license key required — the addon itself validates the license on use.
 */

import { getObjectUtf8String, isR2Configured } from './lib/r2.js';
import { createClient } from '@supabase/supabase-js';

const EXTENSION_INDEX_KEY = 'no3d-tools-library/extensions/index.json';
const EXTENSION_ID = 'no3d_tools_membership';

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
    const index = JSON.parse(await getObjectUtf8String(EXTENSION_INDEX_KEY));
    const extension = index.data?.find((item) => item.id === EXTENSION_ID);
    if (!extension?.archive_url) {
      return res.status(404).json({ error: 'Current extension archive not found' });
    }

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
    res.setHeader('Location', extension.archive_url);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(302).end();
  } catch (err) {
    console.error('Addon download presign error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to generate download URL' });
  }
}
