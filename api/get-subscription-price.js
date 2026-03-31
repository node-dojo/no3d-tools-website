/**
 * Vercel Serverless Function: Get Subscription Price from Stripe
 *
 * Endpoint: GET /api/get-subscription-price
 *
 * Returns:
 *   { amount: 1111, currency: "usd", formatted: "$11.11", interval: "month" }
 */

import Stripe from 'stripe';
import { setCorsHeaders } from './lib/cors.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  if (setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } = process.env;

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const price = await stripe.prices.retrieve(STRIPE_PRICE_ID);

    const amount = price.unit_amount;
    const currency = price.currency;
    const interval = price.recurring?.interval || 'month';

    // Format as dollar string
    const dollars = (amount / 100).toFixed(2);
    const formatted = currency === 'usd' ? `$${dollars}` : `${dollars} ${currency.toUpperCase()}`;

    return res.status(200).json({
      amount,
      currency,
      formatted,
      interval,
    });
  } catch (error) {
    console.error('Failed to fetch Stripe price:', error?.message || error);
    return res.status(500).json({ error: 'Failed to fetch price' });
  }
}
