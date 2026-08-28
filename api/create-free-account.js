/**
 * POST /api/create-free-account
 * Body: { email: string }
 *
 * Creates a free-tier subscription record in Supabase.
 * Generates a license key, emails it, and returns it.
 * If the email already has a record, returns the existing license key.
 *
 * Returns:
 *   { license_key, email, tier, install_url }
 */

import crypto from 'crypto';
import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';
import { sendLicenseKeyEmail, notifyAdminAcquisition } from './lib/email.js';
import { setCorsHeaders } from './lib/cors.js';
import { allowRequest } from './auth/lib/rate-limit.js';

function generateLicenseKey() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const chars = new Array(16).fill(null).map(() => alphabet[crypto.randomInt(0, alphabet.length)]);
  const s = chars.join('');
  return `NO3D-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (setCorsHeaders(req, res, { methods: 'POST, OPTIONS' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (Number(req.headers['content-length'] || 0) > 8_192) return res.status(413).json({ error: 'Payload too large' });
  try {
    if (!await allowRequest(req, { maxAttempts: 5, namespace: 'free-account', windowSeconds: 60 })) {
      return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    }
  } catch {
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  }

  const body = typeof req.body === 'object' ? req.body : {};
  const email = (body.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    // Check if email already has a subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('license_key, tier, status')
      .eq('email', email)
      .maybeSingle();

    if (existing?.license_key) {
      // Already registered — re-send the key via email, don't expose it in the response
      const siteUrl = process.env.SITE_URL || 'https://no3dtools.com';
      try {
        await sendLicenseKeyEmail(email, existing.license_key, `${siteUrl}/v3/account/?state=install`);
      } catch (emailErr) {
        console.error('Failed to re-send license key email:', emailErr?.message || emailErr);
      }
      return res.status(200).json({
        email,
        existing: true,
        message: 'A No3D Tools License Key has been sent to your email.'
      });
    }

    // Create new free-tier record
    const licenseKey = generateLicenseKey();

    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        email,
        license_key: licenseKey,
        status: 'active',
        tier: 'free',
        stripe_customer_id: null,
        stripe_sub_id: null,
        expires_at: null,
        grace_until: null
      });

    if (insertError) {
      console.error('Failed to create free account:', insertError.message);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Log email capture event server-side
    try {
      await supabase.from('site_events').insert({
        event: 'email_captured',
        properties: { email_domain: email.split('@')[1], tier: 'free' },
        page: '/api/create-free-account',
      });
    } catch (_) { /* never block account creation on analytics */ }

    // Send license key email (non-blocking — don't fail if email fails)
    const siteUrl = process.env.SITE_URL || 'https://no3dtools.com';
    try {
      if (process.env.LICENSE_EMAIL_DRY_RUN !== 'true') {
        await sendLicenseKeyEmail(email, licenseKey, `${siteUrl}/v3/account/?state=install`);
      }
    } catch (emailErr) {
      console.error('License email failed (non-fatal):', emailErr.message);
    }

    try {
      await notifyAdminAcquisition({
        type: 'free_license',
        subscriberEmail: email,
        detail: { tier: 'free', endpoint: '/api/create-free-account' },
      });
    } catch (_) { /* non-fatal */ }

    return res.status(201).json({
      license_key: licenseKey,
      email,
      tier: 'free',
      existing: false,
      install_url: '/v3/account/?state=install'
    });
  } catch (err) {
    console.error('create-free-account error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
