# Polar Downloadables API Reference

> Documentation compiled from Polar API exploration for NO3D Tools digital product delivery.
> Last Updated: December 2024

---

## Overview



Polar.sh uses a **two-token authentication system** for accessing downloadable files:

| Token Type | Purpose | How to Get |
|------------|---------|------------|
| **Organization Access Token** | Backend management APIs (products, customers, orders) | Generated in Polar Dashboard → Settings |
| **Customer Session Token** | Customer Portal APIs (downloadables, orders, subscriptions) | Created via `/v1/customer-sessions/` endpoint |

**Critical Insight**: You cannot access downloadable file URLs using only the Organization Access Token. You must create a Customer Session first.

---

## Authentication Flow for Downloads

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DOWNLOAD AUTHENTICATION FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User clicks "Download" on website                                   │
│     └─> POST /api/customer/download { productId: "xxx" }                │
│         └─> Header: Authorization: Bearer {our_session_token}           │
│                                                                          │
│  2. Backend validates OUR custom session (Redis)                        │
│     └─> Extract customerId from session                                 │
│                                                                          │
│  3. Backend creates POLAR Customer Session                              │
│     └─> POST /v1/customer-sessions/                                     │
│         └─> Body: { customer_id: "xxx" }                                │
│         └─> Auth: Bearer {POLAR_API_TOKEN} (Organization token)         │
│         └─> Returns: { token: "...", expires_at: "...", ... }           │
│                                                                          │
│  4. Backend fetches downloadables using POLAR session                   │
│     └─> GET /v1/customer-portal/downloadables/                          │
│         └─> Auth: Bearer {polar_session.token} (Customer token!)        │
│         └─> Returns: { items: [...downloadable files...] }              │
│                                                                          │
│  5. Backend matches downloadable to requested product                   │
│     └─> Use benefit_id to link downloadable to product                  │
│                                                                          │
│  6. Return download URL to frontend                                     │
│     └─> { downloadUrl: "...", expiresAt: "...", fileName: "..." }       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Reference

### 1. Create Customer Session

**Purpose**: Generate a temporary token to access Customer Portal APIs on behalf of a customer.

```
POST https://api.polar.sh/v1/customer-sessions/
Authorization: Bearer {POLAR_API_TOKEN}  ← Organization token
Content-Type: application/json

{
  "customer_id": "uuid-of-customer"
}

// Alternative: use external_id instead
{
  "external_customer_id": "your-system-customer-id"
}
```

**Response**:
```json
{
  "id": "session-uuid",
  "token": "polar_cs_xxxx...",       // ← USE THIS for Customer Portal APIs
  "expires_at": "2024-12-30T04:00:00Z",
  "customer_portal_url": "https://polar.sh/customer-portal/...",
  "customer_id": "customer-uuid",
  "customer": { ... full customer object ... }
}
```

**SDK Usage**:
```javascript
import { Polar } from '@polar-sh/sdk';

const polar = new Polar({ accessToken: process.env.POLAR_API_TOKEN });

const session = await polar.customerSessions.create({
  customerId: customerId,  // camelCase in SDK
});

// Response properties may be camelCase or snake_case depending on SDK version
const token = session.token;
const expiresAt = session.expiresAt || session.expires_at;
```

---

### 2. List Customer Downloadables

**Purpose**: Get all downloadable files available to a customer.

```
GET https://api.polar.sh/v1/customer-portal/downloadables/
Authorization: Bearer {customer_session_token}  ← Customer token, NOT org token!
```

**Query Parameters**:
- `organization_id` (optional): Filter by organization
- `benefit_id` (optional): Filter by specific benefit
- `limit` (optional): Max results (default 10, max 100)
- `page` (optional): Page number for pagination

**Response**:
```json
{
  "items": [
    {
      "id": "downloadable-uuid",
      "benefit_id": "benefit-uuid",    // ← Links to CustomerStateBenefitGrant
      "file": {
        "id": "file-uuid",
        "organization_id": "org-uuid",
        "name": "Product Name.zip",    // Original filename
        "path": "internal/path",
        "mime_type": "application/zip",
        "size": 12345678,              // Bytes
        "storage_version": "...",
        "checksum_etag": "...",
        "checksum_sha256_base64": "...",
        "checksum_sha256_hex": "...",
        "last_modified_at": "2024-12-15T10:00:00Z",
        "version": "...",
        "is_uploaded": true,
        "created_at": "2024-12-15T09:00:00Z",
        "size_readable": "11.77 MB",   // Human-readable size
        "download": {
          "url": "https://files.polar.sh/...",  // ← SIGNED DOWNLOAD URL
          "expires_at": "2024-12-30T04:00:00Z"  // ← URL expiration
        }
      }
    }
  ],
  "pagination": {
    "total_count": 5,
    "max_page": 1
  }
}
```

---

### 3. Get Customer State (for verification)

**Purpose**: Get customer's active subscriptions and granted benefits to verify access.

```
GET https://api.polar.sh/v1/customers/{customer_id}/state
Authorization: Bearer {POLAR_API_TOKEN}  ← Organization token
```

**Response Structure**:
```json
{
  "id": "customer-uuid",
  "email": "customer@example.com",
  "active_subscriptions": [
    {
      "id": "subscription-uuid",
      "product_id": "product-uuid",    // ← Links to product
      "status": "active",
      "amount": 1200,
      "currency": "usd",
      "recurring_interval": "month",
      "current_period_end": "2025-01-15T..."
    }
  ],
  "granted_benefits": [
    {
      "id": "grant-uuid",
      "benefit_id": "benefit-uuid",    // ← Links to downloadables via benefit_id
      "benefit_type": "downloadables", // Types: custom, discord, github_repository, downloadables, license_keys, meter_credit
      "granted_at": "2024-12-15T...",
      "properties": {
        "files": ["file-id-1", "file-id-2"]  // File IDs, NOT URLs
      }
    }
  ],
  "active_meters": [...]
}
```

