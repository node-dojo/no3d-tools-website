/**
 * POST /api/join
 *
 * Simple email list signup — no license key, no download, just capture the email.
 * Creates a free-tier subscription row if the email doesn't exist yet.
 * Returns { ok: true, existing: bool }
 */

import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, source } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('email, tier, status')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ ok: true, existing: true });
    }

    // Create email-only row (no license key yet — they'll get one when they download)
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        email: email.toLowerCase().trim(),
        license_key: 'pending-' + crypto.randomUUID().slice(0, 8),
        status: 'active',
        tier: 'free',
        source: source || 'email_signup',
        stripe_customer_id: 'email-' + crypto.randomUUID().slice(0, 12),
      });

    if (error) {
      console.error('Join error:', error.message);
      return res.status(500).json({ error: 'Failed to save' });
    }

    // Log event
    try {
      await supabase.from('site_events').insert({
        event: 'email_signup',
        properties: { email_domain: email.split('@')[1], source: source || 'email_signup' },
        page: '/api/join',
      });
    } catch (_) {}

    return res.status(201).json({ ok: true, existing: false });
  } catch (err) {
    console.error('Join error:', err.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
