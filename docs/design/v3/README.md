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
- `/v3/product/?handle=dojo-bolt-gen-v05-obj` — paid Product Detail 04D

These two pages form the first review and release gate. Together they test the shared masthead, mobile push-down catalog, responsive display typography, hero treatment, product grid, product metadata, ASCII node plate, and the individual-product Commerce entry point without introducing account-state complexity yet.

`/v3/account/`, the action-only Product 04F state, and `/v3/type/` remain preserved as working reference routes. They are explicitly outside the first tranche’s release gate and must not delay or silently expand it.

The first tranche reuses the current catalog and Commerce APIs. It does not introduce a second product, price, checkout, or entitlement model.

## Canon snapshot

Snapshot recorded 2026-08-18. SHA-256 values make later drift explicit.

| Canon file | SHA-256 |
| --- | --- |
| `CANON.md` | `793f7521266699521e94fe1e520f0b18a8aabc5c4272a579b18f4e02bf5d940f` |
| `DESIGN-LANGUAGE.md` | `7c989b3c4a3e22ee6f414eda2b2b3463ca1a1f1bb9677871a3915b917054b480` |
| `MOBILE-DECISIONS.md` | `c73330c3fc814d622e06ac723020fe3aca71a73838230c82260ffb61eefaa399` |
| `TOKENS.md` | `79e30722a1a93af46f4df0ea8d727a6831225688b1d52a1bf57d8169f40290ca` |
| `COMPONENTS.md` | `ab66a23a60a0f26f175a43ea625d0a3f538ee5b727e9eb045c47ea543de4cec9` |
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

The first-tranche acceptance suite checks both 390x844 mobile and 1440x1100 desktop layouts for Home 02D and paid Product Detail 04D, including document-flow catalog expansion, product identity ordering, the approved hero, ASCII boundary sockets, horizontal-only function dividers, overflow, fonts, and browser-blue regressions.
