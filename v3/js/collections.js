const collectionHandles = ['no3d-chrome-tools'];

export async function getCatalogCollections() {
  const results = await Promise.all(collectionHandles.map(async handle => {
    try {
      const response = await fetch(`/api/collections/${encodeURIComponent(handle)}`);
      if (!response.ok) return null;
      const collection = await response.json();
      return {
        ...collection,
        kind: 'collection',
        tags: ['Collections'],
        productType: 'Collection',
        accessPolicy: 'paid',
        releaseStatus: 'Collection',
        releaseVersion: `${collection.productCount} tools`,
        catalogUrl: collection.productUrl || `/v3/collections/${encodeURIComponent(handle)}/`,
      };
    } catch {
      return null;
    }
  }));
  return results.filter(Boolean);
}
