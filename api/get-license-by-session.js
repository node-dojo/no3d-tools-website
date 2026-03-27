/**
 * GET /api/get-license-by-session
 *
 * Query: session_id (Stripe Checkout Session id, e.g. cs_...)
 *
 * Bridges the gap between Stripe checkout completion and license key
 * availability on the success page. The webhook may not have fired yet
 * when the user lands on the success page, so callers should poll.
 *
 * Returns:
 *   { license_key, email, status, expires_at }   — subscription found
 *   { pending: true }                             — webhook hasn't processed yet
 */

import Stripe from 'stripe';
import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query;
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'session_id required' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Server misconfigured: Supabase service role missing' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get customer ID from Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || !session.customer) {
      return res.status(404).json({ error: 'Session not found or no customer' });
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer.id;

    // Look up subscription by customer ID
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('license_key, email, status, expires_at')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error || !subscription) {
      // Webhook hasn't processed yet
      return res.status(200).json({ pending: true });
    }

    return res.status(200).json({
      license_key: subscription.license_key,
      email: subscription.email,
      status: subscription.status,
      expires_at: subscription.expires_at,
    });
  } catch (err) {
    console.error('Error fetching license by session:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
