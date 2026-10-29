import deliveries from './delivery.json' with { type: 'json' };

// Private delivery metadata is kept out of the Blender catalog and manifests.
// Ownership, payment, refunds and recovery remain authoritative in Commerce.
export function getPrintDelivery(handle) {
  if (typeof handle !== 'string') return null;
  return deliveries.find(product => product.handle === handle) || null;
}
