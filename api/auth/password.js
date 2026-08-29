import { allowSignInRequest } from './lib/rate-limit.js';
import { claimPurchasingGuest } from './lib/claim.js';
import { issuePurchaseRecovery } from './lib/recovery.js';
import { clearAuthCookies, passwordSignIn, passwordSignUp, safeAuthNext } from './lib/session.js';
import { v3OwnerAllowed } from './lib/v3-access.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PURCHASE_ORDER_NEXT = /^\/v3\/account\/orders\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i;

export function purchaseOrderIdFromNext(next) {
  return typeof next === 'string' ? (next.match(PURCHASE_ORDER_NEXT)?.[1] || null) : null;
}

async function confirmationRecoveryToken(req, next) {
  const orderId = purchaseOrderIdFromNext(next);
  if (!orderId) return undefined;
  try {
    return (await issuePurchaseRecovery(req, orderId)).token;
  } catch (error) {
    // Checkout fulfillment can still be settling. The same-browser guest-cookie
    // claim remains valid; the order-bound proof is a resilience path.
    console.warn('Purchase confirmation proof unavailable', {
      error: error instanceof Error ? error.message : 'unknown_error',
      orderId,
    });
    return undefined;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const mode = req.body?.mode === 'signin' ? 'signin' : 'signup';
  try {
    if (!await allowSignInRequest(req, { maxAttempts: mode === 'signup' ? 10 : 5 })) {
      return res.status(429).json({ error: 'try_again_later' });
    }
  } catch {
    return res.status(429).json({ error: 'try_again_later' });
  }
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const next = safeAuthNext(req.body?.next) || '/v3/account/?state=install';
  if (!EMAIL.test(email) || email.length > 254 || password.length < 10 || password.length > 200) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }
  if (!v3OwnerAllowed(email)) return res.status(403).json({ error: 'staging_access_denied' });
  try {
    const recoveryToken = mode === 'signup'
      ? await confirmationRecoveryToken(req, next)
      : undefined;
    let result = mode === 'signin'
      ? await passwordSignIn(res, email, password)
      : await passwordSignUp(req, res, email, password, { next, recoveryToken });
    if (mode === 'signup' && result.accountExists) {
      try {
        result = await passwordSignIn(res, email, password);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        return res.status(409).json({
          error: message.includes('confirm') ? 'account_unverified' : 'account_password_mismatch',
        });
      }
    }
    let destination = next;
    let claim = { status: 'verification_pending' };
    if (result.authenticated && result.user) {
      try {
        claim = await claimPurchasingGuest(req, result.user);
      } catch (error) {
        console.error('Password account claim failed', { error: error instanceof Error ? error.message : 'unknown_error' });
        clearAuthCookies(res);
        return res.status(503).json({ error: 'account_claim_failed' });
      }
      if (claim.status === 'identity_collision') {
        destination = `${next}${next.includes('?') ? '&' : '?'}claim=review`;
      }
    }
    return res.status(mode === 'signin' ? 200 : 201).json({ ...result, claimStatus: claim.status, next: destination });
  } catch (error) {
    console.error('Password authentication failed', { error: error instanceof Error ? error.message : 'unknown_error' });
    return res.status(400).json({ error: 'authentication_failed' });
  }
}
