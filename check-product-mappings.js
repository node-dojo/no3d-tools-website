import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read all product JSON files
const productDir = path.join(__dirname, 'assets', 'product-data');
const files = fs.readdirSync(productDir).filter(f => f.endsWith('.json'));

console.log('=== COMPREHENSIVE PRODUCT MAPPING REPORT ===\n');

const productData = {};
files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(productDir, file), 'utf8'));
  const handle = data.handle || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  productData[handle] = {
    file,
    title: data.title,
    handle
  };
});

// Read POLAR_PRODUCTS
const polarProductsPath = path.join(__dirname, 'polar-products.js');
let polarProducts = {};
try {
  const polarContent = fs.readFileSync(polarProductsPath, 'utf8');
  const match = polarContent.match(/const POLAR_PRODUCTS = ({[\s\S]*?});/);
  if (match) {
    const func = new Function(`return ${match[1]}`);
    polarProducts = func();
  }
} catch (error) {
  console.error('Error reading polar-products.js:', error.message);
}

console.log('PRODUCT MAPPING STATUS:\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ Product Handle                    │ Status │ Polar Product ID   │');
console.log('├─────────────────────────────────────────────────────────────────┤');

const allHandles = new Set([...Object.keys(productData), ...Object.keys(polarProducts)]);
const sortedHandles = Array.from(allHandles).sort();

sortedHandles.forEach(handle => {
  const product = productData[handle];
  const polar = polarProducts[handle];
  
  let status = '❌ MISSING';
  let polarId = 'N/A';
  
  if (product && polar) {
    status = '✅ MAPPED';
    polarId = polar.productId || 'NO ID';
  } else if (product && !polar) {
    status = '⚠️  NOT MAPPED';
  } else if (!product && polar) {
    status = '🔵 EXTRA';
    polarId = polar.productId || 'NO ID';
  }
  
  const handleDisplay = handle.padEnd(32);
  const statusDisplay = status.padEnd(10);
  const idDisplay = (polarId.substring(0, 18) + (polarId.length > 18 ? '...' : '')).padEnd(20);
  
  console.log(`│ ${handleDisplay} │ ${statusDisplay} │ ${idDisplay} │`);
});

console.log('└─────────────────────────────────────────────────────────────────┘\n');

// Summary
const mapped = Object.keys(productData).filter(h => polarProducts[h]);
const missing = Object.keys(productData).filter(h => !polarProducts[h]);
const extra = Object.keys(polarProducts).filter(h => !productData[h]);

console.log('SUMMARY:');
console.log(`  Total products: ${Object.keys(productData).length}`);
console.log(`  ✅ Mapped: ${mapped.length}`);
console.log(`  ⚠️  Missing mappings: ${missing.length}`);
console.log(`  🔵 Extra mappings: ${extra.length}\n`);

if (missing.length > 0) {
  console.log('MISSING MAPPINGS (need to be added to POLAR_PRODUCTS):');
  missing.forEach(handle => {
    const product = productData[handle];
    console.log(`  - ${handle} (${product.title})`);
  });
  console.log('');
}

if (extra.length > 0) {
  console.log('EXTRA MAPPINGS (in POLAR_PRODUCTS but no product file):');
  extra.forEach(handle => {
    const polar = polarProducts[handle];
    console.log(`  - ${handle} (${polar.name})`);
  });
  console.log('');
}

// Check for slug mismatches
console.log('SLUG MISMATCHES (same product, different handles):');
const polarByTitle = {};
Object.entries(polarProducts).forEach(([slug, product]) => {
  const titleKey = product.name.toLowerCase().replace(/\s+/g, '-');
  if (!polarByTitle[titleKey]) {
    polarByTitle[titleKey] = [];
  }
  polarByTitle[titleKey].push({ slug, product });
});

Object.entries(productData).forEach(([handle, product]) => {
  const titleKey = product.title.toLowerCase().replace(/\s+/g, '-');
  const polarMatches = polarByTitle[titleKey] || [];
  
  if (polarMatches.length > 0) {
    const match = polarMatches.find(m => m.slug === handle);
    if (!match) {
      console.log(`  ⚠️  "${product.title}"`);
      console.log(`     Product file handle: ${handle}`);
      polarMatches.forEach(m => {
        console.log(`     POLAR_PRODUCTS key: ${m.slug}`);
      });
      console.log('');
    }
  }
});
