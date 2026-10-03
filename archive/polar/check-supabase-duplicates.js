#!/usr/bin/env node
/**
 * Comprehensive duplicate checker for Supabase products
 * Checks: handle, title, polar_product_id
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

async function checkDuplicates() {
  console.log('\n=== Comprehensive Supabase Duplicate Check ===\n');

  try {
    // Fetch all products
    const { data: products, error } = await supabase
      .from('products')
      .select('id, handle, title, polar_product_id, status, created_at, icon_url')
      .order('title', { ascending: true });

    if (error) {
      console.error('❌ Error fetching products:', error);
      process.exit(1);
    }

    console.log(`Total products in database: ${products.length}\n`);

    // Group by handle
    const byHandle = {};
    const byTitle = {};
    const byPolarId = {};
    const byTitleLower = {};

    products.forEach(p => {
      // Group by handle (should be unique per schema)
      if (p.handle) {
        if (!byHandle[p.handle]) byHandle[p.handle] = [];
        byHandle[p.handle].push(p);
      }

      // Group by title
      if (p.title) {
        if (!byTitle[p.title]) byTitle[p.title] = [];
        byTitle[p.title].push(p);
        
        // Also by lowercase title
        const lower = p.title.toLowerCase().trim();
        if (!byTitleLower[lower]) byTitleLower[lower] = [];
        byTitleLower[lower].push(p);
      }

      // Group by polar_product_id
      if (p.polar_product_id) {
        if (!byPolarId[p.polar_product_id]) byPolarId[p.polar_product_id] = [];
        byPolarId[p.polar_product_id].push(p);
      }
    });

    let foundDuplicates = false;

    // Check for duplicate handles
    console.log('--- Checking Duplicate Handles ---');
    Object.entries(byHandle).forEach(([handle, items]) => {
      if (items.length > 1) {
        foundDuplicates = true;
        console.log(`\n⚠️ Handle "${handle}" has ${items.length} products:`);
        items.forEach(p => {
          console.log(`   - ID: ${p.id.substring(0, 8)}... | Title: "${p.title}" | Status: ${p.status}`);
        });
      }
    });

    // Check for duplicate titles (exact match)
    console.log('\n--- Checking Duplicate Titles (Exact) ---');
    Object.entries(byTitle).forEach(([title, items]) => {
      if (items.length > 1) {
        foundDuplicates = true;
        console.log(`\n⚠️ Title "${title}" has ${items.length} products:`);
        items.forEach(p => {
          console.log(`   - ID: ${p.id.substring(0, 8)}... | Handle: "${p.handle}" | Status: ${p.status}`);
        });
      }
    });

    // Check for duplicate titles (case-insensitive)
    console.log('\n--- Checking Duplicate Titles (Case-Insensitive) ---');
    Object.entries(byTitleLower).forEach(([titleLower, items]) => {
      if (items.length > 1) {
        // Only show if not already shown in exact check
        const uniqueTitles = new Set(items.map(p => p.title));
        if (uniqueTitles.size > 1) {
          foundDuplicates = true;
          console.log(`\n⚠️ Title "${items[0].title}" has case variants (${items.length} products):`);
          items.forEach(p => {
            console.log(`   - ID: ${p.id.substring(0, 8)}... | Handle: "${p.handle}" | Title: "${p.title}" | Status: ${p.status}`);
          });
        }
      }
    });

    // Check for duplicate polar_product_ids
    console.log('\n--- Checking Duplicate Polar Product IDs ---');
    Object.entries(byPolarId).forEach(([polarId, items]) => {
      if (items.length > 1) {
        foundDuplicates = true;
        console.log(`\n⚠️ Polar ID "${polarId.substring(0, 8)}..." has ${items.length} products:`);
        items.forEach(p => {
          console.log(`   - ID: ${p.id.substring(0, 8)}... | Handle: "${p.handle}" | Title: "${p.title}" | Status: ${p.status}`);
        });
      }
    });

    if (!foundDuplicates) {
      console.log('\n✅ No duplicates found by handle, title, or polar_product_id!');
    }

    // Summary
    console.log('\n--- Summary ---');
    console.log(`Total products: ${products.length}`);
    console.log(`Unique handles: ${Object.keys(byHandle).length}`);
    console.log(`Unique titles: ${Object.keys(byTitle).length}`);
    console.log(`Unique Polar IDs: ${Object.keys(byPolarId).length}`);
    
    // Status breakdown
    const statusCount = {};
    products.forEach(p => {
      statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    });
    console.log('\nBy Status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // List all products for reference
    console.log('\n--- All Products ---');
    products.forEach((p, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${p.title.padEnd(40)} | ${p.handle.padEnd(40)} | ${p.status}`);
    });

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkDuplicates();
