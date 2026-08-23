import crypto from 'crypto';

import { getSupabaseServiceClient } from '../../lib/supabaseAdmin.js';

const buckets = globalThis.__no3dAuthRateBuckets || new Map();
globalThis.__no3dAuthRateBuckets = buckets;

export async function allowSignInRequest(req, { maxAttempts = 5 } = {}) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const key = crypto.createHash('sha256').update(`${ip}:${process.env.COMMERCE_SITE_BACKEND_SECRET || ''}`).digest('hex');
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const { data, error } = await supabase.rpc('no3d_consume_auth_rate_limit', {
      p_bucket_key: key,
      p_max_attempts: maxAttempts,
      p_window_seconds: 600,
    });
    if (error) throw new Error(`Distributed sign-in rate limit failed: ${error.message}`);
    return data === true;
  }
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('Distributed sign-in rate limit is not configured');
  }
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= maxAttempts) return false;
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
