/**
 * List Gift Cards Purchased by Customer
 *
 * GET /api/gift-cards/purchased?email=customer@example.com
 *
 * Returns all gift cards purchased by the customer email
 */

import { redis, GIFTCARD_KEY } from '../../lib/credit.js';

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
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }

  try {
    // Get all gift card keys from Redis
    // Note: In production with many gift cards, you'd want to use Redis SCAN instead
    // For now, we'll iterate through known patterns

    // Since we can't easily scan all keys, we'll need to track purchased gift cards
    // Let's create a set of gift card codes for each purchaser email
    const purchasedSetKey = `purchaser:${email.toLowerCase()}:giftcards`;

    // Get all gift card codes purchased by this email
    const giftCardCodes = await redis.smembers(purchasedSetKey);

    if (!giftCardCodes || giftCardCodes.length === 0) {
      return res.status(200).json({
        success: true,
        giftCards: [],
      });
    }

    // Fetch details for each gift card
    const giftCards = [];
    for (const code of giftCardCodes) {
      const giftCard = await redis.get(GIFTCARD_KEY(code));
      if (giftCard) {
        giftCards.push({
          code: giftCard.code,
          valueCents: giftCard.valueCents,
          type: giftCard.type,
          months: giftCard.months,
          createdAt: giftCard.createdAt,
          redeemedAt: giftCard.redeemedAt,
          redeemedBy: giftCard.redeemedBy,
          orderId: giftCard.orderId,
        });
      }
    }

    // Sort by creation date (newest first)
    giftCards.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.status(200).json({
      success: true,
      giftCards,
    });

  } catch (error) {
    console.error('Error fetching purchased gift cards:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchased gift cards',
    });
  }
}
