export function collectionAllowsHandle(manifestJson, membershipScopes, handle) {
  if (!Array.isArray(membershipScopes) || membershipScopes.length === 0) return false;
  const manifest = typeof manifestJson === 'string' ? JSON.parse(manifestJson) : manifestJson;
  return membershipScopes.some((scope) => {
    const members = manifest?.collections?.[scope];
    return Array.isArray(members) && members.includes(handle);
  });
}
