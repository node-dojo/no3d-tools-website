/**
 * POST /api/create-portal-session
 *
 * Body: { "email": "user@example.com" }
 *
 * Looks up a Stripe customer by email and returns a Billing Portal URL.
 * Used when the user does not have a checkout session id in the URL.
 */

import Stripe from 'stripe';
import { setCorsHeaders } from './lib/cors.js';

const rateLimit = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    rateLimit.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > MAX_REQUESTS;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (setCorsHeaders(req, res, { methods: 'POST, OPTIONS' })) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.', portalUrl: null });
  }

  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim()
      : typeof req.body === 'string'
        ? (() => {
            try {
              return JSON.parse(req.body).email?.trim();
            } catch {
              return null;
            }
          })()
        : null;

  if (!email) {
    return res.status(400).json({ error: 'email required', portalUrl: null });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Server configuration error', portalUrl: null });
  }

  const siteUrl =
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://no3dtools.com';

  const returnUrl = `${siteUrl.replace(/\/$/, '')}/subscribe.html`;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { data } = await stripe.customers.list({ email, limit: 1 });
    if (!data.length) {
      return res.status(404).json({
        error: 'no_customer',
        message: 'No subscription found for that email.',
        portalUrl: null
      });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: data[0].id,
      return_url: returnUrl
    });

    return res.status(200).json({ portalUrl: portal.url, customerId: data[0].id });
  } catch (error) {
    console.error('create-portal-session:', error?.message || error);
    return res.status(500).json({
      error: 'portal_error',
      portalUrl: null
    });
  }
}
