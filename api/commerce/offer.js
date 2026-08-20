import {
  commerceBackendFetch,
  commerceError,
  offerKeyForHandle,
} from './lib/client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const handle = Array.isArray(req.query.handle) ? req.query.handle[0] : req.query.handle;
  const offerKey = offerKeyForHandle(handle);
  if (!offerKey) return res.status(400).json({ error: 'invalid_product_handle' });

  try {
    const query = new URLSearchParams({ offerKey });
    const { response, payload } = await commerceBackendFetch(`/api/offer?${query}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: payload.error || 'offer_unavailable' });
    }

    const offer = payload.offer;
    const valid = offer?.offerKey === offerKey &&
      offer?.resourceId === handle &&
      typeof offer?.currency === 'string' &&
      Number.isInteger(offer?.unitAmount) &&
      offer.unitAmount >= 0;
    if (!valid) throw new Error('Commerce returned an invalid public offer');

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ offer });
  } catch (error) {
    return commerceError(res, error);
  }
}
