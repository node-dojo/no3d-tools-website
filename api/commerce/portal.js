import { commerceError, commerceFetch } from './lib/client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const { response, payload } = await commerceFetch(req, res, '/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnTarget: 'product' }),
    });
    if (!response.ok) return res.status(response.status).json({ error: payload.error || 'portal_failed' });
    if (typeof payload.url !== 'string' || !payload.url.startsWith('https://')) {
      throw new Error('Commerce returned an invalid Portal result');
    }
    return res.status(200).json({ url: payload.url });
  } catch (error) {
    return commerceError(res, error);
  }
}
