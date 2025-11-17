import { Polar } from '@polar-sh/sdk';
const polar = new Polar({ accessToken: process.env.POLAR_API_TOKEN });

(async () => {
  const result = await polar.products.list({
    organization_id: process.env.POLAR_ORG_ID,
    limit: 100
  });

  console.log('Result structure:', Object.keys(result));
  const items = result.result?.items || result.items || [];

  // Group products by name
  const byName = {};
  items.forEach(p => {
    if (!byName[p.name]) byName[p.name] = [];
    const firstPrice = p.prices && p.prices[0];
    byName[p.name].push({
      id: p.id,
      price: firstPrice?.price_amount !== undefined ? firstPrice.price_amount : 'FREE',
      priceType: firstPrice?.amount_type || 'unknown',
      created: p.created_at
    });
  });

  // Find duplicates
  console.log('Duplicate products (same name):');
  let found = false;
  Object.entries(byName).forEach(([name, products]) => {
    if (products.length > 1) {
      found = true;
      console.log('\n' + name + ':');
      products.forEach(p => {
        const priceStr = p.price === 'FREE' ? 'FREE (' + p.priceType + ')' : '$' + (p.price/100).toFixed(2);
        const createdStr = p.created ? p.created.substring(0,10) : 'unknown';
        console.log('  - ID: ' + p.id.substring(0,8) + '... Price: ' + priceStr + ' (created: ' + createdStr + ')');
      });
    }
  });

  if (!found) {
    console.log('No duplicates found!');
  }
})();
