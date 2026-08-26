export function filterEffectiveManifest(manifestJson, membershipAllowed, purchasedHandles, accountAuthenticated = false, membershipScopes = []) {
  const manifest = JSON.parse(manifestJson);
  const assets = manifest.assets || {};
  const scopedHandles = new Set();
  for (const scope of membershipScopes) {
    const members = manifest.collections?.[scope];
    if (Array.isArray(members)) for (const handle of members) scopedHandles.add(handle);
  }
  const filteredAssets = {};
  for (const [handle, asset] of Object.entries(assets)) {
    const purchased = purchasedHandles.has(handle);
    const free = asset.access_policy === 'free' && accountAuthenticated;
    const membership = membershipAllowed || scopedHandles.has(handle);
    if (!membership && !purchased && !free) continue;
    filteredAssets[handle] = {
      ...asset,
      access_source: membership && purchased
        ? 'membership_and_purchase'
        : membership ? 'membership'
          : purchased ? 'purchase' : 'free'
    };
  }
  return JSON.stringify({
    ...manifest,
    assets: filteredAssets,
    asset_count: Object.keys(filteredAssets).length
  });
}
