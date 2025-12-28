/**
 * Get Order Downloads API
 * 
 * Endpoint: GET /api/get-order-downloads
 * Query params: 
 *   - checkoutId (preferred) or orderId
 * 
 * Strategy:
 * 1. Check Supabase cache first (fast path)
 * 2. If not found/pending, poll Polar API with backoff
 * 3. Return downloads or fallback instructions
 */

import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

const POLAR_API_BASE = 'https://api.polar.sh';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { checkoutId, orderId } = req.query;

  if (!checkoutId && !orderId) {
    return res.status(400).json({ 
      error: 'checkoutId or orderId required',
      downloads: []
    });
  }

  try {
    // ═══════════════════════════════════════════════════════════════════
    // STRATEGY 1: Check Supabase cache (fast path)
    // ═══════════════════════════════════════════════════════════════════
    
    let cacheQuery = supabase.from('order_downloads').select('*');
    
    if (checkoutId) {
      cacheQuery = cacheQuery.eq('polar_checkout_id', checkoutId);
    } else if (orderId) {
      cacheQuery = cacheQuery.eq('polar_order_id', orderId);
    }
    
    const { data: cached } = await cacheQuery.maybeSingle();

    if (cached && cached.status === 'ready' && cached.downloads?.length > 0) {
      console.log(`✅ Cache hit for ${checkoutId || orderId}`);
      return res.status(200).json({
        downloads: cached.downloads,
        customerEmail: cached.customer_email,
        productIds: cached.product_ids,
        source: 'cache'
      });
    }

    // Cache miss or pending - need to fetch from Polar

    // ═══════════════════════════════════════════════════════════════════
    // STRATEGY 2: Get checkout/order info from Polar
    // ═══════════════════════════════════════════════════════════════════
    
    let customerId = null;
    let customerEmail = null;
    let productIds = [];

    if (checkoutId) {
      // Get checkout details
      const checkout = await polar.checkouts.get({ id: checkoutId });
      
      if (!checkout) {
        return res.status(404).json({ error: 'Checkout not found', downloads: [] });
      }

      // Check if checkout is still processing
      if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
        return res.status(202).json({
          error: 'Checkout still processing',
          status: checkout.status,
          downloads: [],
          retry: true
        });
      }

      customerId = checkout.customer_id;
      customerEmail = checkout.customer_email || checkout.customer?.email;
      
      // Extract product IDs
      if (checkout.products) {
        productIds = checkout.products.map(p => p.id || p);
      } else if (checkout.product) {
        productIds = [checkout.product.id || checkout.product];
      }
    } else if (orderId) {
      const order = await polar.orders.get({ id: orderId });
      if (!order) {
        return res.status(404).json({ error: 'Order not found', downloads: [] });
      }
      customerId = order.customer_id;
      customerEmail = order.customer?.email || order.customer_email;
      if (order.product) productIds = [order.product.id];
    }

    if (!customerId) {
      return res.status(400).json({ 
        error: 'Could not determine customer',
        downloads: []
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // STRATEGY 3: Fetch downloadables with retry
    // ═══════════════════════════════════════════════════════════════════
    
    const downloads = await fetchWithRetry(customerId);

    if (downloads.length > 0) {
      // Cache the result for future requests
      await supabase.from('order_downloads').upsert({
        polar_order_id: orderId || `checkout_${checkoutId}`,
        polar_checkout_id: checkoutId,
        customer_id: customerId,
        customer_email: customerEmail,
        product_ids: productIds,
        downloads: downloads,
        status: 'ready',
        updated_at: new Date().toISOString()
      }, { onConflict: 'polar_order_id' });

      return res.status(200).json({
        downloads,
        customerEmail,
        productIds,
        source: 'polar_api'
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // STRATEGY 4: Fallback - webhook may still be processing
    // ═══════════════════════════════════════════════════════════════════
    
    return res.status(202).json({
      error: 'Downloads not yet available',
      downloads: [],
      customerEmail,
      retry: true,
      message: 'Your order is being processed. Downloads will be available shortly or check your email.'
    });

  } catch (error) {
    console.error('❌ Error in get-order-downloads:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch downloads',
      downloads: [],
      fallbackToEmail: true
    });
  }
}

/**
 * Fetch downloadables with exponential backoff
 */
async function fetchWithRetry(customerId, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        const errorText = await sessionResponse.text();
        throw new Error(`Session failed: ${sessionResponse.status} - ${errorText}`);
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
        const errorText = await downloadablesResponse.text();
        throw new Error(`Downloadables failed: ${downloadablesResponse.status} - ${errorText}`);
      }

      const { items = [] } = await downloadablesResponse.json();

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
      console.warn(`⚠️ Attempt ${attempt}/${maxAttempts} failed:`, error.message);
      
      if (attempt < maxAttempts) {
        // Backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  return [];
}
