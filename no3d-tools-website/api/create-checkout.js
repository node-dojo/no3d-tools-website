/**
 * Vercel Serverless Function: Create Multi-Product Checkout
 *
 * Endpoint: /api/create-checkout
 * Method: POST
 * Body: { productIds: ["id1", "id2", ...] }
 *
 * Returns: { url: "https://polar.sh/checkout/...", error: null }
 */

const { Polar } = require('@polar-sh/sdk');

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      url: null
    });
  }

  try {
    const { productIds } = req.body;

    // Validate input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: productIds array required',
        url: null
      });
    }

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        url: null
      });
    }

    console.log(`Creating checkout for ${productIds.length} products:`, productIds);

    // Create checkout session with multiple products
    let checkout;
    try {
      checkout = await polar.checkouts.create({
        products: productIds, // Array of Polar product IDs
        paymentProcessor: 'stripe',
        successUrl: `${req.headers.origin || 'https://no3d-tools.vercel.app'}/success`,
        metadata: {
          source: 'custom_cart',
          itemCount: productIds.length.toString(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Try parsing response body if available
      if (error.body && typeof error.body === 'string') {
        checkout = JSON.parse(error.body);
      } else {
        throw error;
      }
    }

    console.log('Checkout created successfully:', checkout.id);

    // Return checkout URL
    return res.status(200).json({
      url: checkout.url,
      id: checkout.id,
      error: null
    });

  } catch (error) {
    console.error('Checkout creation failed:', error);

    return res.status(500).json({
      error: error.message || 'Failed to create checkout session',
      url: null,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
