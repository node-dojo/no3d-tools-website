# V3 adjacent preview and release runbook

## Current boundary

V3 remains isolated under `/v3` on branch `feat/v3-adjacent`, and existing production entry routes remain unchanged. Home 02D and paid Product Detail 04D were the first visual gate; the active gate is now the end-to-end customer core documented in [`V3-END-TO-END-RELEASE.md`](./V3-END-TO-END-RELEASE.md).

## Preview sequence

1. Run `npm test`, `npm run acceptance:v3`, and `npm audit` locally.
2. Deploy this branch as a Vercel preview, never as a production deployment.
3. Verify `/v3/` and `/v3/product/?handle=dojo-bolt-gen-v05-obj` on the preview domain.
4. Exercise catalog loading, populated, empty, and failure states with representative records.
5. Exercise checkout only in the configured test environment. Confirm the return target stays on the preview domain and that no live charge can be created.
6. Review 390px mobile, a larger phone, tablet, and desktop widths before approval.

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

## Rollback

Rollback is the inverse routing change: restore the legacy entry routes while leaving the V3 code and API contracts untouched. Because V3 has no independent data model, rollback does not require catalog, entitlement, order, or customer-data migration.

Rollback immediately for checkout failure, broken return targets, catalog failure, or a material mobile layout failure. Visual imperfections that do not affect access or purchase can be repaired in the next V3 patch.

## Deferred tranche

Account 01C, Product 04F / Chain Generator, the type specimen, order recovery, authenticated libraries, and owned downloads remain documented and preserved, but are not approval criteria for this first adjacent release.
