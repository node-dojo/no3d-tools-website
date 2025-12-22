/**
 * Vercel Serverless Function: Reactivate Subscription
 *
 * Endpoint: /api/customer/subscriptions/reactivate
 * Method: POST
 * Headers: Authorization: Bearer {session_token}
 * Body: { subscriptionId: "sub-xxx" }
 *
 * Returns: { success: true, subscription: {...} }
 *
 * Reactivates a subscription that was set to cancel at period end.
 */

import { Polar } from '@polar-sh/sdk';
import { validateSession } from '../../lib/session.js';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

/**
 * Verify customer owns the subscription
 */
async function verifySubscriptionOwnership(subscriptionId, customerId) {
  try {
    const subscription = await polar.subscriptions.get({ id: subscriptionId });

    if (!subscription) {
      return { valid: false, error: 'Subscription not found' };
    }

    // Check if subscription belongs to customer
    if (subscription.customerId !== customerId) {
      console.error(
        `Customer ${customerId} does not own subscription ${subscriptionId}`
      );
      return { valid: false, error: 'Unauthorized' };
    }

    return { valid: true, subscription };
  } catch (error) {
    console.error('Error verifying subscription ownership:', error);
    return { valid: false, error: 'Failed to verify subscription' };
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Validate session
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const customerId = session.customerId;

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    const { subscriptionId } = req.body;

    // Validate input
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: subscriptionId required',
      });
    }

    console.log(`Reactivation request for subscription ${subscriptionId}`);

    // Verify subscription ownership
    const verification = await verifySubscriptionOwnership(
      subscriptionId,
      customerId
    );

    if (!verification.valid) {
      return res.status(403).json({
        success: false,
        error: verification.error || 'Unauthorized',
      });
    }

    // Reactivate subscription by setting cancelAtPeriodEnd to false
    let updatedSubscription;

    try {
      updatedSubscription = await polar.subscriptions.update({
        id: subscriptionId,
        cancelAtPeriodEnd: false,
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reactivate subscription',
      });
    }

    console.log(`Subscription ${subscriptionId} reactivated successfully`);

    return res.status(200).json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd || false,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to reactivate subscription',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
