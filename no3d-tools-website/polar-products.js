// Polar Product Mapping with Price IDs
// Updated with price IDs for multi-product checkout
// Last updated: 2025-11-02T00:15:00.000Z

const POLAR_PRODUCTS = {
  'dojo-mesh-repair': {
    productId: 'b6cd2888-3ca8-4d40-a0ef-26a4bd0465a6',
    priceId: 'ca6b0a69-3aae-439f-8c4c-2d561a97a51d',
    name: 'Dojo Mesh Repair',
    url: 'https://buy.polar.sh/polar_cl_FWdlbndGV3wQ85KhtrUnvKyDbgBlae6n79gd81Jr4z6'
  },
  'dojo-print-vizv45': {
    productId: 'b6b80558-3845-4bed-8698-a5f93139c442',
    priceId: 'e4af1270-09a2-4051-9b3f-c4fe42e2c94e',
    name: 'Dojo Print Viz_V4.5',
    url: 'https://buy.polar.sh/polar_cl_JeKh5GnreidjXxpbZzln1p9Rr6xmPlcDKmbqF19Xmcv'
  },
  'dojo-squircle-v45obj': {
    productId: 'cbe13cb6-c46e-43f4-9ed7-e97a53c81287',
    priceId: '2d897d49-9a79-439b-b567-1e5e2e794331',
    name: 'Dojo Squircle v4.5_obj',
    url: 'https://buy.polar.sh/polar_cl_MazgEp8hdhUv1fkuimyuJE266ucAVtN8lsmNo1OT4S7'
  },
  'dojosquircle-v45': {
    productId: '68463bd4-c654-4fe8-abdd-0db6548c3999',
    priceId: 'c55a4623-5d22-4f78-930c-8bea9c78ba1f',
    name: 'Dojo_Squircle v4.5',
    url: 'https://buy.polar.sh/polar_cl_7eGf8vqxd7fn83fld9VEkQ2yDQasgg2QncBCO0c30BH'
  },
  'print-bed-previewobj': {
    productId: 'ca78bcdc-fd85-47be-9ffb-c0788f36ab44',
    priceId: 'e45e3583-c2bf-4f04-8bb5-c5ebb75c18cb',
    name: 'Print Bed Preview_obj',
    url: 'https://buy.polar.sh/polar_cl_UTp4L2nxBWs3ilPz77SaETAQtG2QZBWz470ax4XYvUb'
  },
  // Add more products as needed - these are the main ones for testing
};

// Polar organization base URL (checkout links)
const POLAR_ORG_URL = 'https://polar.sh/no3d-tools';

// Export for use in website
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { POLAR_PRODUCTS, POLAR_ORG_URL };
}
