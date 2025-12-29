#!/usr/bin/env node
/**
 * Fix Polar Product ID Mappings in Supabase
 * 
 * This script:
 * 1. Fetches all ACTIVE Polar products (not archived)
 * 2. Fetches all Supabase products
 * 3. Matches by product name/title
 * 4. Updates Supabase with correct active Polar product IDs
 * 
 * Usage:
 *   node scripts/fix-polar-mappings.js --dry-run   # Preview changes
 *   node scripts/fix-polar-mappings.js             # Execute updates
 */

import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';
import 'dotenv/config';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const polarToken = process.env.POLAR_API_TOKEN;
const polarOrgId = process.env.POLAR_ORG_ID;

const dryRun = process.argv.includes('--dry-run');

console.log('\n========================================');
console.log('   Fix Polar Product ID Mappings');
console.log('========================================');
console.log(dryRun ? '\n🔍 DRY RUN MODE - No changes will be made\n' : '\n⚠️ LIVE MODE - Will update Supabase\n');

// Validate environment
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!polarToken) {
  console.error('❌ Missing POLAR_API_TOKEN');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const polar = new Polar({ accessToken: polarToken });

// Normalize title for matching
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, ' ')  // Normalize separators
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .replace(/v\d+\.?\d*/gi, '') // Remove version numbers
    .trim();
}

async function fetchActivePolarProducts() {
  console.log('🔄 Fetching active Polar products...');
  
  try {
    const result = await polar.products.list({
      organizationId: polarOrgId,
      limit: 100,
      isArchived: false  // Only active products
    });
    
    const products = result.result?.items || result.items || [];
    console.log(`   Found ${products.length} active Polar products\n`);
    return products;
  } catch (error) {
    console.error('❌ Polar API error:', error.message);
    return [];
  }
}

async function fetchSupabaseProducts() {
  console.log('🔄 Fetching Supabase products...');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, handle, title, polar_product_id, polar_price_id, status')
      .eq('status', 'active')
      .order('title', { ascending: true });
    
    if (error) throw error;
    console.log(`   Found ${data.length} active Supabase products\n`);
    return data || [];
  } catch (error) {
    console.error('❌ Supabase error:', error.message);
    return [];
  }
}

async function fixMappings() {
  const polarProducts = await fetchActivePolarProducts();
  const supabaseProducts = await fetchSupabaseProducts();
  
  if (polarProducts.length === 0 || supabaseProducts.length === 0) {
    console.error('❌ Cannot proceed without products from both sources');
    process.exit(1);
  }
  
  // Create lookup map of Polar products by normalized title
  const polarByTitle = {};
  polarProducts.forEach(p => {
    const normalizedTitle = normalizeTitle(p.name);
    if (!polarByTitle[normalizedTitle]) {
      polarByTitle[normalizedTitle] = p;
    }
  });
  
  // Also create lookup by exact name (case-insensitive)
  const polarByExactName = {};
  polarProducts.forEach(p => {
    const key = (p.name || '').toLowerCase().trim();
    if (!polarByExactName[key]) {
      polarByExactName[key] = p;
    }
  });
  
  console.log('═══════════════════════════════════════');
  console.log('   MATCHING RESULTS');
  console.log('═══════════════════════════════════════\n');
  
  const updates = [];
  const noMatch = [];
  const alreadyCorrect = [];
  const invalidCurrentId = [];
  
  // Build set of valid active Polar IDs
  const activePolarIds = new Set(polarProducts.map(p => p.id));
  
  for (const supaProduct of supabaseProducts) {
    const supaTitle = (supaProduct.title || '').toLowerCase().trim();
    const normalizedSupaTitle = normalizeTitle(supaProduct.title);
    
    // Try to find matching Polar product
    let polarMatch = polarByExactName[supaTitle] || polarByTitle[normalizedSupaTitle];
    
    if (!polarMatch) {
      // Try partial matching for common patterns
      const titleWords = supaTitle.split(/\s+/);
      for (const [key, polarP] of Object.entries(polarByExactName)) {
        if (titleWords.every(word => key.includes(word)) || key.split(/\s+/).every(word => supaTitle.includes(word))) {
          polarMatch = polarP;
          break;
        }
      }
    }
    
    if (!polarMatch) {
      noMatch.push(supaProduct);
      continue;
    }
    
    // Check if current mapping is already correct
    if (supaProduct.polar_product_id === polarMatch.id) {
      alreadyCorrect.push({
        title: supaProduct.title,
        polarId: polarMatch.id
      });
      continue;
    }
    
    // Check if current mapping points to an archived/invalid product
    if (supaProduct.polar_product_id && !activePolarIds.has(supaProduct.polar_product_id)) {
      invalidCurrentId.push({
        title: supaProduct.title,
        currentId: supaProduct.polar_product_id,
        newId: polarMatch.id
      });
    }
    
    // Get price ID from Polar product
    const priceId = polarMatch.prices?.[0]?.id || null;
    
    updates.push({
      supabaseId: supaProduct.id,
      title: supaProduct.title,
      handle: supaProduct.handle,
      oldPolarId: supaProduct.polar_product_id,
      newPolarId: polarMatch.id,
      newPriceId: priceId,
      polarName: polarMatch.name
    });
  }
  
  // Report results
  console.log(`✅ Already correct: ${alreadyCorrect.length}`);
  alreadyCorrect.forEach(p => console.log(`   - ${p.title}`));
  
  console.log(`\n⚠️ Updates needed: ${updates.length}`);
  updates.forEach(u => {
    const oldId = u.oldPolarId ? u.oldPolarId.substring(0, 8) + '...' : 'NULL';
    const newId = u.newPolarId.substring(0, 8) + '...';
    console.log(`   - "${u.title}"`);
    console.log(`     Old: ${oldId} → New: ${newId} (${u.polarName})`);
  });
  
  if (invalidCurrentId.length > 0) {
    console.log(`\n❌ Had INVALID/ARCHIVED Polar IDs: ${invalidCurrentId.length}`);
    invalidCurrentId.forEach(p => {
      console.log(`   - "${p.title}" - was pointing to archived product!`);
    });
  }
  
  console.log(`\n❓ No match found: ${noMatch.length}`);
  noMatch.forEach(p => console.log(`   - "${p.title}" (handle: ${p.handle})`));
  
  if (updates.length === 0) {
    console.log('\n✅ No updates needed - all mappings are correct!');
    return;
  }
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - Run without --dry-run to apply updates');
    return;
  }
  
  // Apply updates
  console.log('\n═══════════════════════════════════════');
  console.log('   APPLYING UPDATES');
  console.log('═══════════════════════════════════════\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          polar_product_id: update.newPolarId,
          polar_price_id: update.newPriceId,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.supabaseId);
      
      if (error) throw error;
      
      console.log(`✅ Updated: "${update.title}"`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to update "${update.title}":`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n========================================');
  console.log('   SUMMARY');
  console.log('========================================');
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📊 Already correct: ${alreadyCorrect.length}`);
  console.log(`❓ No match found: ${noMatch.length}`);
}

fixMappings().catch(console.error);
