import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const polar = new Polar({ accessToken: process.env.POLAR_API_TOKEN });
const orgId = process.env.POLAR_ORG_ID;

// Check Supabase for bolt products
const { data: supaProducts } = await supabase
  .from('products')
  .select('id, title, handle, polar_product_id, polar_price_id, status')
  .or('title.ilike.%bolt%,handle.ilike.%bolt%');

console.log('=== SUPABASE BOLT PRODUCTS ===');
for (const p of supaProducts || []) {
  console.log(`\n${p.title} (${p.handle})`);
  console.log(`  polar_product_id: ${p.polar_product_id}`);
  console.log(`  polar_price_id: ${p.polar_price_id}`);
  console.log(`  status: ${p.status}`);
}

// Check Polar for bolt products (both active AND archived)
console.log('\n=== ALL POLAR BOLT PRODUCTS ===');

// Get active
const activeProducts = await polar.products.list({
  organizationId: orgId,
  isArchived: false
});

// Get archived
const archivedProducts = await polar.products.list({
  organizationId: orgId,
  isArchived: true
});

const allPolar = [...activeProducts.result.items, ...archivedProducts.result.items];

for (const p of allPolar) {
  if (p.name.toLowerCase().includes('bolt')) {
    console.log(`\n${p.name} ${p.isArchived ? '(ARCHIVED)' : '(ACTIVE)'}`);
    console.log(`  id: ${p.id}`);
    console.log(`  price_id: ${p.prices?.[0]?.id}`);
  }
}

// Cross-reference: check if Supabase polar_product_ids exist in Polar
console.log('\n=== CROSS-REFERENCE CHECK ===');
const polarIds = new Set(allPolar.map(p => p.id));
const activePolarIds = new Set(activeProducts.result.items.map(p => p.id));

for (const p of supaProducts || []) {
  if (p.polar_product_id) {
    const exists = polarIds.has(p.polar_product_id);
    const isActive = activePolarIds.has(p.polar_product_id);
    console.log(`\n${p.title}:`);
    console.log(`  Polar ID: ${p.polar_product_id}`);
    console.log(`  Exists in Polar: ${exists}`);
    console.log(`  Is Active: ${isActive}`);
    if (!isActive && exists) {
      console.log(`  ⚠️ PROBLEM: Points to ARCHIVED product!`);
    }
    if (!exists) {
      console.log(`  ❌ PROBLEM: Polar product ID doesn't exist!`);
    }
    if (isActive) {
      console.log(`  ✅ OK`);
    }
  } else {
    console.log(`\n${p.title}:`);
    console.log(`  ❌ NO POLAR PRODUCT ID!`);
  }
}
