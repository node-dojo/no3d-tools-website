/**
 * Check Polar product prices
 *
 * This script fetches all products from Polar and displays their prices
 */

import { Polar } from '@polar-sh/sdk';

// Use the same token as in the API
const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN || 'polar_oat_VvufDDhLcmjic8IbjbPn8TXtkETZqC6gb2DFP1vHGlP';
const POLAR_ORG_ID = process.env.POLAR_ORG_ID || 'f0c16049-5959-42c9-8be8-5952c38c7d63';

const polar = new Polar({
  accessToken: POLAR_API_TOKEN
});

async function checkPrices() {
  try {
    console.log('Fetching products from Polar...');
    console.log('Organization ID:', POLAR_ORG_ID);

    const result = await polar.products.list({
      organizationId: POLAR_ORG_ID,
      limit: 100
    });

    if (!result || !result.result) {
      throw new Error('Invalid response from Polar API');
    }

    const products = result.result.items || [];
    console.log(`\nFound ${products.length} products:\n`);

    for (const product of products) {
      console.log('─'.repeat(60));
      console.log(`Product: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`Archived: ${product.isArchived}`);

      if (product.prices && product.prices.length > 0) {
        console.log(`Prices (${product.prices.length}):`);
        product.prices.forEach((price, index) => {
          const amount = price.priceAmount / 100;
          const currency = price.priceCurrency || 'USD';
          console.log(`  [${index + 1}] Price ID: ${price.id}`);
          console.log(`      Amount: $${amount.toFixed(2)} ${currency}`);
          console.log(`      Archived: ${price.isArchived}`);
          console.log(`      Type: ${price.type}`);
        });
      } else {
        console.log('Prices: NONE');
      }
    }

    console.log('─'.repeat(60));
    console.log('\nSummary:');
    const withPrices = products.filter(p => p.prices && p.prices.length > 0);
    const withoutPrices = products.filter(p => !p.prices || p.prices.length === 0);
    console.log(`Products with prices: ${withPrices.length}`);
    console.log(`Products without prices: ${withoutPrices.length}`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkPrices();
