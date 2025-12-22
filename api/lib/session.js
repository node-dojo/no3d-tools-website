/**
 * Session Validation Utility
 *
 * Shared utility for validating customer sessions.
 * Sessions are stored in Redis with a 30-day expiry.
 */

import { Redis } from '@upstash/redis';
import { Polar } from '@polar-sh/sdk';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

// Session key prefix
const SESSION_KEY = (token) => `session:${token}`;

// Session TTL: 30 days in seconds
const SESSION_TTL = 30 * 24 * 60 * 60;

/**
 * Create a new session
 * @param {string} sessionToken - Unique session token
 * @param {object} data - Session data
 * @param {string} data.customerId - Polar customer ID
 * @param {string} data.email - Customer email
 * @param {string} data.name - Customer name (optional)
 * @returns {Promise<boolean>} Success
 */
export async function createSession(sessionToken, data) {
  try {
    const sessionData = {
      customerId: data.customerId,
      email: data.email,
      name: data.name || null,
      createdAt: new Date().toISOString(),
    };

    await redis.set(SESSION_KEY(sessionToken), sessionData, { ex: SESSION_TTL });

    console.log(`✅ Session created for ${data.email} (expires in 30 days)`);
    return true;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Validate a session and return customer data
 * @param {object} req - HTTP request object
 * @returns {Promise<object|null>} Customer data or null if invalid
 */
export async function validateSession(req) {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      console.log('No Authorization header found');
      return null;
    }

    // Check for Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('Invalid Authorization header format');
      return null;
    }

    const sessionToken = parts[1];

    // Look up session in Redis
    const sessionData = await redis.get(SESSION_KEY(sessionToken));

    if (!sessionData) {
      console.log('Session not found or expired');
      return null;
    }

    console.log(`✅ Session validated for ${sessionData.email}`);

    // Return customer data
    return {
      customerId: sessionData.customerId,
      email: sessionData.email,
      name: sessionData.name,
      sessionToken: sessionToken,
    };
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

/**
 * Get session data by token
 * @param {string} sessionToken - Session token
 * @returns {Promise<object|null>} Session data or null
 */
export async function getSession(sessionToken) {
  try {
    const sessionData = await redis.get(SESSION_KEY(sessionToken));
    return sessionData;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Delete a session (logout)
 * @param {string} sessionToken - Session token to delete
 * @returns {Promise<boolean>} Success
 */
export async function deleteSession(sessionToken) {
  try {
    await redis.del(SESSION_KEY(sessionToken));
    console.log('🚪 Session deleted (logout)');
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

/**
 * Refresh session TTL
 * @param {string} sessionToken - Session token
 * @returns {Promise<boolean>} Success
 */
export async function refreshSession(sessionToken) {
  try {
    const sessionData = await getSession(sessionToken);

    if (!sessionData) {
      return false;
    }

    // Reset expiration to 30 days
    await redis.expire(SESSION_KEY(sessionToken), SESSION_TTL);

    console.log(`🔄 Session refreshed for ${sessionData.email}`);
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    throw error;
  }
}

/**
 * Validate session and fetch full customer data from Polar
 * @param {object} req - HTTP request object
 * @returns {Promise<object|null>} Full customer data or null
 */
export async function validateSessionWithCustomer(req) {
  try {
    const sessionData = await validateSession(req);

    if (!sessionData) {
      return null;
    }

    // Fetch full customer data from Polar
    const customer = await polar.customers.get(sessionData.customerId);

    return {
      ...sessionData,
      customer: customer,
    };
  } catch (error) {
    console.error('Error validating session with customer data:', error);
    return null;
  }
}

export default {
  createSession,
  validateSession,
  getSession,
  deleteSession,
  refreshSession,
  validateSessionWithCustomer,
};
