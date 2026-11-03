# Mace download revision — 2026-11-02

The private immutable ZIP was uploaded on 2026-11-02 and downloaded back with
matching byte count and SHA-256. Its delivery pointer is ready for release.
Production publication is recorded separately in the release receipt. The
previous object is retained for rollback.

Joe selected exactly these existing STL files:

- `111mm Mace Ball_0919_39_1412_001.stl`
- `Big Chain_0919_31_1412_001.stl`
- `Lighter Holding Haft handle_0919_58_1409_001.stl`

The alternate sizes, optional clip, and Bambu Studio project are excluded from
this package. The original source directory is unchanged. Spike Planter has a
separate wall-mounted and free-standing revision documented in
`SPIKE-PLANTER-DOWNLOAD-REVISION.md`.

Prepared package:

`/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/THE WELL_play files/Mace and Chain Lighter Keeper/NO3D Download Packages/2026-11-02-three-stls/mace-and-chain.zip`

Size: 3,347,209 bytes. SHA-256:
`14dd2f99afa7fca29b0b338deb94f07c539039b78cf2d638916811885b8ea799`.

The adjacent `package-manifest.json` records source hashes, the previous delivery
metadata, and the new delivery metadata. Verification reopened the ZIP, checked
the exact three-entry list and CRCs, and compared each extracted SHA-256 with
its original source. The ZIP stays outside the public website and Git.

Both the Prints detail page and campaign page use the revised included-file list
and per-product format. Access rules, prices, and checkout are unchanged.

## Viewer and gallery follow-up

Joe requested on 2026-11-02 that the outdated yellow print-bed montage be
removed once the STL viewer is available. That local viewer implementation is
now complete and tested; the shared catalog entry has been removed. See
`PRINT-PART-VIEWERS.md`. The removed entry was `v3/assets/prints/mace-detail-3.png`, with the alt text
"Mace and Chain printable parts". Both the Prints detail page and campaign page now omit it, and gallery
checks reflect three remaining media items. The source image is preserved as
historical media.

The replacement belongs in its own borderless "Included in Download:" section
with the three selected parts identified by name. The website uses a fixed,
mobile-first grid rather than Wellbord's infinite-canvas interactions.

Gumroad embedding is an idea to evaluate, not an approved publication change.
Its [custom landing-page documentation](https://gumroad.com/help/article/353-custom-product-landing-pages)
currently permits inline JavaScript and selected script CDNs but blocks
JavaScript network requests and external media/players. Reusing a remotely
hosted viewer is therefore not established as supported. A self-contained
viewer with embedded preview geometry would require a separate proof of
concept within the documented 500,000-character page limit. Linking to the
NO3D viewer is the straightforward fallback. No Gumroad pages were changed.
