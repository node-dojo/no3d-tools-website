import { commerceFetch, commerceError } from '../../commerce/lib/client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const { response, payload } = await commerceFetch(req, res, '/api/devices/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceLabel: req.body?.deviceLabel })
    });
    if (!response.ok) return res.status(response.status).json(payload);
    const origin = process.env.SITE_URL || 'https://no3dtools.com';
    return res.status(201).json({ ...payload, approvalUrl: `${origin}/connect-purchases.html?code=${encodeURIComponent(payload.deviceCode)}` });
  } catch (error) { return commerceError(res, error); }
}
