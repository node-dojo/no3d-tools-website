/**
 * Credit Balance System
 *
 * Manages customer credit balances using Upstash Redis.
 * Credits are tied to email addresses (no login required).
 *
 * Storage Schema:
 * - credit:balance:{email} → { balance: cents, lastUpdated: ISO }
 * - credit:txn:{email}:{id} → { type, amount, source, reference, balanceAfter, createdAt }
 * - credit:txn:index:{email} → [txnId1, txnId2, ...]
 * - credit:giftcard:{code} → { code, value, purchaserEmail, recipientEmail, redeemedAt }
 * - credit:pending:{discountId} → { email, amount, checkoutId } (TTL: 1 hour)
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// Initialize Upstash Redis client
// Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Key prefixes
const BALANCE_KEY = (email) => `credit:balance:${email.toLowerCase()}`;
const TXN_KEY = (email, id) => `credit:txn:${email.toLowerCase()}:${id}`;
const TXN_INDEX_KEY = (email) => `credit:txn:index:${email.toLowerCase()}`;
const GIFTCARD_KEY = (code) => `credit:giftcard:${code.toUpperCase()}`;
const PENDING_KEY = (discountId) => `credit:pending:${discountId}`;

// Transaction types
export const TXN_TYPES = {
  CREDIT_ADDED: 'credit_added',      // Gift card redeemed
  CREDIT_USED: 'credit_used',        // Applied to purchase
  CREDIT_REFUND: 'credit_refund',    // Refund added back
};

/**
 * Generate a unique transaction ID
 */
function generateTxnId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Get customer's credit balance
 * @param {string} email - Customer email
 * @returns {object} { balance: number (cents), lastUpdated: string | null }
 */
export async function getBalance(email) {
  try {
    const data = await redis.get(BALANCE_KEY(email));
    if (!data) {
      return { balance: 0, lastUpdated: null };
    }
    return data;
  } catch (error) {
    console.error('Error getting balance:', error);
    throw error;
  }
}

/**
 * Add credit to customer balance
 * @param {string} email - Customer email
 * @param {number} amountCents - Amount to add in cents
 * @param {string} source - Source of credit (e.g., 'gift_card', 'refund')
 * @param {string} reference - Reference ID (e.g., gift card code, order ID)
 * @returns {object} { newBalance: number, transactionId: string }
 */
export async function addCredit(email, amountCents, source, reference) {
  try {
    // Get current balance
    const current = await getBalance(email);
    const newBalance = current.balance + amountCents;

    // Update balance
    await redis.set(BALANCE_KEY(email), {
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
    });

    // Record transaction
    const txnId = await recordTransaction(email, {
      type: TXN_TYPES.CREDIT_ADDED,
      amount: amountCents,
      source,
      reference,
      balanceAfter: newBalance,
    });

    console.log(`💰 Added ${amountCents} cents credit to ${email}. New balance: ${newBalance}`);

    return { newBalance, transactionId: txnId };
  } catch (error) {
    console.error('Error adding credit:', error);
    throw error;
  }
}

/**
 * Debit credit from customer balance
 * @param {string} email - Customer email
 * @param {number} amountCents - Amount to debit in cents
 * @param {string} source - Source of debit (e.g., 'purchase')
 * @param {string} reference - Reference ID (e.g., order ID)
 * @returns {object} { newBalance: number, transactionId: string }
 */
export async function debitCredit(email, amountCents, source, reference) {
  try {
    // Get current balance
    const current = await getBalance(email);

    if (current.balance < amountCents) {
      throw new Error(`Insufficient credit. Balance: ${current.balance}, Required: ${amountCents}`);
    }

    const newBalance = current.balance - amountCents;

    // Update balance
    await redis.set(BALANCE_KEY(email), {
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
    });

    // Record transaction
    const txnId = await recordTransaction(email, {
      type: TXN_TYPES.CREDIT_USED,
      amount: -amountCents, // Negative for debits
      source,
      reference,
      balanceAfter: newBalance,
    });

    console.log(`💳 Debited ${amountCents} cents from ${email}. New balance: ${newBalance}`);

    return { newBalance, transactionId: txnId };
  } catch (error) {
    console.error('Error debiting credit:', error);
    throw error;
  }
}

/**
 * Record a transaction
 * @param {string} email - Customer email
 * @param {object} txn - Transaction details
 * @returns {string} Transaction ID
 */
