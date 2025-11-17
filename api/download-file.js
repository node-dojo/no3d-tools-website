/**
 * Vercel Serverless Function: Proxy File Downloads
 *
 * Endpoint: /api/download-file
 * Method: GET
 * Query: ?email=string&productId=string
 *
 * Verifies ownership, then proxies file download from Polar
 * Sets proper Content-Disposition header for filename
 */

import { Polar } from '@polar-sh/sdk';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

export default async (req, res) => {
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
      error: 'Method not allowed'
    });
  }

  try {
    const { email, productId } = req.query;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: email required'
      });
    }

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: productId required'
      });
    }

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error: POLAR_API_TOKEN not set'
      });
    }

    console.log(`Verifying ownership for download: ${email} -> ${productId}`);

    // Verify ownership first
    let customer;
    try {
      const customers = await polar.customers.list({
        email: email,
        limit: 1
      });

      if (!customers || !customers.items || customers.items.length === 0) {
        return res.status(403).json({
          error: 'Customer not found'
        });
      }

      customer = customers.items[0];
    } catch (error) {
      if (error.statusCode === 404 || error.status === 404) {
        return res.status(403).json({
          error: 'Customer not found'
        });
      }
      throw new Error(`Failed to find customer: ${error.message || 'Unknown error'}`);
    }

    // Check entitlements
    let hasAccess = false;
    try {
      const entitlements = await polar.entitlements.list({
        customerId: customer.id,
        limit: 100
      });

      if (entitlements?.items) {
        for (const entitlement of entitlements.items) {
          if (entitlement.product && entitlement.product.id === productId) {
            hasAccess = true;
            break;
          }
        }
      }
    } catch (error) {
      // Try subscriptions as fallback
      const subscriptions = await polar.subscriptions.list({
        customerId: customer.id,
        limit: 100
      });

      if (subscriptions?.items) {
        for (const sub of subscriptions.items) {
          if (sub.product && sub.product.id === productId) {
            hasAccess = true;
            break;
          }
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Product not owned by customer'
      });
    }

    // Get product and find downloadable benefit
    let downloadUrl;
    let filename;

    try {
      const product = await polar.products.get({ id: productId });

      if (product && product.benefits) {
        for (const benefit of product.benefits) {
          if (benefit.type === 'downloadable' && benefit.properties?.file_id) {
            const file = await polar.files.get({ id: benefit.properties.file_id });
            if (file && file.url) {
              downloadUrl = file.url;
              filename = file.name || `${product.name || 'product'}.blend`;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting product download URL:', error);
      return res.status(500).json({
        error: 'Failed to get download URL'
      });
    }

    if (!downloadUrl) {
      return res.status(404).json({
        error: 'Download file not found for this product'
      });
    }

    // Fetch file from Polar
    try {
      const fileResponse = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`
        }
      });

      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
      }

      // Get file content type
      const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
      const contentLength = fileResponse.headers.get('content-length');

      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Stream file to client
      const fileBuffer = await fileResponse.arrayBuffer();
      return res.status(200).send(Buffer.from(fileBuffer));

    } catch (error) {
      console.error('Error fetching file:', error);
      return res.status(500).json({
        error: 'Failed to download file'
      });
    }

  } catch (error) {
    console.error('Download proxy failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });

    const errorMessage = error.message || 'Failed to download file';

    return res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

