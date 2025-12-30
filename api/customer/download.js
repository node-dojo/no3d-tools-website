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
 * Verifies customer owns the product and provides a download URL using the Polar Customer State API.
 */

import { Polar } from '@polar-sh/sdk';
import { validateSession } from '../lib/session.js';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

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

    // Get Customer State from Polar
    const response = await fetch(`https://api.polar.sh/v1/customers/${customerId}/state`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Polar API error: ${response.status} ${response.statusText}`);
    }

    const state = await response.json();
    let hasAccess = false;
    let downloadInfo = null;

    // Check for ownership and find the downloadable benefit in a single pass
    const allBenefits = [...(state.active_subscriptions || []), ...(state.granted_benefits || [])];

    for (const item of allBenefits) {
      // The item could be a subscription or a granted benefit (entitlement-like)
      const product = item.product;
      
      if (product && product.id === productId) {
        hasAccess = true;
        
        // If it's a benefit and has downloadable files, extract the download info
        const benefit = item.benefit || item; // A subscription has a benefit, a granted_benefit *is* the benefit
        if (benefit && benefit.type === 'downloadables' && benefit.properties?.files?.length > 0) {
          const file = benefit.properties.files[0];
          downloadInfo = {
            downloadUrl: file.download_url, // Note: snake_case from direct API response
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            fileName: file.name || `${product.name}.zip`,
          };
          // We found the file, no need to keep looping for this product
          break;
        }
      }
    }

    if (!hasAccess) {
      console.log(`❌ Customer does not own product ${productId}`);
      return res.status(403).json({
        error: 'You do not have access to this product',
      });
    }

    if (!downloadInfo) {
      // The user has access, but we couldn't find a downloadable file.
      // This could happen for non-downloadable products or configuration issues.
      throw new Error('No downloadable files found for this product.');
    }

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
