/**
 * Vercel Serverless Function: Verify Token & Create Session
 *
 * Endpoint: /api/customer/session
 * Method: POST
 * Body: { token: string }
 *
 * Returns: { success: true, sessionToken: "xxx", customer: {...} }
 *
 * Verifies the magic link token and creates a session for the customer.
 */

import { Polar } from '@polar-sh/sdk';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { createSession } from '../lib/session.js';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Magic link token key prefix
const AUTH_TOKEN_KEY = (token) => `auth:token:${token}`;

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
    const { token } = req.body;

    // Validate token
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
      });
    }

    console.log(`🔐 Verifying magic link token`);

    // Look up token in Redis
    const tokenData = await redis.get(AUTH_TOKEN_KEY(token));

    if (!tokenData) {
      console.log('Token not found or expired');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    const { email, customerId } = tokenData;

    // Delete magic link token (one-time use)
    await redis.del(AUTH_TOKEN_KEY(token));
    console.log('🔥 Magic link token consumed (one-time use)');

    // If no customer ID, try to find customer by email
    let customer = null;
    let finalCustomerId = customerId;

    if (finalCustomerId) {
      // Fetch customer by ID
      try {
        customer = await polar.customers.get(finalCustomerId);
        console.log(`✅ Customer found: ${customer.email}`);
      } catch (error) {
        console.error('Error fetching customer by ID:', error);
        // Fall through to email lookup
      }
    }

    // If no customer yet, try to find by email
    if (!customer) {
      try {
        const customers = await polar.customers.list({
          email: email,
          limit: 1,
        });

        if (customers && customers.items && customers.items.length > 0) {
          customer = customers.items[0];
          finalCustomerId = customer.id;
          console.log(`✅ Customer found by email: ${customer.email}`);
        } else {
          console.log(`No customer found for ${email}`);
          // Return error - customer must exist in Polar
          return res.status(404).json({
            success: false,
            error: 'No customer account found. Please make a purchase first.',
          });
        }
      } catch (error) {
        console.error('Error looking up customer by email:', error);
        return res.status(500).json({
          success: false,
          error: 'Error verifying customer account',
        });
      }
    }

    // Create session token (30-day expiry)
    const sessionToken = crypto.randomUUID();

    await createSession(sessionToken, {
      customerId: finalCustomerId,
      email: customer.email,
      name: customer.name || null,
    });

    // Return session token and customer data
    return res.status(200).json({
      success: true,
      sessionToken: sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name || null,
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    console.error('Session creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
    });
  }
}
