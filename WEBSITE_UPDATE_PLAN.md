# No3d Tools Website — Update Plan

## Current State (March 2026)

The website is a vanilla HTML/CSS/JS single-page app on Vercel. It fetches products from Supabase via `/api/get-all-products` and renders a product grid + detail view.

**What works on the backend:** Stripe subscription checkout, webhook processing (invoice.paid, payment_failed, subscription events), license key generation, license email via Resend, license validation for Blender addon, presigned R2 downloads, presigned R2 manifest.

**What's broken on the frontend:** The checkout button still calls the deprecated Polar API. Subscription detection is hardcoded to `false`. Browser back button leaves the site. Dead UI elements (cart, search, popups) are visible but non-functional. No way for subscribers to see their license key or status on the website.

---

## The Complete Subscription Flow (Target State)

```
SUBSCRIBE FLOW:

1. User browses product grid on no3dtools.com
2. Clicks product → sees product detail page
3. Clicks "SUBSCRIBE" button
   → POST /api/create-checkout
   → Redirects to Stripe Checkout (monthly subscription)
4. User enters payment info on Stripe
5. Payment succeeds
   → Stripe fires invoice.paid webhook
   → /api/stripe-webhook.js processes:
     - Generates license key (NO3D-XXXX-XXXX-XXXX-XXXX)
     - Upserts subscription row in Supabase (status: active, expires: +30 days)
     - Sends license key email via Resend
6. Stripe redirects to /success.html?session_id=cs_xxx
   → Page fetches checkout details
   → Shows order confirmation + license key
   → Saves license key to localStorage
   → Links to billing portal for management
7. User receives email with license key

DOWNLOAD FLOW (returning subscriber):

1. User visits no3dtools.com
2. License key found in localStorage → validated against /api/validate
3. All product buttons show "DOWNLOAD" instead of "SUBSCRIBE"
4. User clicks "DOWNLOAD" on a product
   → GET /api/download/{handle}?license_key=NO3D-XXXX...
   → Returns presigned R2 URL (15-min TTL)
   → Browser downloads .blend file

BLENDER ADDON FLOW (existing, working):

1. User enters license key in Blender addon preferences
2. Addon validates: POST /api/validate { license_key }
3. Addon fetches manifest: GET /api/manifest?license_key=NO3D-XXXX...
4. Addon downloads assets: GET /api/download/{handle}?license_key=NO3D-XXXX...

ACCOUNT MANAGEMENT:

1. User visits /account.html
2. Enters email → POST /api/create-portal-session
3. Redirects to Stripe Billing Portal
   → Change payment method, cancel subscription, view invoices
```

---

## Fixes (Priority Order)

### 1. Replace Polar Checkout with Stripe

**Current:** BUY NOW handler (script.js ~line 327) calls `/api/polar-checkout-session` with Polar product/price IDs. Uses `window.Polar.EmbedCheckout` for an embedded modal. Completely broken — Polar is deprecated.

**Fix:**
- Replace BUY NOW handler with: POST to `/api/create-checkout` → redirect to `checkout_url`
- Button text: "SUBSCRIBE" (not "BUY NOW")
- Remove all Polar references: `polarProductId`, `polarPriceId`, `window.Polar.EmbedCheckout`
- Remove Polar embed script import from `index.html`
- No embedded modal — full-page redirect to Stripe Checkout
- Add loading state to prevent double-clicks

**The button has two states:**

| Visitor state | Button text | On click |
|---------------|-------------|----------|
| Guest / non-subscriber | SUBSCRIBE | POST `/api/create-checkout` → Stripe Checkout |
| Active subscriber | DOWNLOAD | GET `/api/download/{handle}?license_key=...` → browser download |

### 2. Subscription Status Detection

**Current:** `checkSubscriptionStatus()` returns `false` always. Everyone sees SUBSCRIBE.

**Fix — license key flow:**

```
Page load
  → Check localStorage for 'no3d_license_key'
  → If found, check cached validation ('no3d_license_valid', 'no3d_license_checked')
    → If cache < 1 hour old and valid: subscriber = true
    → If cache stale or missing: POST /api/validate { license_key }
      → Cache result in localStorage for 1 hour
      → If valid: subscriber = true, show DOWNLOAD buttons
      → If invalid: subscriber = false, clear cache, show SUBSCRIBE buttons
  → If no license key in localStorage: subscriber = false
```

