// no3d-tools-website/api/polar-checkout-session.js

import { Polar } from '@polar-sh/sdk';

const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN;
const POLAR_ORG_ID = process.env.POLAR_ORG_ID;

// Initialize Polar SDK
const polar = new Polar({
  accessToken: POLAR_API_TOKEN
});

export default async function (req, res) {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!POLAR_API_TOKEN) {
    console.error('Server Error: POLAR_API_TOKEN is not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error: POLAR_API_TOKEN missing.' });
  }

  const { productId, productPriceId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required.' });
  }

  try {
    // Get origin from request headers (for embedOrigin validation)
    // Polar requires the exact origin (protocol + host + port) without trailing slash
    let origin = req.headers.origin || req.headers.referer;
    
    if (origin) {
      try {
        const originUrl = new URL(origin);
        origin = `${originUrl.protocol}//${originUrl.host}`;
      } catch (e) {
        origin = 'https://no3dtools.com';
      }
    } else {
      origin = 'https://no3dtools.com';
    }

    // Clean origin: ensure it has NO trailing slash
    origin = origin.replace(/\/$/, '');

    // Construct success URL (redirect back to our site after checkout)
    // Even if using the embedded modal, Polar needs a valid success URL.
    // We add checkout_success=true so our script.js can detect it and break out of the iframe.
    const successUrl = `${origin}/index.html?checkout_id={CHECKOUT_ID}&checkout_success=true`;

    console.log(`[Polar API] Creating session for ${productId}. Origin: ${origin}, SuccessURL: ${successUrl}`);

    // Create checkout session using Polar SDK
    const checkoutData = {
      products: [productId],
      embedOrigin: origin,
      successUrl: successUrl,
      metadata: {
        source: 'direct_buy_button',
        requestedPriceId: productPriceId || 'default',
        timestamp: new Date().toISOString()
      }
    };

    const checkout = await polar.checkouts.create(checkoutData);

    if (checkout && checkout.url) {
      console.log('[Polar API] Successfully created checkout session:', checkout.id);
      
      return res.status(200).json({ 
        checkout_url: checkout.url,
        id: checkout.id,
        clientSecret: checkout.client_secret
      });
    } else {
      console.error('[Polar API] Failed: No URL returned from Polar SDK');
      return res.status(500).json({ error: 'Failed to retrieve checkout URL from Polar.' });
    }

  } catch (error) {
    console.error('[Polar API] Error creating checkout session:', error.message);
    if (error.body) {
      console.error('[Polar API] API Error body:', typeof error.body === 'string' ? error.body : JSON.stringify(error.body));
    }
    
    // Check for specific Polar API errors
    if (error.status === 401) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Polar API token.' });
    }
    
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}