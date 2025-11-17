/**
 * Vercel Serverless Function: Get Polar Product Prices
 *
 * Endpoint: /api/get-polar-prices
 * Method: GET
 *
 * Returns: { prices: { productId: { priceId, amount, currency } } }
 *
 * Fetches current prices from Polar API for all products
 */

import { Polar } from '@polar-sh/sdk';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

export default async (req, res) => {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      prices: {}
    });
  }

  try {
    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error: POLAR_API_TOKEN not set',
        prices: {}
      });
    }

    console.log('Fetching Polar product prices...');

    // Organization ID from environment or default
    const organizationId = process.env.POLAR_ORG_ID || 'f0c16049-5959-42c9-8be8-5952c38c7d63';

    // Fetch all products from Polar for this organization
    const result = await polar.products.list({
      organizationId: organizationId,
      limit: 100
    });

    if (!result || !result.result) {
      throw new Error('Invalid response from Polar API');
    }

    const polarProducts = result.result.items || [];
    const prices = {};

    // Build price map by product ID
    for (const product of polarProducts) {
      if (product.isArchived) continue;

      // Get the first active price (usually the main price)
      const activePrice = product.prices?.find(p => !p.isArchived);
      if (activePrice) {
        // Handle different price types
        let amount, currency, formatted;

        if (activePrice.amountType === 'free') {
          amount = 0;
          currency = 'USD';
          formatted = 'FREE';
        } else if (activePrice.priceAmount !== undefined && activePrice.priceAmount !== null) {
          // Convert from cents to dollars for paid prices
          amount = activePrice.priceAmount / 100;
          currency = activePrice.priceCurrency || 'USD';
          formatted = `$${amount.toFixed(2)}`;
        } else {
          // Skip prices without amount info
          continue;
        }

        prices[product.id] = {
          productId: product.id,
          priceId: activePrice.id,
          amount: amount,
          currency: currency,
          formatted: formatted,
          name: product.name
        };
      }
    }

    console.log(`Fetched prices for ${Object.keys(prices).length} products`);

    // Return prices
    return res.status(200).json({
      prices: prices,
      error: null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch Polar prices:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      error: error.message || 'Failed to fetch product prices',
      prices: {},
      timestamp: new Date().toISOString()
    });
  }
};

