/**
 * Subscription/license access for NO3D Tools subscriber APIs (validate, manifest, download).
 * Aligns with Stripe webhook rows in `subscriptions`: status active | grace | expired.
 */

/**
 * @typedef {object} SubscriptionRow
 * @property {string} stripe_customer_id
 * @property {string | null} stripe_sub_id
 * @property {string} email
 * @property {string} license_key
 * @property {'active'|'grace'|'expired'} status
 * @property {string | null} expires_at
 * @property {string | null} grace_until
 * @property {'free'|'subscriber'} [tier]
 */

/**
 * @param {SubscriptionRow | null} row
 * @param {Date} [now]
 * @returns {{ allowed: boolean, effectiveStatus: 'active'|'grace'|'expired'|'free'|'invalid', expires_at: string | null, grace_until: string | null }}
 */
export function computeAccessState(row, now = new Date()) {
  if (!row) {
    return { allowed: false, effectiveStatus: 'invalid', expires_at: null, grace_until: null };
  }

  const { status, expires_at, grace_until, tier } = row;

  // Free tier: valid license but no subscriber asset access
  if (tier === 'free') {
    return { allowed: false, effectiveStatus: 'free', expires_at: null, grace_until: null };
  }

  if (status === 'active') {
    return {
      allowed: true,
      effectiveStatus: 'active',
      expires_at: expires_at ?? null,
      grace_until: grace_until ?? null
    };
  }

  if (status === 'grace') {
    const gu = grace_until ? new Date(grace_until) : null;
    if (gu && gu > now) {
      return {
        allowed: true,
        effectiveStatus: 'grace',
        expires_at: expires_at ?? null,
        grace_until: grace_until ?? null
      };
    }
    return {
      allowed: false,
      effectiveStatus: 'expired',
      expires_at: expires_at ?? null,
      grace_until: grace_until ?? null
    };
  }

  if (status === 'expired') {
    return {
      allowed: false,
      effectiveStatus: 'expired',
      expires_at: expires_at ?? null,
      grace_until: grace_until ?? null
    };
  }

  return { allowed: false, effectiveStatus: 'invalid', expires_at: null, grace_until: null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} licenseKey
 * @returns {Promise<SubscriptionRow | null>}
 */
export async function fetchSubscriptionByLicenseKey(supabase, licenseKey) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_sub_id, email, license_key, status, expires_at, grace_until, tier')
    .eq('license_key', licenseKey)
    .maybeSingle();

  if (error) {
    console.error('subscriptions lookup error:', error.message);
    return null;
  }
  return data ?? null;
}

/**
 * Library version for validate responses: env NO3D_LIBRARY_VERSION (e.g. semver), else manifest version is maintained separately.
 * @returns {string}
 */
export function getLibraryVersionForApi() {
  const v = process.env.NO3D_LIBRARY_VERSION;
  return typeof v === 'string' && v.trim() ? v.trim() : '0.0.0';
}
