import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

async function fetchProducts() {
  try {
    const result = await polar.products.list({
      organizationId: process.env.POLAR_ORG_ID,
      limit: 100
    });

    console.log('All Polar Products:');
    console.log('===================\n');

    if (result && result.result) {
      const products = result.result.items || [];
      products.forEach(product => {
        console.log('Product:', product.name);
        console.log('  ID:', product.id);
        console.log('  Prices:', product.prices.map(p => ({ id: p.id, amount: p.priceAmount })));
        console.log('  Archived:', product.isArchived);
        console.log('');
      });

      console.log('Total products:', products.length);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchProducts();
