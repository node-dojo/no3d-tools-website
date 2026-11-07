import { commerceBackendFetch, commerceFetch } from '../../commerce/lib/client.js';
import { allowRequest } from '../../auth/lib/rate-limit.js';
import { getPrintDelivery } from './catalog.js';
import { isR2Configured, presignGetObject } from '../../lib/r2.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createPrintPurchaseHandler(dependencies = {}) {
  const service = { commerceBackendFetch, commerceFetch, allowRequest, product: getPrintDelivery, ready: isR2Configured, sign: presignGetObject, ...dependencies };
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    // Pausing new account-free checkout must not invalidate previously emailed links.
    // Commerce still enforces paid ownership and the delivery service's availability.
    if (req.headers.origin && req.headers.origin !== new URL(process.env.SITE_URL || 'https://no3dtools.com').origin) return res.status(403).json({ error: 'invalid_origin' });
    const input = req.body || {};
    if (!['order','access','recover','preferences'].includes(input.action)) return res.status(400).json({ error: 'invalid_request' });
    const body = { action: input.action };
    if (input.action === 'order') {
      if (typeof input.orderId !== 'string' || !uuid.test(input.orderId)) return res.status(400).json({ error: 'invalid_order' });
      body.orderId = input.orderId;
    } else if (input.action === 'recover') {
      if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return res.status(400).json({ error: 'invalid_email' });
      body.email = input.email.trim().toLowerCase();
    } else {
      if (typeof input.grant !== 'string' || input.grant.length > 1000) return res.status(400).json({ error: 'invalid_link' });
      body.grant = input.grant;
      if (input.action === 'preferences') {
        for (const key of ['updates','promotions']) if (typeof input[key] === 'boolean') body[key] = input[key];
      }
    }
    try {
      if (body.action === 'recover' && !await service.allowRequest(req, { namespace: 'print-recovery', maxAttempts: 5, windowSeconds: 600 })) return res.status(429).json({ error: 'try_again_later' });
      const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      const { response, payload } = body.action === 'order'
        ? await service.commerceFetch(req, res, '/api/prints', options)
        : await service.commerceBackendFetch('/api/prints', options);
      if (!response.ok) return res.status(response.status).json({ error: 'print_request_unavailable' });
      if (body.action === 'recover') return res.status(202).json({ accepted: true });
      if (body.action === 'preferences') return res.status(200).json({ updates: payload.updates === true, promotions: payload.promotions === true });
      if (payload.state !== 'ready') return res.status(200).json({ state: payload.state === 'pending' ? 'pending' : 'unavailable' });
      const product = service.product(payload.handle);
      if (!product || product.status !== 'active') return res.status(403).json({ error: 'print_unavailable' });
      const result = { state: 'ready', title: product.title, handle: product.handle, filename: product.filename,
        grant: payload.grant, preferenceGrant: payload.preferenceGrant, updates: payload.updates === true, promotions: payload.promotions === true };
      if (input.download === true) {
        if (!service.ready()) return res.status(503).json({ error: 'delivery_unavailable' });
        result.url = await service.sign(product.file_url, 900);
        result.expiresIn = 900;
        result.checksum = product.checksum;
      }
      return res.status(200).json(result);
    } catch { return res.status(503).json({ error: 'print_service_unavailable' }); }
  };
}
