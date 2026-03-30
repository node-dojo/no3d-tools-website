/**
 * Vercel Serverless Function: Create Stripe Checkout Session
 *
 * Endpoint: /api/create-checkout
 * Method: POST (also accepts GET)
 *
 * Returns:
 *   {
 *     checkout_url: "https://checkout.stripe.com/...",
 *     id: "cs_...",
 *     error: null
 *   }
 *
 * This replaces the older Polar checkout flow for Stripe-based subscriptions.
 */

import Stripe from 'stripe';
import { setCorsHeaders } from './lib/cors.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (setCorsHeaders(req, res, { methods: 'POST, GET, OPTIONS' })) return;

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', url: null });
  }

  try {
    const {
      STRIPE_SECRET_KEY,
      STRIPE_PRICE_ID,
      STRIPE_SUCCESS_URL,
      STRIPE_CANCEL_URL,
      SITE_URL
    } = process.env;

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
      return res.status(500).json({
        error: 'Server configuration error: STRIPE_SECRET_KEY and STRIPE_PRICE_ID must be set',
        url: null
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const siteUrl = (
      SITE_URL?.trim() ||
      'https://no3dtools.com'
    );

    const successUrl =
      STRIPE_SUCCESS_URL?.trim() ||
      `${siteUrl}/success.html?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      STRIPE_CANCEL_URL?.trim() ||
      `${siteUrl}/subscribe.html?checkout_success=false&session_id={CHECKOUT_SESSION_ID}`;

    const body = req.method === 'POST' && req.body && typeof req.body === 'object' ? req.body : {};
    const customerEmail =
      body.customer_email ||
      body.customerEmail ||
      body.email ||
      undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      allow_promotion_codes: true,
      metadata: {
        source: 'stripe_checkout_session',
      }
    });

    if (!session?.url) {
      return res.status(500).json({ error: 'Stripe returned no checkout URL', url: null });
    }

    return res.status(200).json({
      checkout_url: session.url,
      url: session.url,
      id: session.id,
      error: null
    });
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      url: null
    });
  }
}
