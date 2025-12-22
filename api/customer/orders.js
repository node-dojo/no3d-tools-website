/**
 * Vercel Serverless Function: Customer Order History
 *
 * Endpoint: /api/customer/orders
 * Method: GET
 * Headers: Authorization: Bearer {session_token}
 * Query: ?page=1&limit=20
 *
 * Returns: {
 *   orders: [{
 *     id: "order-id",
 *     createdAt: "2024-01-15T...",
 *     status: "paid",
 *     amount: 2400,
 *     currency: "usd",
 *     products: [{
 *       id: "product-id",
 *       name: "Product Name",
 *       handle: "product-handle"
 *     }],
 *     invoiceUrl: "https://..."
 *   }],
 *   pagination: { page: 1, totalPages: 3, totalItems: 45 }
 * }
 */

import { Polar } from '@polar-sh/sdk';
import { validateSession } from '../lib/session.js';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

/**
 * Format order data for response
 * @param {object} order - Polar order object
 * @returns {object} Formatted order
 */
function formatOrder(order) {
  // Extract products from order items
  const products = [];

  if (order.orderItems && Array.isArray(order.orderItems)) {
    for (const item of order.orderItems) {
      if (item.product) {
        products.push({
          id: item.product.id,
          name: item.product.name,
          handle: item.product.handle || null,
          description: item.product.description || null,
        });
      }
    }
  }

  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    products: products,
    invoiceUrl: order.invoiceUrl || null,
    billingEmail: order.billingEmail || null,
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow GET
  if (req.method !== 'GET') {
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

    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100

    console.log(`📦 Fetching orders for customer ${customerId} (page ${page}, limit ${limit})`);

    // Fetch orders from Polar
    let ordersResponse;
    try {
      ordersResponse = await polar.orders.list({
        customerId: customerId,
        sorting: ['-created_at'], // Most recent first
        limit: limit,
        page: page,
      });
    } catch (error) {
      console.error('Error fetching orders from Polar:', {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
      });

      // Return empty list if orders not found
      if (error.statusCode === 404 || error.status === 404) {
        return res.status(200).json({
          orders: [],
          pagination: {
            page: 1,
            totalPages: 0,
            totalItems: 0,
          },
        });
      }

      throw error;
    }

    // Format orders
    const orders = (ordersResponse.items || []).map(formatOrder);

    // Calculate pagination
    const totalItems = ordersResponse.pagination?.totalCount || orders.length;
    const totalPages = Math.ceil(totalItems / limit);

    console.log(`✅ Retrieved ${orders.length} orders (${totalItems} total)`);

    return res.status(200).json({
      orders: orders,
      pagination: {
        page: page,
        totalPages: totalPages,
        totalItems: totalItems,
      },
    });
  } catch (error) {
    console.error('Orders request failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Failed to fetch orders',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
