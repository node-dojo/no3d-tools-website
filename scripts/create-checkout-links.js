#!/usr/bin/env node

/**
 * Create Checkout Links for All Products
 *
 * Automatically generates checkout links for each product in Polar,
 * enabling customers to access free products without manual setup.
 */

const { Polar } = require('@polar-sh/sdk');

const POLAR_API_TOKEN = process.env.POLAR_API_TOKEN;
const POLAR_ORG_ID = process.env.POLAR_ORG_ID;
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!POLAR_API_TOKEN || !POLAR_ORG_ID) {
  console.error('Error: POLAR_API_TOKEN and POLAR_ORG_ID required');
  process.exit(1);
}

const polar = new Polar({ accessToken: POLAR_API_TOKEN });

async function main() {
  console.log('🔗 Creating Checkout Links for All Products...\n');
  if (DRY_RUN) {
    console.log('🧪 DRY RUN MODE - No checkout links will be created\n');
  }

  // 1. Get all products
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

  console.log(`Found ${allProducts.result.items.length} products\n`);

  // 2. Get existing checkout links
  let existingLinks;
  try {
    existingLinks = await polar.checkoutLinks.list({
      organizationId: POLAR_ORG_ID,
      limit: 100
    });
  } catch (error) {
    if (error.body && typeof error.body === 'string') {
      existingLinks = JSON.parse(error.body);
    } else {
      throw error;
    }
  }

  // Create a map of existing links by product ID
  const linksByProduct = new Map();
  if (existingLinks.result && existingLinks.result.items) {
    for (const link of existingLinks.result.items) {
      if (link.product_id) {
        linksByProduct.set(link.product_id, link);
      }
    }
  }

  console.log(`Found ${linksByProduct.size} existing checkout links\n`);

  // 3. Create checkout links for products that don't have one
  const checkoutLinks = [];
  let created = 0;
  let skipped = 0;

  for (const product of allProducts.result.items) {
    // Skip test products
    if (product.name.toLowerCase().includes('test product')) {
      console.log(`⏭️  Skipping test product: ${product.name}`);
      skipped++;
      continue;
    }

    // Check if link already exists
    if (linksByProduct.has(product.id)) {
      const existingLink = linksByProduct.get(product.id);
      console.log(`✓ ${product.name}`);
      console.log(`  Already has link: ${existingLink.url}\n`);
      checkoutLinks.push({
        productId: product.id,
        productName: product.name,
        url: existingLink.url
      });
      skipped++;
      continue;
    }

    // Create new checkout link
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create checkout link for: ${product.name}`);
      checkoutLinks.push({
        productId: product.id,
        productName: product.name,
        url: `https://polar.sh/checkout/WOULD-BE-CREATED`
      });
    } else {
      try {
        let newLink;
        try {
          newLink = await polar.checkoutLinks.create({
            productId: product.id,
            paymentProcessor: 'stripe',
            label: product.name,
            metadata: {
              source: 'automated_script'
            }
          });
        } catch (error) {
          if (error.body && typeof error.body === 'string') {
            newLink = JSON.parse(error.body);
          } else {
            throw error;
          }
        }

        console.log(`✓ ${product.name}`);
        console.log(`  Created: ${newLink.url || newLink.client_secret}\n`);
        console.log(`  Full response:`, JSON.stringify(newLink, null, 2));

        checkoutLinks.push({
          productId: product.id,
          productName: product.name,
          url: newLink.url || newLink.client_secret || 'ERROR_NO_URL',
          rawResponse: newLink
        });
        created++;
      } catch (error) {
        console.error(`✗ Failed to create link for ${product.name}:`, error.message);
        if (error.body) {
          console.error('  Details:', error.body);
        }
        console.log();
      }
    }
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total products: ${allProducts.result.items.length}`);
  console.log(`Checkout links created: ${created}`);
  console.log(`Already existed/skipped: ${skipped}`);
  console.log(`Available checkout links: ${checkoutLinks.length}\n`);

  // 5. Save mapping to file for use by generate-polar-mapping.js
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, 'checkout-links.json');

  fs.writeFileSync(outputPath, JSON.stringify(checkoutLinks, null, 2));
  console.log(`💾 Checkout links saved to: ${outputPath}\n`);

  if (!DRY_RUN) {
    console.log('✅ Checkout links created successfully!');
    console.log('\n📋 Next step: Run generate-polar-mapping.js to update website\n');
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
