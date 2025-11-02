const { Polar } = require('@polar-sh/sdk');

const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN
});

async function createBenefit() {
  console.log('Creating downloadable benefit...');
  
  try {
    // Note: We need to NOT include organizationId with org token
    const benefit = await polar.benefits.create({
      type: 'downloadables',
      description: 'Test Product - Dojo Bool v5 Download',
      properties: {
        files: ['64ea14ba-3730-4ec9-b09b-6747337e3dc3']  // Existing file
      }
    });
    
    if (benefit.body && typeof benefit.body === 'string') {
      const parsed = JSON.parse(benefit.body);
      console.log('✅ Benefit created:', JSON.stringify(parsed, null, 2));
      return parsed;
    }
    
    console.log('✅ Benefit created:', JSON.stringify(benefit, null, 2));
    return benefit;
  } catch (error) {
    if (error.body && typeof error.body === 'string') {
      try {
        const parsed = JSON.parse(error.body);
        console.log('Benefit response:', JSON.stringify(parsed, null, 2));
        return parsed;
      } catch {
        console.error('Error body:', error.body);
      }
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

createBenefit();
