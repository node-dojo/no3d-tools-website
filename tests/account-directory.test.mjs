import assert from 'node:assert/strict';
import test from 'node:test';

import { accountFileFolders, accountFileView, filterAccountFiles } from '../v3/js/account-library.js';

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

test('My File view is derived only from an effective account-library item and catalog metadata', () => {
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
  assert.equal(file.action.label, 'Check for update →');
  assert.match(file.action.href, /^\/api\/commerce\/download\//);
  assert.equal('selected' in file, false);
  assert.equal('inFile' in file, false);
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
  assert.equal(files.find(file => file.handle === 'free-tool').action.label, 'Available in Blender →');
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
