import { claimPurchasingGuest } from './lib/claim.js';
import { redeemPurchaseRecovery } from './lib/recovery.js';
import { clearAuthCookies, exchangeAuthCode, safeAuthNext } from './lib/session.js';
import { v3OwnerAllowed } from './lib/v3-access.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const code = typeof req.query?.code === 'string' ? req.query.code : '';
  if (!code) return res.redirect(303, '/account?auth=invalid');

  try {
    const { user } = await exchangeAuthCode(req, res, code);
    if (!v3OwnerAllowed(user.email)) {
      clearAuthCookies(res);
      return res.redirect(303, '/v3/access/?access=denied');
    }
    const recoveryToken = typeof req.query?.recovery_token === 'string' ? req.query.recovery_token : '';
    const claim = recoveryToken
      ? await redeemPurchaseRecovery(user, recoveryToken)
      : await claimPurchasingGuest(req, user);
    const suffix = claim.status === 'identity_collision'
      ? 'claim=review'
      : claim.status === 'invalid_recovery'
        ? 'recovery=invalid'
        : 'auth=signed-in';
    const next = safeAuthNext(req.query?.next) || '/account';
    return res.redirect(303, `${next}${next.includes('?') ? '&' : '?'}${suffix}`);
  } catch (error) {
    console.error('Passwordless callback failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    clearAuthCookies(res);
    const next = safeAuthNext(req.query?.next);
    if (next?.startsWith('/v3/')) {
      return res.redirect(303, `/v3/onboarding/create-account/?auth=invalid&next=${encodeURIComponent(next)}`);
    }
    return res.redirect(303, '/account?auth=invalid');
  }
}
