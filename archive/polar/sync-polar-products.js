#!/usr/bin/env node

/**
 * Sync Polar Product IDs to JSON files
 *
 * This script fetches the latest product data from Polar API and updates
 * the corresponding JSON files in assets/product-data/ with the correct
 * product IDs. This ensures the website always displays current prices.
 *
 * Usage:
 *   node scripts/sync-polar-products.js [--dry-run]
 */

import { Polar } from '@polar-sh/sdk';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

const DRY_RUN = process.argv.includes('--dry-run');

// Mapping of Polar product names to JSON filenames
// This handles cases where the product name doesn't exactly match the filename
const NAME_MAPPINGS = {
  'Dojo_Squircle v4.5': 'Dojo_Squircle v4.5.json',
  'Dojo Squircle v4.5_obj': 'Dojo Squircle v4.5_obj.json',
  'Dojo Print Viz_V4.5': 'Dojo Print Viz_V4.5.json',
  'Dojo Mesh Repair': 'Dojo Mesh Repair.json',
  'Dojo Knob_obj': 'Dojo Knob_obj.json',
  'Dojo Knob': 'Dojo Knob.json',
  'Dojo Gluefinity Grid_obj': 'Dojo Gluefinity Grid_obj.json',
  'Dojo Crv Wrapper v4': 'Dojo Crv Wrapper v4.json',
  'Dojo Calipers': 'Dojo Calipers.json',
  'Dojo Bool v5': 'Dojo Bool v5.json',
  'Dojo Bolt Gen v05_Obj': 'Dojo Bolt Gen v05_Obj.json',
  'Dojo Bolt Gen v05': 'Dojo Bolt Gen v05.json'
};

async function syncProducts() {
  try {
    if (!process.env.POLAR_API_TOKEN) {
      console.error('ERROR: POLAR_API_TOKEN not found in environment');
      console.error('Make sure you have a .env file with POLAR_API_TOKEN set');
      process.exit(1);
    }

    console.log('\n=== Syncing Polar Products ===\n');
    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }

    const organizationId = process.env.POLAR_ORG_ID || 'f0c16049-5959-42c9-8be8-5952c38c7d63';

    // Fetch products from Polar
    console.log('📡 Fetching products from Polar API...');
    const result = await polar.products.list({
      organizationId: organizationId,
      limit: 100,
      isArchived: false
    });

    const products = result.result?.items || [];
    console.log(`✅ Found ${products.length} active products\n`);

    // Build product mapping
    const productMap = new Map();
    for (const product of products) {
      productMap.set(product.name, {
        id: product.id,
        name: product.name,
        prices: product.prices
      });
    }

    // Update JSON files
    const productDataDir = path.join(__dirname, '..', 'assets', 'product-data');
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const [polarName, jsonFilename] of Object.entries(NAME_MAPPINGS)) {
      const jsonPath = path.join(productDataDir, jsonFilename);

      if (!fs.existsSync(jsonPath)) {
        console.log(`⚠️  File not found: ${jsonFilename}`);
        skippedCount++;
        continue;
      }

      const polarProduct = productMap.get(polarName);
      if (!polarProduct) {
        console.log(`⚠️  No Polar product found for: ${polarName}`);
        skippedCount++;
        continue;
      }

      try {
        // Read existing JSON
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        // Check if update needed
        const currentId = jsonData.polar?.product_id;
        const newId = polarProduct.id;

        if (currentId === newId) {
          console.log(`✓ ${jsonFilename.padEnd(40)} Already up to date`);
          continue;
        }

        // Update the product ID
        if (!jsonData.polar) {
          jsonData.polar = {};
        }
        jsonData.polar.product_id = newId;

        if (DRY_RUN) {
          console.log(`🔍 ${jsonFilename.padEnd(40)} Would update: ${currentId || 'none'} → ${newId}`);
        } else {
          // Write updated JSON
          fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n', 'utf8');
          console.log(`✅ ${jsonFilename.padEnd(40)} Updated: ${currentId || 'none'} → ${newId}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${jsonFilename}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Sync Complete ===');
    if (DRY_RUN) {
      console.log(`Would update ${updatedCount} files`);
    } else {
      console.log(`Updated: ${updatedCount} files`);
    }
    console.log(`Skipped: ${skippedCount} files`);
    if (errorCount > 0) {
      console.log(`Errors: ${errorCount} files`);
    }
    console.log('');

  } catch (error) {
    console.error('\nERROR: Failed to sync products');
    console.error('Status:', error.statusCode || 'unknown');
    console.error('Message:', error.message);
    if (error.body) {
      console.error('Details:', error.body);
    }
    process.exit(1);
  }
}

syncProducts();
