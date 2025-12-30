/**
 * ADMIN Diagnostic Endpoint: Download Debug
 *
 * Endpoint: GET /api/admin/download-debug?email=xxx&productId=yyy
 * 
 * This is an ADMIN endpoint that bypasses customer login.
 * It looks up a customer by email and runs full diagnostics.
 *
 * Query params:
 * - email: Customer email to look up
 * - productId: (optional) Polar product ID to check benefit matching
 * - customerId: (optional) Direct Polar customer ID (skips email lookup)
 *
 * Security: This endpoint has no auth but only returns diagnostic data,
 * not actual download URLs. For production, you may want to add API key auth.
 */

import { Polar } from '@polar-sh/sdk';

const POLAR_API_BASE = 'https://api.polar.sh';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, productId, customerId: directCustomerId } = req.query;

  if (!email && !directCustomerId) {
    return res.status(400).json({ 
      error: 'email or customerId query parameter required',
      usage: '/api/admin/download-debug?email=customer@example.com&productId=xxx'
    });
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    query: { email, productId, directCustomerId },
    environment: {
      hasPolarToken: !!process.env.POLAR_API_TOKEN,
    },
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
    // STEP 1: Find customer by email (or use provided customerId)
    // ========================================================================
    let customerId = directCustomerId;
    
    if (!customerId && email) {
      diagnostics.steps.customerLookup = { attempted: true, email };
      
      try {
        const customersResponse = await polar.customers.list({
          email: email.toLowerCase().trim(),
          limit: 10, // Get multiple to check for duplicates
        });

        const customers = customersResponse.items || [];
        
        diagnostics.steps.customerLookup = {
          success: true,
          email: email,
          customersFound: customers.length,
          customers: customers.map(c => ({
            id: c.id,
            email: c.email,
            name: c.name,
            createdAt: c.createdAt || c.created_at,
          })),
        };

        if (customers.length === 0) {
          diagnostics.summary.issues.push(`No customer found with email: ${email}`);
          diagnostics.summary.recommendations.push(
            'Check if the email matches exactly what was used during checkout'
          );
        } else if (customers.length > 1) {
          diagnostics.summary.issues.push(
            `Multiple customers found for email ${email} - this could cause ID mismatches!`
          );
        }

        // Use first customer
        customerId = customers[0]?.id;
      } catch (lookupError) {
        diagnostics.steps.customerLookup = {
          success: false,
          error: lookupError.message,
        };
        diagnostics.summary.issues.push(`Customer lookup failed: ${lookupError.message}`);
      }
    }

    if (!customerId) {
      diagnostics.summary.status = 'FAILED';
      diagnostics.summary.message = 'Could not find customer - cannot proceed with diagnostics';
      return res.status(200).json(diagnostics);
    }

    diagnostics.customerId = customerId;

    // ========================================================================
    // STEP 2: Fetch product and its benefits (if productId provided)
    // ========================================================================
    if (productId) {
      diagnostics.steps.productBenefits = { attempted: true };
      
      try {
        const product = await polar.products.get({ id: productId });
        
        diagnostics.steps.productBenefits = {
          success: true,
          productId: product.id,
          productName: product.name,
          totalBenefits: product.benefits?.length || 0,
          benefits: product.benefits?.map(b => ({
            id: b.id,
            type: b.type,
            description: b.description,
            // Show all fields for debugging
            allFields: Object.keys(b),
          })) || [],
          // Group by type for clarity
          benefitsByType: {},
        };

        // Group benefits by type
        product.benefits?.forEach(b => {
          const type = b.type || 'unknown';
          if (!diagnostics.steps.productBenefits.benefitsByType[type]) {
            diagnostics.steps.productBenefits.benefitsByType[type] = [];
          }
          diagnostics.steps.productBenefits.benefitsByType[type].push(b.id);
        });

        const allTypes = Object.keys(diagnostics.steps.productBenefits.benefitsByType);
        diagnostics.steps.productBenefits.allBenefitTypes = allTypes;

        if (allTypes.length > 0 && !allTypes.includes('downloadables')) {
          diagnostics.summary.issues.push(
            `Product benefits use type(s): [${allTypes.join(', ')}] - code filters for 'downloadables' which may not match!`
          );
          diagnostics.summary.recommendations.push(
            `Update download.js line 107 to filter for the correct type: ${allTypes.join(' or ')}`
          );
        }
      } catch (productError) {
        diagnostics.steps.productBenefits = {
          success: false,
          error: productError.message,
        };
        diagnostics.summary.issues.push(`Failed to fetch product: ${productError.message}`);
      }
    }

    // ========================================================================
    // STEP 3: Fetch customer state (shows granted benefits)
    // ========================================================================
    diagnostics.steps.customerState = { attempted: true };
    
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
            benefit_type: grant.benefit_type,
            granted_at: grant.granted_at,
            allFields: Object.keys(grant),
          })) || [],
          // Group by type
          grantedBenefitsByType: {},
        };

        // Group granted benefits by type
        customerState.granted_benefits?.forEach(g => {
          const type = g.benefit_type || 'unknown';
          if (!diagnostics.steps.customerState.grantedBenefitsByType[type]) {
            diagnostics.steps.customerState.grantedBenefitsByType[type] = [];
          }
          diagnostics.steps.customerState.grantedBenefitsByType[type].push(g.benefit_id);
        });

        const allGrantTypes = Object.keys(diagnostics.steps.customerState.grantedBenefitsByType);
        diagnostics.steps.customerState.allBenefitTypes = allGrantTypes;

        if (customerState.granted_benefits?.length === 0) {
          diagnostics.summary.issues.push(
            'Customer has NO granted benefits - purchase may not have completed or benefits not configured'
          );
          diagnostics.summary.recommendations.push(
            'Check Polar dashboard → Orders to verify order exists and is complete'
          );
          diagnostics.summary.recommendations.push(
            'Check Polar dashboard → Products → Benefits to verify benefits are attached'
          );
        }
      } else {
        const errorText = await stateResponse.text();
        diagnostics.steps.customerState = {
          success: false,
          statusCode: stateResponse.status,
          error: errorText,
        };
        
        if (stateResponse.status === 404) {
          diagnostics.summary.issues.push(`Customer ${customerId} not found in Polar`);
        } else {
          diagnostics.summary.issues.push(`Customer state API returned ${stateResponse.status}`);
        }
      }
    } catch (stateError) {
      diagnostics.steps.customerState = {
        success: false,
        error: stateError.message,
      };
    }

    // ========================================================================
    // STEP 4: Create customer session
    // ========================================================================
    diagnostics.steps.customerSession = { attempted: true };

    try {
      const polarSession = await polar.customerSessions.create({
        customerId: customerId,
      });

      diagnostics.steps.customerSession = {
        success: true,
        hasToken: !!polarSession.token,
        tokenPrefix: polarSession.token?.substring(0, 15) + '...',
        expiresAt: polarSession.expiresAt || polarSession.expires_at,
        customerPortalUrl: polarSession.customerPortalUrl || polarSession.customer_portal_url,
      };

      // ========================================================================
      // STEP 5: Fetch downloadables using customer session
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
              // Don't expose actual URL for security
            })) || [],
          };

          if (downloadables.items?.length === 0) {
            diagnostics.summary.issues.push(
              'Downloadables API returned ZERO items for this customer'
            );
            diagnostics.summary.recommendations.push(
              'This means either: (a) no benefits granted, or (b) benefits have no files uploaded'
            );
          } else {
            diagnostics.summary.recommendations.push(
              `Found ${downloadables.items.length} downloadable file(s) - downloads SHOULD work!`
            );
          }

          // Check benefit ID matching if we have product info
          if (productId && diagnostics.steps.productBenefits?.success) {
            const productBenefitIds = diagnostics.steps.productBenefits.benefits?.map(b => b.id) || [];
            const downloadableBenefitIds = [...new Set(downloadables.items?.map(d => d.benefit_id) || [])];
            const matchingIds = productBenefitIds.filter(id => downloadableBenefitIds.includes(id));
            
            diagnostics.steps.benefitMatching = {
              productBenefitIds,
              customerDownloadableBenefitIds: downloadableBenefitIds,
              matchingIds,
              hasMatch: matchingIds.length > 0,
            };

            if (matchingIds.length === 0 && productBenefitIds.length > 0 && downloadableBenefitIds.length > 0) {
              diagnostics.summary.issues.push(
                'Product benefit IDs do NOT match customer downloadable benefit IDs!'
              );
              diagnostics.summary.recommendations.push(
                'The customer may have purchased a different product, or benefit assignment changed'
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
        }
      } catch (downloadablesError) {
        diagnostics.steps.downloadables = {
          success: false,
          error: downloadablesError.message,
        };
      }

    } catch (sessionError) {
      diagnostics.steps.customerSession = {
        success: false,
        error: sessionError.message,
      };
      diagnostics.summary.issues.push(`Failed to create customer session: ${sessionError.message}`);
    }

    // ========================================================================
    // STEP 6: List customer's orders (bonus diagnostic)
    // ========================================================================
    diagnostics.steps.customerOrders = { attempted: true };
    
    try {
      const ordersResponse = await polar.orders.list({
        customerId: customerId,
        limit: 10,
      });

      diagnostics.steps.customerOrders = {
        success: true,
        totalOrders: ordersResponse.items?.length || 0,
        orders: ordersResponse.items?.map(order => ({
          id: order.id,
          status: order.status,
          createdAt: order.createdAt || order.created_at,
          productId: order.product?.id,
          productName: order.product?.name,
          amount: order.amount,
          currency: order.currency,
        })) || [],
      };

      if (ordersResponse.items?.length === 0) {
        diagnostics.summary.issues.push('Customer has NO orders in Polar');
        diagnostics.summary.recommendations.push(
          'This customer may not have completed a purchase, or the customerId is wrong'
        );
      }
    } catch (ordersError) {
      diagnostics.steps.customerOrders = {
        success: false,
        error: ordersError.message,
      };
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    if (diagnostics.summary.issues.length === 0) {
      diagnostics.summary.status = 'OK';
      diagnostics.summary.message = 'All checks passed - downloads should work!';
    } else {
      diagnostics.summary.status = 'ISSUES_FOUND';
      diagnostics.summary.message = `Found ${diagnostics.summary.issues.length} issue(s) - see details above`;
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
