/**
 * Polar Webhook Receiver
 *
 * Receives and processes webhook events from Polar.sh
 * Handles subscription lifecycle events: created, updated, canceled, revoked
 * Handles gift card purchases: generates codes and sends emails
 */

import { Polar } from '@polar-sh/sdk';
import crypto from 'crypto';
import { isGiftCardProduct, createGiftCardDiscount } from '../../gift-cards/generate.js';
import { sendGiftCardEmail } from '../../gift-cards/email.js';
import { consumePendingDebit, debitCredit } from '../../../lib/credit.js';

const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN;
const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

/**
 * Verify Polar webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from X-Polar-Signature header
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(payload, signature) {
  if (!POLAR_WEBHOOK_SECRET) {
    console.warn('⚠️  POLAR_WEBHOOK_SECRET not set, skipping signature verification');
    return true; // In development, allow without secret
  }

  const hmac = crypto.createHmac('sha256', POLAR_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  const expectedSignature = `sha256=${digest}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Process webhook event
 * @param {object} event - Webhook event data
 */
async function processWebhookEvent(event) {
  const { type, data } = event;

  console.log(`📥 Received webhook event: ${type}`);
  console.log(`   Event ID: ${event.id || 'unknown'}`);
  console.log(`   Timestamp: ${event.created_at || new Date().toISOString()}`);

  switch (type) {
    case 'subscription.created':
      await handleSubscriptionCreated(data);
      break;

    case 'subscription.updated':
      await handleSubscriptionUpdated(data);
      break;

    case 'subscription.canceled':
      await handleSubscriptionCanceled(data);
      break;

    case 'subscription.revoked':
      await handleSubscriptionRevoked(data);
      break;

    case 'checkout.created':
      await handleCheckoutCreated(data);
      break;

    case 'order.created':
      await handleOrderCreated(data);
      break;

    default:
      console.log(`   ⚠️  Unhandled event type: ${type}`);
  }
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(data) {
  console.log(`   ✅ Subscription created`);
  console.log(`   Customer ID: ${data.customer_id}`);
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   Product ID: ${data.product_id}`);

  // TODO: Store subscription in database or Polar metadata
  // For MVP, we'll just log and use Polar API for verification
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(data) {
  console.log(`   🔄 Subscription updated`);
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   Status: ${data.status}`);

  // TODO: Update subscription status in database
}

/**
 * Handle subscription.canceled event
 */
async function handleSubscriptionCanceled(data) {
  console.log(`   ❌ Subscription canceled`);
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   Customer ID: ${data.customer_id}`);

  // TODO: Mark subscription for end-of-period revocation
  // Access remains until period ends
}

/**
 * Handle subscription.revoked event
 */
async function handleSubscriptionRevoked(data) {
  console.log(`   🚫 Subscription revoked`);
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   Customer ID: ${data.customer_id}`);

  // TODO: Immediately revoke access
}

/**
 * Handle checkout.created event
 */
async function handleCheckoutCreated(data) {
  console.log(`   🛒 Checkout created`);
  console.log(`   Checkout ID: ${data.id}`);

  // TODO: Initialize pending order if needed
}

/**
 * Handle order.created event
 * Checks if order contains gift card products and processes them
 * Also handles credit debit confirmation for orders using store credit
 */
async function handleOrderCreated(data) {
  console.log(`   📦 Order created`);
  console.log(`   Order ID: ${data.id}`);
  console.log(`   Customer ID: ${data.customer_id}`);

  // Get customer email from order data
  const customerEmail = data.customer?.email || data.billing_address?.email;
  if (!customerEmail) {
    console.warn('   ⚠️  No customer email found in order');
    return;
  }

  // Check if a credit discount was used (by checking discount metadata)
  const discount = data.discount;
  if (discount && discount.id) {
    // Check if this was a credit discount by looking for pending debit
    try {
      const pendingDebit = await consumePendingDebit(discount.id);
      if (pendingDebit) {
        console.log(`   💳 Credit discount detected: ${discount.code || discount.id}`);

        // Debit the credit from customer balance
        await debitCredit(
          pendingDebit.email,
          pendingDebit.amountCents,
          'purchase',
          data.id
        );

        console.log(`   ✅ Credit debited: $${pendingDebit.amountCents / 100} from ${pendingDebit.email}`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing credit debit:`, error);
    }
  }

  // Check if order contains gift card products
  const items = data.items || data.line_items || [];
  for (const item of items) {
    const productId = item.product_id || item.product?.id;

    if (productId && isGiftCardProduct(productId)) {
      console.log(`   🎁 Gift card product detected: ${productId}`);

      try {
        // Create gift card and store in KV
        const giftCard = await createGiftCardDiscount(productId, data.id, customerEmail);
        console.log(`   ✅ Gift card created: ${giftCard.code} for $${giftCard.value}`);

        // Send email with gift card code
        const emailResult = await sendGiftCardEmail(giftCard, customerEmail);
        if (emailResult.success) {
          console.log(`   📧 Gift card email sent to ${customerEmail}`);
        } else {
          console.error(`   ❌ Failed to send gift card email:`, emailResult.error);
        }
      } catch (error) {
        console.error(`   ❌ Error processing gift card:`, error);
      }
    }
  }
}

/**
 * Vercel serverless function handler
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get signature from header
    const signature = req.headers['x-polar-signature'];
    if (!signature && POLAR_WEBHOOK_SECRET) {
      console.warn('⚠️  Missing X-Polar-Signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook event
    await processWebhookEvent(req.body);

    // Return success
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