---

## Benefit Types

| Type | Description | Properties |
|------|-------------|------------|
| `downloadables` | Digital file downloads | `{ files: ["file-id", ...] }` |
| `license_keys` | Software license keys | `{ license_key_id, display_key }` |
| `discord` | Discord role access | `{ guild_id, role_id, ... }` |
| `github_repository` | Private repo access | `{ repository_owner, repository_name, permission }` |
| `custom` | Custom benefit | `{}` (empty) |
| `meter_credit` | Usage credits | (linked via active_meters) |

---

## Linking Downloadables to Products

The challenge: Customer Portal downloadables don't include `product_id` directly. You must link them through benefits.

### Option A: Use Customer State + Downloadables Together

```javascript
// 1. Get customer state (with org token)
const state = await fetch(`/v1/customers/${customerId}/state`, {
  headers: { Authorization: `Bearer ${POLAR_API_TOKEN}` }
});

// 2. Build benefit_id → product_id mapping
// Note: Customer state doesn't directly link benefit to product
// You need to use the Benefits API or Products API to get this mapping

// 3. Get downloadables (with customer session token)
const downloadables = await fetch('/v1/customer-portal/downloadables/', {
  headers: { Authorization: `Bearer ${customerSession.token}` }
});

// 4. Match by benefit_id
const targetDownloadable = downloadables.items.find(d => 
  benefitIdsForProduct.includes(d.benefit_id)
);
```

### Option B: Use Benefits API to Get Product Association

```
GET /v1/benefits/{benefit_id}
Authorization: Bearer {POLAR_API_TOKEN}
```

Returns benefit details including which products it's attached to.

### Option C: Use Products API to Get Associated Benefits

```
GET /v1/products/{product_id}
Authorization: Bearer {POLAR_API_TOKEN}
```

Returns product with `benefits` array showing attached benefit IDs.

---

## Common Mistakes

### ❌ Wrong: Using Org Token for Customer Portal
```javascript
// This will NOT work - Customer Portal requires customer session token
await fetch('/v1/customer-portal/downloadables/', {
  headers: { Authorization: `Bearer ${process.env.POLAR_API_TOKEN}` }  // WRONG!
});
```

### ❌ Wrong: Trying to Extract URLs from Customer State
```javascript
// Customer state only has file IDs, not download URLs
const fileUrl = state.granted_benefits[0].properties.files[0];  // This is an ID, not a URL!
```

### ❌ Wrong: Hardcoding Download URLs
```javascript
// Download URLs are signed and expire - never cache or store them
const downloadUrl = "https://files.polar.sh/..."; // Will expire!
```

### ✅ Correct: Full Flow
```javascript
// 1. Create customer session
const session = await polar.customerSessions.create({ customerId });

// 2. Fetch downloadables with session token
const response = await fetch('/v1/customer-portal/downloadables/', {
  headers: { Authorization: `Bearer ${session.token}` }
});

// 3. Extract download URL from response
const downloadable = response.items[0];
const url = downloadable.file.download.url;
const expiresAt = downloadable.file.download.expires_at;
```

---

## NO3D Tools Implementation Notes

### Current Session Architecture

We use a **custom session system** (not Polar's customer sessions):

1. After checkout, we create a session in Redis with `customerId`
2. Frontend stores session token in cookie/localStorage
3. Each API request validates our session via Redis
4. For downloads, we create a **temporary** Polar customer session on-the-fly

### Why Two Session Systems?

- **Our sessions**: Long-lived, control our app's auth flow
- **Polar sessions**: Short-lived (1 hour default), only for Polar API access

### File: `/api/customer/download.js`

This endpoint:
1. Validates our custom session (Redis)
2. Creates temporary Polar customer session
3. Fetches downloadables from Customer Portal
4. Matches to requested product
5. Returns signed download URL

---

## Polar SDK Reference

```javascript
import { Polar } from '@polar-sh/sdk';

// Initialize with Organization Access Token
const polar = new Polar({
  accessToken: process.env.POLAR_API_TOKEN,
});

// Customer Sessions
await polar.customerSessions.create({ customerId });

// Customers
await polar.customers.get({ id: customerId });
await polar.customers.getState({ id: customerId });
await polar.customers.list({ organizationId });

// Products
await polar.products.get({ id: productId });
await polar.products.list({ organizationId });

// Benefits
await polar.benefits.get({ id: benefitId });
await polar.benefits.list({ organizationId });

// Orders
await polar.orders.get({ id: orderId });
await polar.orders.list({ customerId });
```

---

## Related Documentation

- [Polar API Reference](https://polar.sh/docs/api-reference/)
- [Customer Portal - Downloadables](https://polar.sh/docs/api-reference/customer-portal/downloadables/list)
- [Customer Sessions](https://polar.sh/docs/api-reference/customer-sessions/create)
- [Customer State](https://polar.sh/docs/api-reference/customers/state)

---

## Debugging Checklist

If downloads aren't working:

1. **Check benefit configuration**: Does the product have a "downloadables" benefit attached?
2. **Check file uploads**: Are files actually uploaded to the downloadables benefit?
3. **Verify customer access**: Does `GET /v1/customers/{id}/state` show `granted_benefits` with `benefit_type: "downloadables"`?
4. **Test customer session**: Can you create a session with `polar.customerSessions.create()`?
5. **Check downloadables response**: Does `/v1/customer-portal/downloadables/` return items?
6. **Verify benefit linkage**: Is the downloadable's `benefit_id` linked to the product?

---

*This document is part of the SOLVET Global project documentation.*
