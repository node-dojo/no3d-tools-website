import { claimPurchasingGuest } from './lib/claim.js';
import { authenticatedSession } from './lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const auth = await authenticatedSession(req, res);
    if (!auth) return res.status(401).json({ error: 'sign_in_required' });
    const result = await claimPurchasingGuest(req, auth.user);
    if (result.status === 'identity_collision') return res.status(409).json({ error: 'identity_collision' });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Purchase claim failed', { error: error instanceof Error ? error.message : 'unknown_error' });
    return res.status(400).json({ error: 'claim_failed' });
  }
}
