/**
 * Credit Redemption API Endpoint
 *
 * POST /api/credit/redeem
 * Body: { code: string, email: string }
 *
 * Redeems a gift card code and adds credit to the customer's balance
 */

import { redeemGiftCard, getBalance } from '../../lib/credit.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, email } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Gift card code is required',
    });
  }

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format',
    });
  }

  try {
    const result = await redeemGiftCard(code, email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Get updated balance for response
    const { balance } = await getBalance(email);

    return res.status(200).json({
      success: true,
      message: result.message,
      valueAdded: result.valueAdded,
      valueAddedFormatted: `$${(result.valueAdded / 100).toFixed(2)}`,
      newBalance: balance,
      newBalanceFormatted: `$${(balance / 100).toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error redeeming gift card:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to redeem gift card. Please try again.',
    });
  }
}
