/**
 * Vercel Serverless Function: Customer Profile Management
 *
 * Endpoint: /api/customer/profile
 * Methods: GET, PATCH
 *
 * GET:
 *   Headers: Authorization: Bearer {session_token}
 *   Returns: { id, email, name, createdAt, metadata }
 *
 * PATCH:
 *   Headers: Authorization: Bearer {session_token}
 *   Body: { name: string }
 *   Returns: { success: true, customer: {...} }
 *
 * Allows customers to view and update their profile information.
 * Email cannot be changed for security reasons.
 */

import { Polar } from '@polar-sh/sdk';
import { validateSession } from '../lib/session.js';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Validate session
  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - please sign in',
    });
  }

  const customerId = session.customerId;

  try {
    // Handle GET request - fetch profile
    if (req.method === 'GET') {
      console.log(`📋 Fetching profile for customer: ${customerId}`);

      // Fetch customer from Polar
      const customer = await polar.customers.get({ id: customerId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      // Return customer profile
      return res.status(200).json({
        id: customer.id,
        email: customer.email,
        name: customer.name || null,
        createdAt: customer.createdAt,
        metadata: customer.metadata || {},
      });
    }

    // Handle PATCH request - update profile
    else if (req.method === 'PATCH') {
      console.log(`✏️ Updating profile for customer: ${customerId}`);

      const { name } = req.body;

      // Validate name (if provided)
      if (name !== undefined && name !== null) {
        if (typeof name !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Name must be a string',
          });
        }

        // Trim and validate name length
        const trimmedName = name.trim();
        if (trimmedName.length > 100) {
          return res.status(400).json({
            success: false,
            error: 'Name must be 100 characters or less',
          });
        }
      }

      // Update customer in Polar
      const updatedCustomer = await polar.customers.update({
        id: customerId,
        name: name ? name.trim() : null,
      });

      console.log(`✅ Profile updated successfully`);

      // Return updated customer
      return res.status(200).json({
        success: true,
        customer: {
          id: updatedCustomer.id,
          email: updatedCustomer.email,
          name: updatedCustomer.name || null,
          createdAt: updatedCustomer.createdAt,
          metadata: updatedCustomer.metadata || {},
        },
      });
    }

    // Method not allowed
    else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error) {
    console.error('Profile operation failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      status: error.status,
      statusCode: error.statusCode,
    });

    // Return appropriate error
    if (error.statusCode === 404 || error.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
    });
  }
}
