import { getSupabaseServiceClient } from '../../lib/supabaseAdmin.js';
import { isR2Configured, presignGetObject } from '../../lib/r2.js';
import {
  commerceError,
  commerceFetch,
  validProductRecovery,
} from '../lib/client.js';

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRESIGN_TTL_SECONDS = 900;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const orderId = Array.isArray(req.query.orderId) ? req.query.orderId[0] : req.query.orderId;
  if (typeof orderId !== 'string' || !ORDER_ID.test(orderId)) {
    return res.status(400).json({ error: 'invalid_order_id' });
  }

  try {
    const { response, payload: order } = await commerceFetch(req, res, `/api/orders/${orderId}`);
    if (!response.ok) return res.status(response.status).json({ error: order.error || 'order_lookup_failed' });
    if (!validProductRecovery(order)) {
      return res.status(403).json({ error: 'product_not_ready' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase || !isR2Configured()) return res.status(503).json({ error: 'delivery_unavailable' });
    const { data: product, error } = await supabase
      .from('products')
      .select('handle, file_url, checksum, status')
      .eq('handle', order.recovery.product_handle)
      .maybeSingle();
    if (error) throw new Error(`Product lookup failed: ${error.message}`);
    if (!product || product.status !== 'active' || typeof product.file_url !== 'string' || !product.file_url.trim()) {
      return res.status(404).json({ error: 'asset_not_available' });
    }

    const url = await presignGetObject(product.file_url.trim(), PRESIGN_TTL_SECONDS);
    return res.status(200).json({
      url,
      expiresIn: PRESIGN_TTL_SECONDS,
      handle: product.handle,
      checksum: product.checksum ?? null,
    });
  } catch (error) {
    return commerceError(res, error);
  }
}
