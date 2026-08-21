# V3 end-to-end customer release

## Release objective

Promote the approved V3 surfaces from a visual adjacent tranche into one staged customer journey without changing the production root:

`catalog → product → acquisition → managed account → entitlement/library → Blender install/connect → billing or recovery`

The release is complete only when both an individual purchaser and a member can leave, return, authenticate, and recover the same effective library.

## Customer routes

| Customer need | V3 route | Authority |
| --- | --- | --- |
| Browse and search | `/v3/` | Website catalog |
| Evaluate an instrument | `/v3/product/?handle=...` | Website catalog metadata + Commerce/Stripe price and availability |
| Understand full-catalog access | `/v3/membership/` | Website presentation + Stripe price |
| Create or enter an account | `/v3/onboarding/create-account/` | Website Supabase Auth |
| Install and connect Blender | `/v3/account/?state=install` and `?state=connect` | Website session + Commerce device grant |
| View the effective library | `/v3/account/` | Commerce purchases plus current membership compatibility read |
| Return from an individual purchase | `/v3/account/orders/:orderId` | Commerce order and recovery contract |
| Return from membership checkout | `/v3/account/?membership_checkout=success&session_id=...` | Stripe fulfillment + verified website identity |
| Manage billing | Account `Manage billing` | Commerce portal for product customers; authenticated Stripe portal for current members |

## Authority boundary

- NO3D Commerce remains authoritative for individual orders, Stripe Customer mappings, permanent entitlements, refunds, recovery grants, and Blender device grants.
- Stripe Price objects remain the financial record; V3 reads their validated public amount through Commerce and never treats the website catalog price column as purchasable authority.
- Website Supabase Auth remains authoritative for the managed site session.
- The existing website subscription table remains a temporary compatibility source for membership status while the already-live subscription rail is moved into Commerce. V3 reads it only after verified authentication and never accepts a browser-supplied email for membership lookup or portal access.
- Active membership expands the account inventory from the live catalog; permanent purchases retain their distinct source and survive membership cancellation.
- No browser return is considered payment proof. Individual fulfillment comes from Commerce. Membership return polls the existing Stripe-backed fulfillment endpoint and requires the checkout email to match the verified account before presenting completion.

## Acceptance gates

### Automated

- `npm test`
- `npm run acceptance:v3`
- `NO3D_E2E_EMAIL=<owner email> npm run acceptance:v3:commerce -- --apply`
  creates a Stripe test-mode product order, waits for Commerce fulfillment,
  claims the guest purchase into the managed account, verifies the signed
  download, and confirms membership Checkout remains test-only.
- `npm run acceptance:v3:device -- --apply` uses the isolated staging
  acceptance account to approve a Blender device grant, verify the purchased
  asset in the filtered manifest, exercise its signed download, and rotate the
  device refresh token.
- `npm run acceptance:v3:membership -- --apply` creates and fulfills a Stripe
  test subscription, verifies full-catalog Account and Blender access, opens
  the authenticated billing portal, cancels the subscription, and proves that
  membership-only access expires while a permanent purchase survives.
- `npm run acceptance:v3:refund -- --apply` purchases a disposable product,
  verifies Account and Blender ownership, issues a full Stripe test refund,
  and proves that fulfillment, entitlement, manifest, and download access are
  revoked without affecting an unrelated permanent purchase.
- `npm run acceptance:v3:refund -- --apply --require-repeat` repeats the same
  product purchase after a prior full refund and proves that a revoked source
  order does not prevent a new paid entitlement from fulfilling normally.
- `npm run acceptance:v3:recovery -- --apply` creates a temporary confirmed
  Supabase Auth identity, fulfills a guest purchase, issues and redeems a
  one-time Commerce recovery grant with verified identity proof, rejects token
  replay, refunds the fixture order, and deletes the temporary Auth user.
- `npm run acceptance:v3:free -- --apply` temporarily designates one unowned
  staging fixture as free, verifies Account visibility, device-manifest access,
  and R2 delivery without Checkout, then restores the original catalog policy
  and manifest bytes in `finally`.
- `npm audit`
- `git diff --check`
- Mobile and desktop checks for Home, Product, Membership, account entry, install, connect, completion, free/purchased account, and active-member account.

### Staging transaction matrix

Verified on 2026-08-20: owner gate; Commerce-backed public price; individual
Stripe test Checkout; Commerce `paid`/`fulfilled` projection; signed product
download; guest-purchase claim into a managed account; permanent inventory in
Account; device grant start, approval, and exchange; purchase-filtered Blender
manifest; device-authenticated download; refresh-token rotation; membership
activation; authenticated billing portal; immediate cancellation and expiry;
full-catalog Account expansion (50 entries); full published Blender catalog
(47 assets); fallback to the permanent Apple MagSafe purchase; full refund
revocation of a disposable Dojo Knob order; successful repeat purchase after
that refund; and one-time guest-order recovery into a fresh verified managed
identity with replay rejection and cleanup. The free-library rows remain
intentionally unpopulated until canonical free products and their access-policy
contract are designated.

1. Signed-out and non-owner access fail closed; an owner account enters once through NO3D Auth.
2. Mobile account creation sends desktop setup continuation and proceeds into the usable account.
3. Desktop installs the native extension and approves a returned device code.
4. Individual test Checkout returns to `/v3/account/orders/:orderId`; its webhook fulfills once and the product appears in Account.
5. The owned-product download verifies the Commerce order and returns only that product.
6. Membership test Checkout returns to the V3 account; the verified matching account becomes a member and shows the full current catalog.
7. Member billing portal returns to V3; cancellation/expiry removes membership-only inventory while permanent purchases remain.
8. Refund/revocation removes only its source product from Account and Blender after refresh.
9. Production URLs, Stripe live mode, Supabase production data, and existing extension clients remain unchanged throughout staging.

## Promotion and rollback

Promotion is a routing change after the matrix passes, not a copy of V3 markup into legacy pages. Keep the legacy pages intact for one observation window. Rollback restores the old entry routes while retaining the additive V3 code and unchanged backend contracts.

The membership compatibility read is allowed for this release but is not the final architectural destination. Moving recurring checkout and subscription lifecycle into Commerce is a named post-acceptance migration, not an invisible permanent fork.
