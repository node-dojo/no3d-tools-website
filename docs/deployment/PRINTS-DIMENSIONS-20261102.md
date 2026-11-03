# Spike Planter dimensions — 2026-11-02

Removed the Bambu Studio project note and replaced the nominal-size paragraph
with a compact table below the five STL previews. The catalog details and
standalone product page share the same table. Each row gives individual part
bounds as X × Y × Z in millimeters, rounded to 0.1 mm; these are not assembled
planter heights. Measurements come from the existing package manifest recorded
in `../design/v3/SPIKE-PLANTER-DOWNLOAD-REVISION.md`.

The millimeters/100% import instruction remains. Download files, the included
3MF project, media, prices, checkout and access behavior are unchanged.

## Release evidence

- Runtime source: `1b777cd` (implementation `3e37a75`).
- Preview: `dpl_D3kMR46pRZ3c79n5cX6U17JExZJP`.
- Production: `dpl_A34yrpzAQm2pxw2WdDW6nQ8v8U87`,
  https://no3dtoolssite-5yvfrev5h-node-dojos-projects.vercel.app.
- Canonical https://no3dtools.com readback confirms this deployment is Ready.
- Rollback: `dpl_AY667wd1QGS3XxxejrSeiZ5Gcxyv`,
  https://no3dtoolssite-jab2rrv8o-node-dojos-projects.vercel.app.
- 195 unit checks and existing V3, Prints and campaign acceptance passed.
- Local and live browser checks passed for catalog and campaign at 1440, 390
  and 320 pixels: exact five rows, removed prose, retained import instruction,
  no horizontal overflow and no page errors. Mobile checks use browser emulation.
- Nine changed public runtime files match local SHA-256 hashes.
- The existing dependency audit remains at nine advisories. No Commerce APIs
  changed, so no new financial transactions were performed for this copy/table
  change.

Readback and source hashes are in `prints-dimensions-live-20261102.json`.
Screenshots remain under `/tmp/no3d-dimensions-live/`. This documentation
follow-up does not alter the deployed runtime source.
