/**
 * Gift Card System with Credit Balance
 *
 * When a gift card is purchased, we store the code in Vercel KV.
 * When redeemed, the value is added to the recipient's credit balance.
 * Credits can be used partially across multiple purchases.
 *
 * Flow:
 * 1. Customer buys gift card → Polar order.created webhook fires
 * 2. We generate a unique code (DOJO-XXXX-XXXX-XXXX)
 * 3. We store the code in Vercel KV
 * 4. We email the code to the purchaser
 * 5. Recipient redeems code → Credit added to their balance
 * 6. Credit is used at checkout via dynamic Polar discounts
 */

import crypto from 'crypto';
import { storeGiftCard, getGiftCard, redeemGiftCard } from '../../lib/credit.js';

// Gift card product IDs and their values (in cents for Polar API)
const GIFT_CARD_PRODUCTS = {
  'c36ce649-f55f-4901-a8a0-339ca41deb27': { valueCents: 3300, valueDollars: 33, name: 'Christmas Gift Card $33' },
  '7d677970-f244-48fa-aba9-e1e91c977a88': { valueCents: 11100, valueDollars: 111, name: 'Christmas Gift Card $111' },
  'ea5c5645-eea2-46b0-ae23-86061fd432a7': { valueCents: 22200, valueDollars: 222, name: 'Christmas Gift Card $222' },
};

/**
 * Generate a unique gift card code
 * Format: DOJO-XXXX-XXXX-XXXX (uppercase alphanumeric)
 */
export function generateGiftCardCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: 0, O, 1, I
  let code = 'DOJO';

  for (let i = 0; i < 3; i++) {
    code += '-';
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(crypto.randomInt(chars.length));
    }
  }

  return code;
}

/**
 * Check if a product is a gift card
 */
export function isGiftCardProduct(productId) {
  return productId in GIFT_CARD_PRODUCTS;
}

/**
 * Get gift card details from product ID
 */
export function getGiftCardDetails(productId) {
  return GIFT_CARD_PRODUCTS[productId] || null;
}

/**
 * Create a gift card and store it in Vercel KV
 *
 * @param {string} productId - The gift card product ID that was purchased
 * @param {string} orderId - The Polar order ID
 * @param {string} purchaserEmail - Email of the person who bought the gift card
 * @returns {object} Gift card details including the code
 */
export async function createGiftCardDiscount(productId, orderId, purchaserEmail) {
  const giftCardDetails = getGiftCardDetails(productId);

  if (!giftCardDetails) {
    throw new Error(`Unknown gift card product: ${productId}`);
  }

  const code = generateGiftCardCode();

  try {
    // Store the gift card in Vercel KV for later redemption
    await storeGiftCard(code, giftCardDetails.valueCents, purchaserEmail, orderId);

    console.log(`🎁 Gift card stored: ${code} for $${giftCardDetails.valueDollars}`);

    return {
      code,
      value: giftCardDetails.valueDollars,
      valueCents: giftCardDetails.valueCents,
      name: giftCardDetails.name,
      orderId,
      purchaserEmail,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Failed to create gift card:', error);
    throw error;
  }
}

/**
 * Verify a gift card code exists and is valid
 * Uses Vercel KV to check if the code exists and hasn't been redeemed
 */
export async function verifyGiftCardCode(code) {
  try {
    const normalizedCode = code.toUpperCase().trim();
    const giftCard = await getGiftCard(normalizedCode);

    if (!giftCard) {
      return { valid: false, message: 'Invalid gift card code' };
    }

    if (giftCard.redeemedAt) {
      return { valid: false, message: 'This gift card has already been redeemed' };
    }

    return {
      valid: true,
      value: giftCard.valueCents / 100,
      valueCents: giftCard.valueCents,
      code: giftCard.code,
      message: `Valid gift card worth $${giftCard.valueCents / 100}`,
    };
  } catch (error) {
    console.error('Error verifying gift card:', error);
    return { valid: false, message: 'Unable to verify gift card' };
  }
}

// Re-export redeemGiftCard from credit lib for convenience
export { redeemGiftCard } from '../../lib/credit.js';

export default {
  generateGiftCardCode,
  isGiftCardProduct,
  getGiftCardDetails,
  createGiftCardDiscount,
  verifyGiftCardCode,
};
