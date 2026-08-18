import { commerceError, commerceFetch } from './lib/client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const { response, payload } = await commerceFetch(req, res, '/api/account');
    return res.status(response.status).json(payload);
  } catch (error) {
    return commerceError(res, error);
  }
}
