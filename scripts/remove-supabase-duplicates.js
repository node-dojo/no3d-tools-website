#!/usr/bin/env node
/**
 * Script to remove duplicate products from Supabase
 * Keeps the most recent product for each handle and deletes older duplicates
 * 
 * Usage:
 *   node scripts/remove-supabase-duplicates.js --dry-run   # Preview changes
 *   node scripts/remove-supabase-duplicates.js             # Execute deletion
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dryRun = process.argv.includes('--dry-run');

async function removeDuplicates() {
  console.log('\n=== Remove Duplicate Products from Supabase ===');
  console.log(dryRun ? '🔍 DRY RUN MODE - No changes will be made\n' : '⚠️ LIVE MODE - Will delete duplicates\n');

  try {
    // Fetch all products ordered by created_at DESC (newest first)
    const { data: products, error } = await supabase
      .from('products')
      .select('id, handle, title, status, created_at, updated_at')
      .order('created_at', { ascending: false }); // Newest first

    if (error) {
      console.error('❌ Error fetching products:', error);
      process.exit(1);
    }

    console.log(`Total products in database: ${products.length}\n`);

    // Group by handle (case-insensitive)
    const byHandle = {};
    products.forEach(p => {
      const key = (p.handle || '').toLowerCase().trim();
      if (!key) return;
      if (!byHandle[key]) byHandle[key] = [];
      byHandle[key].push(p);
    });

    // Find duplicates
    const duplicatesToDelete = [];
    const keptProducts = [];

    Object.entries(byHandle).forEach(([handle, items]) => {
      if (items.length > 1) {
        // Keep the first one (newest, since we sorted by created_at DESC)
        const keep = items[0];
        const deleteItems = items.slice(1);
        
        keptProducts.push({ handle, kept: keep, deletedCount: deleteItems.length });
        duplicatesToDelete.push(...deleteItems);
      }
    });

    if (duplicatesToDelete.length === 0) {
      console.log('✅ No duplicates found! Database is clean.');
      return;
    }

    console.log(`Found ${duplicatesToDelete.length} duplicate products to remove:\n`);

    // Show what will be kept vs deleted
    keptProducts.forEach(({ handle, kept, deletedCount }) => {
      console.log(`📦 Handle: "${handle}"`);
      console.log(`   ✅ KEEPING: "${kept.title}" (ID: ${kept.id.substring(0, 8)}..., created: ${kept.created_at?.substring(0, 10)})`);
      console.log(`   ❌ DELETING: ${deletedCount} duplicate(s)`);
    });

    console.log('\n--- Products to delete ---');
    duplicatesToDelete.forEach(p => {
      console.log(`   - ID: ${p.id} | Handle: "${p.handle}" | Title: "${p.title}" | Status: ${p.status}`);
    });

    if (dryRun) {
      console.log('\n🔍 DRY RUN - No changes made. Run without --dry-run to delete.');
      return;
    }

    // Actually delete the duplicates
    console.log('\n⏳ Deleting duplicates...');
    
    const idsToDelete = duplicatesToDelete.map(p => p.id);
    
    const { error: deleteError, count } = await supabase
      .from('products')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('❌ Error deleting products:', deleteError);
      process.exit(1);
    }

    console.log(`\n✅ Successfully deleted ${duplicatesToDelete.length} duplicate products!`);

    // Verify the cleanup
    const { data: remainingProducts, error: verifyError } = await supabase
      .from('products')
      .select('id')
      .eq('status', 'active');

    if (!verifyError) {
      console.log(`📊 Remaining active products: ${remainingProducts.length}`);
    }

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

removeDuplicates();
