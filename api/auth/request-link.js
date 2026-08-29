import { isAuthEmailDeliveryError, isAuthRateLimitError, requestSignInLink } from './lib/session.js';
import { allowSignInRequest } from './lib/rate-limit.js';
import { v3OwnerAllowed } from './lib/v3-access.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    if (!await allowSignInRequest(req)) return res.status(429).json({ error: 'try_again_later' });
  } catch (error) {
    console.error('Passwordless sign-in rate limit failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return res.status(429).json({ error: 'try_again_later' });
  }
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const next = typeof req.body?.next === 'string' ? req.body.next : undefined;
  if (!EMAIL.test(email) || email.length > 254) {
    return res.status(202).json({ sent: true });
  }
  if (!v3OwnerAllowed(email)) return res.status(202).json({ sent: true });
  try {
    await requestSignInLink(req, res, email, { next });
  } catch (error) {
    console.error('Passwordless sign-in request failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    if (isAuthRateLimitError(error)) {
      return res.status(429).json({ error: 'try_again_later' });
    }
    if (isAuthEmailDeliveryError(error)) {
      return res.status(503).json({ error: 'email_unavailable' });
    }
  }
  return res.status(202).json({ sent: true });
}
