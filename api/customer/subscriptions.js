/**
 * Vercel Serverless Function: List Customer Subscriptions
 *
 * Endpoint: /api/customer/subscriptions
 * Method: GET
 * Headers: Authorization: Bearer {session_token}
 *
 * Returns: {
 *   subscriptions: [
 *     {
 *       id: "sub-id",
 *       status: "active",
 *       product: { id, name, description },
 *       currentPeriodStart: "2024-01-01T...",
 *       currentPeriodEnd: "2024-02-01T...",
 *       cancelAtPeriodEnd: false,
 *       amount: 1200,
 *       currency: "usd",
 *       interval: "month"
 *     }
 *   ],
 *   hasActiveSubscription: true
 * }
 */

import { Polar } from '@polar-sh/sdk';
import { validateSession } from '../lib/session.js';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

/**
 * Format subscription data for client
 */
function formatSubscription(sub) {
  return {
    id: sub.id,
    status: sub.status || 'active',
    product: sub.product
      ? {
          id: sub.product.id,
          name: sub.product.name,
          description: sub.product.description,
        }
      : null,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
    amount: sub.amount || sub.price?.priceAmount || 0,
    currency: sub.currency || sub.price?.priceCurrency || 'usd',
    interval:
      sub.recurringInterval || sub.price?.recurringInterval || 'month',
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

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
    // Validate session
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = session.customerId;

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error',
      });
    }

    console.log(`Fetching subscriptions for customer: ${customerId}`);

    // Fetch subscriptions from Polar
    const subscriptionsResponse = await polar.subscriptions.list({
      customerId: customerId,
      sorting: ['-started_at'],
      limit: 100,
    });

    if (!subscriptionsResponse || !subscriptionsResponse.items) {
      console.log('No subscriptions found');
      return res.status(200).json({
        subscriptions: [],
        hasActiveSubscription: false,
      });
    }

    // Format subscriptions
    const subscriptions = subscriptionsResponse.items.map(formatSubscription);

    // Check if any subscriptions are active
    const hasActiveSubscription = subscriptions.some(
      (sub) => sub.status === 'active' && !sub.cancelAtPeriodEnd
    );

    console.log(
      `Found ${subscriptions.length} subscriptions (${hasActiveSubscription ? 'has active' : 'no active'})`
    );

    return res.status(200).json({
      subscriptions,
      hasActiveSubscription,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Failed to fetch subscriptions',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
