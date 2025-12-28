// no3d-tools-website/api/polar-checkout-session.js

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { Polar } from '@polar-sh/sdk';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Adjust path to root .env

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

    // SUCCESS URL: Redirect to dedicated success page
    // Polar will automatically append ?checkout_id={CHECKOUT_ID} to this URL
    // Using the {CHECKOUT_ID} placeholder ensures we get the checkout ID for order lookup
    const successUrl = `${origin}/success.html?checkout_id={CHECKOUT_ID}`;

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

    // If we have a specific price ID, the Polar SDK/API usually picks it automatically 
    // if it's the only active price or if we use the productPriceId field directly.
    // However, for standard products, passing the productId in the products array is most stable.
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
