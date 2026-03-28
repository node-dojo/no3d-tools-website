/**
 * POST /api/create-free-account
 * Body: { email: string }
 *
 * Creates a free-tier subscription record in Supabase.
 * Generates a license key, emails it, and returns it.
 * If the email already has a record, returns the existing license key.
 *
 * Returns:
 *   { license_key, email, tier, download_url }
 */

import crypto from 'crypto';
import { getSupabaseServiceClient } from './lib/supabaseAdmin.js';
import { sendLicenseKeyEmail } from './lib/email.js';

function generateLicenseKey() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const chars = new Array(16).fill(null).map(() => alphabet[crypto.randomInt(0, alphabet.length)]);
  const s = chars.join('');
  return `NO3D-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
      // Already registered — return existing key
      return res.status(200).json({
        license_key: existing.license_key,
        email,
        tier: existing.tier || 'free',
        existing: true,
        download_url: '/api/download-addon'
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

    // Send license key email (non-blocking — don't fail if email fails)
    const siteUrl = process.env.SITE_URL || 'https://no3dtools.com';
    try {
      if (process.env.LICENSE_EMAIL_DRY_RUN !== 'true') {
        await sendLicenseKeyEmail(email, licenseKey, `${siteUrl}/api/download-addon`);
      }
    } catch (emailErr) {
      console.error('License email failed (non-fatal):', emailErr.message);
    }

    return res.status(201).json({
      license_key: licenseKey,
      email,
      tier: 'free',
      existing: false,
      download_url: '/api/download-addon'
    });
  } catch (err) {
    console.error('create-free-account error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
