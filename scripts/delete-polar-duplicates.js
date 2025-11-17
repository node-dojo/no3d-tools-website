#!/usr/bin/env node

/**
 * Delete (Archive) Duplicate Products in Polar Catalog
 * 
 * Since Polar doesn't support true deletion, this script archives duplicates.
 * Archived products are hidden from new purchases but remain accessible to
 * existing customers with active subscriptions.
 * 
 * Usage:
 *   node scripts/delete-polar-duplicates.js [options]
 * 
 * Options:
 *   --dry-run          Preview what would be archived (default)
 *   --no-dry-run       Actually archive products
 *   --by-name          Group duplicates by product name (default)
 *   --by-sku           Group duplicates by SKU
 *   --keep-newest      Keep the newest version of each duplicate group
 *   --keep-oldest      Keep the oldest version of each duplicate group
 *   --keep-ids=id1,id2 Keep specific product IDs (comma-separated)
 */

import { Polar } from '@polar-sh/sdk';
import { parseArgs } from 'util';
import 'dotenv/config';

const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN;
const POLAR_ORG_ID = process.env.POLAR_ORG_ID;

if (!POLAR_API_TOKEN || !POLAR_ORG_ID) {
  console.error('❌ Error: POLAR_API_TOKEN and POLAR_ORG_ID environment variables are required');
  process.exit(1);
}

const polar = new Polar({
  accessToken: POLAR_API_TOKEN,
});

// Parse command line arguments
const { values, positionals } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: true },
    'no-dry-run': { type: 'boolean', default: false },
    'by-name': { type: 'boolean', default: true },
    'by-sku': { type: 'boolean', default: false },
    'keep-newest': { type: 'boolean', default: false },
    'keep-oldest': { type: 'boolean', default: false },
    'keep-ids': { type: 'string' },
  },
  allowPositionals: true,
});

const DRY_RUN = values['no-dry-run'] ? false : values['dry-run'];
const GROUP_BY_SKU = values['by-sku'];
const KEEP_NEWEST = values['keep-newest'];
const KEEP_OLDEST = values['keep-oldest'];
const KEEP_IDS = values['keep-ids'] ? values['keep-ids'].split(',').map(id => id.trim()) : null;

/**
 * Fetch all products from Polar (including archived)
 */
async function fetchAllProducts() {
  console.log('📡 Fetching all products from Polar...\n');
  
  const activeResponse = await polar.products.list({
    organizationId: POLAR_ORG_ID,
    limit: 100,
    isArchived: false,
  });
  
  const archivedResponse = await polar.products.list({
    organizationId: POLAR_ORG_ID,
    limit: 100,
    isArchived: true,
  });
  
  const activeProducts = activeResponse.result?.items || [];
  const archivedProducts = archivedResponse.result?.items || [];
  const allProducts = [...activeProducts, ...archivedProducts];
  
  console.log(`Found ${allProducts.length} total products:`);
  console.log(`  - ${activeProducts.length} active`);
  console.log(`  - ${archivedProducts.length} archived\n`);
  
  return allProducts;
}

/**
 * Group products by name or SKU to identify duplicates
 */
function groupDuplicates(products) {
  const groups = {};
  
  products.forEach(product => {
    // Skip already archived products from duplicate detection
    if (product.isArchived) return;
    
    const key = GROUP_BY_SKU 
      ? (product.prices?.[0]?.priceAmount?.toString() || product.name) // Use SKU or fallback to name
      : product.name;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(product);
  });
  
  // Filter to only groups with duplicates
  const duplicateGroups = {};
  Object.entries(groups).forEach(([key, items]) => {
    if (items.length > 1) {
      duplicateGroups[key] = items;
    }
  });
  
  return duplicateGroups;
}

/**
 * Determine which product to keep from a duplicate group
 */
