/**
 * Get Downloads by Customer Session Token
 * 
 * Endpoint: GET /api/get-downloads-by-token?token=polar_cst_xxx
 * 
 * This endpoint proxies requests to Polar's customer portal API
 * to avoid CORS issues when fetching downloads from the browser.
 */

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

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ 
      error: 'token parameter required',
      downloads: []
    });
  }

  try {
    console.log('🔄 Fetching downloadables with customer session token...');
    
    // Use the customer session token as Bearer token to call Polar's API
    const response = await fetch(`${POLAR_API_BASE}/v1/customer-portal/downloadables/?limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Polar API error:', response.status, errorText);
      
      // Return a user-friendly error
      return res.status(response.status).json({
        error: `Polar API error: ${response.status}`,
        details: errorText,
        downloads: [],
        fallbackToEmail: true
      });
    }

    const data = await response.json();
    const items = data.items || [];

    console.log(`✅ Received ${items.length} downloadable items from Polar`);

    // Transform the response
    const downloads = items
      .filter(d => d.file?.download?.url)
      .map(d => ({
        benefitId: d.benefit_id,
        url: d.file.download.url,
        filename: d.file.name || 'download.blend',
        expiresAt: d.file.download.expires_at,
        size: d.file.size,
        sizeReadable: d.file.size_readable,
        productId: d.benefit?.product_id || null
      }));

    // Extract unique product IDs
    const productIds = [...new Set(
      items
        .map(d => d.benefit?.product_id)
        .filter(Boolean)
    )];

    return res.status(200).json({
      success: downloads.length > 0,
      downloads,
      productIds,
      source: 'customer_session_token'
    });

  } catch (error) {
    console.error('❌ Error fetching downloads by token:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch downloads',
      downloads: [],
      fallbackToEmail: true
    });
  }
}
