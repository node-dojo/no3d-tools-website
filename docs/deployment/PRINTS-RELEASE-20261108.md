# Prints layout and sketchbooks — 2026-11-08

Joe authorized implementation and publication of the new Prints layout and
sketchbook experience. The release is live at https://no3dtools.com/v3/prints/.
The permanent host replaces the temporary Cloudflare testing link.

## Published source

- Application source: `58ad077fe02a738b4d04d43fbab0d42056359102` from
  `codex/prints-account-free-20261107` in
  `/Users/joebowers/Projects/no3d-tools-prints`.
- Production project: `no3dtoolssite`, deployment
  `dpl_3zdCGveAoUnnBdYBLcJVuMBB9y4r`,
  https://no3dtoolssite-qot7rhayg-node-dojos-projects.vercel.app.
- Built with `--prod --skip-domain`, verified on its protected deployment URL,
  then promoted. Existing automation bypass was used only in memory; project
  protection settings were unchanged.
- Canonical host was independently inspected after promotion and resolves to
  that Ready deployment. The deployed source metadata and 73 public asset
  hashes were checked. The public root redirects to the verified V3 entry.
- Rollback: `dpl_9fiZ2mojmct77zVhX6sS7xQPsvok`, source
  `69d480a7e9b0d5ab79a5ad61168515ad3b573c8d`,
  https://no3dtoolssite-58gj5z5bt-node-dojos-projects.vercel.app.

The previous production planter proximity video and portrait-media fit fix
were merged into this release before building. Unrelated canonical integration
checkout work was preserved. Subsequent commits contain acceptance-test and
release-documentation changes only; the application source above remains the
published artifact.

## Behavior

- Full-bleed Prints catalog with revised product information, truncated
  description preview, reduced hairlines, and the plus/book entry control.
- The selected book slides up from below the viewport, eases to the center
  as a closed book, and floats over the stationary product background.
- Horizontal page turning, simultaneous pinch/zoom/pan, reactive tilt,
  drag-offscreen dismissal, corner close, Escape and focus restoration.
  The bottom-edge pull gesture remains available.
- Spike Planter uses its new baked artwork and product-specific book. Lighter
  Keeper uses its existing book. Switching products resets page and zoom state.
- After product selection and hero readiness, the selected book warms with
  bounded caching and limited download concurrency. The GPU renderer remains
  lazy. The closed-cover poster appears immediately; delayed accessible loading
  dots appear only if readiness takes longer. Errors expose retry, and stale
  product loads are canceled.
- Existing catalog download/access branches are retained through a shared
  action helper. Payment backend, product delivery keys and prices are unchanged.

## Verification

- Isolated dependency installation and build passed; 205 unit/contract tests
  passed. V3, Prints, landing pages, media and sketchbook browser suites passed
  locally. Acquisition fixtures covered guest, member, owner, unavailable and
  revoked access on catalog and detail surfaces.
- Protected candidate and public canonical host passed sketchbook interaction
  and product-switching suites. Checks include actual WebGL pixels, transparent
  surround, cold-load entrance, closed centered cover on reopening, loading
  feedback, page turns, pinch isolation, vertical dismissal, zoomed offscreen
  pan, nested details, standalone pages, wheel, keyboard, stale-load cancellation
  and failed-load retry.
- Public readback verified 73 assets, seven routes, both compressed manifests
  and representative pose chunks, unchanged Tools entry/controller assets,
  both live offers at $11.11 USD, and anonymous download rejection with 403.
- Public media acceptance passed 36 checks across eight product/catalog/landing
  desktop/mobile views, including actual video playback, looping, hidden
  controls, inactive pause and portrait fitting. Four additional catalog views
  verified both layouts and closed books at mobile and desktop widths, with no
  horizontal overflow or page errors. Public screenshots were visually reviewed.
- The long hosted headless test dropped CDP touch events after navigating away
  from a scrolled modal; capture listeners confirmed events never reached the
  new document. Independent journeys now use fresh page targets with the same
  assertions. Standalone navigation waits for the actual sketchbook control
  instead of all network traffic: two background `/api/track` requests remained
  pending on production after the interactive page was ready.

Evidence is saved in `prints-live-20261108.json`. Screenshots are under
`/tmp/no3d-prints-live-visual/` and `/tmp/no3d-prints-live-media/`.

No live charge was made. This release did not rerun a real payment/fulfillment
lifecycle; those branches were fixture-tested and public price/access were
checked read-only. Mobile testing used Chromium touch emulation; physical
iPhone/Safari acceptance remains with Joe. The inherited dependency audit is
nine advisories (4 low, 1 moderate, 4 high); dependency upgrades were outside
this release.
