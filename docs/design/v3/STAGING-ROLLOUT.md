# V3 Private Staging Rollout

Status: isolated Supabase and Vercel Preview foundations active; owner gate, Commerce health route, recovery-table security gate, and Stripe test webhook verified.

## Approved staging envelope

- Two Supabase preview branches are approved at `$0.01344` per branch-hour.
- Maximum lifetime: 30 days, ending no later than **2026-09-18**.
- Estimated maximum branch usage: **$19.63** before any applicable credits or taxes.
- Supabase Pro was activated on **2026-08-19** with **THE WELL TAROT, LLC** as the subscribing business.
- Website Auth/catalog branch: `v3-staging-30d` (`eydsnjawjhahtlbzwvlo`).
- Commerce branch: `v3-staging-30d` (`lqidrljskdpjlshtwfbv`).
- Both branches are data-isolated. The website branch contains the public product catalog seed only; no customer, Auth, order, entitlement, payment, analytics, or event data was copied.

## Pro-plan decision checkpoint

The two preview branches are temporary; Supabase Pro is the intended production baseline for customer identity, orders, entitlements, and recovery. The accepted justification is preventing production projects from pausing and retaining automatic backups for customer and payment-adjacent state.

Review the first complete billing period no later than **2026-09-18**, remove the two preview branches, and confirm actual recurring compute and usage costs. Compare the retained infrastructure value against another currently active subscription, but do not cancel another subscription merely to offset this cost; inventory its actual use and obtain a separate cancellation decision first.

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

## Payment security gate

Resolved on **2026-08-20**. `public.order_recovery_grants` uses the following server-only posture in both the Commerce source migrations and isolated staging branch:

```sql
alter table public.order_recovery_grants enable row level security;
revoke all on table public.order_recovery_grants from anon, authenticated;
grant all on table public.order_recovery_grants to service_role;
```

No browser-facing policy is required for this table because recovery is mediated by the signed Commerce service endpoints.

Verification confirmed that RLS is enabled, `anon` and `authenticated` have no direct table privileges, and `service_role` retains the required access. The Supabase advisor's informational “RLS enabled, no policy” notice is expected for this intentionally service-only table.

## Stripe staging webhook

Verified on **2026-08-20**:

- The enabled test-mode endpoint is `https://commerce-v3.no3dtools.com/api/stripe/webhook`.
- It subscribes only to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`, matching the Commerce handler registry.
- Stripe's signing secret is stored in Doppler `no3d-commerce/stg` and Vercel Preview; no secret value belongs in this document or repository.
- A fresh Stripe-originated `checkout.session.completed` event reached the endpoint, entered the isolated Commerce database, and completed once with no processing error.
- An older test endpoint containing a Vercel automation-bypass credential was removed after that credential appeared in diagnostic output; the owning `no3d-app` bypass was revoked and now has zero active automation-bypass credentials.

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
