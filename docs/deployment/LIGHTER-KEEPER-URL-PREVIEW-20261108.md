# Lighter Keeper URL and preview — 2026-11-08

Public URL: https://no3dtools.com/p/lighter-keeper

The public product name now matches The Lighter Keeper 01. Existing
`/p/mace-and-chain`, `/lighter`, and their trailing-slash forms redirect with
308 to the new URL, preserving query parameters. The new URL's trailing slash
also redirects to its canonical form. Commerce, entitlement, download, and
sketchbook handles remain `mace-and-chain`.

The social preview uses a separate 720×720 crop of the existing approved
photograph, making the subject approximately 1.74× larger without clipping
the chain or spikes. The landing-page hero remains unchanged. Source hash,
crop operation, and output hash are recorded in
`v3/assets/prints/lighter-keeper-social.provenance.json`.

- Deployed source: `aab2a4c` (implementation `4b23595`).
- Production deployment: `dpl_3yz7XNh7jwSTVUxXERGp2pBuLVmP`.
- Deployment URL: https://no3dtoolssite-riy47xief-node-dojos-projects.vercel.app
- Rollback: `dpl_Gyd9b4Joxhwgv5oxStT4APrbyW4a` at
  https://no3dtoolssite-9xzeu2i6a-node-dojos-projects.vercel.app

Node 24, npm ci, all 206 unit/contract tests, V3 acceptance (8 routes,
mobile and desktop), landing acceptance (320px, 390px, 1440px), production
build, and diff checks passed. Landing fixtures verified the new public URL
still uses the original purchase identity, owner/member download paths, and
new sign-in return URL. No real purchases were made. Dependency audit remains
at 9 inherited findings: 4 low, 1 moderate, 4 high, 0 critical; no dependencies
changed.

Protected-candidate and public-domain checks passed for all redirects and UTM
preservation, desktop/mobile product rendering, price, sketchbook button,
sign-in return, absence of horizontal overflow, and absence of page errors.
Facebook, Twitter, WhatsApp, iMessageBot, and Applebot user-agent requests
returned the new canonical URL and social image; downloaded image bytes matched
the source crop SHA-256. Actual third-party unfurl UI and physical iPhone
acceptance remain user-verifiable; already-sent messages can retain cached
previews.

Public evidence: `lighter-keeper-url-preview-live-20261108.json`.
