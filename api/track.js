import { createClient } from '@supabase/supabase-js';
import { sanitizeAnalyticsPage, sanitizeAnalyticsProperties, sanitizeAnalyticsReferrer } from './lib/analytics.js';
import { allowRequest } from './auth/lib/rate-limit.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (Number(req.headers['content-length'] || 0) > 16_384) {
    return res.status(413).json({ error: 'Payload too large' });
  }
  try {
    if (!await allowRequest(req, { maxAttempts: 120, namespace: 'analytics', windowSeconds: 60 })) {
      return res.status(429).json({ error: 'Too many requests' });
    }
  } catch {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { event, properties, page, referrer, session_id } = req.body || {};

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'Missing event name' });
  }

  const { error } = await supabase.from('site_events').insert({
    event: event.slice(0, 80),
    properties: sanitizeAnalyticsProperties(properties),
    page: sanitizeAnalyticsPage(page),
    referrer: sanitizeAnalyticsReferrer(referrer, process.env.NO3D_SITE_URL),
    session_id: typeof session_id === 'string' ? session_id.slice(0, 80) : null,
  });

  if (error) {
    console.error('Track error:', error.message);
    return res.status(500).json({ error: 'Failed to record event' });
  }

  return res.status(200).json({ ok: true });
}
