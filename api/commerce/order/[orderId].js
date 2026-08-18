import { commerceError, commerceFetch } from '../lib/client.js';

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const orderId = Array.isArray(req.query.orderId) ? req.query.orderId[0] : req.query.orderId;
  if (typeof orderId !== 'string' || !ORDER_ID.test(orderId)) return res.status(400).json({ error: 'invalid_order_id' });

  try {
    const { response, payload } = await commerceFetch(req, res, `/api/orders/${orderId}`);
    return res.status(response.status).json(payload);
  } catch (error) {
    return commerceError(res, error);
  }
}
