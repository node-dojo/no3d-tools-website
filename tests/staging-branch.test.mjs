import assert from 'node:assert/strict';
import test from 'node:test';
import { stagingBranch } from '../scripts/lib/staging-branch.mjs';

test('staging sync requires one explicit branch before any remote environment mutation', () => {
  for (const args of [[], ['--apply'], ['--branch'], ['--branch', '--apply'],
    ['--branch=a', '--branch=b'], ['--branch', 'a', '--branch=b']]) {
    assert.throws(() => stagingBranch(args));
  }
});

test('staging sync accepts explicit literal branch names', () => {
  assert.equal(stagingBranch(['--apply', '--branch', 'codex/preview']), 'codex/preview');
  assert.equal(stagingBranch(['--branch=release/v3', '--apply']), 'release/v3');
});

test('staging sync rejects invalid names and checkout shorthand', () => {
  for (const branch of ['@{-1}', 'HEAD', 'bad..ref', 'bad ref', '-flag', 'bad~ref']) {
    assert.throws(() => stagingBranch(['--branch', branch]));
  }
});
