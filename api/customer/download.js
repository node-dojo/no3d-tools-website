/**
 * Vercel Serverless Function: Product Download
 *
 * Endpoint: /api/customer/download
 * Method: POST
 * Headers: Authorization: Bearer {session_token}
 * Body: { productId: "xxx" }
 *
 * Returns: {
 *   downloadUrl: "https://...",
 *   expiresAt: "2024-01-15T12:30:00Z",
 *   fileName: "Product Name.zip"
 * }
 *
 * TWO-TOKEN AUTHENTICATION SYSTEM:
 * ================================
 * 1. Our custom session (Redis, 30-day) → validates user is logged in
 * 2. Polar Customer Session (1-hour) → temporary token for Customer Portal APIs
 * 
 * Data Flow:
 * 1. Validate our session → get customerId
 * 2. Get product details → find which benefit IDs are attached
 * 3. Get customer state → verify customer has those benefits granted
 * 4. Create Polar session → get token for Customer Portal APIs
 * 5. Get downloadables → find files matching those benefit IDs
 * 6. Return download URL
 * 
 * See: POLAR_DOWNLOADABLES_API.md for detailed documentation
 */

import { Polar } from '@polar-sh/sdk';
import { 
  validateSession, 
  createPolarSession, 
  fetchCustomerDownloadables,
  fetchCustomerState 
} from '../lib/session.js';

