# NO3D Tools Design Language V3 implementation

This directory records the implementation boundary between the approved Obsidian design canon and the adjacent website build.

## Authority

The design authority remains the Vault package:

`PROJECTS/NO3D SITE/No3dtools Design Language v3/V3 Canon Implementation Package`

The code in `/v3` is the executable implementation. If the code and canon disagree, resolve the discrepancy deliberately in the canon first, then update the implementation and this snapshot. Do not silently normalize the design toward the legacy website.

## Approved screen lineage

- Home: `Home 02D`
- Product, paid: `Product Detail 04D`
- Product, action-only: `Product Detail 04F`
- Account: `Account 01C`
- Typography: Doto variable-weight lab, with Doto fixed at weight 700

Later mobile decisions override stale mobile captures in the original HTML samples. See [MOBILE-IMPLEMENTATION.md](./MOBILE-IMPLEMENTATION.md).

## First implementation tranche

- `/v3/` — Home 02D catalog
- `/v3/product/?handle=chrome-crayon` — live paid Product Detail 04D
- `/v3/product/?handle=dojo-bolt-gen-v05-obj` — live paid Bolt object-edition study

These two pages form the first review and release gate. Together they test the shared masthead, mobile push-down catalog, responsive display typography, hero treatment, product grid, product metadata, ASCII node plate, and the individual-product Commerce entry point without introducing account-state complexity yet.

The action-only Product 04F state and `/v3/type/` remain preserved as working reference routes. They are explicitly outside the first tranche’s release gate and must not delay or silently expand it.

The first tranche reuses the current catalog and Commerce APIs. It does not introduce a second product, price, checkout, or entitlement model.

## Onboarding and account vertical slice

The approved account flow is implemented as one account surface plus one account-entry modal:

- `/v3/onboarding/create-account/` — managed account-entry modal over the V3 site
- `/v3/account/?state=install` — compact, version-aware installation wizard inside the final Account chassis
- `/v3/account/?state=connect&code=...` — automatic Commerce device approval inside the same chassis
- `/v3/account/?state=complete` — completion transition into the active library
- `/v3/account/` — active account and Commerce-owned library

The flow uses the existing server-managed Supabase session, adds email/password plus Google and GitHub PKCE entry points, reads the canonical Commerce account summary, installs the production extension feed, and approves the existing Commerce device grant when Blender returns its short-lived code. The normal path deliberately contains no second NO3D consent action: choosing **Connect My Library** in Blender establishes user intent, and successful browser authentication completes the pending connection. Manual code entry is recovery-only.

The previous standalone Install and Connect pages are redirects into this unified Account surface. Do not recreate a second onboarding shell.

## End-to-end customer core

The release boundary now also includes `/v3/membership/`, individual Checkout return through `/v3/account/orders/:orderId`, membership return through the authenticated V3 Account, active-member full-catalog inventory, and billing management. The executable acceptance tranche is named `end-to-end-v3-customer-core`; see [`../../deployment/V3-END-TO-END-RELEASE.md`](../../deployment/V3-END-TO-END-RELEASE.md).

### Deliberate external boundaries

- Google and GitHub must be enabled in the deployed Supabase project and the deployed callback URL must be allowlisted before those buttons work in production.
- Commerce remains the only source of owned products and membership. The UI must not fabricate a free starter library; it stays empty until the canonical free entitlements are designated and returned by Commerce.
- The current Commerce account summary does not expose a rich connected-device record. Until that contract grows, the page may show the locally selected Blender version and connection state, but must not imply authoritative device health or last-contact data.

### Runtime authority

- Vercel project: `no3dtoolssite` (`no3dtools.com`). Do not create or link a second V3 project.
- Doppler project/config: `no3dtools/prd` for the website runtime.
- No3D Commerce project/config: `no3d-commerce/prd`; Commerce owns accounts, identity links, orders, Stripe Customer mappings, entitlements, refunds, account summaries, and Blender device grants.
- The website keeps its existing Supabase Auth project and translates a verified website session into a short-lived Commerce identity assertion. Browser code never receives either service-role or Commerce backend credentials.
- Email/password is the required managed-account path. Google and GitHub remain graceful optional entry points until their OAuth applications are configured and enabled in Supabase.

Private release-candidate infrastructure and the 30-day teardown boundary are specified in [`STAGING-ROLLOUT.md`](./STAGING-ROLLOUT.md). The owner gate is staging-only and must remain a no-op in Production.

Founder quotation blocks are written as spoken copy for a future personal video/voice asset. Correct obvious grammar and spelling while retaining colloquial phrasing.

## Canon snapshot

Snapshot recorded 2026-08-18. SHA-256 values make later drift explicit.

| Canon file | SHA-256 |
| --- | --- |
| `CANON.md` | `793f7521266699521e94fe1e520f0b18a8aabc5c4272a579b18f4e02bf5d940f` |
| `DESIGN-LANGUAGE.md` | `20ecdb40bd3adc9ea453044ec5d408251b6ae9eaa8f353a5e6171b0a0c96105c` |
| `MOBILE-DECISIONS.md` | `c73330c3fc814d622e06ac723020fe3aca71a73838230c82260ffb61eefaa399` |
| `TOKENS.md` | `23c0fb3ef61899f90e6f5a22f1866aa4369f68617526fbe5cb999a58cfd26d7e` |
| `COMPONENTS.md` | `017d6a888c3fc49df1509b91cd440e99a86840e78312c8d2ddabd627c77e6bfb` |
| `SCREEN-ROADMAP.md` | `ab9fb4ae7192f7026986cde5a59dd9ad881193f8694485cd4843dbe7619522af` |
| `home-02d-site-rail.html` | `55f53ab0a6bf82b0f3ba5f8ef05515c70096ba881a250beae54e2de088474c5a` |
| `account-01c-flow-states.html` | `1d447985cbb859736205264cc18607ef3b5cb3a20bab683b4395e7b7a356ff1c` |
| `product-detail-04d-assembled-manual.html` | `cf3d155333972841c5455d91fb632e97a6c948b8830b9f1fb8877d792a0886e5` |
| `product-detail-04f-chain-generator-actions.html` | `ce4b06e9cd009de1fe997ab5c61af803e3a3c0590abdda894c198d8bc7a11f1b` |
| `typography-doto-weight-lab.html` | `b22df65760fe43f01eb090eda22522f4acd365d3671d1ce8432a1785788ae360` |

## Required checks

Run before requesting review:

```sh
npm test
npm run acceptance:v3
npm audit
```

The acceptance suite checks both 390x844 mobile and 1440x1100 desktop layouts for Home 02D, paid Product Detail 04D, the account-entry modal, the compact Install and Connect states, the completion transition, and the active Account surface. It also guards document-flow catalog expansion, product identity ordering, the approved hero, ASCII boundary sockets, horizontal-only function dividers, overflow, fonts, and browser-blue regressions.
