import assert from 'node:assert/strict';
import test from 'node:test';

import { accountFileFolders, accountFileView, filterAccountFiles, mergeEffectiveAccountLibrary, projectScopedMembershipCatalog } from '../v3/js/account-library.js';
import { PRODUCT_PREVIEW_FALLBACK, resolveProductPreview } from '../v3/js/product-preview.js';

const catalog = {
  handle: 'dojo-bolt-gen-v05-obj',
  title: 'Dojo Bolt Gen V05 Obj',
  productType: 'Geometry Nodes',
  thumbnail: '/bolt.png',
  workbench: {
    filename: 'Dojo_Bolt_Gen_V05_Obj.no3d',
    folder: 'Hardware',
    kind: 'Object edition',
    summary: 'A ready-to-use bolt generator.',
    modifiedAt: '2026-08-20T00:00:00Z',
  },
};

test('product previews prefer thumbnails and preserve the pixel folder fallback', () => {
  assert.deepEqual(resolveProductPreview({ title: 'Bolt', thumbnail: '/bolt.png', image: '/hero.png' }), {
    alt: 'Bolt thumbnail',
    fallback: false,
    src: '/bolt.png',
  });
  assert.deepEqual(resolveProductPreview({ title: 'No image' }), {
    alt: '',
    fallback: true,
    src: PRODUCT_PREVIEW_FALLBACK,
  });
});

