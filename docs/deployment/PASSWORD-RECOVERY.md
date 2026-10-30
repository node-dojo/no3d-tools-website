# Managed password recovery

The shared account entry page offers **Forgot password?** in Sign in mode.
Account Details also links directly to recovery. The same entry page is used
when customers return from checkout or sign in from a Prints product.

Recovery sends an email through the existing Resend configuration. The link
opens `/v3/auth/reset-password/`, asks the customer to continue, and then accepts
and confirms a new password. Successful recovery signs the same identity back
in and returns to the requested account, order, or product page. Membership and
permanent purchase ownership are not rewritten.

The server generates Supabase recovery proof, seals it for this purpose, and
places it in a URL fragment. The page immediately clears that fragment and has
no analytics script. Opening the page alone does not consume the link. The
explicit Continue action exchanges it for an encrypted HttpOnly recovery cookie;
ordinary account cookies cannot authorize a password reset. Links expire after
15 minutes and are single-use. A separate rate limit applies to each recovery
action, and email requests return a generic response for unknown addresses.

Changing the password revokes refresh sessions and creates a fresh normal login.
Existing access JWTs remain subject to Supabase's normal expiry. If the password
changes but subsequent sign-in fails, the page confirms the change and offers
sign-in instead of falsely reporting that the old password still applies.

## Configuration

Recovery uses existing server configuration: `NO3D_SITE_URL`,
`NO3D_AUTH_STATE_SECRET`, Supabase Auth keys, `RESEND_API_KEY`, and `FROM_EMAIL`.
No database migration or Commerce deployment is required. Staging retains its
owner gate; the reset and account-entry pages are public shells, but their
authentication APIs still enforce the allowed-email list.

## Verification

```sh
npm test
npm run acceptance:password-reset
doppler run --project no3dtools --config stg -- npm run acceptance:password-reset:staging -- --apply
```

The local browser scenario covers desktop/mobile, a fresh browser for the email
link, confirmation mismatch, return to Prints, and expired/reused links. Unit
tests also cover cross-origin requests, identity mismatch, unknown addresses,
recovery-cookie isolation, revocation, and retry after a rejected password.

The staging script is restricted to the staging site and Supabase project. It
uses the existing dedicated acceptance account, changes its password through
the UI, checks old/new password sign-in and membership, rejects link/cookie
replay, and restores the original fixture password in `finally`. It retrieves
the emitted link from Resend in memory; it does not expose credentials or links
in its receipt. This proves the application email callback, separately from
inbox reception.

For a synthetic acceptance mailbox, set `NO3D_E2E_DELIVERY_EMAIL` to an existing,
allowed staging account with a reachable inbox. The additional UI request checks
delivery without changing that account's password. Independently inspect the
received inbox message. Report these as separate checks; a provider's `sent`
event alone is not proof of inbox delivery.

Receipts and screenshots are written under `/tmp/no3d-password-reset-*`.
Never copy email grants, cookies, passwords, or raw mail bodies into release
receipts. Public production smoke checks should not change a real member's
password.
