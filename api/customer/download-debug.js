/**
 * Diagnostic Endpoint: Download Debug
 *
 * Endpoint: GET /api/customer/download-debug?productId=xxx
 * Headers: Authorization: Bearer {session_token}
 *
 * Returns diagnostic data showing:
 * 1. What customerId we have in session
 * 2. What benefits the product has
 * 3. What benefits the customer has been granted
 * 4. What the downloadables API returns
 * 5. Why matching might be failing
 *
 * This helps identify where the download flow breaks.
 */

import { Polar } from '@polar-sh/sdk';
import { validateSession } from '../lib/session.js';

const POLAR_API_BASE = 'https://api.polar.sh';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      hasPolarToken: !!process.env.POLAR_API_TOKEN,
      polarTokenPrefix: process.env.POLAR_API_TOKEN?.substring(0, 10) + '...',
    },
    session: null,
    steps: {},
    summary: {
      issues: [],
      recommendations: []
    }
  };

  try {
    // Validate environment
    if (!process.env.POLAR_API_TOKEN) {
      diagnostics.summary.issues.push('POLAR_API_TOKEN not configured');
      return res.status(500).json(diagnostics);
    }

    // Initialize Polar SDK
    const polar = new Polar({
      accessToken: process.env.POLAR_API_TOKEN,
    });

    // ========================================================================
    // STEP 0: Validate our session
    // ========================================================================
    const session = await validateSession(req);
    if (!session) {
      diagnostics.session = { valid: false, error: 'No valid session found' };
      diagnostics.summary.issues.push('Session validation failed - customer not logged in');
      return res.status(401).json(diagnostics);
    }

    diagnostics.session = {
      valid: true,
      customerId: session.customerId,
      email: session.email,
      hasCustomerId: !!session.customerId,
    };

    const customerId = session.customerId;
    const { productId } = req.query;

    if (!customerId) {
      diagnostics.summary.issues.push('No customerId in session - this is critical!');
    }

    // ========================================================================
    // STEP 1: Fetch product and its benefits
    // ========================================================================
    diagnostics.steps.productBenefits = { attempted: true };
    
    if (productId) {
      try {
        const product = await polar.products.get({ id: productId });
        
        diagnostics.steps.productBenefits = {
          success: true,
          productId: product.id,
          productName: product.name,
          totalBenefits: product.benefits?.length || 0,
          benefits: product.benefits?.map(b => ({
            id: b.id,
            type: b.type,           // <-- What type does Polar actually return?
            description: b.description,
            // Include any other fields that exist
            ...Object.keys(b).reduce((acc, key) => {
              if (!['id', 'type', 'description'].includes(key)) {
                acc[key] = b[key];
              }
              return acc;
            }, {})
          })) || [],
          downloadableBenefitIds: product.benefits
            ?.filter(b => b.type === 'downloadables')
            .map(b => b.id) || [],
          // Also check for other possible type names
          fileDownloadBenefitIds: product.benefits
            ?.filter(b => b.type === 'file_downloads' || b.type === 'file_download')
            .map(b => b.id) || [],
        };

        // Check for benefit type issues
        const allTypes = [...new Set(product.benefits?.map(b => b.type) || [])];
        diagnostics.steps.productBenefits.allBenefitTypes = allTypes;
        
        if (allTypes.length > 0 && !allTypes.includes('downloadables')) {
          diagnostics.summary.issues.push(
            `Product benefits use type(s): [${allTypes.join(', ')}] - not 'downloadables'. Code may be filtering incorrectly.`
          );
        }
      } catch (productError) {
        diagnostics.steps.productBenefits = {
          success: false,
          error: productError.message,
          errorType: productError.constructor.name,
        };
        diagnostics.summary.issues.push(`Failed to fetch product: ${productError.message}`);
      }
    } else {
      diagnostics.steps.productBenefits = {
        skipped: true,
        reason: 'No productId provided in query params',
      };
    }

    // ========================================================================
    // STEP 2: Fetch customer state (granted benefits)
    // ========================================================================
    diagnostics.steps.customerState = { attempted: true };
    
    if (customerId) {
      try {
        const stateResponse = await fetch(
          `${POLAR_API_BASE}/v1/customers/${customerId}/state`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (stateResponse.ok) {
          const customerState = await stateResponse.json();
          
          diagnostics.steps.customerState = {
            success: true,
            customerId: customerState.id,
            email: customerState.email,
            activeSubscriptionsCount: customerState.active_subscriptions?.length || 0,
            activeSubscriptions: customerState.active_subscriptions?.map(sub => ({
              id: sub.id,
              product_id: sub.product_id,
              status: sub.status,
            })) || [],
            grantedBenefitsCount: customerState.granted_benefits?.length || 0,
            grantedBenefits: customerState.granted_benefits?.map(grant => ({
              benefit_id: grant.benefit_id,
              benefit_type: grant.benefit_type,  // <-- What type does Polar actually return?
              granted_at: grant.granted_at,
              // Include any other fields
              ...Object.keys(grant).reduce((acc, key) => {
                if (!['benefit_id', 'benefit_type', 'granted_at', 'properties'].includes(key)) {
                  acc[key] = grant[key];
                }
                return acc;
              }, {})
            })) || [],
            downloadableGrantIds: customerState.granted_benefits
              ?.filter(g => g.benefit_type === 'downloadables')
              .map(g => g.benefit_id) || [],
            // Check alternative type names
            fileDownloadGrantIds: customerState.granted_benefits
              ?.filter(g => g.benefit_type === 'file_downloads' || g.benefit_type === 'file_download')
              .map(g => g.benefit_id) || [],
          };

          // Check for benefit type issues
          const allGrantTypes = [...new Set(customerState.granted_benefits?.map(g => g.benefit_type) || [])];
          diagnostics.steps.customerState.allBenefitTypes = allGrantTypes;

          if (customerState.granted_benefits?.length === 0) {
            diagnostics.summary.issues.push('Customer has NO granted benefits - purchase may not have completed properly');
          } else if (!allGrantTypes.includes('downloadables')) {
            diagnostics.summary.issues.push(
              `Customer's granted benefits use type(s): [${allGrantTypes.join(', ')}] - not 'downloadables'`
            );
          }
        } else {
          const errorText = await stateResponse.text();
          diagnostics.steps.customerState = {
            success: false,
            statusCode: stateResponse.status,
            error: errorText,
          };
          diagnostics.summary.issues.push(`Customer state API returned ${stateResponse.status}: ${errorText}`);
        }
      } catch (stateError) {
        diagnostics.steps.customerState = {
          success: false,
          error: stateError.message,
        };
        diagnostics.summary.issues.push(`Failed to fetch customer state: ${stateError.message}`);
      }
    } else {
      diagnostics.steps.customerState = {
        skipped: true,
        reason: 'No customerId in session',
      };
    }

    // ========================================================================
    // STEP 3: Create customer session and fetch downloadables
    // ========================================================================
    diagnostics.steps.customerSession = { attempted: true };
    diagnostics.steps.downloadables = { attempted: false };

    if (customerId) {
      try {
        const polarSession = await polar.customerSessions.create({
          customerId: customerId,
        });

        diagnostics.steps.customerSession = {
          success: true,
          hasToken: !!polarSession.token,
          tokenPrefix: polarSession.token?.substring(0, 20) + '...',
          expiresAt: polarSession.expiresAt || polarSession.expires_at,
          customerPortalUrl: polarSession.customerPortalUrl || polarSession.customer_portal_url,
          returnedCustomerId: polarSession.customerId || polarSession.customer_id,
        };

        // ========================================================================
        // STEP 4: Fetch downloadables using customer session token
        // ========================================================================
        diagnostics.steps.downloadables = { attempted: true };

        try {
          const downloadablesResponse = await fetch(
            `${POLAR_API_BASE}/v1/customer-portal/downloadables/?limit=100`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${polarSession.token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (downloadablesResponse.ok) {
            const downloadables = await downloadablesResponse.json();
            
            diagnostics.steps.downloadables = {
              success: true,
              totalItems: downloadables.items?.length || 0,
              pagination: downloadables.pagination,
              items: downloadables.items?.map(item => ({
                id: item.id,
                benefit_id: item.benefit_id,
                fileName: item.file?.name,
                fileSize: item.file?.size,
                fileSizeReadable: item.file?.size_readable,
                mimeType: item.file?.mime_type,
                hasDownloadUrl: !!item.file?.download?.url,
                downloadUrlExpires: item.file?.download?.expires_at,
                // Include raw structure for debugging
                rawFileKeys: item.file ? Object.keys(item.file) : [],
              })) || [],
            };

            if (downloadables.items?.length === 0) {
              diagnostics.summary.issues.push(
                'Downloadables API returned ZERO items - customer has no downloadable files'
              );
              diagnostics.summary.recommendations.push(
                'Check if benefits were granted after purchase (see customerState above)'
              );
              diagnostics.summary.recommendations.push(
                'Verify files are uploaded to the benefit in Polar dashboard'
              );
            }

            // Check benefit ID matching
            if (productId && diagnostics.steps.productBenefits?.success) {
              const productBenefitIds = diagnostics.steps.productBenefits.benefits?.map(b => b.id) || [];
              const downloadableBenefitIds = downloadables.items?.map(d => d.benefit_id) || [];
              
              const matchingBenefitIds = productBenefitIds.filter(id => downloadableBenefitIds.includes(id));
              
              diagnostics.steps.benefitMatching = {
                productBenefitIds,
                downloadableBenefitIds,
                matchingIds: matchingBenefitIds,
                hasMatch: matchingBenefitIds.length > 0,
              };

              if (matchingBenefitIds.length === 0 && productBenefitIds.length > 0 && downloadableBenefitIds.length > 0) {
                diagnostics.summary.issues.push(
                  'Product benefit IDs do NOT match downloadable benefit IDs - this is the bug!'
                );
              }
            }
          } else {
            const errorText = await downloadablesResponse.text();
            diagnostics.steps.downloadables = {
              success: false,
              statusCode: downloadablesResponse.status,
              error: errorText,
            };
            diagnostics.summary.issues.push(
              `Downloadables API returned ${downloadablesResponse.status}: ${errorText}`
            );
          }
        } catch (downloadablesError) {
          diagnostics.steps.downloadables = {
            success: false,
            error: downloadablesError.message,
          };
          diagnostics.summary.issues.push(`Failed to fetch downloadables: ${downloadablesError.message}`);
        }

      } catch (sessionError) {
        diagnostics.steps.customerSession = {
          success: false,
          error: sessionError.message,
          errorType: sessionError.constructor.name,
        };
        diagnostics.summary.issues.push(`Failed to create customer session: ${sessionError.message}`);
      }
    } else {
      diagnostics.steps.customerSession = {
        skipped: true,
        reason: 'No customerId in session',
      };
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    if (diagnostics.summary.issues.length === 0) {
      diagnostics.summary.status = 'OK';
      diagnostics.summary.message = 'All steps completed successfully';
    } else {
      diagnostics.summary.status = 'ISSUES_FOUND';
      diagnostics.summary.message = `Found ${diagnostics.summary.issues.length} issue(s)`;
    }

    return res.status(200).json(diagnostics);

  } catch (error) {
    diagnostics.summary.issues.push(`Unexpected error: ${error.message}`);
    diagnostics.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
    return res.status(500).json(diagnostics);
  }
}
