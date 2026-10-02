import { individualProductsEnabled } from './lib/client.js';
import { membershipExpectedEnvironment } from '../lib/payment-environment.js';

/**
 * Exposes only the public rollout state. Commerce configuration and credentials
 * remain server-only in the adapter.
 */
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    individualProductsEnabled: individualProductsEnabled(),
    membershipExpectedEnvironment: membershipExpectedEnvironment(),
  });
}
