#!/usr/bin/env node
/**
 * Script to list all Polar products with their IDs and prices
 *
 * Usage: node scripts/list-polar-products.js
 */

import { Polar } from '@polar-sh/sdk';
import 'dotenv/config';

// Initialize Polar SDK
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

async function listProducts() {
  try {
    if (!process.env.POLAR_API_TOKEN) {
      console.error('ERROR: POLAR_API_TOKEN not found in environment');
      console.error('Make sure you have a .env file with POLAR_API_TOKEN set');
      process.exit(1);
    }

    console.log('\n=== Fetching Polar Products ===\n');

    const organizationId = process.env.POLAR_ORG_ID || 'f0c16049-5959-42c9-8be8-5952c38c7d63';

    const result = await polar.products.list({
      organizationId: organizationId,
      limit: 100
    });

    if (!result || !result.result) {
      throw new Error('Invalid response from Polar API');
    }

    const products = result.result.items || [];

    if (products.length === 0) {
      console.log('No products found');
      return;
    }

    console.log(`Found ${products.length} products:\n`);
    console.log('Name'.padEnd(40) + 'Product ID'.padEnd(42) + 'Price');
    console.log('-'.repeat(100));

    for (const product of products) {
      if (product.isArchived) continue;

      const activePrice = product.prices?.find(p => !p.isArchived);
      const priceStr = activePrice
        ? `$${(activePrice.priceAmount / 100).toFixed(2)}`
        : 'No price';

      console.log(
        product.name.padEnd(40) +
        product.id.padEnd(42) +
        priceStr
      );
    }

    console.log('\n=== JSON Mapping ===\n');
    console.log('Copy this to update your product JSON files:\n');

    for (const product of products) {
      if (product.isArchived) continue;
      console.log(`"${product.name}": "${product.id}",`);
    }

  } catch (error) {
    console.error('\nERROR:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.body) {
      console.error('Response:', error.body);
    }
    process.exit(1);
  }
}

listProducts();
