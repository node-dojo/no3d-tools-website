export function filterEffectiveManifest(manifestJson, membershipAllowed, purchasedHandles, accountAuthenticated = false) {
  const manifest = JSON.parse(manifestJson);
  const assets = manifest.assets || {};
  const filteredAssets = {};
  for (const [handle, asset] of Object.entries(assets)) {
    const purchased = purchasedHandles.has(handle);
    const free = asset.access_policy === 'free' && accountAuthenticated;
    if (!membershipAllowed && !purchased && !free) continue;
    filteredAssets[handle] = {
      ...asset,
      access_source: membershipAllowed && purchased
        ? 'membership_and_purchase'
        : membershipAllowed ? 'membership'
          : purchased ? 'purchase' : 'free'
    };
  }
  return JSON.stringify({
    ...manifest,
    assets: filteredAssets,
    asset_count: Object.keys(filteredAssets).length
  });
}
