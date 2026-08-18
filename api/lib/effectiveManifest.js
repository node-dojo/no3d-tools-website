export function filterEffectiveManifest(manifestJson, membershipAllowed, purchasedHandles) {
  const manifest = JSON.parse(manifestJson);
  const assets = manifest.assets || {};
  const filteredAssets = {};
  for (const [handle, asset] of Object.entries(assets)) {
    const purchased = purchasedHandles.has(handle);
    if (!membershipAllowed && !purchased) continue;
    filteredAssets[handle] = {
      ...asset,
      access_source: membershipAllowed && purchased
        ? 'membership_and_purchase'
        : purchased ? 'purchase' : 'membership'
    };
  }
  return JSON.stringify({
    ...manifest,
    assets: filteredAssets,
    asset_count: Object.keys(filteredAssets).length
  });
}
