# Lighter Keeper share link — 2026-11-08

Historical first release. Superseded by
[Lighter Keeper URL and preview](LIGHTER-KEEPER-URL-PREVIEW-20261108.md).

Public URL: https://no3dtools.com/lighter

`/lighter` and `/lighter/` permanently redirect (308) to `/p/mace-and-chain`.
Query parameters are preserved. The existing product handle, canonical URL,
offers, entitlements, and downloads retain their identities.

- Deployed source: `d058f4c` on `codex/prints-account-free-20261107`.
- Production deployment: `dpl_Gyd9b4Joxhwgv5oxStT4APrbyW4a`.
- Deployment URL: https://no3dtoolssite-9xzeu2i6a-node-dojos-projects.vercel.app
- Rollback deployment: `dpl_3zdCGveAoUnnBdYBLcJVuMBB9y4r`.

Validation: Node 24, npm ci, 205 unit/contract tests, V3 browser acceptance
(8 routes at 390×844 and 1440×1100), production build, and diff checks passed.
Dependency audit remains at the existing 9 findings (4 low, 1 moderate,
4 high, 0 critical); this release changes no dependencies.

Both the protected candidate and public domain were checked for the bare
link, trailing slash, and Instagram UTM query preservation. Mobile and desktop
browser checks reached The Lighter Keeper 01 with the current price,
sketchbook access, no horizontal overflow, and no page errors. Requests using
Facebook, Twitter, and WhatsApp crawler user agents returned the product title,
canonical URL, and a reachable product preview image. Actual posting/unfurling
inside those services and physical iPhone acceptance were not performed.

Public readback: `lighter-share-link-live-20261108.json`.
