# Product sketchbooks

`v3/js/sketchbook/books.js` resolves the selected catalog product to a book package.
Only `spike-planter-01` currently declares `sketchbook: 'spike-planter'` in
`v3/data/prints/catalog.js`. Missing, unknown, and unconfigured products use the
unchanged original export in `v3/assets/sketchbook/`.

The catalog carousel, its product details dialog, and standalone print pages all
pass their current product to the same viewer. Switching books cancels the old
load, disposes geometry/textures, replaces the canvas, and resets navigation.
Lowering and reopening the same book retains its view.

## Package contract

Each custom book lives in `v3/assets/sketchbook/books/<book>/v<number>/`:

- `manifest.json.gz`: parts, UVs, materials, quantization bounds, pose chunks,
  `pageCount`, `pageSpreads`, `pageStops`, and `initialProgress`.
- `textures/*.webp`: web derivatives; artwork keeps its alpha channel.
- `poses/*.bin`: the existing lossless delta-u16 codec, HTTP gzip encoded.
- `open.webp`: transparent poster rendered from the same web opening pose.

Spike Planter v1 contains 27 faces / 14 artwork spreads and 281 deformation
samples. It opens on the first right-hand page, “Stay Foolish.” Its page stops
come from the rig's actual leaf-flip attribute. Each material uses the UV
transform from the authored Blender material. The shader composites ink alpha
over opaque paper with blank reverse sides; the canvas surround remains
transparent. Cover decals bind to the animated cover surface during export,
so their source relief cannot pierce the final pages. This adjusts export arrays
only and leaves the Blender authoring geometry intact.

The original book's manifest predates navigation metadata. The resolver supplies
its original opening progress and stops. The pose store still retains at most
three nearby chunks and downloads at most two concurrently.

## Adding the next authored book

Use the existing Product Sketchbooks rig and its ordered transparent bake
manifest. Keep original layouts and full-resolution artwork outside the web
package. Capture a disposable Blender snapshot through Agent Bridge with
`bpy.data.libraries.write(..., path_remap='ABSOLUTE')`; do not save or modify the
live authoring document to make an export.

Run the exporter in a separate Blender process. This adapter targets the
current rig's `Socket_4` progress, `page index`, `page flip factor`, cover,
and material contracts; inspect those before using a differently structured rig.

```sh
blender --background --factory-startup --disable-autoexec SOURCE_SNAPSHOT.blend \
  --python scripts/export-sketchbook.py -- \
  --book 'SPIKE PLANTER book' --bakes page-bake-manifest.json \
  --expected-pages 27 --output TEMP_EXPORT

node scripts/package-sketchbook.mjs TEMP_EXPORT v3/assets/sketchbook/books/BOOK/v2
node scripts/render-sketchbook-poster.mjs v3/assets/sketchbook/books/BOOK/v2 PROOF_DIR
```

Packaging requires `cwebp` on PATH. It checks exact pose-codec round trips and
refuses to overwrite an existing package manifest. Use a new version directory
for later revisions, then update the registry pointer. Add the catalog's
`sketchbook` key only when the package and its visual proof are ready. No asset
copies are needed for products that share the default book.

Changed JavaScript imports and page entrypoints need new query versions because
the site serves these modules with immutable caching. Book packages carry their
version in the path; nested manifest and pose gzip headers are in `vercel.json`
and the local preview server.

## Verification

```sh
node --test tests/sketchbook-books.test.mjs
node scripts/print-sketchbook-acceptance.mjs
node scripts/sketchbook-product-acceptance.mjs
```

Check every rendered stop in `PROOF_DIR` for order, UV alignment, page opacity,
and first/last cover poses. The browser checks cover catalog/details/standalone
selection, switching while loading, retry, gestures, transparent surround, and
return state. Also run the repository's standard tests and V3 acceptance.
Local Chromium checks do not establish physical iPhone or deployed acceptance.
