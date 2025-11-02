#!/usr/bin/env node

/**
 * Update Product Prices to $4.44
 *
 * Updates all products in Polar to have a fixed price of $4.44
 */

const { Polar } = require('@polar-sh/sdk');

const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN;
const POLAR_ORG_ID = process.env.POLAR_ORG_ID;
const NEW_PRICE = 444; // $4.44 in cents

if (!POLAR_API_TOKEN || !POLAR_ORG_ID) {
  console.error('Error: POLAR_API_TOKEN and POLAR_ORG_ID required');
  process.exit(1);
}

const polar = new Polar({ accessToken: POLAR_API_TOKEN });

async function main() {
  console.log(`💰 Updating all product prices to $4.44...\n`);

  // Get all products
  let allProducts;
  try {
    allProducts = await polar.products.list({
      organizationId: POLAR_ORG_ID,
      limit: 100
    });
  } catch (error) {
    if (error.body && typeof error.body === 'string') {
      allProducts = JSON.parse(error.body);
    } else {
      throw error;
    }
  }

  let updated = 0;
  let skipped = 0;

  for (const product of allProducts.result.items) {
    // Skip test products
    if (product.name.toLowerCase().includes('test product')) {
      console.log(`⏭️  Skipping test product: ${product.name}`);
      skipped++;
      continue;
    }

    // Skip NO3D Membership
    if (product.name === 'NO3D Membership') {
      console.log(`⏭️  Skipping: ${product.name}`);
      skipped++;
      continue;
    }

    console.log(`\nUpdating: ${product.name}`);
    console.log(`  Product ID: ${product.id}`);

    // Get current price
    const currentPrice = product.prices[0];
    console.log(`  Current price: ${currentPrice.amount_type}`);

    try {
      // Update product - replace free price with $4.44 fixed price
      let updatedProduct;
      try {
        updatedProduct = await polar.products.update({
          id: product.id,
          productUpdate: {
            prices: [
              {
                amount_type: 'fixed',
                price_amount: NEW_PRICE,
                price_currency: 'usd'
              }
            ]
          }
        });
      } catch (error) {
        if (error.body && typeof error.body === 'string') {
          updatedProduct = JSON.parse(error.body);
        } else {
          throw error;
        }
      }

      console.log(`  ✓ Updated to $4.44`);
      updated++;
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
      if (error.body) {
        console.error(`  Details:`, JSON.stringify(error.body, null, 2));
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total products: ${allProducts.result.items.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}\n`);

  console.log('✅ Price updates complete!');
  console.log('\n📋 Next step: Regenerate checkout links\n');
}

main().catch(error => {
  console.error('Error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
