/**
 * Credit Balance API Endpoint
 *
 * GET /api/credit/balance?email={email}
 * Returns the customer's credit balance
 */

import { getBalance } from '../../lib/credit.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const { balance, lastUpdated } = await getBalance(email);

    return res.status(200).json({
      success: true,
      email: email.toLowerCase(),
      balance: balance, // in cents
      balanceFormatted: `$${(balance / 100).toFixed(2)}`,
      lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
    });
  }
}
