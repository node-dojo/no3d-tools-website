/**
 * Vercel Serverless Function: Create Multi-Product Checkout
 *
 * Endpoint: /api/create-checkout
 * Method: POST
 * Body: { productIds: ["product-id-1", "product-id-2", ...] }
 *
 * Returns: { url: "https://polar.sh/checkout/...", error: null }
 *
 * Uses Polar SDK - expects array of product ID strings (not price IDs)
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
    const { productIds } = req.body;

    // Validate input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: productIds array required',
        url: null
      });
    }

    // Validate each product ID is a string
    for (const productId of productIds) {
      if (typeof productId !== 'string' || !productId.trim()) {
        return res.status(400).json({
          error: 'Invalid request: each productId must be a non-empty string',
          url: null
        });
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

    console.log(`Creating checkout for ${productIds.length} products:`, productIds);

    // Validate products are not archived before creating checkout
    const archivedProducts = [];
    const validProductIds = [];
    
    for (const productId of productIds) {
      try {
        const product = await polar.products.get({ id: productId });
        if (product.is_archived) {
          console.warn(`Product ${productId} is archived:`, product.name);
          archivedProducts.push({
            id: productId,
            name: product.name || productId
          });
        } else {
          validProductIds.push(productId);
        }
      } catch (error) {
        console.error(`Error checking product ${productId}:`, error.message);
        // If we can't verify, include it but log a warning
        validProductIds.push(productId);
      }
    }

    // If all products are archived, return error
    if (validProductIds.length === 0 && archivedProducts.length > 0) {
      return res.status(400).json({
        error: 'All products in your cart are archived and cannot be purchased.',
        archivedProducts: archivedProducts.map(p => p.name),
        url: null
      });
    }

    // If some products are archived, log warning but proceed with valid ones
    if (archivedProducts.length > 0) {
      console.warn(`Removing ${archivedProducts.length} archived products from checkout:`, archivedProducts.map(p => p.name));
    }

    // Create checkout session with only valid (non-archived) products
    let checkout;
    try {
      // Get origin from request headers (for embedOrigin validation)
      const origin = req.headers.origin || req.headers.host 
        ? `https://${req.headers.host}` 
        : 'https://no3d-tools-website.vercel.app';
      
      const checkoutData = {
        products: validProductIds, // Only non-archived products
        // No successUrl - let Polar use their native confirmation/download page
        embedOrigin: origin, // Required for embedded checkout modal - must match your domain
        metadata: {
          source: 'custom_cart',
          itemCount: validProductIds.length.toString(),
          originalItemCount: productIds.length.toString(),
          timestamp: new Date().toISOString()
        }
      };

      console.log('Creating checkout with data:', JSON.stringify(checkoutData, null, 2));

      // Use Polar SDK - expects array of product ID strings
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

      // Check if error is about archived products
      const errorBody = error.body || error.message || '';
      const errorString = typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody);
      
      if (errorString.includes('archived') || errorString.includes('Product is archived')) {
        // Try to extract product ID from error
        const archivedMatch = errorString.match(/["']([^"']+)["']/);
        const archivedProductId = archivedMatch ? archivedMatch[1] : 'unknown';
        
        throw new Error(`One or more products in your cart are archived and cannot be purchased. Please remove archived products and try again. (Product ID: ${archivedProductId})`);
      }

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
      error: null,
      archivedProductsRemoved: archivedProducts.length > 0 ? archivedProducts.map(p => p.name) : null,
      validProductCount: validProductIds.length,
      originalProductCount: productIds.length
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
