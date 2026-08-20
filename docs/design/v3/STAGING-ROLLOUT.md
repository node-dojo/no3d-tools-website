# V3 Private Staging Rollout

Status: implementation ready; infrastructure binding pending Supabase Pro and the owner-email allowlist.

## Approved staging envelope

- Two Supabase preview branches are approved at `$0.01344` per branch-hour.
- Maximum lifetime: 30 days, ending no later than **2026-09-18**.
- Estimated maximum branch usage: **$19.63** before any applicable credits or taxes.
- Supabase Pro is a separate organization-plan cost and remains unapproved; no preview branch exists or is accruing cost yet.

## Boundaries

- The public production root remains unchanged until the relaunch teaser is explicitly approved for deployment.
- The teaser prototype is stored in the Vault at `PROJECTS/NO3D SITE/No3dtools Design Language v3/Relaunch Teaser` and is not part of this deployable repository.
- V3 human-facing routes are owner-only in staging.
- Stripe webhooks, Commerce service calls, Supabase Auth callbacks, extension feeds, and Blender device traffic remain outside the UI gate and keep their own signature, assertion, session, or device-token controls.
- `V3_ACCESS_MODE` is unset in production, so the middleware is a no-op on the current public deployment.

## Environment map

| Concern | Website staging | Commerce staging |
|---|---|---|
| Vercel | Preview deployment for `feat/v3-adjacent` | Preview deployment from the Commerce source |
| Persistent host | `v3.no3dtools.com` | staging Commerce URL recorded in `COMMERCE_API_URL` |
| Doppler | `no3dtools/stg` | `no3d-commerce/stg` |
| Supabase | isolated branch of the website Auth project | isolated branch of the Commerce project |
| Stripe | test mode | test mode, test webhook endpoint |
| Access | exact `V3_OWNER_EMAILS` allowlist | trusted site backend plus signed assertions |

The Vercel project already uses its one custom-environment slot for `mvp-site`, so this release candidate uses branch-specific Preview variables rather than deleting or repurposing that existing environment without a separate decision.

## Required staging variables

Website:

- `V3_ACCESS_MODE=owner`
- `V3_OWNER_EMAILS`
- `STAGING_EXPIRES_AT=2026-09-18T23:59:59-06:00`
- branch-specific Supabase URL, publishable/anon key, and service-role key
- test Stripe price, secret, and webhook secret
- staging Commerce URL, site-backend secret, assertion key ID, and assertion secret
- staging site/auth issuer URLs
- existing R2 and email variables only where the tested flow genuinely needs them

Commerce:

- `COMMERCE_ENV=sandbox`
- branch-specific Supabase URL and service-role key
- Stripe test secret and webhook secret
- staging `COMMERCE_SITES_JSON` with exact website issuer and return targets
- operational queue/cron secrets scoped to staging

No production secret is copied simply to make a check pass. Shared delivery storage is allowed only after confirming every tested endpoint remains read-only or writes to an isolated prefix.

## Owner gate

The gate uses the real NO3D Supabase session and an exact, normalized email allowlist. It is not a shared password and does not introduce a second customer-auth system.

- Unauthenticated visitors to `/v3/*` are redirected to `/v3/access/`.
- Authenticated non-owner accounts are denied entry to the staged flow.
- Static V3 assets required to render the access screen remain reachable.
- Account-creation and passwordless endpoints refuse to send or create for non-allowlisted addresses while staging mode is enabled.
- Failure to inspect a session fails closed.

## Acceptance matrix

Run these in order against staging:

1. Owner gate denies a signed-out browser and a non-owner account.
2. Approved owner creates or signs into a staged account and completes email verification.
3. Free acquisition claims the account without creating a paid entitlement.
4. Blender 5.2+ installs through the native remote-extension path.
5. Blender returns a connection code and the browser automatically approves the device grant.
6. The free library appears in both Blender and the Account screen.
7. Stripe test Checkout purchases one product; its paid webhook creates the order and entitlement exactly once.
8. The account and Blender library show the purchased asset, with an individual download/install date and a manual update action.
9. Stripe test subscription fills the eligible catalog and exposes automatic updates.
10. Billing portal, cancellation, expiry, refund, recovery, repeat purchase, and refresh-token rotation behave correctly.
11. Mobile and desktop V3 visual acceptance passes with no browser-blue controls or horizontal overflow.
12. Production URLs, data, Stripe customers, entitlements, and extension clients remain unchanged.

## Teardown

Target date: **2026-09-18**.

1. Export the final acceptance evidence.
2. Delete both Supabase branches.
3. Remove or archive the Vercel Preview aliases and branch-scoped variables.
4. Delete staging Doppler values that are no longer required; retain only the variable-name manifest and rollout record.
5. Revoke staging Stripe webhook secrets and any temporary automation credentials.
6. Verify the public production root still points to its intentionally promoted deployment.
