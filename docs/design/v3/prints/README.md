# NO3D Prints layout candidate

This local candidate implements Tools ↔ Prints switching and a full-bleed Prints carousel. Its initial products are the published Gumroad **3D printable Mace and Chain Lighter Keeper** and **3D printable Spike Planter 01**. Parts is deferred.

## Current design direction

Joe's 2026-10-28 direction: use the existing NO3D design language and UX, replacing the dense tool shelf with viewport-filling product photography beneath overlaid text. The carousel supports previous/next controls, horizontal swipe/scroll, vertical mouse-wheel advancement, keyboard arrows, and a product index. There is no autoplay.

The latest review moves all product information and actions out of the photograph into the product list. The active row expands to show file format, price, and Product details; other rows retain only their number and title. Clicking a row, using the carousel controls, swiping, keyboard navigation, search, and direct product URLs keep that expanded row synchronized with the visible photograph. The photo slides contain no title or purchase overlay. Desktop keeps this compact list in the left rail; on phones it sits near the bottom of the viewport above the footer, with the introductory subheading remaining near the masthead. Clicking a product in the photograph opens a full-screen slide-up product page. Its shared centered hitbox is 56% of viewport width and 64% of viewport height on both slides. The Product details button remains a keyboard-accessible alternative.

The masthead switches between the existing Tools and Prints wordmarks. The Prints subheading is Joe's exact first draft:

> 3d printable downloads and build plans for next level projects

**Correction from Joe during review:** titles must be fully opaque, with no unusual overlay effects. Use the expanded-background hero images to make the subject smaller in the frame, leaving more photographic background for the type. There are no title blend modes, shadows, outlines, transparency effects, or image-darkening layers. Joe supplied expanded-background images on 2026-10-28 and requested this preview use them. Do not compensate for image/text contrast by adding effects.

Desktop and mobile now use the two 1254px square backgrounds Joe attached later on 2026-10-28. They were saved byte-for-byte as `mace-chain-background-v2.png` and `spike-planter-background-v2.png` in this checkout and in the corresponding source product’s `Background Expansions` folder. Both use centered cover framing. Earlier expanded images remain preserved. Exact attachment paths, durable source paths, SHA-256 hashes, and earlier edit records are retained in `v3/data/prints/hero-image-provenance.json`. No image effects or edits were applied.

Caret correction during review (2026-10-28): the inherited chunky pixel carousel glyph is rejected. This candidate uses one clean stroked chevron for the Tools shelf, Prints carousel, and storefront dropdown, rotated for direction. This is a local review change; the live site and approved master files remain unchanged.

## Start and review

```sh
npm ci
npm run preview:prints
```

Open `http://127.0.0.1:4174/v3/prints/`. Direct slide links use `?product=mace-and-chain` or `?product=spike-planter-01`.

The preview binds only to `127.0.0.1`, serves local assets and public catalog snapshots, rejects all mutation requests, and blocks external fetch/form/frame connections. It does not load production credentials or proxy production APIs. The Tools page uses a public catalog snapshot for comparison; it retains its existing layout. The Download action hands nonmembers to the existing Gumroad checkout only after an explicit click; it does not submit a purchase. Local pages and galleries load without external requests.

## Gumroad product-page match

Joe requested matching the existing Gumroad product pages. The slide-up document ports their paper/ink/yellow palette, fonts, 1440px page width, masthead, ruled 1.65/.85 assembly, product-specific display title sizes, split price/Download area, documentation grid, and responsive breakpoints. Source references are the two product URLs below and their `/landing/embed` documents, inspected 2026-10-28. The Mace page’s outdated Blender-extension metadata is corrected to 3D print files. Added elements are the thumbnail gallery, close/back behavior, and member access line.

The gallery contains four Mace items and five Planter items, including the original demonstrations. It supports thumbnails, native horizontal swipe, chevrons, keyboard arrows/Home/End, and controlled video playback. Existing description wording and included-file order are preserved. `gallery-image-provenance.json` records public sources and byte hashes; two large GIFs were converted to MP4 without autoplay. The new full-bleed backgrounds are separate from the original detail gallery.

`?product=...&details=1` opens the corresponding page. Browser Back, Forward, Escape, and Catalog close/restore it and return focus to the trigger. Opening and closing slide vertically, with reduced-motion support.

## Download and membership boundary

The ordinary Download action uses the product’s existing Gumroad `?wanted=true` checkout. Gumroad remains price, purchase, receipt, and paid-delivery authority for those transactions. This implementation does not import or grant access based on Gumroad purchases in NO3D accounts.

