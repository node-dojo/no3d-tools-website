import { spawnSync } from 'node:child_process';

// Never infer a remote environment destination from the current checkout.
export function stagingBranch(args) {
  const options = args.filter(arg => arg === '--branch' || arg.startsWith('--branch='));
  if (options.length !== 1) throw new Error('Specify exactly one --branch <preview-branch>.');
  const option = options[0];
  const branch = option === '--branch' ? args[args.indexOf(option) + 1] : option.slice(9);
  if (!branch || branch.startsWith('-') || branch.startsWith('@') || branch === 'HEAD') {
    throw new Error('A literal preview branch name is required.');
  }
  const result = spawnSync('git', ['check-ref-format', '--branch', branch], { stdio: 'ignore' });
  if (result.status !== 0) throw new Error('Invalid preview branch name.');
  return branch;
}
