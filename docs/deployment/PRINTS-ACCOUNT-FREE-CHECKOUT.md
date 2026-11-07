# Prints account-free checkout — 2026-11-07

The checkout collects payment and email, returns directly to a download page,
and automatically emails a reusable purchase link. The download page supports
recovery and independent file-update/promotion preferences without signup.
The optional promotion checkbox is initially unchecked and appears beside the
download button. Stripe's built-in promotion checkbox was rejected pending
separate Stripe terms; no terms were accepted and that setting is not used.

## Implementation

Commerce stores buyer emails in service-role-only `print_contacts` and
`print_purchases`, associated with their orders and purchased prints. Resend
sends from a durable outbox. Promotions require opt-in; updates target the
purchased print. The existing newsletter sender remains a separate audience.
The Commerce companion document describes campaign preview and controlled send.

`/v3/prints/download/` has no account requirement or analytics. Email grants
arrive in URL fragments, are cleared from browser history, and remain in memory.
The website requests a fresh private file URL only after Commerce rechecks paid
ownership and active access. A full refund blocks subsequent download requests;
already issued URLs expire after fifteen minutes. Recovery is rate-limited and
does not reveal whether an email has purchased.

## Validation commands

- `npm test`
- `node scripts/print-delivery-acceptance.mjs`
- `npm run acceptance:v3`
- `npm run acceptance:landing`
- `doppler run --project no3dtools --config stg -- node scripts/print-delivery-staging-acceptance.mjs --apply`

The last command opens public product buttons, completes real hosted test-mode
payments, reads the automatic email content from Resend, opens it in a fresh
browser, verifies full ZIP checksums, saves preferences, exercises recovery,
refunds its test payments, and waits for access revocation. It checks Auth-user
counts before and after. Resend acceptance and actual inbox receipt are separate
claims; the recipient inbox is not opened by this script. No live card is used.

## Release boundary

Current production before this change is `dpl_BSEUaDDVHgdN5gupGzoJsmLdn1yS`,
source `f68cdec`. Newer development includes unpublished sketchbook and naming
work. Prepare the checkout release on the deployed source rather than publishing
the entire development branch. Preserve canonical website checkout changes.

Deploy the Commerce migration and service plus website adapters before enabling
`PRINTS_ACCOUNT_FREE_ENABLED=true` on both services. The staging configuration
script is restricted to existing sandbox projects and transfers secrets through
stdin. It must never be retargeted to production.

To pause new account-free checkout, set the website flag false while retaining
Commerce, mail processing and the new delivery endpoints. Previously emailed
links must remain usable. Whole-site rollback to a pre-delivery build would
break those links and is not a safe rollback after completed purchases.

Production deployment and inbox acceptance remain separate from implementation
and staging.

## Staging acceptance completed

Verified 2026-11-07 at 20:03 UTC.

- Website runtime: `e999956`, isolated from live source `f68cdec`.
  Development branch also contains the implementation as `52bfafd`.
- Commerce runtime: `82cb914`.
- Website staging: `dpl_C63GrTFCZbwr7N9SYXBsGFJnGZmi`,
  https://no3d-tools-staging-bm4rmhn7s-node-dojos-projects.vercel.app,
  aliased to https://staging.no3dtools.com.
- Commerce staging: `dpl_5nDYwSEskxu7UzF4qP5ixo2sXBmg`,
  https://no3d-commerce-staging-eigmcgu9a-node-dojos-projects.vercel.app,
  aliased to https://commerce-staging.no3dtools.com.
- Commerce sandbox migration applied to `lqidrljskdpjlshtwfbv`.
  The two existing operations-monitor and reconciliation-page migrations were
  also missing from staging and were applied there. The older sandbox webhook
  was not completing event delivery; replacement
  `we_1UZFe3LRzYZv3EhftliuTVA0` receives the unchanged event list/API version.
  Its signing secret was stored directly in Doppler and Vercel; the old
  `we_1UFdo8LRzYZv3EhfP2EaVb6l` endpoint is disabled.

Both products passed real Stripe sandbox payments through public product
buttons without sign-in. Mace delivery passed with the browser return blocked;
Planter returned directly to its ready download page. Both emailed links worked
in fresh browser contexts, and full ZIP byte counts and SHA-256 checksums matched
the private manifest. Preference saves and a public resend request worked.
Three final-run emails were accepted by Resend once each. No automatic provider
retry was needed in this final run.

Full sandbox refunds revoked both source entitlements and subsequent emailed-link
downloads. Independent Stripe and Commerce readback confirmed the financial and
access states. Website Auth-user counts stayed at nine before and after: no Auth
user was created. Earlier failed-run test payments were refunded and abandoned
test Checkout sessions expired.

408 unit/contract tests passed (199 website, 209 Commerce), together with the
transactional SQL acceptance, desktop/mobile delivery, eight-route V3, Prints,
and product-landing checks. The optional checkbox beside Download was also
tested to change promotion preference without changing file-update preference.
Existing member/owner download bypass is covered by local Prints/landing checks;
the hosted run covers the changed guest path.

Evidence: [hosted journey](prints-account-free-staging-20261107.json) and
[independent readback](prints-account-free-readback-20261107.json).
The provider's last event was `sent`; actual inbox receipt is **not verified**.
Mobile checks use browser emulation. Invalid/expired links, delayed payment,
duplicate projection, retry/lease safety and suppression use local fixtures/SQL.

Production read-only preflight found the Prints schema/functions absent and the
new flag disabled, with the existing live storefront origin, sender and storage
configured. No production migration or deployment has been performed. The
canonical website checkout's unrelated price/lifecycle work and the development
checkout's unpublished naming/sketchbook work remain preserved. Dependency
audit remains nine inherited advisories (4 low, 1 moderate, 4 high); dependencies
were not changed.
