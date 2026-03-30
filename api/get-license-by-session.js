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
import crypto from 'crypto';
import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';
import { sendLicenseKeyEmail } from './lib/email.js';

function generateLicenseKey() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const chars = new Array(16).fill(null).map(() => alphabet[crypto.randomInt(0, alphabet.length)]);
  const s = chars.join('');
  return `NO3D-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

import { setCorsHeaders } from './lib/cors.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) return;

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

    // Get session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription'],
    });
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

    if (!error && subscription) {
      return res.status(200).json({
        license_key: subscription.license_key,
        email: subscription.email,
        status: subscription.status,
        expires_at: subscription.expires_at,
      });
    }

    // Webhook hasn't processed yet — provision directly from Stripe session
    // data as a resilient fallback. Only provision for paid sessions.
    if (session.payment_status !== 'paid') {
      return res.status(200).json({ pending: true });
    }

    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      return res.status(200).json({ pending: true });
    }

    const licenseKey = generateLicenseKey();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stripeSub = session.subscription;
    const stripeSubId =
      typeof stripeSub === 'string'
        ? stripeSub
        : stripeSub?.id || null;

    const { error: upsertError } = await supabase.from('subscriptions').upsert(
      {
        stripe_customer_id: customerId,
        stripe_sub_id: stripeSubId,
        email,
        license_key: licenseKey,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        grace_until: null,
      },
      { onConflict: 'stripe_customer_id' }
    );

    if (upsertError) {
      console.error('Fallback license provisioning failed:', upsertError);
      return res.status(200).json({ pending: true });
    }

    // Send license email (best-effort)
    try {
      if (process.env.LICENSE_EMAIL_DRY_RUN !== 'true') {
        await sendLicenseKeyEmail(email, licenseKey, process.env.ADDON_DOWNLOAD_URL);
      }
    } catch (emailErr) {
      console.error('License email send failed:', emailErr?.message || emailErr);
    }

    return res.status(200).json({
      license_key: licenseKey,
      email,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Error fetching license by session:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
