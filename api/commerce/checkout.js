import {
  commerceError,
  commerceFetch,
  individualProductsEnabled,
  offerKeyForHandle,
} from './lib/client.js';
import { getSupabaseServiceClient } from '../lib/supabaseAdmin.js';
import { getPrintDelivery } from '../prints/lib/catalog.js';
import { resolvePrintAccess } from '../prints/lib/access.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!individualProductsEnabled()) return res.status(503).json({ error: 'commerce_not_ready' });

  const attemptToken = typeof req.body?.attemptToken === 'string' ? req.body.attemptToken : '';
  if (!/^[A-Za-z0-9_-]{16,200}$/.test(attemptToken)) {
    return res.status(400).json({ error: 'invalid_attempt_token' });
  }
  const handle = typeof req.body?.handle === 'string' ? req.body.handle.trim() : '';
  const offerKey = offerKeyForHandle(handle);
  if (!offerKey) return res.status(400).json({ error: 'invalid_product_handle' });

  try {
    const print = getPrintDelivery(handle);
    if (print) {
      const { access } = await resolvePrintAccess(req, res, handle);
      if (access.mode === 'download') return res.status(409).json({ error: 'already_entitled' });
      if (access.mode === 'unavailable' || print.status !== 'active') return res.status(503).json({ error: 'delivery_unavailable' });
    }
    if (!print) {
      const supabase = getSupabaseServiceClient();
      if (!supabase) return res.status(503).json({ error: 'catalog_unavailable' });
      const { data: product, error } = await supabase
        .from('products')
        .select('handle, status')
        .eq('handle', handle)
        .maybeSingle();
      if (error) throw new Error(`Product lookup failed: ${error.message}`);
      if (!product || product.status !== 'active') return res.status(404).json({ error: 'product_not_available' });
    }

    const { response, payload } = await commerceFetch(req, res, '/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptToken,
        offerKey,
        returnTarget: 'product',
      }),
    });
    if (!response.ok) return res.status(response.status).json({ error: payload.error || 'checkout_failed' });
    if (typeof payload.checkoutUrl !== 'string' || typeof payload.orderId !== 'string') {
      throw new Error('Commerce returned an invalid checkout result');
    }
    return res.status(200).json({ checkoutUrl: payload.checkoutUrl, orderId: payload.orderId });
  } catch (error) {
    return commerceError(res, error);
  }
}
