# Gift Card & Credit Balance System

## Overview

The gift card system uses a customer credit balance approach, allowing partial redemption across multiple purchases. When a customer purchases a gift card, we:

1. Generate a unique code (format: `DOJO-XXXX-XXXX-XXXX`)
2. Store the code in Vercel KV with its value
3. Email the code to the purchaser via Resend

The recipient can then redeem the code on their account page, adding the value to their credit balance. Credits can be used partially across multiple purchases.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    GIFT CARD & CREDIT FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PURCHASE                                                     │
│     Customer buys gift card on no3d.tools                       │
│     → Polar checkout processes payment                          │
│                                                                  │
│  2. WEBHOOK (order.created)                                      │
│     → Polar sends webhook to /api/v1/webhooks/polar             │
│     → We detect gift card product ID                            │
│     → Generate unique code: DOJO-XXXX-XXXX-XXXX                 │
│     → Store code in Vercel KV with value                        │
│                                                                  │
│  3. EMAIL                                                        │
│     → Send beautiful email via Resend                           │
│     → Contains the gift card code in big bold letters           │
│     → Purchaser forwards/gives code to recipient                │
│                                                                  │
│  4. REDEMPTION (on account page)                                 │
│     → Recipient goes to no3d.tools/account.html                 │
│     → Enters gift card code                                     │
│     → Code is validated and marked as redeemed                  │
│     → Value is added to their credit balance                    │
│                                                                  │
│  5. CHECKOUT WITH CREDIT                                         │
│     → Customer goes to checkout                                  │
│     → System detects stored email & credit balance              │
│     → Creates dynamic Polar discount for credit amount          │
│     → Credit is debited after successful payment (webhook)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Gift Card Products

| Handle | Product ID | Value |
|--------|------------|-------|
| christmas-gift-card-33 | c36ce649-f55f-4901-a8a0-339ca41deb27 | $33 |
| christmas-gift-card-111 | 7d677970-f244-48fa-aba9-e1e91c977a88 | $111 |
| christmas-gift-card-222 | ea5c5645-eea2-46b0-ae23-86061fd432a7 | $222 |

## Required Environment Variables

```bash
# Polar API (already configured)
POLAR_API_TOKEN=your_polar_api_token
POLAR_ORGANIZATION_ID=f0c16049-5959-42c9-8be8-5952c38c7d63
POLAR_WEBHOOK_SECRET=your_webhook_secret

# Resend Email (required for gift cards)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=gifts@no3d.tools  # Must be verified in Resend

# Upstash Redis (required for credit storage)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

## Setting Up Upstash Redis

Redis secrets are stored in **Doppler** and synced to Vercel.

### Setup Steps

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Add to Doppler:
   ```bash
   doppler secrets set UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
   doppler secrets set UPSTASH_REDIS_REST_TOKEN="your_token"
   ```
5. Sync to Vercel (if using Doppler-Vercel integration)

## API Endpoints

### Credit Balance

**GET /api/credit/balance?email={email}**

Returns the customer's credit balance.

```json
{
  "success": true,
  "email": "customer@example.com",
  "balance": 11100,
  "balanceFormatted": "$111.00",
  "lastUpdated": "2024-12-21T10:30:00Z"
}
```

### Redeem Gift Card

**POST /api/credit/redeem**

```json
{
  "code": "DOJO-A3BK-7NWP-2XYZ",
  "email": "customer@example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "$111.00 credit added to your account!",
  "valueAdded": 11100,
  "valueAddedFormatted": "$111.00",
  "newBalance": 11100,
  "newBalanceFormatted": "$111.00"
}
```

### Transaction History

**GET /api/credit/history?email={email}&limit={limit}**

Returns credit transaction history.

### Apply Credit to Checkout

**POST /api/credit/apply-to-checkout**

Creates a Polar checkout with credit applied as a discount.

```json
{
  "email": "customer@example.com",
  "productId": "product-uuid",
  "successUrl": "https://no3d.tools/success"
}
```

## Files

### Core Credit System
- `lib/credit.js` - Shared credit utility functions (Upstash Redis operations)
- `api/credit/balance.js` - Get credit balance
- `api/credit/redeem.js` - Redeem gift card code
- `api/credit/history.js` - Get transaction history
- `api/credit/apply-to-checkout.js` - Create checkout with credit

### Gift Card System
- `api/gift-cards/generate.js` - Code generation & KV storage
- `api/gift-cards/email.js` - Email template & sending via Resend
- `api/v1/webhooks/polar.js` - Webhook handler (detects gift card purchases, handles credit debiting)

### Frontend
- `account.html` - Credit balance display, redemption UI, transaction history
- `script.js` - Checkout flow with automatic credit application

## Upstash Redis Storage Schema

```
credit:balance:{email}     → { balance: cents, lastUpdated: ISO }
credit:txn:{email}:{id}    → { type, amount, source, reference, balanceAfter, createdAt }
credit:txn:index:{email}   → [txnId1, txnId2, ...]
credit:giftcard:{code}     → { code, value, purchaserEmail, recipientEmail, redeemedAt }
credit:pending:{discountId} → { email, amount, checkoutId } (TTL: 1 hour)
```

## Testing

1. Purchase a gift card on the website
2. Check webhook logs for code generation and KV storage
3. Verify email is sent (check Resend dashboard)
4. Log in to account page and redeem the code
5. Verify credit balance increases
6. Make a purchase and verify credit is applied
7. Check that credit balance decreases after successful payment

## Discount Code Format

Codes are generated in the format: `DOJO-XXXX-XXXX-XXXX`

- Prefix: `DOJO` (brand identifier)
- Characters: Uppercase letters + numbers (excluding 0, O, 1, I to avoid confusion)
- Example: `DOJO-A3BK-7NWP-2XYZ`

## Key Features

### Partial Redemption
Unlike traditional discount codes, credit can be used partially:
- Buy a $111 gift card
- Use $50 on first purchase → $61 remains
- Use $61 on second purchase → $0 remains

### Email-Based Identity
- Credits are tied to email addresses
- No login required - just enter email when redeeming
- Email is stored in localStorage after first purchase for automatic credit detection

### Dynamic Discounts
At checkout:
1. System checks credit balance for stored email
2. Creates a single-use Polar discount for applicable amount
3. Applies discount to checkout session
4. On successful payment (via webhook), credit is debited

### Single-Use Gift Cards
- Each gift card code can only be redeemed once
- Code is marked as redeemed after successful redemption
- Attempting to reuse returns error message

## Limitations

- Credit cannot be refunded back to a gift card
- Credits don't expire (can add expiration later if needed)
- Cannot use credit on subscription renewals (only initial purchase)
- Multiple products in cart: credit only applies to single-product checkouts

## Future Enhancements

- [ ] Credit expiration dates
- [ ] Multi-product checkout with credit
- [ ] Credit for subscription renewals
- [ ] Admin panel for credit management
- [ ] Email notification when credit is used
