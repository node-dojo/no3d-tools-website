# Prints carousel media — 2026-11-02

Joe supplied `/Users/joebowers/Downloads/add to product media files` for the
product carousels, then chose to keep the larger clips as videos instead of GIFs.
All six supplied files are represented in both the Prints catalog and focused
product pages. Existing media and download packages are preserved.

| Source | Product | Published format |
| --- | --- | --- |
| `mace assembly1.mov` | Mace and Chain | H.264 MP4, 29.8 seconds |
| `mace assembly1 (1).mov` | Mace and Chain | H.264 MP4, 12 seconds |
| `mace assembly1 (2).mov` | Mace and Chain | Looping GIF, 4.1 seconds |
| `IMG_3530.mov` | Mace and Chain | H.264 MP4, 10.4 seconds |
| `IMG_5220.mov` | Spike Planter | Looping GIF, 1.1 seconds |
| `keychain haft1.png` | Mace and Chain | WebP photo |

The Mace carousel now has eight entries; Planter has six. Videos retain the
established muted inline autoplay/loop behavior with hidden playback controls.
GIFs load only when selected, return to static source-frame posters when
inactive, and use those posters in the thumbnail strip. Switching slides and
closing details stops inactive motion. No generated imagery or new copy is
introduced beyond descriptive alt text.

The three optimized videos total 4,505,332 bytes, compared with 29,212,769 bytes
for their smaller GIF alternatives. All six published media files total
9,928,165 bytes, excluding the small posters. Source duration and framing are
preserved. HDR clips are tone-mapped to SDR for browser consistency. Videos
are 720 pixels tall at 24 fps; the short GIFs are 540 pixels tall at 12 fps.
The photo is 1920 pixels tall. Hashes, source paths, frame timestamps and
encoding settings are in `../design/v3/prints-media-20261102.json`.

Original sources are unchanged. Converted files, GIF alternatives and initial
720px GIF exports remain in the source folder's `Converted for NO3D Prints/`
directory. Only the selected web assets are included in Git and deployed.

## Release and verification

- Runtime source: `20e5dea` (media implementation `f7ddf94`).
- Preview build: `dpl_9sXaoHbDf8pHExW5LXuM26bD2TdU`.
- Production: `dpl_AY667wd1QGS3XxxejrSeiZ5Gcxyv`,
  https://no3dtoolssite-jab2rrv8o-node-dojos-projects.vercel.app.
- Canonical host readback confirms the new deployment at https://no3dtools.com.
- Rollback: `dpl_596cCkrkRKFk5pdXK33wzXC53oxn`,
  https://no3dtoolssite-clt7qjpkm-node-dojos-projects.vercel.app.
- 195 unit checks, existing Prints/campaign acceptance and eight-route V3
  desktop/mobile acceptance passed. The unchanged dependency audit has nine
  advisories (4 low, 1 moderate, 4 high).
- Media acceptance verifies all six new entries in catalog/campaign views at
  1440px and 390px: 24 checks. It observes actual video playback and looping,
  GIF pixel changes, inactive media state, and zero initial GIF requests.
  Run locally with `node scripts/prints-media-acceptance.mjs`, or set
  `PRINTS_MEDIA_URL=https://no3dtools.com` for read-only public verification.
- All 19 changed public source/media files were downloaded from production
  and matched local SHA-256 values. No Commerce, account or delivery API changed;
  the prior release's payment/download lifecycle evidence remains applicable.

Browser screenshots and media results are under `/tmp/no3d-prints-media-live/`.
Mobile checks use browser emulation, not a physical iPhone. This documentation
follow-up does not alter the deployed application source above.
