import crypto from 'crypto';

import { setCorsHeaders } from '../lib/cors.js';
import { collectionOfferKey, commerceError, commerceFetch } from './lib/client.js';

export default async function handler(req, res) {
  if (setCorsHeaders(req, res, { methods: 'POST, OPTIONS' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (process.env.COMMERCE_COLLECTIONS_ENABLED !== 'true') return res.status(503).json({ error: 'collection_checkout_unavailable' });
  const handle = typeof req.body?.handle === 'string' ? req.body.handle : '';
  const schedule = typeof req.body?.schedule === 'string' ? req.body.schedule : '';
  const offerKey = collectionOfferKey(handle, schedule);
  if (!offerKey) return res.status(400).json({ error: 'invalid_collection_offer' });

  try {
    const { response, payload } = await commerceFetch(req, res, '/api/checkout', {
      body: JSON.stringify({
        attemptToken: crypto.randomBytes(24).toString('base64url'),
        offerKey,
        returnTarget: 'product',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    return res.status(response.status).json(payload);
  } catch (error) {
    return commerceError(res, error);
  }
}
