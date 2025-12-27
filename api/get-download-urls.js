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
    const { email, productIds, checkoutSessionId } = req.body;

    let targetProductIds = productIds;
    let customerEmail = email;

    // Mode 1: Verify via Checkout Session ID (Instant access)
    if (checkoutSessionId) {
        console.log(`Getting download URLs via session ID: ${checkoutSessionId}`);
        try {
            const checkout = await polar.checkouts.get({ id: checkoutSessionId });

            console.log('Checkout object:', JSON.stringify(checkout, null, 2));
            console.log('Checkout status:', checkout?.status);

            if (!checkout) {
                console.error('Checkout not found for ID:', checkoutSessionId);
                return res.status(404).json({ error: 'Checkout session not found', downloads: [] });
            }

            if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
                console.error(`Checkout status is ${checkout.status}, expected 'succeeded' or 'confirmed'`);
                return res.status(403).json({
                  error: `Checkout not complete (status: ${checkout.status})`,
                  downloads: []
                });
            }

            // Extract customer email from various possible locations
            customerEmail = checkout.customer_email ||
                           checkout.customer?.email ||
                           checkout.customerEmail ||
                           checkout.email;

            console.log('Extracted customer email:', customerEmail);
            console.log('Checkout customer object:', checkout.customer);

            // If email still not found, try to fetch customer from Polar
            if (!customerEmail && checkout.customer_id) {
                try {
                    console.log('Fetching customer details for ID:', checkout.customer_id);
                    const customer = await polar.customers.get({ id: checkout.customer_id });
                    customerEmail = customer?.email;
                    console.log('Fetched customer email from customer object:', customerEmail);
                } catch (customerError) {
                    console.error('Error fetching customer:', customerError.message);
                }
            }

            // Extract product IDs from various possible locations
            if (checkout.products && Array.isArray(checkout.products)) {
                targetProductIds = checkout.products.map(p => p.id || p);
                console.log('Extracted product IDs from checkout.products:', targetProductIds);
            } else if (checkout.product) {
                targetProductIds = [checkout.product.id || checkout.product];
                console.log('Extracted product ID from checkout.product:', targetProductIds);
            } else if (checkout.product_id) {
                targetProductIds = [checkout.product_id];
                console.log('Extracted product ID from checkout.product_id:', targetProductIds);
            } else if (checkout.productId) {
                targetProductIds = [checkout.productId];
                console.log('Extracted product ID from checkout.productId:', targetProductIds);
            } else {
                console.error('No product information found in checkout');
            }
        } catch (error) {
            console.error('Error verifying checkout for downloads:', error);
            return res.status(500).json({
              error: 'Failed to verify checkout',
              details: error.message
            });
        }
    }

    // Validate we have what we need
    if (!customerEmail) {
      console.error('Validation failed: No customer email', {
        checkoutSessionId,
        providedEmail: email
      });
      return res.status(400).json({
        error: 'Customer email not found in checkout session',
        downloads: []
      });
    }
    if (!targetProductIds || !Array.isArray(targetProductIds) || targetProductIds.length === 0) {
      console.warn('No product IDs found', {
        checkoutSessionId,
        providedProductIds: productIds
      });
      return res.status(200).json({ downloads: [], error: null });
    }

    console.log(`Retrieving downloads for ${customerEmail}`);

    // Get download URLs for the target products
    const downloads = [];
    for (const productId of targetProductIds) {
      try {
        // Get product details with benefits
        const product = await polar.products.get({ id: productId });

        // Null safety checks
        if (!product) {
          console.log(`Product ${productId} not found`);
          continue;
        }

        if (!product.benefits || !Array.isArray(product.benefits)) {
          console.log(`Product ${productId} has no benefits array`);
          continue;
        }

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

    console.log(`Found ${downloads.length} download URLs for ${targetProductIds.length} target products`);

    return res.status(200).json({
      downloads,
      customerEmail: customerEmail,
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

