#!/usr/bin/env node
/**
 * Diagnostic script to identify duplicate products across all data sources
 * and verify Polar product ID mappings
 * 
 * Usage: node scripts/diagnose-duplicates.js
 */

import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';
import 'dotenv/config';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const polarToken = process.env.POLAR_API_TOKEN;
const polarOrgId = process.env.POLAR_ORG_ID;

console.log('\n========================================');
console.log('   SOLVET Global Duplicate Diagnostic');
console.log('========================================\n');

// Check environment
console.log('📋 Environment Check:');
console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   POLAR_API_TOKEN: ${polarToken ? '✅ Set' : '❌ Missing'}`);
console.log(`   POLAR_ORG_ID: ${polarOrgId ? '✅ Set' : '❌ Missing'}`);
console.log(`   USE_SUPABASE: ${process.env.USE_SUPABASE || 'not set (defaults to false)'}`);
console.log('');

async function fetchPolarProducts() {
  if (!polarToken) {
    console.log('⚠️ Skipping Polar check - no API token');
    return [];
  }
  
  const polar = new Polar({ accessToken: polarToken });
  
  try {
    const result = await polar.products.list({
      organizationId: polarOrgId,
      limit: 100
    });
    
    return result.result?.items || result.items || [];
  } catch (error) {
    console.error('❌ Polar API error:', error.message);
    return [];
  }
}

async function fetchSupabaseProducts() {
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ Skipping Supabase check - missing config');
    return [];
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Supabase error:', error.message);
    return [];
  }
}

async function runDiagnostics() {
  // Fetch from both sources
  console.log('🔄 Fetching data from Polar...');
  const polarProducts = await fetchPolarProducts();
  console.log(`   Found ${polarProducts.length} products in Polar\n`);
  
  console.log('🔄 Fetching data from Supabase...');
  const supabaseProducts = await fetchSupabaseProducts();
  console.log(`   Found ${supabaseProducts.length} products in Supabase\n`);
  
  // === POLAR ANALYSIS ===
  console.log('═══════════════════════════════════════');
  console.log('   POLAR PRODUCT ANALYSIS');
  console.log('═══════════════════════════════════════\n');
  
  // Group Polar products by name
  const polarByName = {};
  const activePolars = [];
  
  polarProducts.forEach(p => {
    const name = p.name || 'Unknown';
    if (!polarByName[name]) polarByName[name] = [];
    polarByName[name].push({
      id: p.id,
      name: p.name,
      archived: p.isArchived || p.is_archived,
      created: (p.createdAt || p.created_at || '').substring(0, 10),
      prices: p.prices?.length || 0
    });
    
    if (!p.isArchived && !p.is_archived) {
      activePolars.push(p);
    }
  });
  
  // Show Polar duplicates (active only)
  const polarDups = Object.entries(polarByName).filter(([_, items]) => 
    items.filter(i => !i.archived).length > 1
  );
  
  if (polarDups.length > 0) {
    console.log('⚠️ ACTIVE Polar Duplicates Found:');
    polarDups.forEach(([name, items]) => {
      const active = items.filter(i => !i.archived);
      if (active.length > 1) {
        console.log(`\n   "${name}":`);
        active.forEach(p => {
          console.log(`      - ${p.id.substring(0, 8)}... (created: ${p.created})`);
        });
      }
    });
  } else {
    console.log('✅ No active Polar duplicates found');
  }
  
  console.log(`\n📊 Polar Summary:`);
  console.log(`   Total: ${polarProducts.length}`);
  console.log(`   Active: ${activePolars.length}`);
  console.log(`   Archived: ${polarProducts.length - activePolars.length}`);
  
  // === SUPABASE ANALYSIS ===
  console.log('\n═══════════════════════════════════════');
  console.log('   SUPABASE PRODUCT ANALYSIS');
  console.log('═══════════════════════════════════════\n');
  
  if (supabaseProducts.length === 0) {
    console.log('⚠️ No products in Supabase - USE_SUPABASE might be disabled');
  } else {
    // Group by handle
    const supaByHandle = {};
    const supaByPolarId = {};
    
    supabaseProducts.forEach(p => {
      const handle = (p.handle || '').toLowerCase().trim();
      if (handle) {
        if (!supaByHandle[handle]) supaByHandle[handle] = [];
        supaByHandle[handle].push(p);
      }
      
      if (p.polar_product_id) {
        if (!supaByPolarId[p.polar_product_id]) supaByPolarId[p.polar_product_id] = [];
        supaByPolarId[p.polar_product_id].push(p);
      }
    });
    
    // Handle duplicates
    const handleDups = Object.entries(supaByHandle).filter(([_, items]) => items.length > 1);
    if (handleDups.length > 0) {
      console.log('⚠️ Supabase Handle Duplicates:');
      handleDups.forEach(([handle, items]) => {
        console.log(`\n   "${handle}" (${items.length} entries):`);
        items.forEach(p => {
          console.log(`      - ID: ${p.id.substring(0, 8)}... | Title: "${p.title}" | Status: ${p.status}`);
        });
      });
    } else {
      console.log('✅ No handle duplicates in Supabase');
    }
    
    // Polar ID duplicates
    const polarIdDups = Object.entries(supaByPolarId).filter(([_, items]) => items.length > 1);
    if (polarIdDups.length > 0) {
      console.log('\n⚠️ Supabase Polar ID Duplicates (multiple products pointing to same Polar ID):');
      polarIdDups.forEach(([polarId, items]) => {
        console.log(`\n   Polar ID: ${polarId.substring(0, 8)}...`);
        items.forEach(p => {
          console.log(`      - ${p.title} (handle: ${p.handle})`);
        });
      });
    }
    
    // Products missing Polar IDs
    const missingPolarId = supabaseProducts.filter(p => !p.polar_product_id && p.status === 'active');
    if (missingPolarId.length > 0) {
      console.log(`\n⚠️ Active Supabase products MISSING polar_product_id:`);
      missingPolarId.forEach(p => {
        console.log(`   - "${p.title}" (handle: ${p.handle})`);
      });
    }
    
    console.log(`\n📊 Supabase Summary:`);
    console.log(`   Total: ${supabaseProducts.length}`);
    console.log(`   Active: ${supabaseProducts.filter(p => p.status === 'active').length}`);
    console.log(`   With Polar ID: ${supabaseProducts.filter(p => p.polar_product_id).length}`);
    console.log(`   Missing Polar ID: ${supabaseProducts.filter(p => !p.polar_product_id).length}`);
  }
  
  // === CROSS-REFERENCE ===
  console.log('\n═══════════════════════════════════════');
  console.log('   CROSS-REFERENCE CHECK');
  console.log('═══════════════════════════════════════\n');
  
  if (supabaseProducts.length > 0 && activePolars.length > 0) {
    // Check if Supabase polar_product_ids point to valid active Polar products
    const activePolarIds = new Set(activePolars.map(p => p.id));
    
    const invalidMappings = supabaseProducts.filter(p => 
      p.polar_product_id && !activePolarIds.has(p.polar_product_id)
    );
    
    if (invalidMappings.length > 0) {
      console.log('❌ Supabase products with INVALID/ARCHIVED Polar IDs:');
      invalidMappings.forEach(p => {
        const polarMatch = polarProducts.find(pp => pp.id === p.polar_product_id);
        const reason = polarMatch ? '(Polar product is ARCHIVED)' : '(Polar product NOT FOUND)';
        console.log(`   - "${p.title}" → ${p.polar_product_id?.substring(0, 8)}... ${reason}`);
      });
      console.log('\n   ⚠️ These products will FAIL checkout!');
    } else {
      console.log('✅ All Supabase polar_product_ids point to valid active Polar products');
    }
    
    // Check for active Polar products not in Supabase
    const supabasePolarIds = new Set(supabaseProducts.map(p => p.polar_product_id).filter(Boolean));
    const missingInSupabase = activePolars.filter(p => !supabasePolarIds.has(p.id));
    
    if (missingInSupabase.length > 0) {
      console.log('\n⚠️ Active Polar products NOT in Supabase:');
      missingInSupabase.forEach(p => {
        console.log(`   - "${p.name}" (${p.id.substring(0, 8)}...)`);
      });
    }
  }
  
  console.log('\n========================================');
  console.log('   DIAGNOSTIC COMPLETE');
  console.log('========================================\n');
}

runDiagnostics().catch(console.error);