export async function recordTransaction(email, txn) {
  try {
    const txnId = generateTxnId();
    const fullTxn = {
      ...txn,
      id: txnId,
      createdAt: new Date().toISOString(),
    };

    // Store transaction
    await redis.set(TXN_KEY(email, txnId), fullTxn);

    // Update transaction index (prepend new txn)
    const currentIndex = (await redis.get(TXN_INDEX_KEY(email))) || [];
    await redis.set(TXN_INDEX_KEY(email), [txnId, ...currentIndex]);

    return txnId;
  } catch (error) {
    console.error('Error recording transaction:', error);
    throw error;
  }
}

/**
 * Get transaction history for a customer
 * @param {string} email - Customer email
 * @param {number} limit - Max number of transactions to return
 * @returns {array} Array of transactions (newest first)
 */
export async function getTransactionHistory(email, limit = 20) {
  try {
    const index = (await redis.get(TXN_INDEX_KEY(email))) || [];
    const txnIds = index.slice(0, limit);

    if (txnIds.length === 0) {
      return [];
    }

    // Fetch all transactions in parallel
    const transactions = await Promise.all(
      txnIds.map((id) => redis.get(TXN_KEY(email, id)))
    );

    return transactions.filter(Boolean);
  } catch (error) {
    console.error('Error getting transaction history:', error);
    throw error;
  }
}

/**
 * Store a gift card code for later redemption
 * @param {string} code - Gift card code
 * @param {number} valueCents - Value in cents
 * @param {string} purchaserEmail - Email of purchaser
 * @param {string} orderId - Polar order ID
 * @param {object} options - Additional options for different gift card types
 * @param {string} options.type - 'credit' or 'membership'
 * @param {number} options.months - Number of free months (for membership type)
 * @param {string} options.subscriptionProductId - Product ID the discount applies to (for membership type)
 * @returns {object} Stored gift card data
 */
export async function storeGiftCard(code, valueCents, purchaserEmail, orderId, options = {}) {
  try {
    const giftCard = {
      code: code.toUpperCase(),
      valueCents,
      purchaserEmail,
      orderId,
      type: options.type || 'credit', // Default to credit for backwards compatibility
      months: options.months || null,
      subscriptionProductId: options.subscriptionProductId || null,
      createdAt: new Date().toISOString(),
      redeemedAt: null,
      redeemedBy: null,
      // For membership type, stores the Polar discount code after redemption
      polarDiscountCode: null,
    };

    await redis.set(GIFTCARD_KEY(code), giftCard);

    console.log(`🎁 Gift card stored: ${code} for $${valueCents / 100} (type: ${giftCard.type})`);

    return giftCard;
  } catch (error) {
    console.error('Error storing gift card:', error);
    throw error;
  }
}

/**
 * Get gift card details
 * @param {string} code - Gift card code
 * @returns {object|null} Gift card data or null if not found
 */
export async function getGiftCard(code) {
  try {
    return await redis.get(GIFTCARD_KEY(code));
  } catch (error) {
    console.error('Error getting gift card:', error);
    throw error;
  }
}

/**
 * Redeem a gift card code
 * For 'credit' type: adds value to customer credit balance
 * For 'membership' type: creates a Polar discount code for free months
 * @param {string} code - Gift card code
 * @param {string} recipientEmail - Email of recipient
 * @returns {object} { success: boolean, message: string, ... }
 */
export async function redeemGiftCard(code, recipientEmail) {
  try {
    const normalizedCode = code.toUpperCase().trim();
    const giftCard = await getGiftCard(normalizedCode);

    if (!giftCard) {
      return { success: false, message: 'Invalid gift card code' };
    }

    if (giftCard.redeemedAt) {
      // For membership type, return the existing discount code if already redeemed
      if (giftCard.type === 'membership' && giftCard.polarDiscountCode) {
        return {
          success: false,
          message: 'This gift card has already been redeemed',
          alreadyRedeemed: true,
          discountCode: giftCard.polarDiscountCode,
        };
      }
      return { success: false, message: 'This gift card has already been redeemed' };
    }

    // Handle membership type - create Polar discount code
    if (giftCard.type === 'membership') {
      return await redeemMembershipGift(giftCard, normalizedCode, recipientEmail);
    }

    // Handle credit type (default) - add credit to balance
    const { newBalance } = await addCredit(
      recipientEmail,
      giftCard.valueCents,
      'gift_card',
      normalizedCode
    );

    // Mark gift card as redeemed
    await redis.set(GIFTCARD_KEY(normalizedCode), {
      ...giftCard,
      redeemedAt: new Date().toISOString(),
      redeemedBy: recipientEmail.toLowerCase(),
    });

    console.log(`✅ Gift card ${normalizedCode} redeemed by ${recipientEmail}`);

    return {
      success: true,
      type: 'credit',
      message: `$${giftCard.valueCents / 100} credit added to your account!`,
      balance: newBalance,
      valueAdded: giftCard.valueCents,
    };
  } catch (error) {
    console.error('Error redeeming gift card:', error);
    return { success: false, message: 'Error redeeming gift card. Please try again.' };
  }
}