**Where the license key enters localStorage:**
- **Primary:** Success page saves it after checkout (see fix #5)
- **Manual:** "Enter License Key" input on account page (see fix #7)
- **Returning:** Already in localStorage from a previous session

### 3. Download Flow for Subscribers

**Current:** DOWNLOAD button exists in HTML but its click handler is incomplete. No download logic is wired.

**Fix:**
- When subscriber clicks DOWNLOAD on a product:
  1. Get license key from localStorage
  2. `GET /api/download/{product.handle}?license_key=${licenseKey}`
  3. Response contains `{ url, expires_in, handle, checksum }`
  4. Create a temporary `<a>` element with `href=url`, `download=true`, click it
  5. Show brief "Downloading..." state on button
  6. Handle errors: expired key → prompt to re-subscribe, missing product → show error

### 4. Success Page — Show License Key + Save to localStorage

**Current:** success.html shows order confirmation and says "Check inbox for license email." Does not display the license key or save it anywhere on the client.

**Problem:** The webhook generates the license key asynchronously. By the time the success page loads, the webhook may not have fired yet. The success page calls `/api/get-checkout-details` which returns session info but NOT the license key (that's in the subscriptions table, keyed by customer ID).

**Fix — add license key polling:**

```
Success page loads
  → Fetch checkout details (customer email, total, products) — immediate
  → Start polling for license key:
    → GET /api/get-license-by-session?session_id=cs_xxx (new endpoint)
      → Looks up Stripe session → customer_id → subscriptions table → license_key
    → If found:
      → Display license key prominently on page
      → Save to localStorage: 'no3d_license_key'
      → Stop polling
    → If not found yet:
      → Show "Generating your license key..." with spinner
      → Retry every 3 seconds, max 10 attempts (30 seconds)
    → If still not found after 30s:
      → Show "License key will be emailed to {email}. Check your inbox."
      → Show "Didn't receive it? Contact support@no3dtools.com"
```

**New API endpoint needed:** `/api/get-license-by-session.js`
- Takes `session_id` query param
- Retrieves Stripe session → gets `customer` ID
- Queries Supabase `subscriptions` where `stripe_customer_id` = customer ID
- Returns `{ license_key, email, status, expires_at }` or `{ pending: true }`

### 5. Browser History for Product Navigation

**Current:** No `pushState`, no `popstate`. Back button leaves the site.

**Fix:**
- `selectProduct(id)`: `history.pushState({ product: id }, '', '?product={id}')`
- `deselectProduct()`: `history.pushState({ product: null }, '', pathname)`
- `popstate` listener: read `event.state.product`, navigate accordingly
- Page load: check `?product=` URL param for deep linking
- Remove existing `replaceState` in logo click (replaced by new deselect logic)

**Result:** Back/forward works between products. URLs are shareable.

### 6. Dead Code Cleanup

**Remove from HTML:**
- Cart icon + badge in header
- Theme toggle button in header
- Cart modal
- Checkout modal (old Polar embedded checkout)
- Landing popup modal
- Christmas popup modal
- Command palette / search modal
- Supabase JS CDN script tag (unused — API calls go through Vercel functions)
- Three.js import map (unused)
- Polar embed script tag (if present)

**Remove from JS initialization:**
- Calls to: `initializeCart()`, `initializeCheckoutModal()`, `initializeLandingPopup()`, `initializeChristmasPopup()`, `initializeThemeToggle()`, `initializeMobileSearch()`, `updateFooterShortcut()`, `updateFooterCommit()`
- Keep the empty function definitions (harmless, prevents reference errors)

**Fix "BECOME A MEMBER" buttons:**
- Wire to `/subscribe.html` or directly call `/api/create-checkout`

### 7. Account Page Improvements

**Current:** account.html has email lookup for Stripe billing portal. No license key display, no subscription status.

**Fix — three sections:**

**Section A: License Key Management**
- Show currently stored license key (from localStorage) with copy button
- "Enter License Key" input for returning subscribers (saves to localStorage)
- "Validate" button that checks `/api/validate` and shows status (active/grace/expired)

**Section B: Subscription Status**
- If license key is valid: show status (active), expiry date, next billing date
- If in grace period: show warning "Payment failed. Update your payment method within X days."
- If expired: show "Subscribe to regain access" with link to checkout

**Section C: Billing Portal** (existing)
- Email lookup → Stripe billing portal
- Manage payment method, view invoices, cancel

### 8. Payment Failure Notification

**Current:** When `invoice.payment_failed` fires, the webhook sets subscription to `grace` status with 7-day window. No notification is sent to the user. They discover access is revoked only when their Blender addon stops working.

**Fix:** Send an email on payment failure:
- Add email handler in webhook for `invoice.payment_failed` event
- Email content: "Your payment failed. You have 7 days to update your payment method before access is revoked."
- Include link to billing portal (Stripe portal URL or `/account.html`)
- Include link to update payment method

Similarly, send notification on `customer.subscription.deleted`:
- "Your subscription has been cancelled. You have access until {expires_at}."

### 9. Subscribe Page Fixes

**Current:** Fetches product count from GitHub API (fragile, rate-limited). No loading state on subscribe button.

**Fix:**
- Fetch product count from `/api/get-all-products` (or add a `/api/product-count` endpoint)
- Add loading state to subscribe button (prevent double-clicks)
- Add email pre-fill option (pass `?email=` param from account page)

---

## New API Endpoint Needed

### `/api/get-license-by-session.js`

```
GET /api/get-license-by-session?session_id=cs_xxx

1. Retrieve Stripe checkout session → get customer_id
2. Query Supabase: subscriptions WHERE stripe_customer_id = customer_id
3. If found: return { license_key, email, status, expires_at }
4. If not found: return { pending: true } (webhook hasn't fired yet)
```

This bridges the gap between Stripe checkout completion and license key availability on the success page.

---

## Implementation Order

```
Phase 1: Fix Checkout (ship together)
  1. Replace Polar checkout with Stripe         ← checkout is currently broken
  2. Subscription detection via license key      ← required for button states
  3. Download flow for subscribers               ← required for DOWNLOAD button
  4. Dead code cleanup + Polar removal           ← hygiene, ships with checkout fix

Phase 2: Post-Checkout Experience (ship together)
  5. Success page license key display + polling  ← critical for onboarding
  6. New API: /api/get-license-by-session        ← required by success page
  7. Account page improvements                   ← license management UI

Phase 3: Reliability + UX (ship independently)
  8. Payment failure email notification          ← prevents silent churn
  9. Browser history + deep links                ← UX improvement
  10. Subscribe page fixes                       ← minor polish
```

Phase 1 is the critical path — checkout is completely broken until this ships.
Phase 2 completes the subscriber onboarding experience.
Phase 3 is polish and reliability.

---

### 11. Subscriber Newsletter — Bi-Monthly Update Email

**Goal:** Active subscribers receive an email twice a month summarizing what's new in the library — new products added, products updated, changelog highlights.

**Data source:** The catalog changelog at `no3d-tools-library/CHANGELOG.md` (maintained by the sync agent) contains timestamped entries for every sync operation. The newsletter aggregates entries from the last ~15 days.

**Implementation:**

**Two-step process: draft → approve → send.** No automated email blasts. Ever.

**Step 1: Auto-generate draft** (scheduled or manual)
- A cron job or the sync agent generates a newsletter draft on the 1st and 15th
- Draft is written to `no3d-tools-library/newsletters/draft_{date}.md` as a markdown file
- A notification is sent to your phone: "Newsletter draft ready for review"
- The draft sits there until you approve it

**Step 2: Manual approval + send** (you)
- Review the draft in Obsidian — edit, rewrite, remove items, add personal notes
- When satisfied, run `/send-newsletter` (Claude Code skill) or click a button in the account dashboard
- Only then does the email go out

**API endpoints:**

`/api/newsletter/generate-draft.js` (cron-triggered)
- Queries recent changelog entries since last newsletter
- Compiles draft markdown with new products, updates, highlights
- Writes to `newsletters/` folder (or Supabase `newsletter_drafts` table)
- Sends ntfy notification: "Newsletter draft ready"
- Does NOT send any email

`/api/newsletter/send.js` (manual trigger only, requires auth)
- Reads the approved draft
- Queries Supabase `subscriptions` where `status = 'active'` and `newsletter_opted_out != true`
- Sends via Resend to all active subscribers
- Logs results to `newsletter_logs` table
- Protected: requires a secret token or admin auth (not publicly callable)

**Vercel Cron** only triggers draft generation, never sending:
```json
{
  "crons": [
    {
      "path": "/api/newsletter/generate-draft",
      "schedule": "0 16 1,15 * *"
    }
  ]
}
```
(Generates draft at 9am Mountain / 4pm UTC on the 1st and 15th)

**Email content structure:**
```
Subject: No3d Tools Library Update — {Month} {Year}

Hi {name or "there"},

Here's what's new in the No3d Tools library since your last update:

## New Products
- Dojo Support Bracket — Parametric support bracket with 5 adjustable inputs
- T-Slot Utilities — T-slot profile generation and assembly tools

## Updated Products
- Dojo Bool v5 — Updated description and documentation
- Chrome Crayon — New media assets added

## Changelog Highlights
- 12 products synced this period
- 3 new .blend files uploaded

Open Blender and sync your library to get the latest!

[Manage Subscription](https://no3dtools.com/account.html)
[Unsubscribe](https://no3dtools.com/api/unsubscribe?email={email}&token={token})
```

**Required additions:**
- Unsubscribe endpoint (`/api/unsubscribe.js`) — required by CAN-SPAM
- `newsletter_opted_out` column on `subscriptions` table (or separate table)
- Unsubscribe token generation (hash of email + secret, not guessable)
- Resend batch sending (or loop with rate limiting)

**Phase:** Ships after Phase 2 (needs subscriber email list and stable changelog data)

---

## What This Plan Does NOT Cover

- **Storefront redesign for subscription-only model.** The current layout shows products with individual prices. A future redesign should present the catalog as "all included with your subscription" — removing per-product pricing display, adding a prominent "Subscribe for access to all tools" banner, and restructuring the product page to emphasize subscription value. This is a design project, not a code fix.
- **Stripe webhooks raw body issue.** The webhook uses `JSON.stringify(req.body)` which may not match the original payload signature. This needs investigation but hasn't caused issues yet (Vercel may pass raw body correctly).
- **Rate limiting.** No endpoints have rate limiting. Not critical for current traffic levels but should be added before any marketing push.
- **Audit logging.** Downloads and license validations are not logged. Useful for analytics but not blocking.
- **Mobile-specific testing.** The mobile CSS exists but hasn't been audited against these changes.
