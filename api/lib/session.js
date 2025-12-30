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

// ============================================================================
// POLAR CUSTOMER SESSION UTILITIES
// ============================================================================
// Polar uses a separate "Customer Session" token for Customer Portal APIs.
// This is different from our custom Redis sessions.
// See: POLAR_DOWNLOADABLES_API.md for full documentation
// ============================================================================

// Polar API base URL
const POLAR_API_BASE = 'https://api.polar.sh';

// Cache for Polar sessions (they last 1 hour, we cache for 50 minutes)
const polarSessionCache = new Map();
const POLAR_SESSION_CACHE_TTL = 50 * 60 * 1000; // 50 minutes in ms

/**
 * Create a Polar Customer Session for accessing Customer Portal APIs
 * 
 * This creates a temporary token that can be used to access:
 * - GET /v1/customer-portal/downloadables/
 * - GET /v1/customer-portal/orders/
 * - GET /v1/customer-portal/subscriptions/
 * 
 * @param {string} customerId - Polar customer ID
 * @param {object} options - Options
 * @param {boolean} options.useCache - Whether to use cached sessions (default: true)
 * @returns {Promise<object>} Polar session with token, expiresAt, customerPortalUrl
 */
export async function createPolarSession(customerId, options = {}) {
  const { useCache = true } = options;
  
  // Check cache first
  if (useCache) {
    const cached = polarSessionCache.get(customerId);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`♻️ Using cached Polar session for ${customerId}`);
      return cached.session;
    }
  }
  
  try {
    console.log(`🔑 Creating new Polar customer session for ${customerId}`);
    
    const response = await fetch(`${POLAR_API_BASE}/v1/customer-sessions/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customer_id: customerId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Polar session: ${response.status} ${errorText}`);
    }
    
    const session = await response.json();
    
    // Normalize response (API returns snake_case, SDK might return camelCase)
    const normalizedSession = {
      id: session.id,
      token: session.token,
      expiresAt: session.expires_at || session.expiresAt,
      customerPortalUrl: session.customer_portal_url || session.customerPortalUrl,
      customerId: session.customer_id || session.customerId,
      customer: session.customer,
    };
    
    // Cache the session
    if (useCache) {
      polarSessionCache.set(customerId, {
        session: normalizedSession,
        expiresAt: Date.now() + POLAR_SESSION_CACHE_TTL,
      });
    }
    
    console.log(`✅ Created Polar session, expires: ${normalizedSession.expiresAt}`);
    return normalizedSession;
    
  } catch (error) {
    console.error('Failed to create Polar customer session:', error);
    throw error;
  }
}

/**
 * Create a Polar Customer Session using the SDK
 * @param {string} customerId - Polar customer ID
 * @returns {Promise<object>} Polar session
 */
export async function createPolarSessionSDK(customerId) {
  try {
    const session = await polar.customerSessions.create({
      customerId: customerId,
    });
    
    // Normalize response
    return {
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt || session.expires_at,
      customerPortalUrl: session.customerPortalUrl || session.customer_portal_url,
      customerId: session.customerId || session.customer_id,
      customer: session.customer,
    };
  } catch (error) {
    console.error('Failed to create Polar session via SDK:', error);
    throw error;
  }
}

/**
 * Fetch customer downloadables using a Polar session token
 * @param {string} polarSessionToken - Polar customer session token
 * @param {object} options - Query options
 * @param {string} options.benefitId - Filter by benefit ID
 * @param {number} options.limit - Max results (default 100)
 * @returns {Promise<object>} Downloadables response with items array
 */
export async function fetchCustomerDownloadables(polarSessionToken, options = {}) {
  const { benefitId, limit = 100 } = options;
  
  let url = `${POLAR_API_BASE}/v1/customer-portal/downloadables/?limit=${limit}`;
  if (benefitId) {
    url += `&benefit_id=${benefitId}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${polarSessionToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch downloadables: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

/**
 * Fetch customer state (subscriptions, benefits, etc.) using org token
 * @param {string} customerId - Polar customer ID
 * @returns {Promise<object>} Customer state
 */
export async function fetchCustomerState(customerId) {
  const response = await fetch(`${POLAR_API_BASE}/v1/customers/${customerId}/state`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch customer state: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

/**
 * Get downloadable files for a customer
 * Combines session creation and downloadables fetching
 * @param {string} customerId - Polar customer ID
 * @param {object} options - Options
 * @param {string} options.benefitId - Filter by benefit ID
 * @returns {Promise<Array>} Array of downloadable file objects
 */
export async function getCustomerDownloadables(customerId, options = {}) {
  // Create Polar session
  const polarSession = await createPolarSession(customerId);
  
  // Fetch downloadables
  const downloadables = await fetchCustomerDownloadables(polarSession.token, options);
  
  // Transform to simplified format
  return (downloadables.items || []).map(item => ({
    id: item.id,
    benefitId: item.benefit_id,
    downloadUrl: item.file?.download?.url,
    expiresAt: item.file?.download?.expires_at,
    fileName: item.file?.name,
    fileSize: item.file?.size,
    fileSizeReadable: item.file?.size_readable,
    mimeType: item.file?.mime_type,
    checksum: item.file?.checksum_sha256_hex,
  })).filter(d => d.downloadUrl); // Only include items with valid download URLs
}

/**
 * Clear cached Polar sessions
 * @param {string} customerId - Optional customer ID to clear specific cache
 */
export function clearPolarSessionCache(customerId = null) {
  if (customerId) {
    polarSessionCache.delete(customerId);
  } else {
    polarSessionCache.clear();
  }
}

export default {
  // Our custom session management
  createSession,
  validateSession,
  getSession,
  deleteSession,
  refreshSession,
  validateSessionWithCustomer,
  
  // Polar customer session utilities
  createPolarSession,
  createPolarSessionSDK,
  fetchCustomerDownloadables,
  fetchCustomerState,
  getCustomerDownloadables,
  clearPolarSessionCache,
};