function selectKeeper(products, keepIds) {
  // If specific IDs to keep, use those
  if (keepIds && keepIds.length > 0) {
    const keeper = products.find(p => keepIds.includes(p.id));
    if (keeper) return keeper;
  }
  
  // If keep-newest, return most recently created
  if (KEEP_NEWEST) {
    return products.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
  }
  
  // If keep-oldest, return least recently created
  if (KEEP_OLDEST) {
    return products.sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    )[0];
  }
  
  // Default: keep the one with most recent update, or first one
  return products.sort((a, b) => 
    new Date(b.modifiedAt || b.createdAt) - new Date(a.modifiedAt || a.createdAt)
  )[0];
}

/**
 * Archive duplicate products
 */
async function archiveDuplicates() {
  try {
    const allProducts = await fetchAllProducts();
    
    if (allProducts.length === 0) {
      console.log('✅ No products found. Catalog is empty.');
      return;
    }
    
    // Group duplicates
    const duplicateGroups = groupDuplicates(allProducts);
    
    if (Object.keys(duplicateGroups).length === 0) {
      console.log('✨ No duplicates found! Catalog is clean.');
      return;
    }
    
    console.log(`🔍 Found ${Object.keys(duplicateGroups).length} duplicate groups:\n`);
    
    // Analyze duplicates
    const toArchive = [];
    const toKeep = [];
    
    Object.entries(duplicateGroups).forEach(([key, products]) => {
      const keeper = selectKeeper(products, KEEP_IDS);
      const duplicates = products.filter(p => p.id !== keeper.id);
      
      toKeep.push(keeper);
      toArchive.push(...duplicates);
      
      console.log(`📦 ${key}:`);
      console.log(`   ✅ Keep: ${keeper.name} (${keeper.id.substring(0, 8)}...) - Created: ${new Date(keeper.createdAt).toLocaleDateString()}`);
      duplicates.forEach(p => {
        console.log(`   🗑️  Archive: ${p.name} (${p.id.substring(0, 8)}...) - Created: ${new Date(p.createdAt).toLocaleDateString()}`);
      });
      console.log('');
    });
    
    console.log('='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Products to keep: ${toKeep.length}`);
    console.log(`   Products to archive: ${toArchive.length}\n`);
    
    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No products were archived');
      console.log('   Run with --no-dry-run to actually archive products\n');
      console.log('⚠️  Note: Polar does not support true deletion via API.');
      console.log('   Products will be archived (hidden from new purchases)');
      console.log('   but remain accessible to existing customers.\n');
      return;
    }
    
    // Confirm before proceeding
    console.log('⚠️  WARNING: This will archive the duplicate products listed above.');
    console.log('   Archived products cannot be unarchived via API.\n');
    
    // Actually archive
    console.log('🗑️  Archiving duplicate products...\n');
    
    let archivedCount = 0;
    let failedCount = 0;
    const failed = [];
    
    for (const product of toArchive) {
      try {
        await polar.products.update({
          id: product.id,
          productUpdate: {
            isArchived: true,
          },
        });
        console.log(`  ✅ Archived: ${product.name} (${product.id.substring(0, 8)}...)`);
        archivedCount++;
      } catch (error) {
        failedCount++;
        failed.push({ name: product.name, id: product.id, error: error.message });
        console.error(`  ❌ Failed: ${product.name} - ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Archiving complete!\n');
    console.log(`   Archived: ${archivedCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log(`   Active products remaining: ${toKeep.length}\n`);
    
    if (failedCount > 0) {
      console.log('⚠️  Failed to archive:');
      failed.forEach(f => {
        console.log(`   - ${f.name} (${f.id.substring(0, 8)}...): ${f.error}`);
      });
      console.log('');
    }
    
    console.log('📝 Note: To permanently delete products, contact Polar support.');
    console.log('   Archived products are hidden but not deleted.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.body) {
      console.error('Details:', error.body);
    }
    process.exit(1);
  }
}

// Run the script
archiveDuplicates();