// Initialize Polar SDK for product lookups
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      console.error('POLAR_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error',
      });
    }

    // ========================================================================
    // STEP 1: Validate our custom session (Redis)
    // ========================================================================
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const customerId = session.customerId;

    // Parse request body
    const { productId } = req.body;

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({
        error: 'Product ID required',
      });
    }

    console.log(`📥 Download request for product ${productId} by customer ${customerId}`);

    // ========================================================================
    // STEP 2: Get product details to find associated benefit IDs
    // ========================================================================
    let productBenefitIds = [];
    try {
      const product = await polar.products.get({ id: productId });
      
      // Extract benefit IDs from the product (filter for downloadables type)
      if (product.benefits && product.benefits.length > 0) {
        productBenefitIds = product.benefits
          .filter(b => b.type === 'downloadables')
          .map(b => b.id);
        
        console.log(`📋 Product has ${product.benefits.length} benefits, ${productBenefitIds.length} are downloadables`);
        if (productBenefitIds.length > 0) {
          console.log(`📋 Downloadable benefit IDs: ${productBenefitIds.join(', ')}`);
        }
      } else {
        console.log(`⚠️ Product ${productId} has no benefits configured`);
      }
    } catch (productError) {
      console.error('Failed to fetch product:', productError.message);
      // Continue anyway - we'll verify access via customer state
    }

    // ========================================================================
    // STEP 3: Get customer state to verify access (uses org token)
    // ========================================================================
    let customerState;
    try {
      customerState = await fetchCustomerState(customerId);
    } catch (stateError) {
      console.error('Failed to fetch customer state:', stateError.message);
      return res.status(500).json({
        error: 'Failed to verify product access',
      });
    }

    // Check if customer has access to the product
    let hasAccessToProduct = false;
    let customerBenefitIds = [];

    // Check active_subscriptions - if they're subscribed to this product
    if (customerState.active_subscriptions) {
      for (const sub of customerState.active_subscriptions) {
        if (sub.product_id === productId) {
          hasAccessToProduct = true;
          console.log(`✅ Customer has active subscription to product ${productId}`);
          break;
        }
      }
    }

    // Check granted_benefits - these are the benefits the customer has access to
    if (customerState.granted_benefits) {
      for (const grant of customerState.granted_benefits) {
        if (grant.benefit_type === 'downloadables') {
          customerBenefitIds.push(grant.benefit_id);
          
          // If this benefit is one of the product's benefits, they have access
          if (productBenefitIds.includes(grant.benefit_id)) {
            hasAccessToProduct = true;
            console.log(`✅ Customer has downloadables benefit ${grant.benefit_id} for product`);
          }
        }
      }
    }

    console.log(`📋 Customer has ${customerBenefitIds.length} downloadable benefit grants`);

    // If we couldn't verify via benefit matching but they have downloadable benefits,
    // proceed and let the downloadables API filter
    if (!hasAccessToProduct && customerBenefitIds.length > 0 && productBenefitIds.length === 0) {
      console.log(`⚠️ Could not verify product benefits, but customer has downloadable grants - proceeding`);
      hasAccessToProduct = true;
    }

    if (!hasAccessToProduct) {
      console.log(`❌ Customer does not have access to product ${productId}`);
      console.log(`   Customer benefit IDs: ${customerBenefitIds.join(', ') || 'none'}`);
      console.log(`   Product benefit IDs: ${productBenefitIds.join(', ') || 'none'}`);
      return res.status(403).json({
        error: 'You do not have access to this product',
      });
    }

    // ========================================================================
    // STEP 4: Create Polar Customer Session (uses org token, returns customer token)
    // ========================================================================
    let polarSession;
    try {
      polarSession = await createPolarSession(customerId);
    } catch (sessionError) {
      console.error('Failed to create Polar customer session:', sessionError);
      return res.status(500).json({
        error: 'Failed to create download session',
      });
    }

    // ========================================================================
    // STEP 5: Fetch downloadables using customer session token
    // ========================================================================
    let downloadables;
    try {
      downloadables = await fetchCustomerDownloadables(polarSession.token);
    } catch (downloadError) {
      console.error('Failed to fetch downloadables:', downloadError);
      return res.status(500).json({
        error: 'Failed to fetch downloadables',
      });
    }

    console.log(`📦 Found ${downloadables.items?.length || 0} total downloadable files`);

    // ========================================================================
    // STEP 6: Filter downloadables to match product's benefits
    // ========================================================================
    const matchingDownloads = [];

    if (downloadables.items && downloadables.items.length > 0) {
      for (const item of downloadables.items) {
        // Match by benefit_id if we know the product's benefits
        const benefitMatches = productBenefitIds.length === 0 || productBenefitIds.includes(item.benefit_id);
        
        if (benefitMatches && item.file && item.file.download) {
          matchingDownloads.push({
            id: item.id,
            benefitId: item.benefit_id,
            downloadUrl: item.file.download.url,
            expiresAt: item.file.download.expires_at,
            fileName: item.file.name,
            fileSize: item.file.size,
            fileSizeReadable: item.file.size_readable,
            mimeType: item.file.mime_type,
            checksum: item.file.checksum_sha256_hex,
          });
        }
      }
    }

    console.log(`📦 Found ${matchingDownloads.length} matching downloadable files for product`);

    // ========================================================================
    // STEP 7: Return download info
    // ========================================================================
    if (matchingDownloads.length > 0) {
      const download = matchingDownloads[0];
      console.log(`✅ Returning download: ${download.fileName}`);

      return res.status(200).json({
        downloadUrl: download.downloadUrl,
        expiresAt: download.expiresAt,
        fileName: download.fileName,
        fileSize: download.fileSize,
        fileSizeReadable: download.fileSizeReadable,
        mimeType: download.mimeType,
        checksum: download.checksum,
        // Include all files if there are multiple
        allFiles: matchingDownloads.length > 1 ? matchingDownloads : undefined,
      });
    }

    // User has access but no downloadable files found
    console.log(`⚠️ Customer has access to ${productId} but no downloadable files found`);
    console.log('Available downloadables:', downloadables.items?.map(d => ({
      id: d.id,
      benefit_id: d.benefit_id,
      file_name: d.file?.name
    })));

    return res.status(404).json({
      error: 'No downloadable files found for this product. The product may not have any files uploaded yet.',
      debug: process.env.NODE_ENV === 'development' ? {
        productId,
        productBenefitIds,
        customerBenefitIds,
        totalDownloadables: downloadables.items?.length || 0,
        downloadableBenefitIds: downloadables.items?.map(d => d.benefit_id) || [],
      } : undefined,
    });

  } catch (error) {
    console.error('Download request failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Failed to generate download URL',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
