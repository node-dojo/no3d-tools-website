/**
 * Fix Duplicate Products in Supabase
 * 
 * This script identifies products with the same title but different handles,
 * merges them by keeping the one with a valid polar_product_id, and archives the rest.
 * 
 * Run with: doppler run -- node scripts/fix-duplicate-products.js
 * 
 * Add --dry-run to preview changes without applying them
 * Add --apply to actually make the changes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for updates

const DRY_RUN = !process.argv.includes('--apply');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeHandle(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidHandle(handle) {
  return handle && !handle.includes(' ') && handle === handle.toLowerCase();
}

async function main() {
  console.log('🔍 Scanning for duplicate products...\n');
  console.log(DRY_RUN ? '⚠️  DRY RUN MODE - No changes will be made' : '🚀 APPLY MODE - Changes will be committed');
  console.log('');

  // Fetch all active products
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching products:', error);
    process.exit(1);
  }

  console.log(`📦 Found ${products.length} active products\n`);

  // Group by normalized title
  const byTitle = {};
  products.forEach(p => {
    const normalizedTitle = (p.title || '').toLowerCase().trim();
    if (!byTitle[normalizedTitle]) byTitle[normalizedTitle] = [];
    byTitle[normalizedTitle].push(p);
  });

  // Find duplicates
  const duplicateGroups = Object.entries(byTitle).filter(([_, items]) => items.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log(`⚠️  Found ${duplicateGroups.length} duplicate groups:\n`);

  const changes = [];

  for (const [title, items] of duplicateGroups) {
    console.log(`\n📋 "${items[0].title}" (${items.length} duplicates)`);
    
    // Determine which one to keep:
    // Priority: 1) Has polar_product_id, 2) Has valid handle, 3) Newest
    items.sort((a, b) => {
      // Products with polar_product_id come first
      const aHasPolar = a.polar_product_id ? 1 : 0;
      const bHasPolar = b.polar_product_id ? 1 : 0;
      if (aHasPolar !== bHasPolar) return bHasPolar - aHasPolar;
      
      // Then products with valid handles
      const aValidHandle = isValidHandle(a.handle) ? 1 : 0;
      const bValidHandle = isValidHandle(b.handle) ? 1 : 0;
      if (aValidHandle !== bValidHandle) return bValidHandle - aValidHandle;
      
      // Then newer products
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const keeper = items[0];
    const toArchive = items.slice(1);

    // Check if keeper needs handle update
    const idealHandle = normalizeHandle(keeper.title);
    const needsHandleUpdate = keeper.handle !== idealHandle;

    console.log(`   ✅ KEEP: ${keeper.id.substring(0, 8)}...`);
    console.log(`      handle: "${keeper.handle}" ${needsHandleUpdate ? `→ "${idealHandle}"` : '(ok)'}`);
    console.log(`      polar_id: ${keeper.polar_product_id || 'none'}`);

    if (needsHandleUpdate) {
      changes.push({
        type: 'update_handle',
        id: keeper.id,
        oldHandle: keeper.handle,
        newHandle: idealHandle,
        title: keeper.title
      });
    }

    for (const dup of toArchive) {
      console.log(`   🗑️  ARCHIVE: ${dup.id.substring(0, 8)}...`);
      console.log(`      handle: "${dup.handle}"`);
      console.log(`      polar_id: ${dup.polar_product_id || 'none'}`);
      
      // If the duplicate has a polar_product_id but keeper doesn't, we need to transfer it
      if (dup.polar_product_id && !keeper.polar_product_id) {
        console.log(`      ⚠️  Transferring polar_product_id to keeper!`);
        changes.push({
          type: 'transfer_polar_id',
          keeperId: keeper.id,
          polarProductId: dup.polar_product_id,
          polarPriceId: dup.polar_price_id
        });
      }

      changes.push({
        type: 'archive',
        id: dup.id,
        handle: dup.handle,
        title: dup.title
      });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 Summary: ${changes.length} changes to apply`);
  console.log(`${'='.repeat(60)}\n`);

  if (DRY_RUN) {
    console.log('ℹ️  Run with --apply to execute these changes');
    console.log('\nChanges that would be made:');
    changes.forEach((c, i) => {
      if (c.type === 'update_handle') {
        console.log(`  ${i + 1}. Update handle: "${c.oldHandle}" → "${c.newHandle}"`);
      } else if (c.type === 'archive') {
        console.log(`  ${i + 1}. Archive: "${c.handle}" (${c.title})`);
      } else if (c.type === 'transfer_polar_id') {
        console.log(`  ${i + 1}. Transfer polar_product_id ${c.polarProductId} to keeper`);
      }
    });
    return;
  }

  // Apply changes
  console.log('🚀 Applying changes...\n');

  for (const change of changes) {
    try {
      if (change.type === 'update_handle') {
        const { error } = await supabase
          .from('products')
          .update({ handle: change.newHandle })
          .eq('id', change.id);
        
        if (error) throw error;
        console.log(`  ✅ Updated handle for ${change.id.substring(0, 8)}...`);
      } 
      else if (change.type === 'transfer_polar_id') {
        const { error } = await supabase
          .from('products')
          .update({ 
            polar_product_id: change.polarProductId,
            polar_price_id: change.polarPriceId
          })
          .eq('id', change.keeperId);
        
        if (error) throw error;
        console.log(`  ✅ Transferred polar_product_id to ${change.keeperId.substring(0, 8)}...`);
      }
      else if (change.type === 'archive') {
        const { error } = await supabase
          .from('products')
          .update({ status: 'archived' })
          .eq('id', change.id);
        
        if (error) throw error;
        console.log(`  ✅ Archived ${change.id.substring(0, 8)}...`);
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${change.type} on ${change.id}:`, err.message);
    }
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
