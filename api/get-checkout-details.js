/**
 * Get Checkout Details
 * 
 * Endpoint: GET /api/get-checkout-details?checkout_id=xxx
 * 
 * Fetches checkout session details from Polar to display on success page.
 * Returns product names, customer email, and total amount.
 */

import { Polar } from '@polar-sh/sdk';

const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN;

// Initialize Polar SDK
const polar = new Polar({
  accessToken: POLAR_API_TOKEN
});

export default async function handler(req, res) {
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
    return res.status(400).json({ 
      error: 'checkout_id parameter required'
    });
  }

  if (!POLAR_API_TOKEN) {
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
      customerEmail: checkout.customerEmail,
      productId: checkout.productId
    });

    // Extract relevant details
    const response = {
      checkoutId: checkout.id,
      status: checkout.status,
      customerEmail: checkout.customerEmail || checkout.customer_email,
      total: checkout.totalAmount || checkout.total_amount,
      currency: checkout.currency || 'usd',
      products: []
    };

    // Try to get product details
    if (checkout.productId || checkout.product_id) {
      const productId = checkout.productId || checkout.product_id;
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
        // Continue without product details
      }
    }

    // Also check if there's a products array in the checkout
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
    
    // Return a graceful error - the success page will still work
    return res.status(200).json({
      checkoutId: checkout_id,
      status: 'completed',
      products: [],
      error: 'Could not fetch full details'
    });
  }
}
