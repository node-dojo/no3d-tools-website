# Prints included-part viewers — 2026-11-02

Implemented for local review in the Prints catalog details and the shared
campaign-page template. Not deployed. User direction: a separate borderless
"Included in Download:" grid, Wellbord-like clay models and direct rotation,
with interactions suitable for a fixed mobile page.

## Behavior

- Mace: 111 mm Mace, Big Chain, Lighter Holding Haft.
- Planter: wall-mounted body, screw-in drip tray and hanger, followed by the
  free-standing body and screw-in drip tray. All five STLs have viewers. The
  wall-mounted Bambu Studio 3MF project remains explicitly listed below them.
- Three columns when the section has at least 560 px, one column otherwise.
  Transparent canvases inherit the surrounding paper or dark campaign surface.
- Desktop drag rotates on both axes. Inline touch drag rotates horizontally;
  vertical swipes scroll the page. Tap/Enter enlarges the selected part.
- The enlarged dialog supports full touch orbit, pinch/wheel zoom, explicit zoom
  and reset controls, arrow keys, plus/minus, Home, and Escape. Focus returns to
  the selected part; Escape does not dismiss the underlying product details.
- No automatic spinning, animation loop, borders, or canvas-editing controls.
  Rendering runs on input/resize. Meshes and the renderer load when approaching
  the viewport. Closing product details disposes renderers, geometry, listeners,
  and pending loads. Maximum six live renderers (five grid, one enlarged).
- A failed fetch or unavailable WebGL leaves names, descriptions and acquisition
  available and offers a retry. The old Mace yellow parts montage has now been
  removed from shared catalog media; its source image is retained.

## Preview assets

The eight public `.bin` files are reduced, normalized display derivatives, not
customer STL/3MF downloads. Public viewer geometry can be extracted; these are
not an access-control mechanism. Printable originals remain in the existing
private Commerce delivery flow. No source STL or delivery ZIP was modified by
this viewer work. Both package release prerequisites in
`MACE-DOWNLOAD-REVISION.md` and `SPIKE-PLANTER-DOWNLOAD-REVISION.md` still apply
before deploying this branch. Standing previews were generated from the
validated exports in the latter package; their source hashes match its manifest.

`print-preview-manifest.json` records each source name/hash, source and preview
triangle counts, output hash and size. The files total 2,876,940 bytes before
HTTP compression. Bounds are normalized to a unit radius with original axes
and relative arrangement preserved. Part sizes are independent display fits,
not a common measurement scale.

Regeneration uses `scripts/prepare-print-previews.py` with Python 3.12,
`numpy==2.5.4`, and `fast-simplification==0.2.0` in a separate environment:

```sh
python scripts/prepare-print-previews.py --mace-dir '/path/to/MACE and CHAIN stls' --planter-dir '/path/to/Spike Vase 01 STLS:3DFs' --standing-dir '/path/to/2026-11-02-wall-and-standing/files/Free Standing'
```

Output filenames are content hashed. Update catalog paths when regenerating.
Binary format: `N3DP` magic, little-endian uint32 vertex/triangle counts,
float32 XYZ positions, then uint32 triangle indices. The browser validates
counts, bounds and indices before constructing a mesh.

Three.js 0.160.1 is vendored with its MIT license from the existing Wellbord
installation. The viewer uses a small scene with a rough neutral clay material,
Z-up orbit, transparent background and capped 2x pixel density. No external
script, model host, worker, or new runtime npm dependency is required.

## Verification

- `npm test`: 195 passing tests, including output integrity and malformed-mesh
  rejection. Original source hashes recorded during generation.
- `npm run acceptance:print-parts`: actual WebGL rendering and pixel changes,
  desktop orbit/keyboard/reset, mobile CDP touch gestures (horizontal orbit,
  vertical scroll, tap and two-finger pinch), focus/modal nesting, resource
  disposal, failed-mesh retry, WebGL-unavailable fallback, and campaign layout.
- `npm run acceptance:prints`, `npm run acceptance:landing`, and
  `npm run acceptance:v3`: passed. Existing checkout/download fixtures passed;
  no live payment, membership, or private-download transaction was performed.
- Desktop and mobile screenshots inspected under
  `/tmp/no3d-print-parts-acceptance/`. Mobile verification is browser touch
  emulation, not a physical iPhone/Safari acceptance run.
- `npm audit`: unchanged nine existing advisories (4 low, 1 moderate, 4 high).
  Vendored Three.js is outside npm audit's dependency coverage.
