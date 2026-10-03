# Website repository guidance

Read `README.md`, then the route relevant to the task. Inspect `git status`
and the current branch before changing files.

## Checkout and Git

- Canonical local integration checkout: `/Users/joebowers/Projects/no3d-tools-website-v3`.
- Consolidated branch: `codex/site-cleanup-20261002`. See
  `docs/development/REPOSITORY-WORKFLOW.md` for preserved snapshots and pending work.
- Git history, local implementation, staged deployment, production deployment,
  and visual acceptance are separate claims. Verify the owning state.
- Other worktrees are historical or scoped work. Preserve their unique changes
  before retiring them. Never overwrite another worktree to make status clean.
- Keep source work in focused commits. Production publishing is a separate operation.

## Routes

- Visual or interaction changes: `docs/design/v3/README.md`, then the named Vault canon.
- Current customer behavior and compatibility: `docs/deployment/current-vs-retired.json`.
- Release acceptance: `docs/deployment/V3-END-TO-END-RELEASE.md`.
- Analytics: `docs/deployment/V3-ANALYTICS-OPERATIONS.md`.
- SOLVET publishing or Commerce service changes: read that owning repository's
  instructions before changing its source or operational state.

## Verification

Use Node 24 and `npm ci`. Run `npm test` for all local unit/contract tests,
`npm run acceptance:v3` for local browser checks, and `npm audit` for dependency
health. Run analytics or editor acceptance when touching those paths. Live
lifecycle scripts have separate target/configuration requirements; do not
substitute local fixture results for deployed acceptance.

Never print or commit credentials. Keep local environment and provider-link
files ignored. Legacy API removal requires caller/version evidence.

## Creative process

A create action opens a place to begin creating. Defer names, categories,
descriptions, and destinations until intention or a real publishing or
ambiguity boundary requires them. Sequence interfaces around the creative
intention, rather than storage requirements.
