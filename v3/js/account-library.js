const titleFromHandle = (handle = '') => String(handle)
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, character => character.toUpperCase());

const filenameFromHandle = (handle = '') => `${String(handle)
  .replace(/\.no3d$/i, '')
  .replace(/[-\s]+/g, '_')}.no3d`;

export function readableHandle(handle = '') {
  return titleFromHandle(handle);
}

export function projectScopedMembershipCatalog(catalog = new Map(), collections = []) {
  const projectedCatalog = new Map(catalog);
  const records = [];
  for (const collection of collections) {
    for (const product of collection?.products || []) {
      const handle = String(product?.handle || '').trim();
      if (!handle) continue;
      if (!projectedCatalog.has(handle)) {
        projectedCatalog.set(handle, {
          handle,
          title: product.title || titleFromHandle(handle),
          thumbnail: product.image || '',
          image: product.image || '',
          releaseStatus: 'active',
          accessPolicy: 'paid',
          workbench: {
            filename: filenameFromHandle(handle),
            folder: 'Blender',
            kind: 'NO3D asset',
            summary: `${product.title || titleFromHandle(handle)} is available through this collection.`,
          },
        });
      }
      records.push({ handle, membership: true, owned: true, permanent: false });
    }
  }
  return { catalog: projectedCatalog, records };
}

const isRevokedRecord = (item = {}) => ['refunded', 'disputed'].includes(item.paymentStatus) ||
  item.entitlementStatus === 'revoked' || item.owned === false;

const hasEffectiveAccess = (item = {}) => !isRevokedRecord(item) && Boolean(
  item.owned === true || item.free || item.membership || item.permanent,
);

const timestamp = value => {
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? 0 : parsed;
};

const latestValue = (items, keys) => items
  .flatMap(item => keys.map(key => item[key]).filter(Boolean))
  .sort((a, b) => timestamp(b) - timestamp(a))[0] || '';

const accessRank = item => (
  (item.orderId && item.permanent ? 32 : 0) +
  (item.orderId ? 16 : 0) +
  (item.permanent ? 8 : 0) +
  (item.membership ? 4 : 0) +
  (item.free ? 2 : 0) +
  (item.owned === true ? 1 : 0)
);

const strongestRecord = items => [...items].sort((a, b) =>
  accessRank(b) - accessRank(a) ||
  timestamp(b.lastInstalledAt || b.purchasedAt || b.addedAt) - timestamp(a.lastInstalledAt || a.purchasedAt || a.addedAt),
)[0];

/**
 * Collapse Commerce entitlement history to one effective library file per
 * asset. This is a read projection only: it does not create a second library
 * store or replace Commerce as the access authority.
 */
export function mergeEffectiveAccountLibrary(records = []) {
  const grouped = new Map();
  for (const record of records) {
    const handle = String(record?.handle || '').trim();
    if (!handle) continue;
    if (!grouped.has(handle)) grouped.set(handle, []);
    grouped.get(handle).push(record);
  }

  return [...grouped.entries()].map(([handle, duplicates]) => {
    const effective = duplicates.filter(hasEffectiveAccess);
    const installedAt = latestValue(duplicates, ['lastInstalledAt', 'installedAt']);
    const addedAt = latestValue(duplicates, ['purchasedAt', 'addedAt']);

    if (effective.length) {
      const base = strongestRecord(effective);
      const activeOrder = strongestRecord(effective.filter(item => item.orderId));
      const merged = {
        ...base,
        handle,
        owned: true,
        free: effective.some(item => item.free === true),
        membership: effective.some(item => item.membership === true),
        permanent: effective.some(item => item.permanent === true),
      };
      if (activeOrder?.orderId) merged.orderId = activeOrder.orderId;
      else delete merged.orderId;
      if (activeOrder?.paymentStatus) merged.paymentStatus = activeOrder.paymentStatus;
      else if (isRevokedRecord(merged)) delete merged.paymentStatus;
      if (merged.entitlementStatus === 'revoked') delete merged.entitlementStatus;
      if (installedAt) merged.lastInstalledAt = installedAt;
      if (addedAt) {
        merged.purchasedAt = addedAt;
        merged.addedAt = addedAt;
      }
      return merged;
    }

    const revoked = strongestRecord(duplicates);
    const merged = { ...revoked, handle, owned: false };
    if (!isRevokedRecord(merged)) merged.entitlementStatus = 'revoked';
    if (installedAt) merged.lastInstalledAt = installedAt;
    if (addedAt) {
      merged.purchasedAt = addedAt;
      merged.addedAt = addedAt;
    }
    return merged;
  });
}

export function accessLabel(item = {}) {
  if (item.paymentStatus === 'refunded') return 'Refunded / access removed';
  if (isRevokedRecord(item)) return 'Access revoked';
  if (item.free) return 'Free tool';
  if (item.membership && item.permanent) return 'Membership + permanent';
  if (item.membership) return 'Membership access';
  return item.permanent ? 'Permanent access' : 'Membership access';
}

export function accountFileAction(item = {}) {
  if (isRevokedRecord(item)) {
    return {
      href: `/v3/product/?handle=${encodeURIComponent(item.handle || '')}`,
      label: 'Access status →',
    };
  }
  if (item.free || (item.membership && !item.permanent)) {
    return { href: '/v3/account/?state=install', label: 'Available via Add-on →' };
  }
  if (item.orderId) {
    return {
      href: `/api/commerce/download/${encodeURIComponent(item.orderId)}`,
      label: 'Download →',
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
    downloadedAt: item.lastDownloadedAt || item.downloadedAt || '',
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
