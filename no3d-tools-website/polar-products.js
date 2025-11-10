// Polar Product Mapping with Price IDs
// Updated with price IDs for multi-product checkout
// Last updated: 2025-11-09T22:20:00.000Z
// NOTE: Handles must match the "handle" field in product JSON files

const POLAR_PRODUCTS = {
  'dojo-bolt-gen-v05': {
    productId: 'caa98690-507b-43ef-8438-7262e0bd0b64',
    priceId: 'b1508b03-96fd-4433-9aa0-99769a53e057',
    name: 'Dojo Bolt Gen v05',
    url: 'https://polar.sh/no3d-tools' // Multi-cart checkout - individual URLs not required
  },
  'dojo-bolt-gen-v05-obj': {
    productId: '56ab4bb1-a5f9-42ba-9ab7-9662b397c300',
    priceId: '7321f2b2-5aaa-487a-ae6e-482451be028a',
    name: 'Dojo Bolt Gen v05_Obj',
    url: 'https://polar.sh/no3d-tools'
  },
  'dojo-bool-v5': {
    productId: 'e8452fe5-58ea-4788-ab0b-fc4c4e26f320',
    priceId: '179efcd8-2f0f-4ec4-8620-88b6c542a9ef',
    name: 'Dojo Bool v5',
    url: 'https://polar.sh/no3d-tools'
  },
  'dojo-calipers': {
    productId: '415373e2-d342-4974-8402-d63b132d834c',
    priceId: 'd07be3eb-d1e0-4377-8fd5-f8f02eab7a9c',
    name: 'Dojo Calipers',
    url: 'https://polar.sh/no3d-tools'
  },
  'dojo-crv-wrapper-v4': {
    productId: 'ee82acc9-63a8-4b79-a7bd-a06ec8722391',
    priceId: '1b58c8c9-c98a-4406-bba9-866cecc0a084',
    name: 'Dojo Crv Wrapper v4',
    url: 'https://polar.sh/no3d-tools'
  },
  'dojo-gluefinity-grid-obj': {
    productId: 'cb03f53e-a779-4a17-b655-930f7bfdf8bc',
    priceId: 'ab42708d-a925-41c0-97f2-46aa8e99e4f9',
    name: 'Dojo Gluefinity Grid_obj',
    url: 'https://polar.sh/no3d-tools'
  },
  'dojo-knob': {
    productId: 'ae2662f2-1890-47e7-b97c-938ab466cdb0',
    priceId: 'f62f716f-3b45-4360-8405-4af73cd3a6a1',
    name: 'Dojo Knob',
    url: 'https://polar.sh/no3d-tools'
  },
  'dojo-knob-obj': {
    productId: 'cdf5a62e-2f95-4daf-8ed3-385fc1e4e335',
    priceId: '39cef35d-b306-4009-a4d2-007130c7bfac',
    name: 'Dojo Knob_obj',
    url: 'https://polar.sh/no3d-tools'
  },
  'dojo-mesh-repair': {
    productId: 'b6cd2888-3ca8-4d40-a0ef-26a4bd0465a6',
    priceId: 'ca6b0a69-3aae-439f-8c4c-2d561a97a51d',
    name: 'Dojo Mesh Repair',
    url: 'https://buy.polar.sh/polar_cl_FWdlbndGV3wQ85KhtrUnvKyDbgBlae6n79gd81Jr4z6'
  },
  'dojo-print-viz-v45': {
    productId: 'b6b80558-3845-4bed-8698-a5f93139c442',
    priceId: 'e4af1270-09a2-4051-9b3f-c4fe42e2c94e',
    name: 'Dojo Print Viz_V4.5',
    url: 'https://buy.polar.sh/polar_cl_JeKh5GnreidjXxpbZzln1p9Rr6xmPlcDKmbqF19Xmcv'
  },
  'dojo-squircle-v45-obj': {
    productId: 'cbe13cb6-c46e-43f4-9ed7-e97a53c81287',
    priceId: '2d897d49-9a79-439b-b567-1e5e2e794331',
    name: 'Dojo Squircle v4.5_obj',
    url: 'https://buy.polar.sh/polar_cl_MazgEp8hdhUv1fkuimyuJE266ucAVtN8lsmNo1OT4S7'
  },
  'dojo-squircle-v45': {
    productId: '68463bd4-c654-4fe8-abdd-0db6548c3999',
    priceId: 'c55a4623-5d22-4f78-930c-8bea9c78ba1f',
    name: 'Dojo_Squircle v4.5',
    url: 'https://buy.polar.sh/polar_cl_7eGf8vqxd7fn83fld9VEkQ2yDQasgg2QncBCO0c30BH'
  },
};

// Polar organization base URL (checkout links)
const POLAR_ORG_URL = 'https://polar.sh/no3d-tools';

// Export for use in website
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { POLAR_PRODUCTS, POLAR_ORG_URL };
}
