/**
 * Credit History API Endpoint
 *
 * GET /api/credit/history?email={email}&limit={limit}
 * Returns the customer's transaction history
 */

import { getTransactionHistory, TXN_TYPES } from '../../lib/credit.js';

// Human-readable transaction descriptions
const TXN_DESCRIPTIONS = {
  [TXN_TYPES.CREDIT_ADDED]: 'Gift card redeemed',
  [TXN_TYPES.CREDIT_USED]: 'Applied to purchase',
  [TXN_TYPES.CREDIT_REFUND]: 'Refund credit',
};

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

  const { email, limit } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const limitNum = parseInt(limit, 10) || 20;
  const clampedLimit = Math.min(Math.max(1, limitNum), 100);

  try {
    const transactions = await getTransactionHistory(email, clampedLimit);

    // Format transactions for display
    const formattedTransactions = transactions.map((txn) => ({
      id: txn.id,
      type: txn.type,
      description: TXN_DESCRIPTIONS[txn.type] || txn.type,
      amount: txn.amount,
      amountFormatted: txn.amount >= 0
        ? `+$${(txn.amount / 100).toFixed(2)}`
        : `-$${(Math.abs(txn.amount) / 100).toFixed(2)}`,
      balanceAfter: txn.balanceAfter,
      balanceAfterFormatted: `$${(txn.balanceAfter / 100).toFixed(2)}`,
      source: txn.source,
      reference: txn.reference,
      createdAt: txn.createdAt,
    }));

    return res.status(200).json({
      success: true,
      email: email.toLowerCase(),
      transactions: formattedTransactions,
      count: formattedTransactions.length,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history',
    });
  }
}
