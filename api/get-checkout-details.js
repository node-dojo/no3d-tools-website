/**
 * GET /api/get-checkout-details
 *
 * Query: session_id (Stripe Checkout Session id, e.g. cs_...)
 * Legacy: checkout_id — treated as session_id for backwards compatibility.
 *
 * Returns summary fields for the success page.
 */

import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.session_id || req.query.checkout_id;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'session_id parameter required' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product']
    });

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id || null;

    const lineItems = session.line_items?.data || [];
    const products = lineItems.map((line) => {
      const price = line.price;
      const product = price?.product;
      const productObj = typeof product === 'object' && product && !product.deleted ? product : null;
      return {
        id: productObj?.id || price?.id || line.id,
        name: productObj?.name || line.description || 'Subscription',
        description: productObj?.description || null
      };
    });

    const response = {
      checkoutId: session.id,
      sessionId: session.id,
      status: session.status,
      customerId,
      customerEmail: session.customer_details?.email || session.customer_email || null,
      total: session.amount_total ?? 0,
      currency: session.currency || 'usd',
      products
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching Stripe checkout session:', error?.message || error);
    return res.status(200).json({
      checkoutId: sessionId,
      sessionId: sessionId,
      status: 'complete',
      products: [],
      note: 'Could not fetch full details'
    });
  }
}
