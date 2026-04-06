import { getSupabaseServiceClient } from '../lib/supabaseAdmin.js';
import { corsHeaders } from '../lib/cors.js';
import { notifyAdminAcquisition } from '../lib/email.js';

export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const normalized = email.toLowerCase().trim();

  try {
    const { data: prior } = await supabase
      .from('newsletter_subscribers')
      .select('email, unsubscribed')
      .eq('email', normalized)
      .maybeSingle();

    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        { email: normalized, source: 'blog', unsubscribed: false },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Newsletter subscribe error:', error);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }

    const isNewOrResub = !prior || prior.unsubscribed === true;
    if (isNewOrResub) {
      try {
        await notifyAdminAcquisition({
          type: 'newsletter',
          subscriberEmail: normalized,
          detail: {
            source: 'blog',
            signup: prior ? 'resubscribed' : 'new',
          },
        });
      } catch (_) { /* non-fatal */ }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
