/**
 * Vercel Serverless Function: Get Download URLs
 *
 * Endpoint: /api/get-download-urls
 * Method: POST
 * Body: { checkoutSessionId: string }
 *
 * Returns: { downloads: [{ productId, url, filename }], error: null }
 *
 * Flow:
 * 1. Get checkout session to find customer_id and products
 * 2. Create a customer session token
 * 3. Use Customer Portal API to get downloadables with actual URLs
 */

import { Polar } from '@polar-sh/sdk';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

const POLAR_API_BASE = 'https://api.polar.sh';

/**
 * Create a customer session token for accessing the Customer Portal API
 */
async function createCustomerSession(customerId) {
  const response = await fetch(`${POLAR_API_BASE}/v1/customer-sessions/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: customerId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create customer session: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * Get downloadables using the Customer Portal API
 */
async function getCustomerDownloadables(customerSessionToken, benefitId = null) {
  let url = `${POLAR_API_BASE}/v1/customer-portal/downloadables/?limit=100`;
  if (benefitId) {
    url += `&benefit_id=${benefitId}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${customerSessionToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get downloadables: ${response.status} ${errorText}`);
  }

  return await response.json();
}

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
    const { checkoutSessionId } = req.body;

    if (!checkoutSessionId) {
      return res.status(400).json({
        error: 'checkoutSessionId is required',
        downloads: []
      });
    }

    console.log(`Getting download URLs via checkout session: ${checkoutSessionId}`);

    // Step 1: Get checkout to find customer_id and products
    const checkout = await polar.checkouts.get({ id: checkoutSessionId });

    console.log('Checkout status:', checkout?.status);
    console.log('Checkout customer_id:', checkout?.customer_id);

    if (!checkout) {
      return res.status(404).json({
        error: 'Checkout session not found',
        downloads: []
      });
    }

    // Accept both confirmed and succeeded statuses
    if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
      console.log(`Checkout not complete yet, status: ${checkout.status}`);
      return res.status(202).json({
        error: `Checkout still processing (status: ${checkout.status})`,
        downloads: [],
        status: checkout.status
      });
    }

    const customerId = checkout.customer_id;
    if (!customerId) {
      console.error('No customer_id in checkout');
      return res.status(400).json({
        error: 'No customer ID found in checkout',
        downloads: []
      });
    }

    // Extract product IDs from checkout
    let targetProductIds = [];
    if (checkout.products && Array.isArray(checkout.products)) {
      targetProductIds = checkout.products.map(p => p.id || p);
    } else if (checkout.product) {
      targetProductIds = [checkout.product.id || checkout.product];
    } else if (checkout.product_id) {
      targetProductIds = [checkout.product_id];
    }

    console.log('Target product IDs:', targetProductIds);

    // Step 2: Create a customer session token
    console.log('Creating customer session for:', customerId);
    const customerSession = await createCustomerSession(customerId);
    const customerToken = customerSession.token;

    if (!customerToken) {
      console.error('No token in customer session response:', customerSession);
      return res.status(500).json({
        error: 'Failed to create customer session',
        downloads: []
      });
    }

    console.log('Customer session created successfully');

    // Step 3: Get downloadables via Customer Portal API
    const downloadablesResponse = await getCustomerDownloadables(customerToken);
    const downloadables = downloadablesResponse.items || [];

    console.log(`Found ${downloadables.length} downloadables for customer`);

    // Step 4: Map downloadables to our download format
    const downloads = [];

    for (const downloadable of downloadables) {
      // Get the product ID from the benefit
      // We need to find which product this benefit belongs to
      const file = downloadable.file;
      const benefitId = downloadable.benefit_id;

      if (file && file.download && file.download.url) {
        // Find which product has this benefit
        let productId = null;
        for (const targetId of targetProductIds) {
          try {
            const product = await polar.products.get({ id: targetId });
            if (product.benefits?.some(b => b.id === benefitId)) {
              productId = targetId;
              break;
            }
          } catch (e) {
            console.error(`Error checking product ${targetId}:`, e.message);
          }
        }

        downloads.push({
          productId: productId || 'unknown',
          benefitId: benefitId,
          url: file.download.url,
          filename: file.name || 'download.blend',
          expiresAt: file.download.expires_at,
          size: file.size,
          sizeReadable: file.size_readable
        });

        console.log(`✅ Added download: ${file.name} (${file.size_readable})`);
      }
    }

    // Filter to only include downloads for purchased products
    const filteredDownloads = downloads.filter(d =>
      d.productId === 'unknown' || targetProductIds.includes(d.productId)
    );

    console.log(`Returning ${filteredDownloads.length} downloads for ${targetProductIds.length} products`);

    return res.status(200).json({
      downloads: filteredDownloads,
      customerEmail: checkout.customer_email || checkout.customer?.email,
      productIds: targetProductIds,
      error: null
    });

  } catch (error) {
    console.error('Get download URLs failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      error: error.message || 'Failed to get download URLs',
      downloads: [],
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
