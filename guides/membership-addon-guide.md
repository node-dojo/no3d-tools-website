# No3d Tools Membership — Install & Usage Guide

## What It Does

The No3d Tools Membership addon syncs your entire No3d Tools asset library directly into Blender. Once installed and activated with your license key, every asset — geometry node tools, materials, mesh objects — appears in Blender's Asset Browser, ready to drag into any project. New assets are synced automatically when you open Blender.

---

## Requirements

- Blender 4.5 or newer
- An active No3d Tools subscription ([subscribe here](https://no3dtools.com/subscribe.html))
- Your license key (sent to your email after subscribing)

---

## Installation

### Step 1: Download the Addon

Download the latest `no3d_tools_membership.zip` from the link in your license key email, or from your [account page](https://no3dtools.com/account.html).

### Step 2: Install in Blender

1. Open Blender
2. Go to **Edit → Preferences → Add-ons**
3. Click **Install...** (top right)
4. Navigate to the downloaded `no3d_tools_membership.zip`
5. Click **Install Add-on**

### Step 3: Enable the Addon

1. In the Add-ons list, search for **"No3d Tools Membership"**
2. Check the box to enable it
3. The addon preferences panel will expand

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
- Visit [no3dtools.com/account.html](https://no3dtools.com/account.html) to look it up

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

Visit [no3dtools.com/account.html](https://no3dtools.com/account.html) to:
- View your subscription status
- Update your payment method
- Cancel your subscription
- Access Stripe's billing portal

### Re-subscribe

If your subscription expired, visit [no3dtools.com/subscribe.html](https://no3dtools.com/subscribe.html) to re-subscribe. Your existing license key will be reactivated — you don't need a new one.

---

## Troubleshooting

### "Invalid license key"
- Make sure you copied the full key including the `NO3D-` prefix
- Check for extra spaces before or after the key
- Verify your subscription is active at [no3dtools.com/account.html](https://no3dtools.com/account.html)

### "Sync failed"
- Check your internet connection
- Try clicking **Validate** first, then **Sync Now**
- If the error persists, the server may be temporarily down — try again in a few minutes

### Assets not showing in Asset Browser
- Make sure the **NO3D Tools** library is selected in the Asset Browser dropdown (top left)
- Try closing and reopening the Asset Browser
- Check that the library path in addon preferences points to the correct folder
- Run **Sync Now** to refresh

### Addon not appearing in Preferences
- Make sure you installed the `.zip` file, not an extracted folder
- Restart Blender after installation
- Check that you're running Blender 4.5 or newer

### Lost your license key
- Check your email for "No3d Tools — Your License Key"
- Visit [no3dtools.com/account.html](https://no3dtools.com/account.html) and enter your email
- Contact support if you can't find it

---

## Quick Reference

| Action | How |
|--------|-----|
| Install addon | Edit → Preferences → Add-ons → Install → select .zip |
| Enter license key | Addon preferences → License → Key field → Validate |
| Sync assets | Addon preferences → Sync Now |
| Auto-sync | Addon preferences → check "Sync on startup" |
| Browse assets | Asset Browser → select "NO3D Tools" library |
| Use a tool | Drag from Asset Browser onto a mesh object |
| Manage subscription | [no3dtools.com/account.html](https://no3dtools.com/account.html) |
| Get support | [no3dtools.com](https://no3dtools.com) |
