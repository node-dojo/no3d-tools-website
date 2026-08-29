import { claimPurchasingGuest } from './lib/claim.js';
import { allowRequest } from './lib/rate-limit.js';
import { redeemPurchaseRecovery } from './lib/recovery.js';
import { clearAuthCookies, openAuthEmailGrant, verifyAuthEmailGrant } from './lib/session.js';
import { v3OwnerAllowed } from './lib/v3-access.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    if (!await allowRequest(req, { maxAttempts: 20, namespace: 'auth-complete', windowSeconds: 600 })) {
      return res.status(429).json({ error: 'try_again_later' });
    }
  } catch {
    return res.status(429).json({ error: 'try_again_later' });
  }
  const grant = openAuthEmailGrant(req.body?.grant);
  if (!grant) return res.status(400).json({ error: 'invalid_or_expired_link' });
  try {
    const { user } = await verifyAuthEmailGrant(res, grant);
    if (!user || !v3OwnerAllowed(user.email)) {
      clearAuthCookies(res);
      return res.status(403).json({ error: 'staging_access_denied' });
    }
    const claim = grant.recoveryToken
      ? await redeemPurchaseRecovery(user, grant.recoveryToken)
      : await claimPurchasingGuest(req, user);
    const suffix = claim.status === 'identity_collision'
      ? 'claim=review'
      : claim.status === 'invalid_recovery'
        ? 'recovery=invalid'
        : 'auth=signed-in';
    return res.status(200).json({
      authenticated: true,
      next: `${grant.next}${grant.next.includes('?') ? '&' : '?'}${suffix}`,
    });
  } catch (error) {
    console.error('Scanner-safe email authentication failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    clearAuthCookies(res);
    return res.status(400).json({ error: 'invalid_or_expired_link' });
  }
}
