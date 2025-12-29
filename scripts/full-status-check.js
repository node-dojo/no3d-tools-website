import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const polar = new Polar({ accessToken: process.env.POLAR_API_TOKEN });
const orgId = process.env.POLAR_ORG_ID;

// Get all Supabase products
const { data: supaProducts } = await supabase
  .from('products')
  .select('id, title, handle, polar_product_id, polar_price_id, status');

// Get all Polar products (active and archived)
const activeProducts = await polar.products.list({
  organizationId: orgId,
  isArchived: false
});

const archivedProducts = await polar.products.list({
  organizationId: orgId,
  isArchived: true
});

const activePolarMap = new Map(activeProducts.result.items.map(p => [p.id, p]));
const archivedPolarMap = new Map(archivedProducts.result.items.map(p => [p.id, p]));

console.log(`\n=== ALL SUPABASE PRODUCTS STATUS ===`);
console.log(`Total Supabase products: ${supaProducts.length}`);
console.log(`Active Polar products: ${activePolarMap.size}`);
console.log(`Archived Polar products: ${archivedPolarMap.size}\n`);

const problems = [];
const good = [];

for (const p of supaProducts) {
  const polarId = p.polar_product_id;
  
  if (!polarId) {
    problems.push({ product: p.title, issue: 'NO POLAR ID', handle: p.handle });
    continue;
  }
  
  if (activePolarMap.has(polarId)) {
    good.push({ product: p.title, polarId });
  } else if (archivedPolarMap.has(polarId)) {
    problems.push({ product: p.title, issue: 'POINTS TO ARCHIVED', polarId, handle: p.handle });
  } else {
    problems.push({ product: p.title, issue: 'POLAR ID NOT FOUND', polarId, handle: p.handle });
  }
}

console.log(`✅ GOOD (${good.length} products):`);
for (const g of good) {
  console.log(`   - ${g.product}`);
}

console.log(`\n❌ PROBLEMS (${problems.length} products):`);
for (const p of problems) {
  console.log(`   - ${p.product}: ${p.issue}`);
  if (p.polarId) console.log(`     Polar ID: ${p.polarId}`);
}

// Also list active Polar products that aren't in Supabase
console.log(`\n📋 ACTIVE POLAR PRODUCTS NOT IN SUPABASE:`);
const supabasePolarIds = new Set(supaProducts.filter(p => p.polar_product_id).map(p => p.polar_product_id));
for (const [id, p] of activePolarMap) {
  if (!supabasePolarIds.has(id)) {
    console.log(`   - ${p.name} (${id})`);
  }
}
