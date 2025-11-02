#!/usr/bin/env node

/**
 * Batch Update All Product Prices to $4.44 using MCP
 */

const products = [
  'caa98690-507b-43ef-8438-7262e0bd0b64', // Dojo Bolt Gen v05
  '56ab4bb1-a5f9-42ba-9ab7-9662b397c300', // Dojo Bolt Gen v05_Obj
  'e8452fe5-58ea-4788-ab0b-fc4c4e26f320', // Dojo Bool v5 (already done)
  '415373e2-d342-4974-8402-d63b132d834c', // Dojo Calipers
  'ee82acc9-63a8-4b79-a7bd-a06ec8722391', // Dojo Crv Wrapper v4
  'cb03f53e-a779-4a17-b655-930f7bfdf8bc', // Dojo Gluefinity Grid_obj
  'ae2662f2-1890-47e7-b97c-938ab466cdb0', // Dojo Knob
  'cdf5a62e-2f95-4daf-8ed3-385fc1e4e335', // Dojo Knob_obj
  'b6cd2888-3ca8-4d40-a0ef-26a4bd0465a6', // Dojo Mesh Repair
  'b6b80558-3845-4bed-8698-a5f93139c442', // Dojo Print Viz_V4.5
  'cbe13cb6-c46e-43f4-9ed7-e97a53c81287', // Dojo Squircle v4.5_obj
  '68463bd4-c654-4fe8-abdd-0db6548c3999', // Dojo_Squircle v4.5
  'ca78bcdc-fd85-47be-9ffb-c0788f36ab44', // Print Bed Preview_obj
];

console.log(`
Use the following MCP calls to update all products to $4.44:

${products.map(id => `polar_products_update --id "${id}" --body '{"prices": [{"amount_type": "fixed", "price_amount": 444, "price_currency": "usd"}]}'`).join('\n')}
`);
