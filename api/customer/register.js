/**
 * Vercel Serverless Function: Register Customer
 *
 * Endpoint: /api/customer/register
 * Method: POST
 * Body: { email: string, password: string }
 *
 * Creates a new customer account with email/password authentication.
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
function hashPassword(password, salt = null) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: useSalt };
}

/**
 * Verify password
 */
function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
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

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
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

    // Check if user already exists
    const existingPassword = await redis.get(PASSWORD_KEY(normalizedEmail));
    if (existingPassword) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please sign in.',
      });
    }

    console.log(`📝 Registering new user: ${normalizedEmail}`);

    // Hash password
    const { hash, salt } = hashPassword(password);

    // Store password in Redis
    await redis.set(PASSWORD_KEY(normalizedEmail), JSON.stringify({ hash, salt }));

    // Create or find customer in Polar
    let customer = null;
    let customerId = null;

    try {
      // Try to find existing customer
      const customers = await polar.customers.list({
        email: normalizedEmail,
        limit: 1,
      });

      if (customers && customers.items && customers.items.length > 0) {
        customer = customers.items[0];
        customerId = customer.id;
        console.log(`✅ Found existing Polar customer: ${customer.email}`);
      } else {
        // Create new customer in Polar
        customer = await polar.customers.create({
          email: normalizedEmail,
        });
        customerId = customer.id;
        console.log(`✅ Created new Polar customer: ${customer.email}`);
      }
    } catch (polarError) {
      console.error('Error with Polar customer:', polarError);
      // Continue without Polar customer - they can be linked later
    }

    // Create session token
    const sessionToken = crypto.randomUUID();

    await createSession(sessionToken, {
      customerId: customerId,
      email: normalizedEmail,
      name: null,
    });

    console.log(`✅ Registration complete for ${normalizedEmail}`);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      sessionToken: sessionToken,
      customer: {
        id: customerId,
        email: normalizedEmail,
        name: null,
      },
    });
  } catch (error) {
    console.error('Registration failed:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
    });
  }
}
