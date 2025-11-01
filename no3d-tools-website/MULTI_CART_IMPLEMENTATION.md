# Multi-Product Cart Checkout Implementation

## Overview

This implementation enables purchasing multiple products in a single checkout session using Polar's Checkouts API.

## Architecture

### 1. Frontend (script.js)
- Shopping cart stores product IDs in localStorage
- `handleCheckout()` function calls serverless API with cart items
- Redirects to Polar checkout URL on success

### 2. Backend (api/create-checkout.js)
- Vercel serverless function
- Creates multi-product checkout session via Polar SDK
- Returns checkout URL to frontend

### 3. Configuration
- `.env` - Local environment variables (not in git)
- `.env.example` - Template for environment setup
- `vercel.json` - Vercel deployment configuration

## Files Changed

1. **api/create-checkout.js** (NEW)
   - Serverless function for creating Polar checkout sessions
   - Accepts array of product IDs
   - Returns checkout URL

2. **script.js** (UPDATED)
   - `handleCheckout()` - Now calls serverless API
   - Handles loading states and errors
   - Redirects to multi-product checkout

3. **package.json** (UPDATED)
   - Added `@polar-sh/sdk` dependency

4. **vercel.json** (UPDATED)
   - Added API function configuration
   - Added environment variable reference

5. **success.html** (NEW)
   - Post-checkout success page
   - Clears cart after successful purchase

6. **.env.example** (NEW)
   - Template for environment variables

## Testing

### Local Testing with Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link project:
   ```bash
   vercel link
   ```

4. Set environment variables:
   ```bash
   vercel env add POLAR_API_TOKEN
   ```
   Paste your API token when prompted.

5. Run dev server:
   ```bash
   npm run dev
   ```

6. Test multi-product checkout:
   - Add 2+ products to cart
   - Click "Checkout" button
   - Should redirect to Polar checkout with all items

### Production Testing

1. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

2. Ensure environment variables are set in Vercel dashboard:
   - Settings → Environment Variables
   - Add `POLAR_API_TOKEN`

3. Test on production URL

## API Endpoint

### POST /api/create-checkout

**Request:**
```json
{
  "productIds": [
    "caa98690-507b-43ef-8438-7262e0bd0b64",
    "56ab4bb1-a5f9-42ba-9ab7-9662b397c300"
  ]
}
```

**Response (Success):**
```json
{
  "url": "https://polar.sh/checkout/...",
  "id": "checkout_id",
  "error": null
}
```

**Response (Error):**
```json
{
  "url": null,
  "error": "Error message"
}
```

## Environment Variables

Required in Vercel dashboard:

- `POLAR_API_TOKEN` - Your Polar API access token

## Cart Flow

1. User adds products to cart → stored in localStorage
2. User clicks "Checkout" button
3. Frontend calls `/api/create-checkout` with product IDs
4. Serverless function creates Polar checkout session
5. Frontend redirects to Polar checkout URL
6. After purchase, user redirected to `/success.html`
7. Success page clears cart from localStorage

## Error Handling

- Empty cart → Alert message
- API failure → Error alert with retry option
- Network error → User-friendly error message
- Loading states during API call

## Security

- API token never exposed to frontend
- Serverless function validates all inputs
- CORS headers configured for security
- Environment variables stored securely in Vercel

## Future Enhancements

1. **Embedded Checkout Modal**
   - Keep users on site during checkout
   - Install `@polar-sh/checkout` package
   - Use `PolarEmbedCheckout.create()`

2. **Webhook Integration**
   - Listen for successful payments
   - Automatically clear cart server-side
   - Send confirmation emails

3. **Cart Persistence**
   - Sync cart across devices for logged-in users
   - Database storage instead of localStorage

4. **Discount Codes**
   - Apply discounts to multi-product carts
   - Pass discount info to Polar API

## Troubleshooting

### API returns 500 error
- Check Vercel logs
- Verify `POLAR_API_TOKEN` is set
- Ensure product IDs are valid

### Checkout button does nothing
- Check browser console for errors
- Verify `/api/create-checkout` endpoint exists
- Test API endpoint directly

### Cart not clearing after purchase
- Check if `/success.html` is being reached
- Verify localStorage is not blocked
- Check browser privacy settings

## Resources

- [Polar Checkouts API](https://docs.polar.sh/features/checkout/session)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Polar SDK Documentation](https://www.npmjs.com/package/@polar-sh/sdk)
