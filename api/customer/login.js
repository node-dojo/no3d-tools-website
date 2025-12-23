/**
 * Vercel Serverless Function: Login Customer
 *
 * Endpoint: /api/customer/login
 * Method: POST
 * Body: { email: string, password: string }
 *
 * Authenticates customer with email/password and creates session.
 */

import { Polar } from '@polar-sh/sdk';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { createSession } from '../lib/session.js';

// Password storage key prefix
const PASSWORD_KEY = (email) => `user:password:${email.toLowerCase()}`;

/**
 * Hash password using PBKDF2 (built-in, no external deps needed)
 */
function hashPassword(password, salt) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash;
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
    const { email, password } = req.body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // Initialize SDKs inside handler (required for Vercel serverless)
    const polar = new Polar({
      accessToken: process.env.POLAR_API_TOKEN,
    });

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const normalizedEmail = email.toLowerCase().trim();

    console.log(`🔐 Login attempt for: ${normalizedEmail}`);

    // Get stored password
    const storedData = await redis.get(PASSWORD_KEY(normalizedEmail));

    if (!storedData) {
      console.log(`❌ No account found for ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const { hash: storedHash, salt } = storedData;

    // Verify password
    const inputHash = hashPassword(password, salt);

    if (inputHash !== storedHash) {
      console.log(`❌ Invalid password for ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    console.log(`✅ Password verified for ${normalizedEmail}`);

    // Get customer from Polar
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
        console.log(`✅ Found Polar customer: ${customer.email}`);
      } else {
        // Create customer in Polar if not exists
        customer = await polar.customers.create({
          email: normalizedEmail,
        });
        customerId = customer.id;
        console.log(`✅ Created Polar customer: ${customer.email}`);
      }
    } catch (polarError) {
      console.error('Error with Polar customer:', polarError);
      // Continue without Polar customer
    }

    // Create session token
    const sessionToken = crypto.randomUUID();

    await createSession(sessionToken, {
      customerId: customerId,
      email: normalizedEmail,
      name: customer?.name || null,
    });

    console.log(`✅ Login successful for ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      sessionToken: sessionToken,
      customer: {
        id: customerId,
        email: normalizedEmail,
        name: customer?.name || null,
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
    });
  }
}
