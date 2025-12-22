/**
 * Vercel Serverless Function: Cancel Subscription
 *
 * Endpoint: /api/customer/subscriptions/cancel
 * Method: POST
 * Headers: Authorization: Bearer {session_token}
 * Body: {
 *   subscriptionId: "sub-xxx",
 *   immediately: false,
 *   reason: "too_expensive"
 * }
 *
 * Returns: { success: true, subscription: {...} }
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

    const { subscriptionId, immediately, reason } = req.body;

    // Validate input
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: subscriptionId required',
      });
    }

    console.log(
      `Cancel request for subscription ${subscriptionId} (immediately: ${immediately || false})`
    );

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

    let updatedSubscription;

    if (immediately) {
      // Immediate revoke
      console.log(`Revoking subscription ${subscriptionId} immediately`);

      try {
        updatedSubscription = await polar.subscriptions.revoke({
          id: subscriptionId,
        });
      } catch (error) {
        console.error('Error revoking subscription:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to cancel subscription immediately',
        });
      }
    } else {
      // Cancel at period end
      console.log(`Setting subscription ${subscriptionId} to cancel at period end`);

      const updateData = {
        id: subscriptionId,
        cancelAtPeriodEnd: true,
      };

      // Add cancellation reason if provided
      if (reason && typeof reason === 'string') {
        updateData.customerCancellationReason = reason;
      }

      try {
        updatedSubscription = await polar.subscriptions.update(updateData);
      } catch (error) {
        console.error('Error updating subscription:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to cancel subscription',
        });
      }
    }

    console.log(`Subscription ${subscriptionId} cancelled successfully`);

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
    console.error('Error cancelling subscription:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
