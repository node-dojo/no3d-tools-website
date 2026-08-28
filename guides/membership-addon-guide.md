# No3D Tools Extension — Install & Usage Guide

## What It Does

The No3D Tools extension syncs your entitled No3D Tools asset library directly into Blender. Membership products and permanently purchased products appear in Blender's Asset Browser, ready to drag into any project. New and updated assets can sync automatically when you open Blender.

---

## Requirements

- Blender 5.0 or newer
- An active membership, one or more individually purchased products, or a free No3D Tools account
- A membership license key or a purchase-connected account

---

## Installation

### Step 1: Add the No3D Tools Repository

On the computer where Blender is installed, open the [No3D Tools setup page](https://no3dtools.com/v3/account/?state=install) and click **Open in Blender**. This adds the official No3D Tools repository to Blender's native Extensions system.

### Step 2: Install in Blender

1. Open Blender
2. Go to **Edit → Preferences → Get Extensions**
3. Find **No3D Tools** in the No3D Tools repository
4. Click **Install**

### Step 3: Open the Extension Preferences

1. Go to **Edit → Preferences → Add-ons**
2. Search for **No3D Tools**
3. Expand the extension preferences

Manual ZIP installation remains available from the setup page as a fallback. Native repository installation is recommended because Blender can deliver extension updates automatically.

---

## Setup

### Enter Your License Key

1. In the addon preferences (Edit → Preferences → Add-ons → No3d Tools Membership), find the **License** section
2. Paste your license key into the **Key** field
   - Format: `NO3D-XXXX-XXXX-XXXX-XXXX`
   - Your key was emailed to you after subscribing
3. Click **Validate**
4. Status should show: **Active** ✓

If you don't have your license key:
- Check your email for "No3d Tools — Your License Key"
- Visit [no3dtools.com/v3/account/](https://no3dtools.com/v3/account/) to look it up

### Set Your Library Path

The addon stores synced assets in a local folder. The default is `~/no3d-tools-library/`.

To change it:
1. In the addon preferences, find the **Library** section
2. Click the folder icon next to **Path**
3. Choose where you want your assets stored
4. The folder will be created automatically if it doesn't exist

### Sync Your Library

1. Click **Sync Now** in the addon preferences
2. The addon will:
   - Validate your license
   - Download the asset manifest
   - Download all .blend files that are new or updated
   - Skip files that haven't changed (checksum-based)
3. First sync downloads the entire library (~500MB depending on your plan)
4. Future syncs only download what's changed (usually <10MB)

### Enable Auto-Sync

Check **"Sync on startup"** to automatically sync when Blender opens. The sync runs in the background — it won't block you from working.

### Connect Individually Purchased Products

1. In the No3D Tools preferences, click **Connect Purchases**
2. Approve the connection in the browser window that opens
3. Return to Blender and click **Restore Purchases**
4. Your permanently purchased products are added to the managed Asset Library

---

## Using Your Assets

### Open the Asset Browser

1. In any Blender workspace, open the **Asset Browser** (or change a panel to Asset Browser type)
2. In the dropdown at the top left, select **NO3D Tools**
3. All your synced assets will appear

### Using Assets in Your Scene

- **Geometry Node tools**: Drag onto any mesh object to add as a modifier
- **Materials**: Drag onto any object to apply
- **Mesh objects**: Drag into the viewport to add to your scene
- **Collections**: Drag to instance an entire collection

### Browsing by Category

Assets are organized by Blender's catalog system. Use the sidebar in the Asset Browser to filter by category (tools, materials, objects, etc.).

---

## Managing Your Subscription

### Check Status

In the addon preferences, the **Status** line shows:
- **Active** ✓ — Your subscription is current
- **Grace Period** ⚠ — Payment failed, you have 7 days to update your payment method
- **Expired** ✗ — Subscription ended, sync disabled

### Update Payment / Cancel

Visit [no3dtools.com/v3/account/](https://no3dtools.com/v3/account/) to:
- View your subscription status
- Update your payment method
- Cancel your subscription
- Access Stripe's billing portal

### Re-subscribe

If your subscription expired, visit [the NO3D Tools membership page](https://no3dtools.com/v3/membership/) to re-subscribe. Your existing license key will be reactivated — you don't need a new one.

---

## Troubleshooting

### "Invalid license key"
- Make sure you copied the full key including the `NO3D-` prefix
- Check for extra spaces before or after the key
- Verify your subscription is active at [no3dtools.com/v3/account/](https://no3dtools.com/v3/account/)

### "Sync failed"
- Check your internet connection
- Try clicking **Validate** first, then **Sync Now**
- If the error persists, the server may be temporarily down — try again in a few minutes

### Assets not showing in Asset Browser
- Make sure the **NO3D Tools** library is selected in the Asset Browser dropdown (top left)
- Try closing and reopening the Asset Browser
- Check that the library path in addon preferences points to the correct folder
- Run **Sync Now** to refresh

### Extension not appearing in Preferences
- Confirm the No3D Tools repository is enabled in **Preferences → Get Extensions**
- Restart Blender after installation
- Check that you're running Blender 5.0 or newer

### Lost your license key
- Check your email for "No3d Tools — Your License Key"
- Visit [no3dtools.com/v3/account/](https://no3dtools.com/v3/account/) and enter your email
- Contact support if you can't find it

---

## Quick Reference

| Action | How |
|--------|-----|
| Install extension | Setup page → Open in Blender → Get Extensions → Install |
| Enter license key | Addon preferences → License → Key field → Validate |
| Sync assets | Addon preferences → Sync Now |
| Auto-sync | Addon preferences → check "Sync on startup" |
| Browse assets | Asset Browser → select "NO3D Tools" library |
| Use a tool | Drag from Asset Browser onto a mesh object |
| Manage subscription | [no3dtools.com/v3/account/](https://no3dtools.com/v3/account/) |
| Get support | [no3dtools.com](https://no3dtools.com) |
