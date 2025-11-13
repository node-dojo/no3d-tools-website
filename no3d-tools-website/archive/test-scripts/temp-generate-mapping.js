import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

async function generateMapping() {
  const products = await polar.products.list({
    organizationId: process.env.POLAR_ORG_ID,
    limit: 100
  });

  console.log('// Polar Product Mapping with Price IDs');
  console.log('// Auto-generated');
  console.log('// Last updated:', new Date().toISOString());
  console.log('');
  console.log('const POLAR_PRODUCTS = {');

  for (const product of products.items) {
    const slug = product.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    
    const priceId = product.prices && product.prices.length > 0 
      ? product.prices[0].id 
      : null;

    console.log(`  '${slug}': {`);
    console.log(`    productId: '${product.id}',`);
    console.log(`    priceId: '${priceId}',`);
    console.log(`    name: '${product.name}'`);
    console.log(`  },`);
  }

  console.log('};');
}

generateMapping().catch(console.error);
