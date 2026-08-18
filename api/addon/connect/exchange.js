import { commerceFetch, commerceError } from '../../commerce/lib/client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const { response, payload } = await commerceFetch(req, res, '/api/devices/exchange', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode: req.body?.deviceCode, exchangeSecret: req.body?.exchangeSecret })
    });
    return res.status(response.status).json(payload);
  } catch (error) { return commerceError(res, error); }
}
