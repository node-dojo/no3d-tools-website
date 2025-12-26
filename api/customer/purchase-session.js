/**
 * Vercel Serverless Function: Create Session from Purchase
 *
 * Endpoint: /api/customer/purchase-session
 * Method: POST
 * Body: { checkoutSessionId: string }
 *
 * Returns: { success: true, sessionToken: "xxx", customer: {...} }
 *
 * Verifies a successful Polar checkout and creates a session for the customer.
 * This allows instant auto-login after purchase.
 */

import { Polar } from '@polar-sh/sdk';
import crypto from 'crypto';
import { createSession } from '../lib/session.js';

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
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { checkoutSessionId } = req.body;

    // Validate checkoutSessionId
    if (!checkoutSessionId || typeof checkoutSessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid checkout session ID',
      });
    }

    // Initialize SDK
    const polar = new Polar({
      accessToken: process.env.POLAR_API_TOKEN,
    });

    console.log(`🔐 Attempting to create purchase session for: ${checkoutSessionId}`);

    // Verify checkout with Polar
    let checkout;
    try {
        checkout = await polar.checkouts.get({ id: checkoutSessionId });
    } catch (error) {
        console.error('Error fetching checkout from Polar:', error);
        return res.status(404).json({
            success: false,
            error: 'Checkout session not found',
        });
    }

    // Verify checkout was successful
    if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
        console.log(`Checkout status is ${checkout.status}, not succeeded`);
        return res.status(403).json({
            success: false,
            error: 'Checkout has not been completed successfully',
            status: checkout.status
        });
    }

    const email = checkout.customer_email || checkout.customer?.email;
    if (!email) {
        return res.status(400).json({
            success: false,
            error: 'No email associated with this checkout session',
        });
    }

    // Find or create customer in Polar (to ensure we have a stable customer ID)
    let customer = null;
    let customerId = checkout.customer_id || checkout.customer?.id;

    if (!customerId) {
        try {
            const customers = await polar.customers.list({
                email: email,
                limit: 1,
            });

            if (customers && customers.items && customers.items.length > 0) {
                customer = customers.items[0];
                customerId = customer.id;
            } else {
                // Create customer if they don't exist yet
                customer = await polar.customers.create({
                    email: email,
                });
                customerId = customer.id;
            }
        } catch (polarError) {
            console.error('Error ensuring customer exists:', polarError);
            // Fallback to just using the email
        }
    }

    // Create session token (30-day expiry)
    const sessionToken = crypto.randomUUID();

    await createSession(sessionToken, {
      customerId: customerId,
      email: email,
      name: checkout.customer_name || checkout.customer?.name || null,
      source: 'purchase_auto_login'
    });

    console.log(`✅ Auto-login session created for ${email}`);

    // Return session token and customer data
    return res.status(200).json({
      success: true,
      sessionToken: sessionToken,
      customer: {
        id: customerId,
        email: email,
        name: checkout.customer_name || checkout.customer?.name || null,
      },
    });
  } catch (error) {
    console.error('Purchase session creation failed:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating your session.',
    });
  }
}
