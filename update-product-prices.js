/**
 * Update all product JSON files with correct Polar prices
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCT_DATA_DIR = path.join(__dirname, 'assets/product-data');
const CORRECT_PRICE = '4.44';

// Get all JSON files
const files = fs.readdirSync(PRODUCT_DATA_DIR).filter(f => f.endsWith('.json'));

console.log(`Found ${files.length} product files to update\n`);

let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(PRODUCT_DATA_DIR, file);

  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    const product = JSON.parse(content);

    // Check if it has variants and a price
    if (product.variants && product.variants.length > 0) {
      const oldPrice = product.variants[0].price;

      // Update the price
      product.variants[0].price = CORRECT_PRICE;

      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(product, null, 2) + '\n');

      console.log(`✅ ${file}`);
      console.log(`   ${oldPrice} → ${CORRECT_PRICE}`);
      updatedCount++;
    } else {
      console.log(`⚠️  ${file} - No variants found`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
  }
}

console.log(`\n✨ Updated ${updatedCount} out of ${files.length} files`);
