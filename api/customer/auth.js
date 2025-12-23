/**
 * Vercel Serverless Function: Send Magic Link
 *
 * Endpoint: /api/customer/auth
 * Method: POST
 * Body: { email: string }
 *
 * Returns: { success: true, message: "Check your email" }
 *
 * Sends a magic link to the customer's email for passwordless authentication.
 * If customer doesn't exist in Polar, still sends email (for first-time buyers).
 */

import { Polar } from '@polar-sh/sdk';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { sendMagicLinkEmail } from '../lib/email.js';

// Magic link token key prefix
const AUTH_TOKEN_KEY = (token) => `auth:token:${token}`;

// Magic link TTL: 15 minutes in seconds
const MAGIC_LINK_TTL = 15 * 60;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

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
    const { email } = req.body;

    // Validate email format
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    console.log(`🔐 Magic link request for ${normalizedEmail}`);

    // Initialize Polar SDK
    const polar = new Polar({
      accessToken: process.env.POLAR_API_TOKEN,
    });

    // Initialize Redis client
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Look up customer in Polar
    let customer = null;
    let customerId = null;

    try {
      const customers = await polar.customers.list({
        email: normalizedEmail,
        limit: 1,
      });

      if (customers && customers.items && customers.items.length > 0) {
        customer = customers.items[0];
        customerId = customer.id;
        console.log(`Found customer: ${customerId}`);
      } else {
        console.log(`No customer found for ${normalizedEmail} (will still send email)`);
      }
    } catch (error) {
      console.error('Error looking up customer:', error);
      // Continue anyway - we still send the email for security
    }

    // Generate crypto-random token
    const token = crypto.randomUUID();

    // Store token in Redis with 15-min expiry
    const tokenData = {
      email: normalizedEmail,
      customerId: customerId,
      createdAt: new Date().toISOString(),
    };

    await redis.set(AUTH_TOKEN_KEY(token), tokenData, { ex: MAGIC_LINK_TTL });

    console.log(`🔑 Magic link token created (expires in 15 minutes)`);

    // Send email via Resend
    try {
      await sendMagicLinkEmail(normalizedEmail, token);
    } catch (error) {
      console.error('Error sending magic link email:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send email. Please try again.',
      });
    }

    // Always return success (never reveal if email exists)
    return res.status(200).json({
      success: true,
      message: 'Check your email for a sign-in link',
    });
  } catch (error) {
    console.error('Auth request failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    // Generic error message (don't leak details)
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
    });
  }
}
