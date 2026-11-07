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
and staging. Final staging results and revisions are appended after acceptance.
