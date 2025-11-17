// Test to see what format Polar expects
console.log('Testing different checkout formats...');

// Format 1: Array of price IDs
const format1 = {
  productPrices: ["price-id-1", "price-id-2"]
};

// Format 2: Array of objects with productPriceId
const format2 = {
  productPrices: [
    { productPriceId: "price-id-1" },
    { productPriceId: "price-id-2" }
  ]
};

// Format 3: Object with products array (might be the correct one)
const format3 = {
  products: ["price-id-1", "price-id-2"]
};

console.log('Format 1:', JSON.stringify(format1, null, 2));
console.log('Format 2:', JSON.stringify(format2, null, 2));
console.log('Format 3:', JSON.stringify(format3, null, 2));
