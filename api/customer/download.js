/**
 * Vercel Serverless Function: Product Download
 *
 * Endpoint: /api/customer/download
 * Method: POST
 * Headers: Authorization: Bearer {session_token}
 * Body: { productId: "xxx" }
 *
 * Returns: {
 *   downloadUrl: "https://...",
 *   expiresAt: "2024-01-15T12:30:00Z",
 *   fileName: "Product Name.zip"
 * }
 *
 * Verifies customer owns the product and provides a download URL.
 */

import { Polar } from '@polar-sh/sdk';
import { validateSession } from '../lib/session.js';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

/**
 * Check if customer owns product via orders
 * @param {string} customerId - Polar customer ID
 * @param {string} productId - Product ID to check
 * @returns {Promise<boolean>} True if customer owns product
 */
async function checkProductOwnership(customerId, productId) {
  try {
    // Check orders
    const orders = await polar.orders.list({
      customerId: customerId,
      limit: 100, // Get all orders
    });

    if (orders && orders.items) {
      for (const order of orders.items) {
        // Only check paid orders
        if (order.status !== 'paid') continue;

        // Check order items for product
        if (order.orderItems && Array.isArray(order.orderItems)) {
          for (const item of order.orderItems) {
            if (item.product && item.product.id === productId) {
              console.log(`✅ Customer owns product via order ${order.id}`);
              return true;
            }
          }
        }
      }
    }

    // Check subscriptions
    const subscriptions = await polar.subscriptions.list({
      customerId: customerId,
      limit: 100,
    });

    if (subscriptions && subscriptions.items) {
      for (const subscription of subscriptions.items) {
        // Check active subscriptions
        if (subscription.status !== 'active' && subscription.status !== 'trialing') continue;

        // Check if subscription product matches
        if (subscription.product && subscription.product.id === productId) {
          console.log(`✅ Customer owns product via subscription ${subscription.id}`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking product ownership:', error);
    return false;
  }
}

/**
 * Get download URL for product
 * @param {object} product - Polar product object
 * @param {string} customerId - Customer ID
 * @returns {Promise<object>} Download info
 */
async function getDownloadInfo(product, customerId) {
  // In Polar, downloadable files are attached as benefits to products
  // We need to get the benefit grants for this customer

  try {
    // Get customer entitlements (benefit grants)
    const entitlements = await polar.entitlements.list({
      customerId: customerId,
      limit: 100,
    });

    if (!entitlements || !entitlements.items) {
      throw new Error('No entitlements found for customer');
    }

    // Find entitlement for this product
    for (const entitlement of entitlements.items) {
      if (entitlement.product && entitlement.product.id === product.id) {
        // Check if this entitlement has downloadable files
        if (entitlement.benefit && entitlement.benefit.type === 'downloadables') {
          // Get the downloadable files
          const files = entitlement.benefit.files || [];

          if (files.length > 0) {
            // For simplicity, return the first file
            // In production, you might want to support multiple files
            const file = files[0];

            return {
              downloadUrl: file.downloadUrl || file.url,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
              fileName: file.name || `${product.name}.zip`,
            };
          }
        }
      }
    }

    // If no downloadable benefit found, try to get product download URLs
    // This is a fallback - in practice, Polar may have different mechanisms
    throw new Error('No downloadable files found for this product');
  } catch (error) {
    console.error('Error getting download info:', error);

    // Fallback: Create a placeholder response
    // In production, you would integrate with your actual file storage
    return {
      downloadUrl: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      fileName: `${product.name}.zip`,
      error: 'Download URL generation not yet implemented',
    };
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error',
      });
    }

    // Validate session
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const customerId = session.customerId;

    // Parse request body
    const { productId } = req.body;

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({
        error: 'Product ID required',
      });
    }

    console.log(`📥 Download request for product ${productId} by customer ${customerId}`);

    // Verify ownership
    const hasAccess = await checkProductOwnership(customerId, productId);

    if (!hasAccess) {
      console.log(`❌ Customer does not own product ${productId}`);
      return res.status(403).json({
        error: 'You do not have access to this product',
      });
    }

    // Get product details
    let product;
    try {
      product = await polar.products.get(productId);
    } catch (error) {
      console.error('Error fetching product:', error);
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    // Get download information
    const downloadInfo = await getDownloadInfo(product, customerId);

    console.log(`✅ Download info generated for product ${productId}`);

    return res.status(200).json(downloadInfo);
  } catch (error) {
    console.error('Download request failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Failed to generate download URL',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
