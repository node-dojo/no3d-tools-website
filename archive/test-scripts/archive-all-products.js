import { Polar } from '@polar-sh/sdk';

const polar = new Polar({ accessToken: process.env.POLAR_API_TOKEN });
const ORG_ID = process.env.POLAR_ORG_ID;

(async () => {
  console.log('🗄️  Archiving all products in Polar...\n');

  // Get all products
  const result = await polar.products.list({
    organization_id: ORG_ID,
    limit: 100
  });

  const items = result.result?.items || result.items || [];
  console.log(`Found ${items.length} products\n`);

  let archived = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of items) {
    if (product.is_archived) {
      console.log(`⏭️  Skipping already archived: ${product.name}`);
      skipped++;
      continue;
    }

    try {
      await polar.products.update({
        pathParameters: { id: product.id },
        body: {
          is_archived: true
        }
      });
      console.log(`✅ Archived: ${product.name}`);
      archived++;
    } catch (error) {
      console.error(`❌ Error archiving ${product.name}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Archived: ${archived}`);
  console.log(`   Skipped (already archived): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n✅ Done! All products archived.`);
})();
