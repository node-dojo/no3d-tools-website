/**
 * Vercel Serverless Function: Verify Purchase Ownership
 *
 * Endpoint: /api/verify-purchase
 * Method: POST
 * Body: { email: string, productIds: string[] }
 *
 * Returns: { ownedProducts: string[], error: null }
 *
 * Uses Polar SDK to verify customer owns the requested products
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
      ownedProducts: []
    });
  }

  try {
    const { email, productIds } = req.body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: email required',
        ownedProducts: []
      });
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: productIds array required',
        ownedProducts: []
      });
    }

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error: POLAR_API_TOKEN not set',
        ownedProducts: []
      });
    }

    console.log(`Verifying ownership for ${email} with ${productIds.length} products`);

    // Find customer by email
    let customer;
    try {
      const customers = await polar.customers.list({
        email: email,
        limit: 1
      });

      if (!customers || !customers.items || customers.items.length === 0) {
        console.log(`No customer found with email: ${email}`);
        return res.status(200).json({
          ownedProducts: [],
          error: null
        });
      }

      customer = customers.items[0];
      console.log(`Found customer: ${customer.id}`);
    } catch (error) {
      console.error('Error finding customer:', {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
        body: error.body
      });

      // If customer not found, return empty owned products
      if (error.statusCode === 404 || error.status === 404) {
        return res.status(200).json({
          ownedProducts: [],
          error: null
        });
      }

      throw new Error(`Failed to find customer: ${error.message || 'Unknown error'}`);
    }

    // Get customer entitlements
    let entitlements;
    try {
      entitlements = await polar.entitlements.list({
        customerId: customer.id,
        limit: 100
      });

      console.log(`Found ${entitlements?.items?.length || 0} entitlements for customer`);
    } catch (error) {
      console.error('Error fetching entitlements:', {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode
      });

      // If entitlements API fails, try alternative approach
      // Check subscriptions instead
      try {
        const subscriptions = await polar.subscriptions.list({
          customerId: customer.id,
          limit: 100
        });

        console.log(`Found ${subscriptions?.items?.length || 0} subscriptions for customer`);

        // Extract product IDs from subscriptions
        const subscribedProductIds = new Set();
        if (subscriptions?.items) {
          for (const sub of subscriptions.items) {
            if (sub.product && sub.product.id) {
              subscribedProductIds.add(sub.product.id);
            }
          }
        }

        const ownedProducts = productIds.filter(id => subscribedProductIds.has(id));
        return res.status(200).json({
          ownedProducts,
          error: null
        });
      } catch (subError) {
        console.error('Error fetching subscriptions:', subError);
        throw new Error(`Failed to verify ownership: ${error.message || 'Unknown error'}`);
      }
    }

    // Extract product IDs from entitlements
    const ownedProductIds = new Set();
    if (entitlements?.items) {
      for (const entitlement of entitlements.items) {
        if (entitlement.product && entitlement.product.id) {
          ownedProductIds.add(entitlement.product.id);
        }
      }
    }

    // Filter requested products to only those owned
    const ownedProducts = productIds.filter(id => ownedProductIds.has(id));

    console.log(`Customer owns ${ownedProducts.length} of ${productIds.length} requested products`);

    return res.status(200).json({
      ownedProducts,
      error: null
    });

  } catch (error) {
    console.error('Verification failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });

    const errorMessage = error.message || 'Failed to verify purchase ownership';

    return res.status(500).json({
      error: errorMessage,
      ownedProducts: [],
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

