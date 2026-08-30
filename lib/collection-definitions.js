export const collectionDefinitions = {
  'no3d-chrome-tools': {
    collectionId: 'no3d-chrome',
    scope: 'no3dtools.membership.no3d-chrome',
    title: 'No3D Chrome tools',
    technicalLabel: 'Chrome collection / Lifetime ownership',
    description: 'A curated, expanding Blender collection for procedural drawing, pixel, pattern, chrome-form, and printable visual tools.',
    thumbnail: '/v3/assets/no3d-chrome-hero-static.webp',
    animatedThumbnail: '/v3/assets/no3d-chrome-hero-animated.webp',
    mediaSize: 1024,
    pricing: {
      payNow: { amount: 6666, formatted: '$66.66' },
      payOverTime: { amount: 1111, formatted: '$11.11', installments: 6 },
    },
  },
  'full-library': {
    collectionId: 'full-library',
    scope: 'no3dtools.membership.full-library',
    title: 'Full NO3D Tools Library',
    technicalLabel: 'Complete library / Lifetime ownership',
    description: 'The complete expanding NO3D Tools collection with managed Blender delivery, maintenance, revisions, and future additions.',
    thumbnail: '/v3/assets/shared-source-folder-black.png',
    animatedThumbnail: '/v3/assets/shared-source-folder-black.png',
    mediaSize: 512,
    pricing: {
      payNow: { amount: 17777, formatted: '$177.77' },
      payOverTime: { amount: 1555, formatted: '$15.55', installments: 12 },
    },
  },
};
