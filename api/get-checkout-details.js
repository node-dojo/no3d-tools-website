/**
 * Get Checkout Details - SIMPLIFIED
 * 
 * Endpoint: GET /api/get-checkout-details?checkout_id=xxx
 * 
 * Per Polar documentation, this endpoint simply fetches checkout session details
 * to display on the success/confirmation page. It does NOT handle downloads -
 * that's what Polar's Customer Portal is for.
 * 
 * Returns: { checkoutId, status, customerEmail, customerId, total, currency, products }
 */

import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { checkout_id } = req.query;

  if (!checkout_id) {
    return res.status(400).json({ error: 'checkout_id parameter required' });
  }

  if (!process.env.POLAR_API_TOKEN) {
    console.error('POLAR_API_TOKEN not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`🔍 Fetching checkout details for: ${checkout_id}`);
    
    // Fetch checkout session from Polar
    const checkout = await polar.checkouts.get({ id: checkout_id });
    
    if (!checkout) {
      return res.status(404).json({ error: 'Checkout not found' });
    }

    console.log('✅ Checkout fetched:', {
      id: checkout.id,
      status: checkout.status,
      customerId: checkout.customer_id
    });

    // Build response with available data
    const response = {
      checkoutId: checkout.id,
      status: checkout.status,
      customerId: checkout.customer_id,
      customerEmail: checkout.customer_email || checkout.customer?.email,
      total: checkout.total_amount || checkout.totalAmount || 0,
      currency: checkout.currency || 'usd',
      products: []
    };

    // Try to get product details if we have a product ID
    const productId = checkout.product_id || checkout.productId;
    if (productId) {
      try {
        const product = await polar.products.get({ id: productId });
        if (product) {
          response.products.push({
            id: product.id,
            name: product.name,
            description: product.description
          });
        }
      } catch (productError) {
        console.warn('Could not fetch product details:', productError.message);
      }
    }

    // Also check if checkout has embedded products array
    if (checkout.products && Array.isArray(checkout.products)) {
      for (const p of checkout.products) {
        const existingIds = response.products.map(x => x.id);
        if (!existingIds.includes(p.id)) {
          response.products.push({
            id: p.id,
            name: p.name || 'Product',
            description: p.description
          });
        }
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching checkout details:', error.message);
    
    // Return graceful error - success page will still work
    return res.status(200).json({
      checkoutId: checkout_id,
      status: 'completed',
      products: [],
      note: 'Could not fetch full details'
    });
  }
}
