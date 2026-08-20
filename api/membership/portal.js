import Stripe from 'stripe';

import { authenticatedSession } from '../auth/lib/session.js';
import { getSupabaseServiceClient } from '../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const auth = await authenticatedSession(req, res);
    if (!auth?.user?.email || !auth.user.email_confirmed_at) {
      return res.status(401).json({ error: 'not_authenticated' });
    }
    const supabase = getSupabaseServiceClient();
    if (!supabase || !process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'billing_unavailable' });
    }
    const { data, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, tier')
      .eq('email', auth.user.email.trim().toLowerCase())
      .neq('tier', 'free')
      .order('expires_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const customerId = data?.[0]?.stripe_customer_id;
    if (!customerId) return res.status(404).json({ error: 'membership_not_found' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const siteUrl = (process.env.NO3D_SITE_URL || process.env.SITE_URL || 'https://no3dtools.com').replace(/\/$/, '');
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/v3/account/`,
    });
    return res.status(200).json({ url: portal.url });
  } catch (error) {
    console.error('Membership billing portal failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return res.status(503).json({ error: 'billing_unavailable' });
  }
}
