/**
 * Polar Webhook Receiver
 *
 * Receives and processes webhook events from Polar.sh
 * Handles subscription lifecycle events: created, updated, canceled, revoked
 */

import { Polar } from '@polar-sh/sdk';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { sendWelcomeEmail } from '../../lib/email.js';

const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN;
const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Redis client for auth tokens
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const AUTH_TOKEN_KEY = (token) => `auth:token:${token}`;
const MAGIC_LINK_TTL = 24 * 60 * 60; // 24 hours for welcome emails

// Initialize Supabase client with service role for webhook operations
let supabase = null;
function getSupabase() {
  if (!supabase && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

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

  const db = getSupabase();
  if (!db) {
    console.warn('   ⚠️  Supabase not configured, skipping database storage');
    return;
  }

  try {
    const customerEmail = data.customer?.email || data.user?.email || '';

    const { error } = await db
      .from('subscriptions')
      .upsert({
        polar_subscription_id: data.id,
        customer_id: data.customer_id || data.user_id,
        customer_email: customerEmail,
        product_id: data.product_id,
        status: data.status || 'active',
        started_at: data.started_at || data.created_at || new Date().toISOString(),
        current_period_end: data.current_period_end,
        metadata: {
          polar_data: data,
          product_name: data.product?.name,
          price_id: data.price_id
        }
      }, {
        onConflict: 'polar_subscription_id'
      });

    if (error) {
      console.error(`   ❌ Error storing subscription:`, error);
    } else {
      console.log(`   ✅ Subscription stored in database`);
    }
  } catch (error) {
    console.error(`   ❌ Error in handleSubscriptionCreated:`, error);
  }
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(data) {
  console.log(`   🔄 Subscription updated`);
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   Status: ${data.status}`);

  const db = getSupabase();
  if (!db) {
    console.warn('   ⚠️  Supabase not configured, skipping database update');
    return;
  }

  try {
    const updateData = {
      status: data.status,
      current_period_end: data.current_period_end,
      updated_at: new Date().toISOString()
    };

    // Update metadata with latest polar data
    const { data: existing } = await db
      .from('subscriptions')
      .select('metadata')
      .eq('polar_subscription_id', data.id)
      .single();

    if (existing) {
      updateData.metadata = {
        ...existing.metadata,
        polar_data: data,
        last_updated_event: 'subscription.updated'
      };
    }

    const { error } = await db
      .from('subscriptions')
      .update(updateData)
      .eq('polar_subscription_id', data.id);

    if (error) {
      console.error(`   ❌ Error updating subscription:`, error);
    } else {
      console.log(`   ✅ Subscription updated in database`);
    }
  } catch (error) {
    console.error(`   ❌ Error in handleSubscriptionUpdated:`, error);
  }
}

/**
 * Handle subscription.canceled event
 */
async function handleSubscriptionCanceled(data) {
  console.log(`   ❌ Subscription canceled`);
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   Customer ID: ${data.customer_id}`);

  const db = getSupabase();
  if (!db) {
    console.warn('   ⚠️  Supabase not configured, skipping database update');
    return;
  }

  try {
    const { error } = await db
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: data.canceled_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('polar_subscription_id', data.id);

    if (error) {
      console.error(`   ❌ Error updating subscription:`, error);
    } else {
      console.log(`   ✅ Subscription marked as canceled in database`);
      console.log(`   ℹ️  Access remains until period ends`);
    }
  } catch (error) {
    console.error(`   ❌ Error in handleSubscriptionCanceled:`, error);
  }
}

/**
 * Handle subscription.revoked event
 */
async function handleSubscriptionRevoked(data) {
  console.log(`   🚫 Subscription revoked`);
  console.log(`   Subscription ID: ${data.id}`);
  console.log(`   Customer ID: ${data.customer_id}`);

  const db = getSupabase();
  if (!db) {
    console.warn('   ⚠️  Supabase not configured, skipping database update');
    return;
  }

  try {
    const { error } = await db
      .from('subscriptions')
      .update({
        status: 'revoked',
        revoked_at: data.revoked_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('polar_subscription_id', data.id);

    if (error) {
      console.error(`   ❌ Error updating subscription:`, error);
    } else {
      console.log(`   ✅ Subscription marked as revoked in database`);
      console.log(`   🚫 Access immediately revoked`);
    }
  } catch (error) {
    console.error(`   ❌ Error in handleSubscriptionRevoked:`, error);
  }
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
 * Stores order AND fetches/caches download URLs
 */
async function handleOrderCreated(data) {
  console.log(`   📦 Order created: ${data.id}`);
  
  const db = getSupabase();
  if (!db) {
    console.warn('   ⚠️  Supabase not configured');
    return;
  }

  const customerEmail = data.customer?.email || data.billing_address?.email;
  const customerId = data.customer_id || data.user_id;
  
  // Extract product IDs from order
  const items = data.items || data.line_items || [];
  const productIds = items.map(item => item.product_id || item.product?.id).filter(Boolean);

  // Initialize order_downloads record as pending
  const { error: insertError } = await db
    .from('order_downloads')
    .upsert({
      polar_order_id: data.id,
      polar_checkout_id: data.checkout_id || null,
      customer_id: customerId,
      customer_email: customerEmail,
      product_ids: productIds,
      status: 'pending',
      updated_at: new Date().toISOString()
    }, { onConflict: 'polar_order_id' });

  if (insertError) {
    console.error(`   ❌ Error creating order_downloads record:`, insertError);
  }

  // Fetch actual download URLs from Polar
  try {
    const downloads = await fetchDownloadsForCustomer(customerId);
    
    // Update record with download data
    const { error: updateError } = await db
      .from('order_downloads')
      .update({
        downloads: downloads,
        status: downloads.length > 0 ? 'ready' : 'failed',
        error_message: downloads.length === 0 ? 'No downloadables found' : null,
        updated_at: new Date().toISOString()
      })
      .eq('polar_order_id', data.id);

    if (updateError) {
      console.error(`   ❌ Error updating downloads:`, updateError);
    } else {
      console.log(`   ✅ Cached ${downloads.length} downloads for order ${data.id}`);
    }
  } catch (fetchError) {
    console.error(`   ❌ Error fetching downloads:`, fetchError);
    
    // Mark as failed but don't lose the order
    await db
      .from('order_downloads')
      .update({
        status: 'failed',
        error_message: fetchError.message,
        updated_at: new Date().toISOString()
      })
      .eq('polar_order_id', data.id);
  }

  // Store order in database
  try {
    const primaryProductId = productIds[0] || null;

    const { error } = await db
      .from('orders')
      .upsert({
        polar_order_id: data.id,
        customer_id: customerId,
        customer_email: customerEmail,
        product_id: primaryProductId,
        amount: data.amount || data.total || 0,
        currency: data.currency || 'usd',
        status: 'completed',
        metadata: {
          polar_data: data,
          items: items.map(item => ({
            product_id: item.product_id || item.product?.id,
            product_name: item.product?.name || item.name,
            amount: item.amount || item.price
          })),
          discount: data.discount,
          billing_address: data.billing_address
        }
      }, {
        onConflict: 'polar_order_id'
      });

    if (error) {
      console.error(`   ❌ Error storing order:`, error);
    } else {
      console.log(`   ✅ Order stored in database`);
    }
  } catch (error) {
    console.error(`   ❌ Error in order storage:`, error);
  }

  // --- WELCOME EMAIL & ACCOUNT SETUP ---
  try {
    console.log(`   🚀 Triggering welcome email for ${customerEmail}...`);
    // Generate a magic link token for account setup
    const token = crypto.randomUUID();
    const customerName = data.customer?.name || data.billing_address?.name || 'Initiate';

    // Store token in Redis
    const redisResult = await redis.set(AUTH_TOKEN_KEY(token), {
      email: customerEmail.toLowerCase().trim(),
      customerId: customerId,
      createdAt: new Date().toISOString(),
      source: 'welcome_email'
    }, { ex: MAGIC_LINK_TTL });
    
    console.log(`   🔑 Token stored in Redis: ${redisResult}`);

    // Send Welcome Email
    const emailResult = await sendWelcomeEmail(customerEmail, customerName, token);
    console.log(`   📧 Welcome & Setup email response:`, JSON.stringify(emailResult));
  } catch (authError) {
    console.error(`   ❌ Error triggering welcome email:`, authError);
  }
}

/**
 * Fetch downloadables for a customer with retry logic
 */
async function fetchDownloadsForCustomer(customerId, maxRetries = 3) {
  const POLAR_API_BASE = 'https://api.polar.sh';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create customer session
      const sessionResponse = await fetch(`${POLAR_API_BASE}/v1/customer-sessions/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: customerId }),
      });

      if (!sessionResponse.ok) {
        throw new Error(`Session creation failed: ${sessionResponse.status}`);
      }

      const { token } = await sessionResponse.json();

      // Fetch downloadables
      const downloadablesResponse = await fetch(
        `${POLAR_API_BASE}/v1/customer-portal/downloadables/?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!downloadablesResponse.ok) {
        throw new Error(`Downloadables fetch failed: ${downloadablesResponse.status}`);
      }

      const { items = [] } = await downloadablesResponse.json();

      // Map to download format
      return items
        .filter(d => d.file?.download?.url)
        .map(d => ({
          benefitId: d.benefit_id,
          url: d.file.download.url,
          filename: d.file.name || 'download.blend',
          expiresAt: d.file.download.expires_at,
          size: d.file.size,
          sizeReadable: d.file.size_readable
        }));

    } catch (error) {
      console.warn(`   ⚠️  Download fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
      } else {
        throw error;
      }
    }
  }
  
  return [];
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