/**
 * Redeem a membership gift by creating a Polar discount code
 * @param {object} giftCard - Gift card data from Redis
 * @param {string} normalizedCode - Normalized gift card code
 * @param {string} recipientEmail - Email of recipient
 * @returns {object} Redemption result with discount code
 */
async function redeemMembershipGift(giftCard, normalizedCode, recipientEmail) {
  const { Polar } = await import('@polar-sh/sdk');

  const polar = new Polar({
    accessToken: process.env.POLAR_API_TOKEN,
  });

  try {
    // Generate a unique discount code name
    const discountCodeName = `GIFT-${normalizedCode.slice(-8)}`; // e.g., GIFT-XXXX-XXXX

    // Create Polar discount: 100% off for N months
    const discount = await polar.discounts.create({
      name: `${giftCard.months} Month Gift - ${normalizedCode}`,
      code: discountCodeName,
      type: 'percentage',
      basisPoints: 10000, // 100% off
      duration: 'repeating',
      durationInMonths: giftCard.months,
      maxRedemptions: 1, // Single use
      organizationId: process.env.POLAR_ORGANIZATION_ID,
      // Restrict to the subscription product
      products: giftCard.subscriptionProductId ? [giftCard.subscriptionProductId] : undefined,
    });

    console.log(`🎫 Polar discount created: ${discount.code} for ${giftCard.months} months`);

    // Mark gift card as redeemed and store the Polar discount code
    await redis.set(GIFTCARD_KEY(normalizedCode), {
      ...giftCard,
      redeemedAt: new Date().toISOString(),
      redeemedBy: recipientEmail.toLowerCase(),
      polarDiscountCode: discount.code,
      polarDiscountId: discount.id,
    });

    console.log(`✅ Membership gift ${normalizedCode} redeemed by ${recipientEmail}`);

    return {
      success: true,
      type: 'membership',
      message: `Your ${giftCard.months}-month membership code is ready! Use code "${discount.code}" when subscribing.`,
      discountCode: discount.code,
      months: giftCard.months,
    };
  } catch (error) {
    console.error('Error creating Polar discount:', error);
    return {
      success: false,
      message: 'Error creating your membership code. Please contact support.',
    };
  }
}

/**
 * Store a pending credit debit (before checkout completes)
 * @param {string} discountId - Polar discount ID
 * @param {string} email - Customer email
 * @param {number} amountCents - Amount to debit
 * @param {string} checkoutId - Polar checkout ID
 * @returns {boolean} Success
 */
export async function storePendingDebit(discountId, email, amountCents, checkoutId) {
  try {
    await redis.set(
      PENDING_KEY(discountId),
      {
        email,
        amountCents,
        checkoutId,
        createdAt: new Date().toISOString(),
      },
      { ex: 3600 } // 1 hour TTL
    );

    console.log(`⏳ Pending debit stored: ${discountId} for ${email}`);
    return true;
  } catch (error) {
    console.error('Error storing pending debit:', error);
    throw error;
  }
}

/**
 * Get and delete a pending debit
 * @param {string} discountId - Polar discount ID
 * @returns {object|null} Pending debit data or null
 */
export async function consumePendingDebit(discountId) {
  try {
    const pending = await redis.get(PENDING_KEY(discountId));
    if (pending) {
      await redis.del(PENDING_KEY(discountId));
      console.log(`✅ Pending debit consumed: ${discountId}`);
    }
    return pending;
  } catch (error) {
    console.error('Error consuming pending debit:', error);
    throw error;
  }
}

export default {
  getBalance,
  addCredit,
  debitCredit,
  recordTransaction,
  getTransactionHistory,
  storeGiftCard,
  getGiftCard,
  redeemGiftCard,
  storePendingDebit,
  consumePendingDebit,
  TXN_TYPES,
};
