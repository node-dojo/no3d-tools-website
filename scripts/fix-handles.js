/**
 * Fix Duplicate Products in Supabase - Phase 2
 * 
 * Updates handles to URL-safe format after duplicates have been archived.
 * 
 * Run with: doppler run -- node scripts/fix-handles.js
 * 
 * Add --dry-run to preview changes without applying them
 * Add --apply to actually make the changes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  console.log('🔍 Scanning for products with invalid handles...\n');
  console.log(DRY_RUN ? '⚠️  DRY RUN MODE - No changes will be made' : '🚀 APPLY MODE - Changes will be committed');
  console.log('');

  // Fetch all active products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, handle, title, status')
    .eq('status', 'active')
    .order('title', { ascending: true });

  if (error) {
    console.error('❌ Error fetching products:', error);
    process.exit(1);
  }

  console.log(`📦 Found ${products.length} active products\n`);

  // Find products with invalid handles
  const needsUpdate = products.filter(p => !isValidHandle(p.handle));

  if (needsUpdate.length === 0) {
    console.log('✅ All handles are valid!');
    return;
  }

  console.log(`⚠️  Found ${needsUpdate.length} products with invalid handles:\n`);

  // Check for conflicts
  const existingHandles = new Set(products.map(p => p.handle.toLowerCase()));
  const changes = [];

  for (const product of needsUpdate) {
    const idealHandle = normalizeHandle(product.title);
    
    console.log(`📋 "${product.title}"`);
    console.log(`   Current: "${product.handle}"`);
    console.log(`   Ideal: "${idealHandle}"`);
    
    // Check if ideal handle would conflict
    if (existingHandles.has(idealHandle) && product.handle.toLowerCase() !== idealHandle) {
      console.log(`   ⚠️  CONFLICT: "${idealHandle}" already exists (likely archived)`);
      // Check if conflict is with an archived product
      const { data: conflictCheck } = await supabase
        .from('products')
        .select('id, status')
        .eq('handle', idealHandle)
        .single();
      
      if (conflictCheck && conflictCheck.status === 'archived') {
        console.log(`   🔄 Conflict is with archived product - will rename archived first`);
        changes.push({
          type: 'rename_archived',
          id: conflictCheck.id,
          oldHandle: idealHandle,
          newHandle: `${idealHandle}-archived-${Date.now()}`
        });
      }
    }
    
    changes.push({
      type: 'update_handle',
      id: product.id,
      oldHandle: product.handle,
      newHandle: idealHandle,
      title: product.title
    });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 Summary: ${changes.length} changes to apply`);
  console.log(`${'='.repeat(60)}\n`);

  if (DRY_RUN) {
    console.log('ℹ️  Run with --apply to execute these changes');
    return;
  }

  // Apply changes in order
  console.log('🚀 Applying changes...\n');

  for (const change of changes) {
    try {
      if (change.type === 'rename_archived') {
        const { error } = await supabase
          .from('products')
          .update({ handle: change.newHandle })
          .eq('id', change.id);
        
        if (error) throw error;
        console.log(`  ✅ Renamed archived: "${change.oldHandle}" → "${change.newHandle}"`);
      } 
      else if (change.type === 'update_handle') {
        const { error } = await supabase
          .from('products')
          .update({ handle: change.newHandle })
          .eq('id', change.id);
        
        if (error) throw error;
        console.log(`  ✅ Updated: "${change.oldHandle}" → "${change.newHandle}"`);
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${change.type} - ${err.message}`);
    }
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
