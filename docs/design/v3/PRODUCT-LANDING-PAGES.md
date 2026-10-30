# Focused product landing pages

Implementation candidate, 2026-10-29. First visual review: Mace and Chain.
This feature has not been published to production.

## Links

- `/p/mace-and-chain`
- `/p/spike-planter-01`
- `/p/chrome-crayon` (and other active catalog tool handles)

These short paths use the existing website host, Vercel project, product
catalog, managed account session, and Commerce checkout. The local read-only
layout preview is `http://127.0.0.1:4174/p/mace-and-chain` after
`npm run preview:prints`. It uses snapshot prices and does not start a real
checkout. Invalid product links never substitute another catalog product.

## Presentation

The reusable page is `v3/product/landing/index.html`; its controller and model
are `v3/js/product-landing.js` and `product-landing-model.js`. It adapts the
approved Product Detail 04D composition: paper/ink, Druk display, Doto body and
price, Silka UI, hairline rules, and the yellow acquisition action. It omits
the catalog, search, store switcher, and membership upsell. It keeps sign-in
and a small support link.

Print content comes from the existing `v3/data/prints/catalog.js`. The optional
`landingHero` selects an existing expanded photograph ahead of the regular
photos/video. The title, description, files, and remaining media are shared
with the Prints product document. No campaign-specific marketing copy or
parallel product record is needed. Tool pages use the existing catalog API.

Desktop pairs the gallery with the product information and acquisition block.
Mobile places the acquisition block immediately after the gallery and before
the longer description. Gallery thumbnails, arrows, swipe/scroll, keyboard
navigation, video controls, and reduced motion are supported.

## Acquisition

- Current prices come from `/api/commerce/offer`, never the authored catalog.
- Prints use `/api/prints/access` and recheck at the action boundary. Members
  see the price crossed out with “free for members.” Members and owners use
  `/api/prints/download` without checkout.
- Buyers use the existing `beginProductCheckout(handle)` and server-owned
  offer selection. Checkout collects their email and payment, and returns
  through the existing order/account/download flow. Zero-priced prints use
  that same email handoff. This does not enroll anyone into a mailing list.
- Tools reuse the Account entitlement projection and download/install paths.
  Free tools retain native account creation and add-on delivery.
- Sign-in and password recovery return to the exact short product path.
- Failed access or offer reads do not trigger a purchase. Repeat clicks are
  locked while an acquisition or checkout redirect is underway.

The middleware applies the existing V3 owner gate to `/p/` on staging. Share
crawlers receive product-specific title, description, photo, and canonical URL.
Landing analytics use the existing product-view/checkout event names with
`source: product_landing`; private query values are not added to those events.

## Verification

- `npm test`: 193 tests passed, including product identity, share metadata,
  safe return paths, and analytics privacy.
- `npm run acceptance:landing`: guest checkout handoff; member/owner direct
  download; entitlement changes after page load; access, price, and delivery
  outages; free-print email handoff; tool owner/free-account paths; unknown
  products; gallery keyboard controls; 1440, 390, and 320 pixel layouts.
- `npm run acceptance:v3`: eight existing routes, desktop and mobile, passed.
- `npm run acceptance:analytics`: passed.
- Browser fixtures do not prove a real payment, receipt, or private artifact
  delivery. The existing backend was reused unchanged. Target-specific
  deployed acceptance remains a release step after layout review.
- `npm audit`: existing lockfile reports 9 advisories (4 low, 1 moderate,
  4 high); production dependencies account for 4 low and 1 moderate. The high
  findings are in the Puppeteer development dependency chain. No dependency
  versions were changed. Dependency remediation is a separate release concern.

Browser evidence is written to `/tmp/no3d-product-landing-acceptance/`.
