#!/usr/bin/env node

/**
 * Update Polar Product Prices
 *
 * This script updates product prices in Polar by:
 * 1. Archiving the existing free price
 * 2. Creating a new fixed price at the specified amount
 *
 * Usage:
 *   node scripts/update-polar-prices.js --price 7.77
 *   node scripts/update-polar-prices.js --price 7.77 --dry-run
 */

import { Polar } from '@polar-sh/sdk';
import 'dotenv/config';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

// Parse command line arguments
const args = process.argv.slice(2);
const priceArg = args.find(arg => arg.startsWith('--price='));
const DRY_RUN = args.includes('--dry-run');

if (!priceArg) {
  console.error('ERROR: --price argument is required');
  console.error('Usage: node scripts/update-polar-prices.js --price=7.77 [--dry-run]');
  process.exit(1);
}

const NEW_PRICE = parseFloat(priceArg.split('=')[1]);
if (isNaN(NEW_PRICE) || NEW_PRICE <= 0) {
  console.error('ERROR: Invalid price value');
  process.exit(1);
}

const NEW_PRICE_CENTS = Math.round(NEW_PRICE * 100);

// Product names to update
const PRODUCTS_TO_UPDATE = [
  'Dojo Bolt Gen v05',
  'Dojo Bolt Gen v05_Obj',
  'Dojo Bool v5',
  'Dojo Calipers',
  'Dojo Crv Wrapper v4',
  'Dojo Gluefinity Grid_obj',
  'Dojo Knob',
  'Dojo Knob_obj',
  'Dojo Mesh Repair',
  'Dojo Print Viz_V4.5',
  'Dojo_Squircle v4.5',
  'Dojo Squircle v4.5_obj'
];

async function updatePrices() {
  try {
    if (!process.env.POLAR_API_TOKEN) {
      console.error('ERROR: POLAR_API_TOKEN not found in environment');
      process.exit(1);
    }

    console.log('\n=== Updating Polar Product Prices ===\n');
    console.log(`New Price: $${NEW_PRICE.toFixed(2)} (${NEW_PRICE_CENTS} cents)`);
    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    } else {
      console.log('⚠️  LIVE MODE - Prices will be updated in Polar\n');
    }

    const organizationId = process.env.POLAR_ORG_ID || 'f0c16049-5959-42c9-8be8-5952c38c7d63';

    // Fetch all products
    console.log('📡 Fetching products from Polar...');
    const result = await polar.products.list({
      organizationId: organizationId,
      limit: 100,
      isArchived: false
    });

    const products = result.result?.items || [];
    console.log(`✅ Found ${products.length} active products\n`);

    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const productName of PRODUCTS_TO_UPDATE) {
      const product = products.find(p => p.name === productName);

      if (!product) {
        console.log(`⚠️  Product not found: ${productName}`);
        skippedCount++;
        continue;
      }

      // Find the current active price
      const currentPrice = product.prices?.find(p => !p.isArchived);
      if (!currentPrice) {
        console.log(`⚠️  No active price found for: ${productName}`);
        skippedCount++;
        continue;
      }

      // Check if it's already the correct price
      if (currentPrice.amountType === 'fixed' && currentPrice.priceAmount === NEW_PRICE_CENTS) {
        console.log(`✓ ${productName.padEnd(40)} Already $${NEW_PRICE.toFixed(2)}`);
        continue;
      }

      try {
        if (DRY_RUN) {
          console.log(`🔍 ${productName.padEnd(40)} Would update: ${currentPrice.amountType} → $${NEW_PRICE.toFixed(2)}`);
        } else {
          // Update the product with new price
          await polar.products.update({
            id: product.id,
            productUpdate: {
              prices: [
                // Keep existing price as archived
                { id: currentPrice.id },
                // Add new fixed price
                {
                  amountType: 'fixed',
                  priceAmount: NEW_PRICE_CENTS,
                  priceCurrency: 'usd'
                }
              ]
            }
          });

          console.log(`✅ ${productName.padEnd(40)} Updated to $${NEW_PRICE.toFixed(2)}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${productName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Update Complete ===');
    if (DRY_RUN) {
      console.log(`Would update ${PRODUCTS_TO_UPDATE.length - skippedCount} products`);
    } else {
      console.log(`Updated: ${updatedCount} products`);
    }
    console.log(`Skipped: ${skippedCount} products`);
    if (errorCount > 0) {
      console.log(`Errors: ${errorCount} products`);
    }
    console.log('');

    if (!DRY_RUN && updatedCount > 0) {
      console.log('Next steps:');
      console.log('1. Run: node scripts/sync-polar-products.js');
      console.log('2. Run: node scripts/generate-polar-products.js');
      console.log('3. Commit and deploy changes\n');
    }

  } catch (error) {
    console.error('\nERROR: Failed to update prices');
    console.error('Status:', error.statusCode || 'unknown');
    console.error('Message:', error.message);
    if (error.body) {
      console.error('Details:', error.body);
    }
    process.exit(1);
  }
}

updatePrices();
