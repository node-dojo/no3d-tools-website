/**
 * GET /api/get-customer-portal-url
 *
 * Query: session_id (Stripe Checkout Session id) — preferred
 *        customer_id (Stripe Customer id) — optional alternative
 *
 * Returns Stripe Billing Portal URL for the customer.
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
  let customerId = req.query.customer_id;

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const siteUrl =
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://no3dtools.com';

  const returnUrl = `${siteUrl.replace(/\/$/, '')}/subscribe.html`;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    if (!customerId && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(String(sessionId));
      const c = session.customer;
      customerId = typeof c === 'string' ? c : c?.id;
    }

    if (!customerId) {
      return res.status(400).json({
        error: 'customer_id or session_id required',
        portalUrl: null
      });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: String(customerId),
      return_url: returnUrl
    });

    if (!portal?.url) {
      return res.status(500).json({ error: 'Stripe returned no portal URL', portalUrl: null });
    }

    return res.status(200).json({
      portalUrl: portal.url,
      customerId: String(customerId)
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error?.message || error);
    return res.status(200).json({
      portalUrl: null,
      error: error?.message || 'portal_error',
      note: 'Configure Stripe Customer Portal in the Stripe Dashboard'
    });
  }
}
