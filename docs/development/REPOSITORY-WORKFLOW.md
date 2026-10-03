# Repository workflow

Local consolidation recorded 2026-10-02. This is a checkout map, not a live
release receipt.

## One integration checkout

Use `/Users/joebowers/Projects/no3d-tools-website-v3` on
`codex/site-cleanup-20261002`. Its base includes `fix/commerce-rollout` at
`c578592` and the 19 finalization commits through `9e72e70`.

The old `feat/v3-adjacent` working state contained copies of 57 files already
committed on finalization. Consolidation kept that history and separately
preserved the 18 differing/new files, merging overlapping payment fixes.

Remote branches and deployment settings are unchanged. Before proposing a
release, compare the candidate against the actual deployed revision and run
the appropriate target-specific lifecycle gates. Do not assume local `main`
represents production.

## Recovery

Original tracked modifications and untracked source files were archived with
SHA-256 manifests in `/Users/joebowers/Projects/no3d-cleanup-recovery-20261002`.
Ignored credentials were excluded from source snapshots.

| Preserved branch | Original work |
| --- | --- |
| `codex/archive-site-local-20261002` | Complete old website working state |
| `codex/archive-commerce-local-20261002` | Account docs and pricing/journey guards, integrated into cleanup |
| `codex/archive-purchase-alerts-20261002` | Unfinished purchase-incident SQL migration, intentionally separate |

Recover source with `git show <branch>:<path>` or create a new worktree from
the preserved branch. Do not reset the integration checkout to a snapshot.

## Retained and retired worktrees

The idle analytics and detached staging worktrees were retired after their
commits were confirmed ancestors of integration. Their ignored Vercel/link
metadata is preserved under the recovery directory's protected `local-metadata/`
folder. Reproducible dependencies and OS cache files were removed with them.

The Commerce worktree remains available because a process was using it during
cleanup; its source changes are committed and integrated. The purchase-alert
worktree remains for the unfinished migration. These are scoped exceptions,
not alternative integration checkouts. The original Git administration entry
also remains. Use `git worktree list` for the live inventory.

## Pending work with its own boundary

The purchase-alert migration changes notification channels and introduces
incident storage. No matching incident caller was found in its original
checkout. It remains on its preserved branch/worktree for implementation,
SQL review, and target-specific acceptance. Consolidation does not mark it
ready or apply it to a database.

The primary Git administration directory is nested in the older SOLVET
repository under `.git/modules/no3d-tools-website`. Leave that directory in
place: the linked worktrees depend on it. Moving Git administration out of
Dropbox is a separate repository migration, not ordinary worktree pruning.

## Validation and hygiene

- `npm test`: discovers every `tests/*.test.mjs`; focused commands remain for iteration.
- `npm run acceptance:v3`: local desktop/mobile fixtures.
- `npm run acceptance:analytics`: local synthetic ingestion fixtures.
- `npm run acceptance:site-editor`: temporary source library and local publisher;
  requires the adjacent SOLVET content module.
- `npm audit`: dependency advisory check.
- `npm run build`: writes generated collections and root deployment metadata;
  validate in a disposable checkout to avoid source churn.

SQL tests and live auth/payment/device/recovery checks require their documented
separate environments. The ordinary unit suite has no production credentials.

Retire worktrees only after checking Git status, ignored configuration, and
active consumers. Preserve provider-link metadata before removal and keep
unique pending work. Keep old branches as provenance until remote/release
normalization is explicitly undertaken.
