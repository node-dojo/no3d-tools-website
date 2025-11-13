/**
 * Test the updated get-polar-prices API logic
 */

import { Polar } from '@polar-sh/sdk';

const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN || 'polar_oat_VvufDDhLcmjic8IbjbPn8TXtkETZqC6gb2DFP1vHGlP';
const POLAR_ORG_ID = process.env.POLAR_ORG_ID || 'f0c16049-5959-42c9-8be8-5952c38c7d63';

const polar = new Polar({
  accessToken: POLAR_API_TOKEN
});

async function testAPI() {
  try {
    console.log('Testing updated API logic...');
    console.log('Organization ID:', POLAR_ORG_ID);
    console.log('');

    // Fetch products with organization filter (like the updated API)
    const result = await polar.products.list({
      organizationId: POLAR_ORG_ID,
      limit: 100
    });

    if (!result || !result.result) {
      throw new Error('Invalid response from Polar API');
    }

    const polarProducts = result.result.items || [];
    const prices = {};

    // Build price map by product ID (same logic as API)
    for (const product of polarProducts) {
      if (product.isArchived) continue;

      // Get the first active price (usually the main price)
      const activePrice = product.prices?.find(p => !p.isArchived);
      if (activePrice) {
        // Convert from cents to dollars
        const amount = activePrice.priceAmount / 100;
        const currency = activePrice.priceCurrency || 'USD';

        prices[product.id] = {
          productId: product.id,
          priceId: activePrice.id,
          amount: amount,
          currency: currency,
          formatted: `$${amount.toFixed(2)}`,
          name: product.name
        };
      }
    }

    console.log(`✅ Successfully fetched ${Object.keys(prices).length} products with prices\n`);

    // Show all products with valid prices (not NaN)
    const validPrices = Object.values(prices).filter(p => !isNaN(p.amount));
    const invalidPrices = Object.values(prices).filter(p => isNaN(p.amount));

    console.log('Valid prices:');
    validPrices.forEach(p => {
      console.log(`  ${p.name}: ${p.formatted}`);
    });

    if (invalidPrices.length > 0) {
      console.log(`\n⚠️  ${invalidPrices.length} products with invalid prices (NaN)`);
    }

    console.log('\n📊 Summary:');
    console.log(`  Total products: ${polarProducts.length}`);
    console.log(`  Active products: ${polarProducts.filter(p => !p.isArchived).length}`);
    console.log(`  Products with valid prices: ${validPrices.length}`);
    console.log(`  Products with invalid prices: ${invalidPrices.length}`);

    return prices;
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();
