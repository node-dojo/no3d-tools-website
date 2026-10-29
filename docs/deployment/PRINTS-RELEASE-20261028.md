# Prints release — 2026-10-28

Joe approved publishing the Prints iteration and directed NO3D Commerce checkout instead of Gumroad checkout.

## Scope

- Tools/Prints selector, two full-bleed photo slides, compact expanding sidebar, supplied backgrounds, corrected chevrons, smaller sidebar text and W mark.
- Slide-up product documents and photo/video galleries. The Gumroad listings supply the approved product text and media; checkout and price authority are NO3D Commerce and Stripe.
- Both products are $11.11 USD one-time downloads. Full-library members and existing owners download directly. Chrome-only membership does not grant Prints.
- Existing native checkout, order return, account library, ownership, refund and recovery APIs are reused. Account shows ZIP files in Prints. No Blender catalog or device manifest is populated with print files.
- Content-addressed private R2 ZIPs: 10 files for Mace (9 published STLs plus the existing local Bambu Studio assembly) and 4 for Planter. Package sizes and SHA-256 values were verified after upload. Staging and production share the existing R2 bucket; new keys do not overwrite existing assets.

## Verification

- 179 unit/contract tests passed.
- V3 browser acceptance passed eight routes at 390×844 and 1440×1100.
- Prints browser acceptance passed carousel/gallery, mobile/desktop, guest native checkout handoff, member/owner downloads, unavailable delivery and revocation scenarios.
- Deployed staging: `dpl_ExjX2eecApFMHKoAqV9CMwD4SD2V`. Both real Stripe sandbox purchases reached paid/fulfilled state, downloaded complete checksum-verified ZIPs, appeared in Account / Prints, and remained accessible after fresh-browser sign-in. Full test refunds revoked both order and print download access. Existing full-library members downloaded both products without checkout; direct attempts to charge them were rejected. See `prints-sandbox-20261028.json`.
- The staging owner account was used. Its legacy membership fixture rows were temporarily expired for purchaser scenarios and restored. Public signup, inbox verification and live payment are not tested by this receipt. Guest native checkout is covered locally and is checked without payment after production publication.
- The inherited dependency audit has 9 advisories (4 low, 1 moderate, 4 high in the Puppeteer development tree). No dependency upgrade is included.

## Source and deployment boundary

The feature checkout is `/Users/joebowers/Projects/no3d-tools-prints`, branch `codex/storefront-prints`, based on live `977dcaa9b97b566d698753bd1beb2b8bf01c8b18`. The canonical integration checkout contains separate unpublished price-projection work and dirty files; those are preserved and excluded from this release. Git-triggered deployments remain disabled for this release branch and main.

Previous production deployment for rollback: `dpl_4mXZMGeanXK6gNiPJ28XPkP29UvP` (`https://no3dtoolssite-3l1ik2xrd-node-dojos-projects.vercel.app`). Production publication/readback is appended after promotion.