New server endpoints `/api/prints/access` and `/api/prints/download` reuse the existing verified website session, paid legacy subscription policy, and Commerce account entitlements. Active full-library members and verified NO3D owners can bypass checkout; narrow collection memberships cannot. The download endpoint checks access again before signing the exact registered private catalog asset for 15 minutes. Missing/draft assets, revoked access, errors, and unknown handles cannot release a file. Browser-supplied membership, price, or file key is never authority.

**Not activated:** neither printable product is present in the local NO3D catalog snapshot. Their exact handles must be registered and their private delivery files connected before member delivery can work in staging/production. A verified member with missing delivery gets an unavailable state, not a paid checkout. No production catalog, private storage, Stripe, Commerce, auth configuration, or entitlement rows were changed.

The default preview is an anonymous guest without credentials. Member, owner, missing-file, and revocation scenarios are exercised through server-side fixture dependencies in acceptance tests, never through a public query/cookie switch. These checks verify local behavior, not actual customer payment, authentication, or private file delivery. Staged real lifecycle verification remains required before release.

## Source and isolation

- Production deployment verified: `dpl_4mXZMGeanXK6gNiPJ28XPkP29UvP`.
- Deployed commit used as the base: `977dcaa9b97b566d698753bd1beb2b8bf01c8b18`.
- Development branch: `codex/storefront-prints`.
- Worktree: `/Users/joebowers/Projects/no3d-tools-prints`.
- Local Git backing store: `/Users/joebowers/Projects/.no3d-prints-source.git`, fetched from the existing GitHub repository at the deployed commit. The original Dropbox-backed Git store stalled during checkout; the incomplete worktree and its temporary branch were cleaned up before creating this independent local worktree.
- No remote branch has been pushed. Automatic Vercel deployments are explicitly disabled for this branch in its local `vercel.json`.
- The original `/Users/joebowers/Projects/no3d-tools-website-v3` checkout and the production deployment are unchanged by this work.

This backing repository is shallow at the production baseline. Fetch/deepen its history before future integration if Git needs additional ancestry; do not transplant the old checkout's Git directory.

## Product and media provenance

Read-only Gumroad snapshots were retrieved on 2026-10-28. `v3/data/prints/gumroad-*.json` retains the selected public product fields, original descriptions, pricing snapshot, and media URLs. `catalog.js` extracts the original text for the detail dialogs. Displayed prices are a design-review snapshot; the linked Gumroad product page remains the purchase authority.

| Product | Gumroad destination | Current hero media |
| --- | --- | --- |
| Printable Mace and Chain Lighter Keeper | https://nodedojo.gumroad.com/l/jvbin | `v3/assets/prints/mace-chain-background-v2.png` |
| Spike Planter 01 | https://nodedojo.gumroad.com/l/spike-planter-01 | `v3/assets/prints/spike-planter-background-v2.png` |

The separate physical Mace and Chain Lighter Holder listing is intentionally excluded from Prints. Joe authorized use of these existing product hero images in the request for this section.

## Validation

```sh
npm test
npm run acceptance:v3
npm run acceptance:prints
npm audit
```

Prints acceptance covers desktop/mobile fit, loaded images, opaque list typography, one expanded product at a time, list/carousel synchronization, no purchase overlay on the photo, section selection, keyboard navigation, deep-link refresh, full-screen detail layout, equal image hitboxes, four/five-item galleries, no autoplay, detail deep-link reload/Back/Forward/focus return, guest checkout handoff and member/owner download bypass with intercepted external destinations, missing/revoked download denial, search/empty states, local-only asset requests, rejected checkout writes, protected filesystem paths, and navigation back to Tools. Screenshots and the results receipt are written to `/tmp/no3d-prints-acceptance`.

The current local run passes 177 unit/contract tests, all eight V3 acceptance routes at two viewport sizes, and the Prints gallery plus five isolated download journeys. Review screenshots and the receipt are saved in `review/`.

The inherited dependency audit reports nine advisories: four low, one moderate, and four high. The high findings are in the Puppeteer development dependency tree (`puppeteer`, `puppeteer-core`, `chromium-bidi`, `zod`). Dependencies and lockfile have not been changed for this visual candidate.

The implementation is a review candidate, not approved design canon or a production release. Next review should concentrate on subject scale and negative space in the revised images, title placement/size, and whether the carousel feels right at desktop and phone sizes.
