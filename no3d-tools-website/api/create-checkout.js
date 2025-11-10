/**
 * Vercel Serverless Function: Create Multi-Product Checkout
 *
 * Endpoint: /api/create-checkout
 * Method: POST
 * Body: { products: [{ product_price_id: "price-id", quantity: 1 }, ...] }
 *
 * Returns: { url: "https://polar.sh/checkout/...", error: null }
 *
 * Uses Polar SDK v0.40.3 with multi-product checkout support
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      url: null
    });
  }

  try {
    const { products } = req.body;

    // Validate input
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: products array required',
        url: null
      });
    }

    // Validate each product has required fields
    for (const product of products) {
      if (!product.product_price_id) {
        return res.status(400).json({
          error: 'Invalid request: each product must have product_price_id',
          url: null
        });
      }
      if (!product.quantity || product.quantity < 1) {
        product.quantity = 1; // Default to 1 if not provided
      }
    }

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error: POLAR_API_TOKEN not set',
        url: null
      });
    }

    console.log(`Creating checkout for ${products.length} products:`, products);

    // Create checkout session with multiple products using new SDK
    let checkout;
    try {
      const checkoutData = {
        products: products,
        successUrl: `${req.headers.origin || 'https://no3dtools.com'}`, // Stay on same page for modal
        embed_origin: req.headers.origin || 'https://no3dtools.com', // Required for embedded checkout modal
        metadata: {
          source: 'custom_cart',
          itemCount: products.length.toString(),
          timestamp: new Date().toISOString()
        }
      };

      console.log('Creating checkout with data:', JSON.stringify(checkoutData, null, 2));

      // Use Polar SDK v0.40.3 with multi-product support
      checkout = await polar.checkouts.create(checkoutData);

      console.log('Polar checkout response:', {
        id: checkout?.id,
        url: checkout?.url,
        hasUrl: !!checkout?.url
      });

    } catch (error) {
      console.error('Polar SDK error:', {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
        body: error.body
      });

      throw new Error(`Failed to create Polar checkout: ${error.message || 'Unknown error'}`);
    }

    // Validate checkout response
    if (!checkout) {
      throw new Error('Polar SDK returned null/undefined checkout');
    }

    if (!checkout.url) {
      console.error('Checkout created but no URL:', checkout);
      throw new Error('Checkout created but no URL returned from Polar');
    }

    console.log('Checkout created successfully:', {
      id: checkout.id,
      url: checkout.url
    });

    // Return checkout URL
    return res.status(200).json({
      url: checkout.url,
      id: checkout.id,
      error: null
    });

  } catch (error) {
    console.error('Checkout creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });

    // Ensure we always return valid JSON
    const errorMessage = error.message || 'Failed to create checkout session';

    return res.status(500).json({
      error: errorMessage,
      url: null,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
