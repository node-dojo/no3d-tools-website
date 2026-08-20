import { authenticatedSession } from '../auth/lib/session.js';
import { computeAccessState } from '../lib/subscriptionAccess.js';
import { getSupabaseServiceClient } from '../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const auth = await authenticatedSession(req, res);
    if (!auth?.user?.email || !auth.user.email_confirmed_at) {
      return res.status(401).json({ error: 'not_authenticated' });
    }
    const supabase = getSupabaseServiceClient();
    if (!supabase) return res.status(503).json({ error: 'membership_unavailable' });
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, expires_at, grace_until, tier')
      .eq('email', auth.user.email.trim().toLowerCase())
      .neq('tier', 'free')
      .order('expires_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const access = computeAccessState(data?.[0] || null);
    return res.status(200).json({
      active: access.allowed,
      status: access.effectiveStatus,
      expiresAt: access.expires_at,
      graceUntil: access.grace_until,
    });
  } catch (error) {
    console.error('Membership account inspection failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return res.status(503).json({ error: 'membership_unavailable' });
  }
}
