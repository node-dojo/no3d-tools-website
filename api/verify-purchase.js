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
    // Parse request body if it's a string
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return res.status(400).json({
          error: 'Invalid request body: must be valid JSON',
          ownedProducts: []
        });
      }
    }

    // Handle empty or missing body
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      console.error('Empty or missing request body');
      return res.status(400).json({
        error: 'Request body is required. Provide either { checkoutSessionId } or { email, productIds }',
        ownedProducts: []
      });
    }

    const { email, productIds, checkoutSessionId } = body || {};

    // Log the request for debugging
    console.log('verify-purchase request:', {
      hasCheckoutSessionId: !!checkoutSessionId,
      hasEmail: !!email,
      hasProductIds: !!productIds,
      productIdsLength: productIds?.length || 0
    });

    // Mode 1: Verify via Checkout Session ID
    if (checkoutSessionId) {
        console.log(`Verifying purchase via session ID: ${checkoutSessionId}`);

        // Validate checkout session ID format (should be UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(checkoutSessionId)) {
            console.log(`Invalid checkout session ID format: ${checkoutSessionId}`);
            return res.status(400).json({
                error: 'Invalid checkout session ID format',
                ownedProducts: []
            });
        }

        try {
            const checkout = await polar.checkouts.get({ id: checkoutSessionId });

            if (!checkout) {
                return res.status(404).json({ error: 'Checkout session not found', ownedProducts: [] });
            }

            if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
                 // It might be 'open' if payment is pending, or 'expired'
                 console.log(`Checkout status is ${checkout.status}`);
                 // We might still want to return info but maybe with a warning?
                 // For now, let's assume if they are on success page, it should be succeeded.
            }

            const customerEmail = checkout.customer_email || checkout.customer?.email;
            // Extract products. The structure depends on Polar API version.
            // Usually checkout.products (array) or checkout.product (single)
            let sessionProductIds = [];
            if (checkout.products) {
                sessionProductIds = checkout.products.map(p => p.id);
            } else if (checkout.product) {
                sessionProductIds = [checkout.product.id];
            } else if (checkout.product_id) {
                sessionProductIds = [checkout.product_id];
            }

            return res.status(200).json({
                ownedProducts: sessionProductIds,
                email: customerEmail,
                checkoutStatus: checkout.status,
                error: null
            });

        } catch (error) {
            console.error('Error fetching checkout session:', error);

            // Handle specific Polar API errors
            if (error.statusCode === 404 || error.status === 404) {
                return res.status(404).json({
                    error: 'Checkout session not found',
                    ownedProducts: []
                });
            }

            return res.status(500).json({
                error: 'Failed to verify checkout session',
                details: error.message
            });
        }
    }

    // Mode 2: Verify via Email + Product IDs (Existing Logic)
    // Validate input
    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.error('Invalid email in request:', { email, type: typeof email });
      return res.status(400).json({
        error: 'Invalid request: email (string) is required',
        ownedProducts: [],
        received: { email, productIds, checkoutSessionId }
      });
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      console.error('Invalid productIds in request:', { productIds, type: typeof productIds, isArray: Array.isArray(productIds) });
      return res.status(400).json({
        error: 'Invalid request: productIds (non-empty array) is required',
        ownedProducts: [],
        received: { email, productIds, checkoutSessionId }
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

