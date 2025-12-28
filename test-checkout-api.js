import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

async function testCheckout() {
  try {
    console.log('Testing checkout creation with Polar SDK...');
    console.log('API Token:', process.env.POLAR_API_TOKEN ? 'Set' : 'Not set');
    console.log('Org ID:', process.env.POLAR_ORG_ID);

    // Test with Dojo Bolt Gen v05_Obj PRODUCT ID
    // SDK expects array of product ID strings
    const products = ['eb28f590-e6eb-463a-830d-95243e51de89'];

    console.log('\nAttempting to create checkout with:');
    console.log(JSON.stringify({ products }, null, 2));

    const checkoutData = {
      products: products,
      successUrl: 'https://no3dtools.com',
      embed_origin: 'https://no3dtools.com',
      metadata: {
        source: 'test',
        timestamp: new Date().toISOString()
      }
    };

    console.log('\nFull checkout data:');
    console.log(JSON.stringify(checkoutData, null, 2));

    const checkout = await polar.checkouts.create(checkoutData);

    console.log('\n✅ Success! Checkout created:');
    console.log('  ID:', checkout.id);
    console.log('  URL:', checkout.url);
    console.log('  Full response:', JSON.stringify(checkout, null, 2));

  } catch (error) {
    console.error('\n❌ Error creating checkout:');
    console.error('  Message:', error.message);
    console.error('  Status:', error.status || error.statusCode);
    console.error('  Body:', error.body);
    if (error.stack) {
      console.error('  Stack:', error.stack);
    }
  }
}

testCheckout();
