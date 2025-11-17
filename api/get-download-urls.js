/**
 * Vercel Serverless Function: Get Download URLs
 *
 * Endpoint: /api/get-download-urls
 * Method: POST
 * Body: { email: string, productIds: string[] }
 *
 * Returns: { downloads: [{ productId, url, filename }], error: null }
 *
 * Verifies ownership first, then retrieves download URLs from Polar benefits
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
      downloads: []
    });
  }

  try {
    const { email, productIds } = req.body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: email required',
        downloads: []
      });
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: productIds array required',
        downloads: []
      });
    }

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error: POLAR_API_TOKEN not set',
        downloads: []
      });
    }

    console.log(`Getting download URLs for ${email} with ${productIds.length} products`);

    // First verify ownership (reuse logic from verify-purchase)
    let customer;
    try {
      const customers = await polar.customers.list({
        email: email,
        limit: 1
      });

      if (!customers || !customers.items || customers.items.length === 0) {
        console.log(`No customer found with email: ${email}`);
        return res.status(200).json({
          downloads: [],
          error: null
        });
      }

      customer = customers.items[0];
    } catch (error) {
      if (error.statusCode === 404 || error.status === 404) {
        return res.status(200).json({
          downloads: [],
          error: null
        });
      }
      throw new Error(`Failed to find customer: ${error.message || 'Unknown error'}`);
    }

    // Get entitlements to verify ownership
    let entitlements;
    try {
      entitlements = await polar.entitlements.list({
        customerId: customer.id,
        limit: 100
      });
    } catch (error) {
      // Try subscriptions as fallback
      const subscriptions = await polar.subscriptions.list({
        customerId: customer.id,
        limit: 100
      });

      const ownedProductIds = new Set();
      if (subscriptions?.items) {
        for (const sub of subscriptions.items) {
          if (sub.product && sub.product.id) {
            ownedProductIds.add(sub.product.id);
          }
        }
      }

      // Filter to only owned products
      const ownedProducts = productIds.filter(id => ownedProductIds.has(id));

      // Get download URLs for owned products
      const downloads = [];
      for (const productId of ownedProducts) {
        try {
          const product = await polar.products.get({ id: productId });
          if (product && product.benefits) {
            for (const benefit of product.benefits) {
              if (benefit.type === 'downloadable' && benefit.properties?.file_id) {
                // Get file download URL
                const file = await polar.files.get({ id: benefit.properties.file_id });
                if (file && file.url) {
                  downloads.push({
                    productId,
                    url: file.url,
                    filename: file.name || `${product.name || 'product'}.blend`
                  });
                  break; // Use first downloadable benefit
                }
              }
            }
          }
        } catch (productError) {
          console.error(`Error getting product ${productId}:`, productError.message);
        }
      }

      return res.status(200).json({
        downloads,
        error: null
      });
    }

    // Extract owned product IDs from entitlements
    const ownedProductIds = new Set();
    if (entitlements?.items) {
      for (const entitlement of entitlements.items) {
        if (entitlement.product && entitlement.product.id) {
          ownedProductIds.add(entitlement.product.id);
        }
      }
    }

    // Filter to only owned products
    const ownedProducts = productIds.filter(id => ownedProductIds.has(id));

    if (ownedProducts.length === 0) {
      return res.status(200).json({
        downloads: [],
        error: null
      });
    }

    // Get download URLs for each owned product
    const downloads = [];
    for (const productId of ownedProducts) {
      try {
        // Get product details with benefits
        const product = await polar.products.get({ id: productId });
        
        if (product && product.benefits) {
          // Find downloadable benefit
          for (const benefit of product.benefits) {
            if (benefit.type === 'downloadable' && benefit.properties?.file_id) {
              try {
                // Get file details to get download URL
                const file = await polar.files.get({ id: benefit.properties.file_id });
                
                if (file && file.url) {
                  downloads.push({
                    productId,
                    url: file.url,
                    filename: file.name || `${product.name || 'product'}.blend`
                  });
                  break; // Use first downloadable benefit found
                }
              } catch (fileError) {
                console.error(`Error getting file for benefit ${benefit.id}:`, fileError.message);
              }
            }
          }
        }

        // Alternative: Check if product has direct download URL in metadata
        if (downloads.length === 0 || !downloads.find(d => d.productId === productId)) {
          // Try to get download URL from product metadata or checkout link
          console.log(`No downloadable benefit found for product ${productId}, checking alternatives`);
        }
      } catch (productError) {
        console.error(`Error getting product ${productId}:`, {
          message: productError.message,
          status: productError.status,
          statusCode: productError.statusCode
        });
      }
    }

    console.log(`Found ${downloads.length} download URLs for ${ownedProducts.length} owned products`);

    return res.status(200).json({
      downloads,
      error: null
    });

  } catch (error) {
    console.error('Get download URLs failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });

    const errorMessage = error.message || 'Failed to get download URLs';

    return res.status(500).json({
      error: errorMessage,
      downloads: [],
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

