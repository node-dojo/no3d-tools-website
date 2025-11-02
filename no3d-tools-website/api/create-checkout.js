/**
 * Vercel Serverless Function: Create Multi-Product Checkout
 *
 * Endpoint: /api/create-checkout
 * Method: POST
 * Body: { productIds: ["id1", "id2", ...] }
 *
 * Returns: { url: "https://polar.sh/checkout/...", error: null }
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
    const { productIds, priceIds } = req.body;

    // Accept either productIds (legacy) or priceIds (new format)
    const ids = priceIds || productIds;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: productIds or priceIds array required',
        url: null
      });
    }

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error: POLAR_API_TOKEN not set',
        url: null
      });
    }

    console.log(`Creating checkout for ${ids.length} items:`, ids);

    // Create checkout session with multiple products
    let checkout;
    try {
      // Log the request we're about to make
      console.log('Polar SDK initialization check:', {
        hasToken: !!process.env.POLAR_API_TOKEN,
        tokenLength: process.env.POLAR_API_TOKEN?.length || 0,
        priceIds: ids
      });

      // Use Polar SDK to create checkout with product price IDs
      // Each ID should be a price ID from the product's prices array
      const checkoutData = {
        productPrices: ids.map(priceId => ({ productPriceId: priceId })),
        successUrl: `${req.headers.origin || 'https://no3dtools.com'}/success.html`,
        metadata: {
          source: 'custom_cart',
          itemCount: ids.length.toString(),
          timestamp: new Date().toISOString()
        }
      };

      console.log('Creating checkout with data:', JSON.stringify(checkoutData, null, 2));

      // Create checkout using the standard checkouts.create method
      checkout = await polar.checkouts.create(checkoutData);

      console.log('Polar checkout response:', {
        id: checkout?.id,
        url: checkout?.url,
        hasUrl: !!checkout?.url
      });

    } catch (error) {
      // Log full error details
      console.error('Polar SDK error:', {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
        code: error.code,
        body: error.body,
        response: error.response?.data
      });
      
      // If error has response data, try to extract it
      if (error.response?.data) {
        throw new Error(`Polar API error: ${JSON.stringify(error.response.data)}`);
      }
      
      // Re-throw with better message
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
      status: error.status,
      body: error.body,
      stack: error.stack
    });

    // Ensure we always return valid JSON
    const errorMessage = error.message || 'Failed to create checkout session';
    const errorDetails = error.body || (error.response?.data ? JSON.stringify(error.response.data) : undefined);

    return res.status(500).json({
      error: errorMessage,
      url: null,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
};
