import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  sendLicenseKeyEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  notifyAdminAcquisition,
} from './lib/email.js';

// Disable Vercel body parsing so we get the raw bytes for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function generateLicenseKey() {
  // 80-ish bits of entropy; 16 chars from base36 (36 possibilities) ~= 82 bits.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const chars = new Array(16).fill(null).map(() => alphabet[crypto.randomInt(0, alphabet.length)]);
  const s = chars.join('');
  return `NO3D-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

function toDateFromUnixSeconds(unixSeconds) {
  if (!unixSeconds) return null;
  const ms = typeof unixSeconds === 'string' ? Number(unixSeconds) * 1000 : unixSeconds * 1000;
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

async function upsertSubscription({ supabase, stripeCustomerId, stripeSubId, email, licenseKey, status, expiresAt, graceUntil }) {
  await supabase.from('subscriptions').upsert(
    {
      stripe_customer_id: stripeCustomerId,
      stripe_sub_id: stripeSubId || null,
      email,
      license_key: licenseKey,
      status,
      tier: 'subscriber',
      expires_at: expiresAt || null,
      grace_until: graceUntil || null
    },
    { onConflict: 'stripe_customer_id' }
  );
}

async function handleInvoicePaid({ supabase, invoice, stripeCustomerId, stripeSubId }) {
  const email =
    invoice.customer_email ||
    invoice.customer_details?.email ||
    invoice.customer?.email ||
    null;

  const existing = await supabase
    .from('subscriptions')
    .select('license_key, email, expires_at')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  const existingRow = existing.data || null;
  const licenseKey = existingRow?.license_key || generateLicenseKey();

  const now = new Date();
  const baseExpiry = existingRow?.expires_at ? new Date(existingRow.expires_at) : now;
  const effectiveBase = baseExpiry > now ? baseExpiry : now;
  const expiresAt = new Date(effectiveBase.getTime() + 30 * 24 * 60 * 60 * 1000);

  const finalEmail = email || existingRow?.email;
  if (!finalEmail) {
    throw new Error('Missing customer email for license issuance');
  }

  await upsertSubscription({
    supabase,
    stripeCustomerId,
    stripeSubId,
    email: finalEmail,
    licenseKey,
    status: 'active',
    expiresAt,
    graceUntil: null
  });

  // Log conversion event
  try {
    await supabase.from('site_events').insert({
      event: existingRow?.license_key ? 'subscription_renewed' : 'checkout_complete',
      properties: { email_domain: finalEmail.split('@')[1], is_new: !existingRow?.license_key },
      page: '/api/stripe-webhook',
    });
  } catch (_) { /* never block webhook on analytics */ }

  // Send the email only when we create a new license.
  if (!existingRow?.license_key) {
    const addonDownloadUrl = process.env.ADDON_DOWNLOAD_URL;
    if (process.env.LICENSE_EMAIL_DRY_RUN === 'true') {
      console.log('LICENSE_EMAIL_DRY_RUN=true - skipping Resend email send');
    } else {
      await sendLicenseKeyEmail(finalEmail, licenseKey, addonDownloadUrl);
    }
    try {
      await notifyAdminAcquisition({
        type: 'paid_subscriber',
        subscriberEmail: finalEmail,
        detail: {
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubId || '',
        },
      });
    } catch (_) { /* non-fatal */ }
  }
}

async function handleInvoicePaymentFailed({ supabase, invoice, stripeCustomerId, stripeSubId }) {
  const email =
    invoice.customer_email ||
    invoice.customer_details?.email ||
    invoice.customer?.email ||
    null;

  const existing = await supabase
    .from('subscriptions')
    .select('license_key, email, expires_at')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  const existingRow = existing.data || null;
  const licenseKey = existingRow?.license_key || generateLicenseKey();

  const now = new Date();
  const graceUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const finalEmail = email || existingRow?.email;
  if (!finalEmail) {
    throw new Error('Missing customer email for grace-state subscription');
  }

  await upsertSubscription({
    supabase,
    stripeCustomerId,
    stripeSubId,
    email: finalEmail,
    licenseKey,
    status: 'grace',
    expiresAt: existingRow?.expires_at ? new Date(existingRow.expires_at) : null,
    graceUntil
  });

  // Notify user about payment failure — wrapped in try/catch so email
  // failure does not break the webhook response.
  try {
    await sendPaymentFailedEmail(finalEmail, graceUntil);
  } catch (emailErr) {
    console.error('Failed to send payment-failed email:', emailErr?.message || emailErr);
  }
}

async function handleSubscriptionDeleted({ supabase, subscription, stripeCustomerId, stripeSubId }) {
  const email =
    subscription.customer_details?.email ||
    subscription.customer_email ||
    subscription.customer?.email ||
    null;

  const existing = await supabase
    .from('subscriptions')
    .select('license_key, email')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  const existingRow = existing.data || null;
  const licenseKey = existingRow?.license_key || generateLicenseKey();

  const finalEmail = email || existingRow?.email;
  if (!finalEmail) {
    throw new Error('Missing customer email for subscription deletion');
  }

  const expiresAt = new Date();

  await upsertSubscription({
    supabase,
    stripeCustomerId,
    stripeSubId,
    email: finalEmail,
    licenseKey,
    status: 'expired',
    expiresAt,
    graceUntil: null
  });

  // Notify user about subscription cancellation — wrapped in try/catch so
  // email failure does not break the webhook response.
  try {
    await sendSubscriptionCancelledEmail(finalEmail, expiresAt);
  } catch (emailErr) {
    console.error('Failed to send subscription-cancelled email:', emailErr?.message || emailErr);
  }
}

async function handleSubscriptionUpdated({ supabase, subscription, stripeCustomerId, stripeSubId }) {
  const email =
    subscription.customer_details?.email ||
    subscription.customer_email ||
    subscription.customer?.email ||
    null;

  const existing = await supabase
    .from('subscriptions')
    .select('license_key, email')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  const existingRow = existing.data || null;
  const licenseKey = existingRow?.license_key || generateLicenseKey();
  const finalEmail = email || existingRow?.email;
  if (!finalEmail) {
    throw new Error('Missing customer email for subscription update');
  }

  // Map Stripe subscription state to our simplified license status.
  // (invoice.* events remain the authoritative source for grace/active transitions)
  const stripeStatus = subscription.status;
  const status =
    stripeStatus === 'active' || stripeStatus === 'trialing'
      ? 'active'
      : stripeStatus === 'past_due' || stripeStatus === 'unpaid'
        ? 'grace'
        : 'expired';

  const expiresAt = toDateFromUnixSeconds(subscription.current_period_end) || undefined;

  await upsertSubscription({
    supabase,
    stripeCustomerId,
    stripeSubId,
    email: finalEmail,
    licenseKey,
    status,
    expiresAt,
    graceUntil: null
  });
}

async function processStripeEvent({ supabase, event }) {
  const stripeCustomerId =
    typeof event.data?.object?.customer === 'string'
      ? event.data.object.customer
      : event.data?.object?.customer?.id;

  const stripeSubId =
    event.data?.object?.subscription ||
    event.data?.object?.id ||
    null;

  switch (event.type) {
    case 'invoice.paid': {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
      if (!customerId) throw new Error('invoice.paid missing customer id');
      const subId = invoice.subscription || null;
      await handleInvoicePaid({ supabase, invoice, stripeCustomerId: customerId, stripeSubId: subId });
      return;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
      if (!customerId) throw new Error('invoice.payment_failed missing customer id');
      const subId = invoice.subscription || null;
      await handleInvoicePaymentFailed({ supabase, invoice, stripeCustomerId: customerId, stripeSubId: subId });
      return;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;
      if (!customerId) throw new Error('customer.subscription.deleted missing customer id');
      await handleSubscriptionDeleted({
        supabase,
        subscription,
        stripeCustomerId: customerId,
        stripeSubId: subscription.id || null
      });
      return;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;
      if (!customerId) throw new Error('customer.subscription.updated missing customer id');
      await handleSubscriptionUpdated({
        supabase,
        subscription,
        stripeCustomerId: customerId,
        stripeSubId: subscription.id || null
      });
      return;
    }
    default:
      // Ignore unknown event types to keep webhook forward compatible.
      return;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ received: false, error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ received: false, error: 'Server misconfigured: STRIPE_SECRET_KEY missing' });
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ received: false, error: 'Server misconfigured: STRIPE_WEBHOOK_SECRET missing' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ received: false, error: 'Server misconfigured: Supabase missing' });
  }

  const signature = req.headers['stripe-signature'] || req.headers['Stripe-Signature'];
  if (!signature) {
    return res.status(400).json({ received: false, error: 'Missing stripe-signature header' });
  }

  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err?.message || err);
    return res.status(400).json({ received: false, error: 'Invalid signature' });
  }

  const stripeEventId = event.id;
  const stripeEventType = event.type;

  // Idempotency: record each Stripe event id once.
  const existing = await supabase
    .from('stripe_event_logs')
    .select('status')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();

  if (existing.data?.status === 'success' || existing.data?.status === 'processing') {
    return res.status(200).json({ received: true, idempotent: true });
  }

  // Attempt to create the processing record; if it already exists we proceed carefully.
  try {
    await supabase.from('stripe_event_logs').insert({
      stripe_event_id: stripeEventId,
      stripe_event_type: stripeEventType,
      status: 'processing',
      payload: event
    });
  } catch (e) {
    // Unique conflict: another execution is likely processing the same event.
  }

  try {
    await processStripeEvent({ supabase, event });

    await supabase
      .from('stripe_event_logs')
      .update({ status: 'success', processed_at: new Date().toISOString() })
      .eq('stripe_event_id', stripeEventId);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error?.message || error);
    await supabase
      .from('stripe_event_logs')
      .update({
        status: 'failed',
        error_message: error?.message || String(error),
        processed_at: new Date().toISOString()
      })
      .eq('stripe_event_id', stripeEventId);

    return res.status(500).json({ received: false, error: 'Webhook processing failed' });
  }
}

