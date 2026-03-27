import Stripe from 'stripe';

function formatAmount(unitAmount, currency = 'usd') {
  if (typeof unitAmount !== 'number') return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(unitAmount / 100);
}

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

  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } = process.env;

  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    return res.status(500).json({
      error: 'Server configuration error: STRIPE_SECRET_KEY and STRIPE_PRICE_ID must be set'
    });
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const price = await stripe.prices.retrieve(STRIPE_PRICE_ID);

    const formattedAmount = formatAmount(price.unit_amount, price.currency);
    const interval = price.recurring?.interval || null;

    return res.status(200).json({
      priceId: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval,
      formattedAmount
    });
  } catch (error) {
    console.error('Failed to fetch Stripe subscription price:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to fetch subscription price'
    });
  }
}
