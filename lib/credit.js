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
 * @returns {object} Stored gift card data
 */
export async function storeGiftCard(code, valueCents, purchaserEmail, orderId) {
  try {
    const giftCard = {
      code: code.toUpperCase(),
      valueCents,
      purchaserEmail,
      orderId,
      createdAt: new Date().toISOString(),
      redeemedAt: null,
      redeemedBy: null,
    };

    await redis.set(GIFTCARD_KEY(code), giftCard);

    console.log(`🎁 Gift card stored: ${code} for $${valueCents / 100}`);

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
 * Redeem a gift card code and add credit to customer
 * @param {string} code - Gift card code
 * @param {string} recipientEmail - Email of recipient
 * @returns {object} { success: boolean, message: string, balance?: number }
 */
export async function redeemGiftCard(code, recipientEmail) {
  try {
    const normalizedCode = code.toUpperCase().trim();
    const giftCard = await getGiftCard(normalizedCode);

    if (!giftCard) {
      return { success: false, message: 'Invalid gift card code' };
    }

    if (giftCard.redeemedAt) {
      return { success: false, message: 'This gift card has already been redeemed' };
    }

    // Add credit to recipient
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
