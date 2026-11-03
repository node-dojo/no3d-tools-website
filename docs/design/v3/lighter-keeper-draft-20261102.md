# Lighter Keeper naming and V2 draft

Joe requested the original product display name **The Lighter Keeper 01** and
a new draft for **Lighter Keeper V2 — Crystal Resin Version**. The draft uses
**The Lighter Keeper 02** with Crystal Resin Version as its edition subtitle.

The original's catalog, details, campaign/social-preview and account-delivery
titles use the new name. Existing `mace-and-chain` handles, offer keys, paid
archive paths/checksums and entitlement identity are unchanged. The former
Mace and Chain name remains searchable. Historical source receipts retain
their original wording.

The V2 draft lives outside the deployable tree:

`/Users/joebowers/Downloads/The Lighter Keeper/NO3D Draft`

Its loopback preview is `http://127.0.0.1:4175/`, started with the folder's
`preview-server.mjs`. It reuses the Prints styles and fonts. No account,
purchase or download endpoint is available from that draft server.

## Hero and recovered material

- Exact selected source: `../IMG_0685.png` relative to the draft folder.
- Built-in image generation extended its dark backdrop. The original photo
  was restored over that extension, preserving the product pixels and shadows.
- Master: 5600 square PNG; exports: 2048 square PNG and WebP.
- Original pixels in the protected region compare with zero differing pixels;
  the edit prompt, source hash, mask and coordinates are in `Hero/`.
- Four supplied photos are in the preview; two original MOVs remain inventoried
  for later selection.
- Recovered full-product and handle copy, six storefront images, six local
  source renders and the legacy notebook sketch animation. Sources and hashes
  are saved in the draft. The notebook animation is archival, not a product
  demonstration.
- Legacy source pages: https://thewelltarot.com/products/the-lighter-keeper
  and https://thewelltarot.com/products/lighter-keeper-handle. A separate
  Formlabs-hosted listing was not located.

The redraft removes former collaboration/fulfillment promises and describes
downloadable resin/FDM files, using Joe's requested compatibility scope. No
material-specific test results, price, file inventory or supported print
profiles are invented. The release bundle and commercial setup remain unset.

## Local verification and release boundary

- 195 unit/contract tests passed.
- Existing campaign acceptance passed on desktop, mobile and narrow viewports,
  including fixture guest checkout and member/owner downloads.
- V3 browser acceptance passed at 390×844 and 1440×1100.
- V2 draft checks passed at 390×844 and 1440×1000: image loaded, no horizontal
  overflow, details open/close, gallery navigation and disabled acquisition.
- Browser verified the original product's new name and old-name search alias.
- Dependency audit reports the existing nine advisories (four low, one
  moderate, four high); no dependency changes are part of this work.

This is local draft preparation and implementation, not a production release.
Commerce/Stripe provider display names have not been changed. Publishing the
original rename and setting up V2 remain separate release operations.
