import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event, properties, page, referrer, session_id } = req.body || {};

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'Missing event name' });
  }

  const { error } = await supabase.from('site_events').insert({
    event,
    properties: properties || {},
    page: page || null,
    referrer: referrer || null,
    session_id: session_id || null,
  });

  if (error) {
    console.error('Track error:', error.message);
    return res.status(500).json({ error: 'Failed to record event' });
  }

  return res.status(200).json({ ok: true });
}
