# V3 release runbook

## Canonical branch — 2026-10-02

`main` is the canonical website integration branch. The consolidated V3
history was advanced by fast-forward; no historical commits were rewritten.
Use the checkout and recovery map in
[repository workflow](../development/REPOSITORY-WORKFLOW.md).

The old `feat/v3-adjacent` branch originally held V3 beside the legacy site.
Its branch name is now historical. A branch promotion is not a production
release: Preview verification and explicit production promotion remain
separate steps.

For branch-scoped staging variables, provide the actual Preview branch to
`npm run env:v3:staging -- --apply --branch <preview-branch>`. Do not assume
variables configured for a historical branch apply to a new candidate.

## Preview sequence

1. Run `npm test`, `npm run acceptance:v3`, and `npm audit` locally.
2. Deploy the candidate as a Vercel Preview and verify the candidate there.
3. Verify `/v3/` and `/v3/product/?handle=dojo-bolt-gen-v05-obj` on the preview domain.
4. Exercise catalog loading, populated, empty, and failure states with representative records.
5. Exercise checkout only in the configured test environment. Confirm the return target stays on the preview domain and that no live charge can be created.
6. Review 390px mobile, a larger phone, tablet, and desktop widths before approval.

## Production sequence

1. Confirm the exact reviewed commit is present on `origin/main`.
2. Deploy that clean commit to the existing `no3dtoolssite` Production target;
   never deploy unrelated working-tree changes.
3. Verify the Production deployment is Ready and that `no3dtools.com` resolves
   to it.
4. Read back the changed static modules or API contracts from the live domain
   and compare them with the committed bytes.
5. Verify the affected rendered customer surface. Keep any authentication-gated
   or transaction-dependent acceptance explicitly separate from public read-back.

## Promotion gate

Production promotion requires all of the following:

- Approved visual comparison against the canon and the later mobile decisions
- Home loading, populated, empty, and error states verified
- Paid product loading, resolved, unavailable, individual-checkout-disabled, checkout-success, and checkout-failure states verified
- Keyboard navigation, visible focus, semantic labels, reduced-motion behavior, and no horizontal overflow verified
- Current catalog and individual-product Commerce contracts unchanged or explicitly migrated
- Analytics and error monitoring confirmed on preview
- A named rollback owner and a short observation window selected

## Cutover

Keep the V3 implementation intact and change routing in one small release. Prefer a server-side rewrite or a single entry-route switch over copying V3 markup into the legacy pages. Preserve `/v3` for one release as a diagnostic route unless doing so creates duplicate-indexing risk; if retained, mark it non-canonical.

Do not delete legacy pages during the cutover release.

The root switch is controlled by `V3_PRODUCTION_LAUNCH`. It is unset (or any
value other than `1`, `true`, `yes`, `on`, or `enabled`) by default, so the
legacy production root remains active. An explicit production environment
change to `V3_PRODUCTION_LAUNCH=true` makes `/` redirect to `/v3/`; `/v3/*`
and all legacy files/routes remain available for diagnosis and rollback. This
flag is separate from `V3_ACCESS_MODE`, which continues to control the V3
owner gate. Owner-gated staging also continues to route `/` into `/v3/`, so
the existing private staging entry does not require the production flag.

## Rollback

Rollback is the inverse environment change: unset `V3_PRODUCTION_LAUNCH` (or
set it to `false`) to restore the legacy root while leaving the V3 code and API
contracts untouched. Because V3 has no independent data model, rollback does
not require catalog, entitlement, order, or customer-data migration.

Rollback immediately for checkout failure, broken return targets, catalog failure, or a material mobile layout failure. Visual imperfections that do not affect access or purchase can be repaired in the next V3 patch.

## Deferred tranche

Account 01C, Product 04F / Chain Generator, the type specimen, order recovery, authenticated libraries, and owned downloads remain documented and preserved, but are not approval criteria for this first adjacent release.

## Main and production deployment

GitHub's default branch and Vercel's configured production branch are both
`main`. `vercel.json` disables automatic Git deployments only for `main`, so
integration pushes do not publish production. Feature-branch Preview builds
remain enabled. Release a reviewed commit through the explicit Preview and
production sequence; changing this setting is a separate deployment-policy
change. This uses Vercel's documented
[`git.deploymentEnabled`](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)
configuration. Database state is unaffected by branch normalization.
