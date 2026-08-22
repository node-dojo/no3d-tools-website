const titleFromHandle = (handle = '') => String(handle)
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, character => character.toUpperCase());

const filenameFromHandle = (handle = '') => `${String(handle)
  .replace(/\.no3d$/i, '')
  .replace(/[-\s]+/g, '_')}.no3d`;

export function readableHandle(handle = '') {
  return titleFromHandle(handle);
}

export function accessLabel(item = {}) {
  if (item.free) return 'Free tool';
  if (item.paymentStatus === 'refunded') return 'Refunded / access removed';
  if (item.entitlementStatus === 'revoked' || !item.owned) return 'Access revoked';
  if (item.membership && item.permanent) return 'Membership + permanent';
  if (item.membership) return 'Membership access';
  return item.permanent ? 'Permanent access' : 'Membership access';
}

export function accountFileAction(item = {}) {
  if (item.paymentStatus === 'refunded' || item.entitlementStatus === 'revoked' || item.owned === false) {
    return {
      href: `/v3/product/?handle=${encodeURIComponent(item.handle || '')}`,
      label: 'Access status →',
    };
  }
  if (item.free || (item.membership && !item.permanent)) {
    return { href: '/v3/account/?state=install', label: 'Available in Blender →' };
  }
  if (item.orderId) {
    return {
      href: `/api/commerce/download/${encodeURIComponent(item.orderId)}`,
      label: item.lastInstalledAt ? 'Check for update →' : 'Install →',
    };
  }
  return {
    href: `/v3/product/?handle=${encodeURIComponent(item.handle || '')}`,
    label: item.owned ? 'Install →' : 'Details →',
  };
}

export function accountFileView(item = {}, product = {}) {
  const handle = item.handle || product.handle || '';
  const workbench = product.workbench || {};
  return {
    handle,
    title: product.title || titleFromHandle(handle),
    filename: workbench.filename || filenameFromHandle(handle),
    folder: workbench.folder || product.productType || 'Unsorted',
    thumbnail: product.thumbnail || product.image || '',
    access: accessLabel(item),
    sync: item.membership ? 'Automatic' : 'Manual',
    installedAt: item.lastInstalledAt || '',
    addedAt: item.purchasedAt || '',
    modifiedAt: item.lastInstalledAt || item.purchasedAt || workbench.modifiedAt || '',
    kind: workbench.kind || product.productType || 'NO3D asset',
    summary: workbench.summary || product.description || 'Available through this account library.',
    action: accountFileAction(item),
  };
}

export function accountFileFolders(files = []) {
  const counts = new Map();
  for (const file of files) counts.set(file.folder, (counts.get(file.folder) || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterAccountFiles(files = [], { folder = '', term = '', sort = 'newest' } = {}) {
  const query = term.trim().toLowerCase();
  const visible = files.filter(file => (!folder || file.folder === folder) && (!query || [
    file.filename,
    file.title,
    file.folder,
    file.access,
    file.kind,
  ].join(' ').toLowerCase().includes(query)));
  return visible.sort((a, b) => {
    if (sort === 'name') return a.filename.localeCompare(b.filename);
    if (sort === 'access') return a.access.localeCompare(b.access) || a.filename.localeCompare(b.filename);
    return new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0) || a.filename.localeCompare(b.filename);
  });
}