test('My Folder view is derived only from an effective account-library item and catalog metadata', () => {
  const file = accountFileView({
    handle: catalog.handle,
    owned: true,
    permanent: true,
    orderId: '11111111-1111-4111-8111-111111111111',
    purchasedAt: '2026-08-01T00:00:00Z',
    lastInstalledAt: '2026-08-21T00:00:00Z',
  }, catalog);
  assert.equal(file.filename, 'Dojo_Bolt_Gen_V05_Obj.no3d');
  assert.equal(file.folder, 'Hardware');
  assert.equal(file.access, 'Permanent access');
  assert.equal(file.sync, 'Manual');
  assert.equal(file.action.label, 'Download →');
  assert.match(file.action.href, /^\/api\/commerce\/download\//);
  assert.equal('selected' in file, false);
  assert.equal('inFile' in file, false);
});

test('scoped membership projects the authored collection instead of every catalog row', () => {
  const catalog = new Map([
    ['existing', { handle: 'existing', title: 'Existing', releaseStatus: 'active' }],
    ['unrelated', { handle: 'unrelated', title: 'Unrelated', releaseStatus: 'active' }],
  ]);
  const result = projectScopedMembershipCatalog(catalog, [{ products: [
    { handle: 'existing', title: 'Existing' },
    { handle: 'manifest-only', title: 'Manifest Only', image: '/manifest-only.png' },
  ] }]);

  assert.deepEqual(result.records.map(item => item.handle), ['existing', 'manifest-only']);
  assert.equal(result.records.some(item => item.handle === 'unrelated'), false);
  assert.equal(result.catalog.get('manifest-only').workbench.filename, 'manifest_only.no3d');
  assert.equal(result.catalog.get('manifest-only').thumbnail, '/manifest-only.png');
});

test('membership, free, and purchased assets remain one grouped effective library', () => {
  const files = [
    accountFileView({ handle: 'free-tool', free: true, owned: true }, { productType: 'Utilities' }),
    accountFileView({ handle: 'member-tool', membership: true, owned: true }, { productType: 'Utilities' }),
    accountFileView({ handle: catalog.handle, permanent: true, owned: true }, catalog),
  ];
  assert.deepEqual(accountFileFolders(files), [
    { name: 'Hardware', count: 1 },
    { name: 'Utilities', count: 2 },
  ]);
  assert.equal(files.find(file => file.handle === 'free-tool').action.label, 'Available via Add-on →');
  assert.equal(files.find(file => file.handle === 'member-tool').sync, 'Automatic');
});

test('revoked records remain legible without exposing a download action', () => {
  const file = accountFileView({
    handle: catalog.handle,
    owned: false,
    permanent: true,
    entitlementStatus: 'revoked',
    orderId: '11111111-1111-4111-8111-111111111111',
  }, catalog);
  assert.equal(file.access, 'Access revoked');
  assert.equal(file.action.label, 'Access status →');
  assert.match(file.action.href, /^\/v3\/product\//);
  assert.doesNotMatch(file.action.href, /download/);
});

test('an active purchase outranks a later revoked duplicate without inheriting its unsafe order', () => {
  const records = mergeEffectiveAccountLibrary([
    {
      handle: catalog.handle,
      owned: true,
      permanent: true,
      paymentStatus: 'paid',
      orderId: '11111111-1111-4111-8111-111111111111',
      purchasedAt: '2026-08-01T00:00:00Z',
      lastInstalledAt: '2026-08-20T00:00:00Z',
    },
    {
      handle: catalog.handle,
      owned: false,
      permanent: true,
      paymentStatus: 'refunded',
      orderId: '22222222-2222-4222-8222-222222222222',
      purchasedAt: '2026-08-15T00:00:00Z',
      lastInstalledAt: '2026-08-21T00:00:00Z',
    },
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].owned, true);
  assert.equal(records[0].permanent, true);
  assert.equal(records[0].paymentStatus, 'paid');
  assert.equal(records[0].orderId, '11111111-1111-4111-8111-111111111111');
  assert.equal(records[0].lastInstalledAt, '2026-08-21T00:00:00Z');
  assert.equal(records[0].purchasedAt, '2026-08-15T00:00:00Z');
  assert.match(accountFileView(records[0], catalog).action.href, /11111111-1111-4111-8111-111111111111/);
});

test('permanent purchase and membership duplicates become one combined effective file', () => {
  const [record] = mergeEffectiveAccountLibrary([
    { handle: catalog.handle, owned: true, permanent: true, orderId: '11111111-1111-4111-8111-111111111111' },
    { handle: catalog.handle, owned: true, membership: true },
  ]);
  assert.equal(record.owned, true);
  assert.equal(record.permanent, true);
  assert.equal(record.membership, true);
  assert.equal(record.orderId, '11111111-1111-4111-8111-111111111111');
  const file = accountFileView(record, catalog);
  assert.equal(file.access, 'Membership + permanent');
  assert.equal(file.sync, 'Automatic');
  assert.match(file.action.href, /^\/api\/commerce\/download\//);
});

test('all-revoked duplicates retain one safe status row', () => {
  const records = mergeEffectiveAccountLibrary([
    { handle: catalog.handle, owned: false, entitlementStatus: 'revoked', orderId: '11111111-1111-4111-8111-111111111111' },
    { handle: catalog.handle, owned: false, paymentStatus: 'refunded', orderId: '22222222-2222-4222-8222-222222222222' },
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].owned, false);
  const file = accountFileView(records[0], catalog);
  assert.match(file.access, /revoked|refunded/i);
  assert.equal(file.action.label, 'Access status →');
  assert.match(file.action.href, /^\/v3\/product\//);
  assert.doesNotMatch(file.action.href, /download/);
});

test('directory filtering and sorting operate on the view without changing entitlement membership', () => {
  const files = [
    accountFileView({ handle: 'older-tool', owned: true, permanent: true, purchasedAt: '2026-01-01' }, { productType: 'Utilities' }),
    accountFileView({ handle: 'newer-tool', owned: true, permanent: true, purchasedAt: '2026-08-01' }, { productType: 'Utilities' }),
    accountFileView({ handle: 'other-tool', free: true, owned: true }, { productType: 'Hardware' }),
  ];
  const visible = filterAccountFiles(files, { folder: 'Utilities', term: 'tool', sort: 'newest' });
  assert.deepEqual(visible.map(file => file.handle), ['newer-tool', 'older-tool']);
  assert.equal(files.length, 3);
});
