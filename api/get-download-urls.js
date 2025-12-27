/**
 * Vercel Serverless Function: Get Download URLs
 *
 * Endpoint: /api/get-download-urls
 * Method: POST or GET
 * Body/Query: { orderId: string } (preferred) or { checkoutSessionId: string } (fallback)
 *
 * Returns: { downloads: [{ productId, url, filename }], error: null }
 *
 * Flow (orderId - preferred):
 * 1. Query Polar Orders API directly to get order details and benefits
 * 2. Extract download URLs from granted benefits
 *
 * Flow (checkoutSessionId - fallback):
 * 1. Get checkout session to find customer_id
 * 2. Create customer session and get downloadables
 */

import { Polar } from '@polar-sh/sdk';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

const POLAR_API_BASE = 'https://api.polar.sh';

/**
 * Get downloads directly from an order (fastest approach)
 */
async function getDownloadsFromOrder(orderId) {
  console.log(`Fetching order: ${orderId}`);

  // Get the order details
  const order = await polar.orders.get({ id: orderId });

  if (!order) {
    throw new Error('Order not found');
  }

  console.log('Order status:', order.status);
  console.log('Order product:', order.product?.name);

  // Get customer ID to fetch their downloadables
  const customerId = order.customer_id;
  if (!customerId) {
    throw new Error('No customer ID in order');
  }

  // Create a customer session to access downloadables
  const sessionResponse = await fetch(`${POLAR_API_BASE}/v1/customer-sessions/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customer_id: customerId }),
  });

  if (!sessionResponse.ok) {
    const errorText = await sessionResponse.text();
    throw new Error(`Failed to create customer session: ${sessionResponse.status} ${errorText}`);
  }

  const customerSession = await sessionResponse.json();
  const customerToken = customerSession.token;

  // Get downloadables for this customer
  const downloadablesResponse = await fetch(
    `${POLAR_API_BASE}/v1/customer-portal/downloadables/?limit=100`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!downloadablesResponse.ok) {
    const errorText = await downloadablesResponse.text();
    throw new Error(`Failed to get downloadables: ${downloadablesResponse.status} ${errorText}`);
  }

  const downloadablesData = await downloadablesResponse.json();
  const downloadables = downloadablesData.items || [];

  console.log(`Found ${downloadables.length} total downloadables for customer`);

  // Map to download format
  const downloads = [];
  for (const downloadable of downloadables) {
    const file = downloadable.file;
    if (file && file.download && file.download.url) {
      downloads.push({
        productId: order.product?.id || 'unknown',
        benefitId: downloadable.benefit_id,
        url: file.download.url,
        filename: file.name || 'download.blend',
        expiresAt: file.download.expires_at,
        size: file.size,
        sizeReadable: file.size_readable
      });
      console.log(`✅ Added download: ${file.name} (${file.size_readable})`);
    }
  }

  return {
    downloads,
    customerEmail: order.customer?.email || order.customer_email,
    productIds: order.product ? [order.product.id] : [],
    orderId: order.id
  };
}

/**
 * Fallback: Get downloads via checkout session ID
 */
async function getDownloadsFromCheckout(checkoutSessionId) {
  console.log(`Getting download URLs via checkout session: ${checkoutSessionId}`);

  // Get checkout to find customer_id and products
  const checkout = await polar.checkouts.get({ id: checkoutSessionId });

  console.log('Checkout status:', checkout?.status);
  console.log('Checkout customer_id:', checkout?.customer_id);

  if (!checkout) {
    throw new Error('Checkout session not found');
  }

  // Accept both confirmed and succeeded statuses
  if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
    console.log(`Checkout not complete yet, status: ${checkout.status}`);
    return {
      downloads: [],
      status: checkout.status,
      pending: true
    };
  }

  const customerId = checkout.customer_id;
  if (!customerId) {
    throw new Error('No customer ID found in checkout');
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

  // Create a customer session token
  console.log('Creating customer session for:', customerId);
  const sessionResponse = await fetch(`${POLAR_API_BASE}/v1/customer-sessions/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customer_id: customerId }),
  });

  if (!sessionResponse.ok) {
    const errorText = await sessionResponse.text();
    throw new Error(`Failed to create customer session: ${sessionResponse.status} ${errorText}`);
  }

  const customerSession = await sessionResponse.json();
  const customerToken = customerSession.token;

  if (!customerToken) {
    throw new Error('Failed to create customer session');
  }

  console.log('Customer session created successfully');

  // Get downloadables via Customer Portal API
  const downloadablesResponse = await fetch(
    `${POLAR_API_BASE}/v1/customer-portal/downloadables/?limit=100`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!downloadablesResponse.ok) {
    const errorText = await downloadablesResponse.text();
    throw new Error(`Failed to get downloadables: ${downloadablesResponse.status} ${errorText}`);
  }

  const downloadablesData = await downloadablesResponse.json();
  const downloadables = downloadablesData.items || [];

  console.log(`Found ${downloadables.length} downloadables for customer`);

  // Map downloadables to our download format
  const downloads = [];
  for (const downloadable of downloadables) {
    const file = downloadable.file;
    if (file && file.download && file.download.url) {
      downloads.push({
        productId: 'unknown', // We don't have exact mapping here
        benefitId: downloadable.benefit_id,
        url: file.download.url,
        filename: file.name || 'download.blend',
        expiresAt: file.download.expires_at,
        size: file.size,
        sizeReadable: file.size_readable
      });
      console.log(`✅ Added download: ${file.name} (${file.size_readable})`);
    }
  }

  console.log(`Returning ${downloads.length} downloads for ${targetProductIds.length} products`);

  return {
    downloads,
    customerEmail: checkout.customer_email || checkout.customer?.email,
    productIds: targetProductIds
  };
}

export default async (req, res) => {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Allow both GET and POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      downloads: []
    });
  }

  try {
    // Get params from query (GET) or body (POST)
    const orderId = req.query?.orderId || req.body?.orderId;
    const checkoutSessionId = req.query?.checkoutSessionId || req.body?.checkoutSessionId;

    // Prefer orderId if available (faster, more direct)
    if (orderId) {
      console.log('Using orderId approach:', orderId);
      const result = await getDownloadsFromOrder(orderId);
      return res.status(200).json({ ...result, error: null });
    }

    // Fallback to checkoutSessionId
    if (checkoutSessionId) {
      console.log('Using checkoutSessionId approach:', checkoutSessionId);
      const result = await getDownloadsFromCheckout(checkoutSessionId);

      // Return 202 if checkout is still processing
      if (result.pending) {
        return res.status(202).json({
          error: `Checkout still processing (status: ${result.status})`,
          downloads: [],
          status: result.status
        });
      }

      return res.status(200).json({ ...result, error: null });
    }

    // No valid identifier provided
    return res.status(400).json({
      error: 'orderId or checkoutSessionId is required',
      downloads: []
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
