import { claimPurchasingGuest } from './lib/claim.js';
import { redeemPurchaseRecovery } from './lib/recovery.js';
import { clearAuthCookies, clearAuthNext, exchangeAuthCode, readAuthNext, safeAuthNext } from './lib/session.js';
import { v3OwnerAllowed } from './lib/v3-access.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const intendedNext = safeAuthNext(req.query?.next) || readAuthNext(req) || '/v3/account/?state=install';
  const code = typeof req.query?.code === 'string' ? req.query.code : '';
  if (!code) return res.redirect(303, `/v3/onboarding/create-account/?auth=invalid&next=${encodeURIComponent(intendedNext)}`);

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
    clearAuthNext(res);
    return res.redirect(303, `${intendedNext}${intendedNext.includes('?') ? '&' : '?'}${suffix}`);
  } catch (error) {
    console.error('Passwordless callback failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    clearAuthCookies(res);
    if (intendedNext.startsWith('/v3/')) {
      return res.redirect(303, `/v3/onboarding/create-account/?auth=invalid&next=${encodeURIComponent(intendedNext)}`);
    }
    return res.redirect(303, '/account?auth=invalid');
  }
}
