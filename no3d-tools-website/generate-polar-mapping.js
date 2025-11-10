import { Polar } from '@polar-sh/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

// Helper to normalize product names for matching
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function generateMapping() {
  try {
    // Fetch all Polar products
    const result = await polar.products.list({
      organizationId: process.env.POLAR_ORG_ID,
      limit: 100
    });

    if (!result || !result.result) {
      console.error('No results from Polar API');
      return;
    }

    const products = result.result.items || [];

    // Filter to get only valid products (not archived, has valid price)
    const validProducts = products.filter(p =>
      !p.isArchived &&
      p.prices &&
      p.prices.length > 0 &&
      p.prices[0].priceAmount !== undefined
    );

    // Read all local product files
    const productDir = path.join(__dirname, 'assets', 'product-data');
    const files = fs.readdirSync(productDir).filter(f => f.endsWith('.json'));

    const localProducts = {};
    files.forEach(file => {
      const data = JSON.parse(fs.readFileSync(path.join(productDir, file), 'utf8'));
      const handle = data.handle || normalizeName(data.title);
      localProducts[handle] = {
        file,
        title: data.title,
        handle
      };
    });

    console.log('=== GENERATING POLAR PRODUCT MAPPING ===\n');
    console.log(`Found ${validProducts.length} valid Polar products`);
    console.log(`Found ${Object.keys(localProducts).length} local products\n`);

    // Build mapping
    const mapping = {};
    const matched = [];
    const unmatched = [];

    Object.entries(localProducts).forEach(([handle, localProduct]) => {
      // Try to find matching Polar product by normalized name
      const normalizedLocal = normalizeName(localProduct.title);

      const polarProduct = validProducts.find(p => {
        const normalizedPolar = normalizeName(p.name);
        return normalizedPolar === normalizedLocal;
      });

      if (polarProduct && polarProduct.prices[0]) {
        mapping[handle] = {
          productId: polarProduct.id,
          priceId: polarProduct.prices[0].id,
          name: polarProduct.name,
          // url will need to be filled in manually or fetched separately
          url: ''
        };
        matched.push({ handle, polarName: polarProduct.name });
      } else {
        unmatched.push({ handle, title: localProduct.title });
      }
    });

    // Display results
    console.log('✅ MATCHED PRODUCTS:');
    matched.forEach(m => {
      console.log(`  ${m.handle} -> ${m.polarName}`);
    });

    console.log(`\n⚠️  UNMATCHED PRODUCTS (${unmatched.length}):`);
    unmatched.forEach(m => {
      console.log(`  ${m.handle} (${m.title})`);
      // Show potential matches
      const potential = validProducts.filter(p => {
        const pName = normalizeName(p.name);
        const lName = normalizeName(m.title);
        return pName.includes(lName) || lName.includes(pName);
      });
      if (potential.length > 0) {
        console.log(`    Possible matches: ${potential.map(p => p.name).join(', ')}`);
      }
    });

    // Generate the mapping code
    console.log('\n=== GENERATED POLAR_PRODUCTS CODE ===\n');
    console.log('const POLAR_PRODUCTS = {');

    Object.entries(mapping).forEach(([handle, data]) => {
      console.log(`  '${handle}': {`);
      console.log(`    productId: '${data.productId}',`);
      console.log(`    priceId: '${data.priceId}',`);
      console.log(`    name: '${data.name}',`);
      console.log(`    url: '${data.url}' // TODO: Add checkout URL`);
      console.log(`  },`);
    });

    console.log('};');

    console.log(`\n✅ Mapped ${matched.length} of ${Object.keys(localProducts).length} products`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

generateMapping();
