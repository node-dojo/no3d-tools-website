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
    // Polar requires the exact origin (protocol + host) without trailing slash
    let origin = req.headers.origin;
    const referer = req.headers.referer;
    
    if (!origin) {
      if (req.headers.host) {
        const host = req.headers.host;
        let protocol = 'https';
        if (referer && referer.startsWith('http://')) protocol = 'http';
        else if (host.includes('localhost') || host.includes('127.0.0.1')) protocol = 'http';
        
        origin = `${protocol}://${host}`;
      } else {
        origin = 'https://no3dtools.com';
      }
    }

    // Clean origin: ensure it has NO trailing slash
    origin = origin.replace(/\/$/, '');

    // Construct success URL (redirect back to our site after checkout)
    // Even if using the embedded modal, Polar needs a valid success URL for session routing
    let successUrl = referer ? referer : `${origin}/index.html`;
    // Ensure successUrl doesn't have double slashes if origin already has one (unlikely with our cleaning)
    successUrl = successUrl.split('?')[0]; // Strip query params for stability
    
    // Add a flag so we know it's a redirect from checkout
    successUrl += '?checkout_success=true';

    console.log(`[Polar API] Creating session for ${productId}. Origin: ${origin}, SuccessURL: ${successUrl}`);

    // Create checkout session using Polar SDK
    // CRITICAL: The 'products' array expects PRODUCT IDs, not Price IDs.
    // If you pass a Price ID into the 'products' array, Polar will return "Product does not exist".
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