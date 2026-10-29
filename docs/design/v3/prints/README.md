# NO3D Prints layout candidate

This local candidate implements Tools ↔ Prints switching and a full-bleed Prints carousel. Its initial products are the published Gumroad **3D printable Mace and Chain Lighter Keeper** and **3D printable Spike Planter 01**. Parts is deferred.

## Current design direction

Joe's 2026-10-28 direction: use the existing NO3D design language and UX, replacing the dense tool shelf with viewport-filling product photography beneath overlaid text. The carousel supports previous/next controls, horizontal swipe/scroll, vertical mouse-wheel advancement, keyboard arrows, and a product index. There is no autoplay.

The masthead switches between the existing Tools and Prints wordmarks. The Prints subheading is Joe's exact first draft:

> 3d printable downloads and build plans for next level projects

**Correction from Joe during review:** titles must be fully opaque, with no unusual overlay effects. Future thumbnail edits will make the subject much smaller in the frame, leaving a generous, low-contrast photographic background for the type. There are no title blend modes, shadows, outlines, transparency effects, or image-darkening layers. The supplied Gumroad photographs currently retain their original framing, so final image/text contrast awaits that artwork revision. Do not compensate by adding effects.

The desktop and mobile photo sources/focal positions can be replaced independently. The current planter uses its published group photograph on desktop and its published portrait cover on mobile. The mace uses its published original cover. All images are original downloaded media; no generated imagery is used.

## Start and review

```sh
npm ci
npm run preview:prints
```

Open `http://127.0.0.1:4174/v3/prints/`. Direct slide links use `?product=mace-and-chain` or `?product=spike-planter-01`.

The preview binds only to `127.0.0.1`, serves local assets and public catalog snapshots, rejects all mutation requests, and blocks external fetch/form/frame connections. It does not load production credentials or proxy production APIs. The Tools page uses a public catalog snapshot for comparison; it retains its existing layout. Gumroad buttons are ordinary external links to the existing product pages.

Product-detail dialogs reuse Gumroad wording and list the downloadable contents. Native NO3D checkout, account delivery, product publishing, and catalog/entitlement migrations are deferred until after layout review. This candidate does not claim to import Gumroad purchases into NO3D accounts.

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

| Product | Gumroad destination | Local original media |
| --- | --- | --- |
| Printable Mace and Chain Lighter Keeper | https://nodedojo.gumroad.com/l/jvbin | `v3/assets/prints/mace-gumroad-cover.png` |
| Spike Planter 01 | https://nodedojo.gumroad.com/l/spike-planter-01 | `v3/assets/prints/planter-gumroad-cover.png`, `planter-gumroad-wide.png` |

The separate physical Mace and Chain Lighter Holder listing is intentionally excluded from Prints. Joe authorized use of these existing product hero images in the request for this section.

## Validation

```sh
npm test
npm run acceptance:v3
npm run acceptance:prints
npm audit
```

Prints acceptance covers desktop/mobile fit, loaded images, opaque title styling, section selection, keyboard navigation, deep-link refresh, detail content/links, search/empty states, local-only asset requests, rejected checkout writes, protected filesystem paths, and navigation back to Tools. Screenshots and the results receipt are written to `/tmp/no3d-prints-acceptance`.

The inherited dependency audit reports nine advisories: four low, one moderate, and four high. The high findings are in the Puppeteer development dependency tree (`puppeteer`, `puppeteer-core`, `chromium-bidi`, `zod`). Dependencies and lockfile have not been changed for this visual candidate.

The implementation is a review candidate, not approved design canon or a production release. Next review should concentrate on subject scale and negative space in the revised images, title placement/size, and whether the carousel feels right at desktop and phone sizes.
