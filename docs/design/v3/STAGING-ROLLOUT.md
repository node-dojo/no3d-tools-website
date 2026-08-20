# V3 Private Staging Rollout

Status: isolated Supabase and Vercel Preview foundations active; owner gate and Commerce health route reachable; Stripe test webhook and final security gate pending.

## Approved staging envelope

- Two Supabase preview branches are approved at `$0.01344` per branch-hour.
- Maximum lifetime: 30 days, ending no later than **2026-09-18**.
- Estimated maximum branch usage: **$19.63** before any applicable credits or taxes.
- Supabase Pro was activated on **2026-08-19** with **THE WELL TAROT, LLC** as the subscribing business.
- Website Auth/catalog branch: `v3-staging-30d` (`eydsnjawjhahtlbzwvlo`).
- Commerce branch: `v3-staging-30d` (`lqidrljskdpjlshtwfbv`).
- Both branches are data-isolated. The website branch contains the public product catalog seed only; no customer, Auth, order, entitlement, payment, analytics, or event data was copied.

## Pro-plan decision checkpoint

Treat Pro as temporary through the staging window. Review it no later than **2026-09-18** and downgrade to Free after branch teardown unless one of these measured production needs justifies keeping it:

- preventing production projects from pausing;
- automatic backups or another recovery requirement;
- production usage exceeds Free quotas;
- a continuing staging or preview environment saves enough release risk or labor to justify the plan.

If Pro is retained, record the justification and compare its value against another currently active subscription. Do not cancel another subscription merely to offset this cost; inventory its actual use and obtain a separate cancellation decision first.

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
| Persistent host | `v3.no3dtools.com` | `commerce-v3.no3dtools.com` |
| Doppler | `no3dtools/stg` | `no3d-commerce/stg` |
| Supabase | isolated branch of the website Auth project | isolated branch of the Commerce project |
| Stripe | test mode | test mode, test webhook endpoint |
| Access | exact `V3_OWNER_EMAILS` allowlist | trusted site backend plus signed assertions |

The Vercel project already uses its one custom-environment slot for `mvp-site`, so this release candidate uses branch-specific Preview variables rather than deleting or repurposing that existing environment without a separate decision.

### Vercel deployment-protection routing

Keep project-level Vercel Authentication enabled for ordinary generated Preview URLs. Register the two staging hosts as ordinary project custom domains and pin them to the approved deployments instead of configuring them as Git-branch domains. Vercel treats branch-bound domains as Preview URLs and places its own authentication challenge in front of Routing Middleware; that prevents the NO3D owner gate from loading and blocks unsigned network access to Commerce endpoints before their application-level verification can run.

Verified on **2026-08-19**:

- `https://v3.no3dtools.com/` redirects to `/v3/`.
- `https://v3.no3dtools.com/v3/` redirects to the NO3D `/v3/access/` owner gate.
- `https://v3.no3dtools.com/v3/access/` returns `200`.
- `https://commerce-v3.no3dtools.com/api/health` returns `200` with the expected Commerce health payload.

Do not disable Vercel Authentication across either project merely to expose these hosts. Commerce remains protected by its signed webhook, trusted-site, assertion, cron, and operations credentials; the website remains protected by the NO3D Supabase session and exact owner-email allowlist.

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

## Security gate before payment acceptance

Supabase currently reports `public.order_recovery_grants` in the Commerce schema with RLS disabled. Do not begin public or payment acceptance testing until the source migration and staging branch deliberately choose and verify the access model. The proposed server-only posture is:

```sql
alter table public.order_recovery_grants enable row level security;
revoke all on table public.order_recovery_grants from anon, authenticated;
grant all on table public.order_recovery_grants to service_role;
```

No browser-facing policy is required for this table because recovery is mediated by the signed Commerce service endpoints.

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
