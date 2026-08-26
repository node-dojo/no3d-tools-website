import { allowSignInRequest } from './lib/rate-limit.js';
import { issuePurchaseRecovery } from './lib/recovery.js';
import { requestSignInLink } from './lib/session.js';
import { v3OwnerAllowed } from './lib/v3-access.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    if (!await allowSignInRequest(req)) return res.status(429).json({ error: 'try_again_later' });
  } catch (error) {
    console.error('Purchase recovery rate limit failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return res.status(429).json({ error: 'try_again_later' });
  }
  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    return res.status(202).json({ sent: true });
  }
  try {
    const recovery = await issuePurchaseRecovery(req, orderId);
    if (!v3OwnerAllowed(recovery.contactEmail)) return res.status(202).json({ sent: true });
    await requestSignInLink(req, res, recovery.contactEmail, {
      recoveryToken: recovery.token,
      next: `/v3/account/orders/${orderId}`,
    });
  } catch (error) {
    console.error('Purchase recovery link request failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
  return res.status(202).json({ sent: true });
}
