# Prints release — 2026-11-02

Joe authorized publishing the reviewed Prints changes. The release adds the
borderless included-part viewers, free-standing Spike Planter parts, active
gallery video autoplay/loop with hidden controls, revised private packages,
and the previously reviewed focused product pages and creator subheading.
The outdated Mace print-bed montage is removed from the gallery.

## Published source

- Source: `bb84d05fe2c86f4654020e0a65a4081b8ae04808`, from the scoped
  `codex/product-landing-pages` checkout at `/Users/joebowers/Projects/no3d-tools-prints`.
- Customer production project: `no3dtoolssite`.
- Production deployment: `dpl_596cCkrkRKFk5pdXK33wzXC53oxn`;
  https://no3dtoolssite-clt7qjpkm-node-dojos-projects.vercel.app.
- Verified canonical host: https://no3dtools.com/v3/prints/.
- Campaign pages: https://no3dtools.com/p/mace-and-chain and
  https://no3dtools.com/p/spike-planter-01.
- Rollback: `dpl_2yN1fDcLQ4M9F522y5dvsayCUavn`, source `ba92034`;
  https://no3dtoolssite-3exi7f38t-node-dojos-projects.vercel.app.

Both revised ZIPs were uploaded to new immutable private R2 keys, then read
back in full with matching size and SHA-256 before the release. Mace contains
exactly the three approved STLs. Spike Planter contains five STLs, the original
wall-mounted Bambu Studio 3MF, and the units note. Both members and permanent
owners resolve the new delivery manifest. Prior package objects remain intact.
Package details are in `prints-live-20261102.json` and the design revision notes.

## Verification

- 195 unit/contract tests passed. V3, Prints, viewer and campaign browser checks
  passed. Viewer checks include actual WebGL/pixel changes, touch rotation versus
  page scrolling, pinch/zoom, focus/escape nesting, failure fallback and disposal.
- The first hosted build rejected a query-string import in the catalog module
  shared by browser and Edge share previews. A plain, revalidating catalog
  import fixed bundling; unit and campaign checks were repeated and both hosted
  staging and production builds passed.
- Dedicated staging project `no3d-tools-staging`, deployment
  `dpl_FhXoc46QajeVTungUuf2ieKKbPrb`, served the exact release. The earlier
  branch-scoped Preview was a build check only; it was not promoted to production.
- Both real Stripe sandbox purchases reached paid/fulfilled, delivered the
  full checksum-verified revised ZIPs, appeared in Account / Prints, and
  remained downloadable after fresh-browser UI sign-in. Full refunds revoked
  order and product downloads. Member price treatment and direct downloads
  skipped checkout; direct charge attempts for members returned 409.
- Independent Stripe and Commerce database readback confirmed both refunds,
  paid/refunded amounts, revoked fulfillment and revoked entitlements.
  The staging account's membership fixture was restored.
- After promotion, 27 public HTML/JS/CSS/font/mesh assets matched release
  source hashes. All eight part previews rendered, rotated and enlarged on
  public desktop/mobile views. Videos actually played and looped with controls
  hidden, and paused when inactive. Both campaign pages rendered. No page
  errors or horizontal overflow were found.
- Public Commerce still reports live mode and both offers are $11.11 USD.
  Anonymous downloads return 403. The three checked Tools entry/controller
  files are unchanged and match production. Campaign social metadata works.

Evidence: `prints-live-20261102.json`, `prints-sandbox-20261102.json`, and
`prints-independent-readback-20261102.json`. Public browser screenshots are
under `/tmp/no3d-prints-live-20261102/`.

No live charge was made. Signup/inbox delivery were outside this release's
changed scope. Mobile checks are browser emulation, not physical iPhone/Safari
acceptance. Free-standing geometry has not been physically print/thread-fit
tested. The inherited dependency audit remains nine advisories (4 low,
1 moderate, 4 high); no dependency upgrade is included. The canonical
integration checkout's separate price work and dirty files were preserved.

This receipt is a documentation follow-up; deployed application source is the
commit identified above.
