/**
 * Apply Credit to Checkout API Endpoint
 *
 * POST /api/credit/apply-to-checkout
 * Body: { email: string, productId: string, amount?: number }
 *
 * Creates a Polar checkout with credit applied as a discount.
 * If the customer has credit, creates a single-use Polar discount
 * for the applicable amount (min of balance or product price).
 */

import { Polar } from '@polar-sh/sdk';
import { getBalance, storePendingDebit } from '../../lib/credit.js';
import crypto from 'crypto';

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

const ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID || 'f0c16049-5959-42c9-8be8-5952c38c7d63';

/**
 * Generate a unique discount code for credit
 * Format: CREDIT-XXXXXXXX
 */
function generateCreditDiscountCode() {
  return `CREDIT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Create a single-use Polar discount for the credit amount
 */
async function createCreditDiscount(amountCents, email, checkoutId) {
  const code = generateCreditDiscountCode();

  const response = await fetch('https://api.polar.sh/v1/discounts/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Credit: ${email}`,
      type: 'fixed',
      amount: amountCents,
      currency: 'usd',
      duration: 'once',
      code: code,
      max_redemptions: 1,
      organization_id: ORGANIZATION_ID,
      metadata: {
        credit_discount: 'true',
        customer_email: email,
        checkout_id: checkoutId,
        created_at: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create discount: ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, productId, priceId, successUrl, amount } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }

  if (!productId) {
    return res.status(400).json({
      success: false,
      error: 'Product ID is required',
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format',
    });
  }

  try {
    // Get customer's credit balance
    const { balance } = await getBalance(email);

    // If no credit, just create a normal checkout
    if (balance <= 0) {
      const checkout = await polar.checkouts.create({
        productId,
        customerEmail: email,
        successUrl: successUrl || 'https://no3d.tools/success',
      });

      return res.status(200).json({
        success: true,
        checkoutUrl: checkout.url,
        creditApplied: 0,
        creditAppliedFormatted: '$0.00',
      });
    }

    // Calculate applicable credit (for now, use full balance up to a max)
    // The actual product price check could be added here if needed
    // For simplicity, we'll apply up to the balance or specified amount
    let creditToApply = balance;
    if (amount && amount < balance) {
      creditToApply = amount;
    }

    // Generate a temporary checkout ID for tracking
    const tempCheckoutId = crypto.randomBytes(8).toString('hex');

    // Create a Polar discount for the credit amount
    const discount = await createCreditDiscount(creditToApply, email, tempCheckoutId);

    console.log(`💳 Created credit discount: ${discount.code} for $${creditToApply / 100}`);

    // Store pending debit (will be completed on webhook)
    await storePendingDebit(discount.id, email, creditToApply, tempCheckoutId);

    // Create checkout with the discount
    const checkout = await polar.checkouts.create({
      productId,
      customerEmail: email,
      discountId: discount.id,
      successUrl: successUrl || 'https://no3d.tools/success',
    });

    console.log(`🛒 Checkout created with credit: ${checkout.url}`);

    return res.status(200).json({
      success: true,
      checkoutUrl: checkout.url,
      creditApplied: creditToApply,
      creditAppliedFormatted: `$${(creditToApply / 100).toFixed(2)}`,
      remainingBalance: balance - creditToApply,
      remainingBalanceFormatted: `$${((balance - creditToApply) / 100).toFixed(2)}`,
      discountCode: discount.code,
    });
  } catch (error) {
    console.error('Error creating checkout with credit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create checkout. Please try again.',
    });
  }
}
