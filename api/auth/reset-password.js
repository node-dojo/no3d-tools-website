import { allowRequest } from './lib/rate-limit.js';
import { claimPurchasingGuest } from './lib/claim.js';
import { issuePurchaseRecovery, redeemPurchaseRecovery } from './lib/recovery.js';
import { passwordSignIn } from './lib/session.js';
import { v3OwnerAllowed } from './lib/v3-access.js';
import { clearPasswordReset, openPasswordResetGrant, readPasswordReset, resetNext, sendPasswordReset, updateRecoveredPassword, verifyPasswordReset } from './lib/password-reset.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function sameOriginResetRequest(req) {
  try {
    return req.headers.origin === new URL(process.env.NO3D_SITE_URL).origin
      && /^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')
      && req.headers['sec-fetch-site'] !== 'cross-site';
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'GET') {
    const state = readPasswordReset(req);
    return res.status(200).json({ ready: Boolean(state), next: state?.next || '/v3/account/' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!sameOriginResetRequest(req)) return res.status(403).json({ error: 'request_not_allowed' });
  const action = req.body?.action;
  if (!['request', 'verify', 'update'].includes(action)) return res.status(400).json({ error: 'invalid_request' });
  try {
    if (!await allowRequest(req, { namespace: `password-reset-${action}`, maxAttempts: action === 'request' ? 5 : 15, windowSeconds: 600 })) return res.status(429).json({ error: 'try_again_later' });
  } catch { return res.status(503).json({ error: 'recovery_unavailable' }); }

  if (action === 'request') {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const next = resetNext(req.body.next);
    if (!EMAIL.test(email) || email.length > 254) return res.status(400).json({ error: 'invalid_email' });
    if (!v3OwnerAllowed(email)) return res.status(202).json({ sent: true });
    try {
      const orderId = next.match(/^\/v3\/account\/orders\/([0-9a-f-]{36})\/?$/i)?.[1];
      let proof = '';
      if (orderId) {
        try {
          const recovery = await issuePurchaseRecovery(req, orderId);
          if (recovery.contactEmail.trim().toLowerCase() === email) proof = recovery.token;
        } catch { /* Existing account ownership remains independent of a guest claim. */ }
      }
      await sendPasswordReset(email, next, proof);
    } catch (error) {
      // The response does not disclose whether an email is registered. A reset
      // never creates an account, unlike the passwordless sign-up API.
      if (error.status !== 404 && !['user_not_found', 'email_not_found'].includes(error.code)) {
        console.error('Password reset request unavailable');
        return res.status(503).json({ error: 'recovery_unavailable' });
      }
    }
    return res.status(202).json({ sent: true });
  }
  if (action === 'verify') {
    clearPasswordReset(res);
    const grant = openPasswordResetGrant(req.body.grant);
    if (!grant) return res.status(400).json({ error: 'invalid_or_expired_link' });
    try {
      await verifyPasswordReset(res, grant);
      return res.status(200).json({ ready: true, next: grant.next });
    } catch { return res.status(400).json({ error: 'invalid_or_expired_link' }); }
  }
  const state = readPasswordReset(req);
  if (!state) return res.status(401).json({ error: 'invalid_or_expired_link' });
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) return res.status(400).json({ error: 'invalid_password' });
  let result;
  try {
    result = await updateRecoveredPassword(res, state, password);
  } catch (error) {
    if (error.code === 'same_password') return res.status(400).json({ error: 'same_password' });
    if (error.code === 'weak_password') return res.status(400).json({ error: 'weak_password' });
    if ([400, 401, 403].includes(error.status) || error.message === 'invalid_recovery_identity') {
      clearPasswordReset(res);
      return res.status(401).json({ error: 'invalid_or_expired_link' });
    }
    return res.status(503).json({ error: 'recovery_unavailable' });
  }
  const signIn = `/v3/onboarding/create-account/?mode=signin&password=updated&next=${encodeURIComponent(state.next)}`;
  if (!result.sessionsRevoked) return res.status(200).json({ updated: true, authenticated: false, next: signIn });
  try {
    await passwordSignIn(res, result.user.email, password);
  } catch { return res.status(200).json({ updated: true, authenticated: false, next: signIn }); }
  let next = state.next;
  try {
    const claim = state.recoveryToken ? await redeemPurchaseRecovery(result.user, state.recoveryToken) : await claimPurchasingGuest(req, result.user, { next });
    if (claim.status === 'identity_collision') next += `${next.includes('?') ? '&' : '?'}claim=review`;
  } catch { /* A successful password change must not depend on Commerce uptime. */ }
  return res.status(200).json({ updated: true, authenticated: true, next });
}
