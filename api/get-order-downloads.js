/**
 * ⚠️ DEPRECATED - Get Order Downloads API
 * 
 * This endpoint is NO LONGER NEEDED per Polar documentation.
 * 
 * Polar's recommended flow:
 * 1. After checkout success, redirect to success page
 * 2. Show confirmation with order details
 * 3. Link customer to Polar's Customer Portal for downloads
 * 
 * The Customer Portal handles everything:
 * - Download links
 * - Expiration management
 * - Re-downloads
 * - Order history
 * 
 * Use /api/get-customer-portal-url instead to get an authenticated
 * portal link that bypasses login.
 * 
 * This file is kept for backwards compatibility but should be removed
 * in a future cleanup.
 * 
 * @deprecated Use Polar Customer Portal instead
 */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  return res.status(410).json({
    error: 'This endpoint is deprecated',
    message: 'Downloads are now handled through Polar Customer Portal',
    portalUrl: 'https://polar.sh/no3d-tools/portal',
    alternativeEndpoint: '/api/get-customer-portal-url'
  });
}
