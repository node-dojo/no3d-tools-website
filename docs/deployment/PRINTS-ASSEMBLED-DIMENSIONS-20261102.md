# Assembled Planter dimensions — 2026-11-02

Replaced the five part rows with two assembled-version rows. Width, depth and
height occupy separate right-aligned columns with tabular numerals. The caption
identifies approximate assembled dimensions in millimeters, rounded to whole
millimeters. Both the catalog details and campaign page use the shared table.

Measurements and source/pose derivation are recorded in
`../design/v3/planter-assembled-dimensions.json`. The wall version measures the
planter facing the wall, rather than its rotated print-bed bounding box. The
standing version uses its original assembly pose before the body and tray were
separated for STL export. These are mesh-derived dimensions; physical printed
dimensions were not measured. No source geometry or download package changed.

## Release

- Runtime source: `f68cdec`, based on the prior live `0880438` release line.
- Preview: `dpl_JCbEqnN9au2ykyypyuGURbQeJLQR`.
- Production: `dpl_BSEUaDDVHgdN5gupGzoJsmLdn1yS`,
  https://no3dtoolssite-1pzzs7n77-node-dojos-projects.vercel.app.
- Canonical https://no3dtools.com readback confirms Ready on this deployment.
- Rollback: `dpl_A34yrpzAQm2pxw2WdDW6nQ8v8U87`,
  https://no3dtoolssite-5yvfrev5h-node-dojos-projects.vercel.app.
- 195 unit tests, eight-route V3 acceptance, Prints acceptance, and campaign
  acceptance passed. Existing audit: nine advisories, unchanged dependencies.
- Local and live catalog/campaign checks passed at 1440, 390 and 320px: two
  exact rows, vertically aligned numeric columns, no horizontal overflow, no
  removed Bambu/nominal-size notes and no page errors. Mobile checks use browser
  emulation. Eight changed public runtime files match local SHA-256 hashes.
- Live evidence: `prints-assembled-dimensions-live-20261102.json`;
  screenshots: `/tmp/no3d-assembled-live/`.

The release checkout is `no3d-prints-assembled-dimensions` on
`codex/prints-assembled-dimensions`, isolated because concurrent unpublished
product naming/draft work existed in `no3d-tools-prints`. That unpublished work
is excluded from this production release. The table change was also
cherry-picked into the existing local Prints checkout (`a923113`) so future
work retains it. Payment and delivery APIs are unchanged.
