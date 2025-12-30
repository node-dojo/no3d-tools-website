/**
 * Get Customer Portal URL - NEW PER POLAR DOCUMENTATION
 * 
 * Endpoint: GET /api/get-customer-portal-url?checkout_id=xxx
 * 
 * Per Polar docs, this creates an authenticated customer session and returns
 * the customerPortalUrl, which allows direct access to downloads without
 * the customer needing to log in.
 * 
 * From Polar SDK docs:
 *   const result = await polar.customerSessions.create({
 *     customerId: "<customer_id>",
 *   });
 *   redirect(result.customerPortalUrl);
 * 
 * Returns: { portalUrl: "https://polar.sh/no3d-tools/portal/..." } (authenticated URL)
 */

import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

export default async function handler(req, res) {
  // CORS headers
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

  const { checkout_id, customer_id } = req.query;

  if (!checkout_id && !customer_id) {
    return res.status(400).json({ error: 'checkout_id or customer_id required' });
  }

  if (!process.env.POLAR_API_TOKEN) {
    console.error('POLAR_API_TOKEN not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    let customerId = customer_id;

    // If we have a checkout_id but no customer_id, fetch the checkout to get the customer
    if (!customerId && checkout_id) {
      console.log(`🔍 Looking up customer from checkout: ${checkout_id}`);
      
      const checkout = await polar.checkouts.get({ id: checkout_id });
      
      if (!checkout) {
        return res.status(404).json({ error: 'Checkout not found' });
      }

      // Check if checkout succeeded
      if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
        console.log(`⏳ Checkout status is ${checkout.status}, may not have customer yet`);
        return res.status(202).json({ 
          error: 'Checkout still processing',
          status: checkout.status,
          retry: true
        });
      }

      customerId = checkout.customer_id;
      
      if (!customerId) {
        console.warn('No customer_id in checkout response');
        return res.status(200).json({ 
          portalUrl: 'https://polar.sh/no3d-tools/portal/request',
          note: 'Customer ID not found, using default portal URL'
        });
      }
    }

    console.log(`🔑 Creating customer session for: ${customerId}`);

    // Create authenticated customer session per Polar docs
    // This returns a customer_portal_url (API) or customerPortalUrl (SDK) 
    // that bypasses login
    const session = await polar.customerSessions.create({
      customerId: customerId
    });

    // Handle both snake_case (API response) and camelCase (SDK typed response)
    const portalUrl = session.customerPortalUrl || session.customer_portal_url;

    if (!session || !portalUrl) {
      console.warn('No customerPortalUrl in session response:', JSON.stringify(session));
      return res.status(200).json({ 
        portalUrl: 'https://polar.sh/no3d-tools/portal/request',
        note: 'Could not create authenticated session'
      });
    }

    console.log('✅ Customer session created successfully');

    return res.status(200).json({
      portalUrl: portalUrl,
      customerId: customerId
    });

  } catch (error) {
    console.error('❌ Error creating customer portal URL:', error.message);
    
    // Return fallback URL - customer can still access portal, just needs to log in
    return res.status(200).json({
      portalUrl: 'https://polar.sh/no3d-tools/portal/request',
      error: error.message,
      note: 'Using fallback portal URL'
    });
  }
}
