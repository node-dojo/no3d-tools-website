# Supabase Realtime Setup

## ✅ What Was Implemented

### 1. Config API Endpoint
- **File**: `api/config.js`
- Returns public Supabase configuration (URL and anon key)
- Safe to expose - anon key is designed to be public

### 2. Realtime Subscription
- **File**: `script.js`
- Automatically subscribes to product changes in Supabase
- Listens for INSERT, UPDATE, DELETE events on `products` table
- Only listens for products with `status = 'active'`

### 3. Automatic Product Reload
- When a product change is detected via Realtime:
  - Reloads all products from Supabase
  - Re-organizes products by type
  - Re-renders sidebar and product grid
  - Updates current product display if one is selected

### 4. Supabase Client CDN
- Added to `index.html`
- Loads Supabase client library from CDN
- Available globally as `window.supabase`

## 🔧 Configuration Required

### Step 1: Enable Realtime in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Database** → **Replication**
4. Find the `products` table
5. Enable replication for the `products` table
6. Click **Enable** or toggle the switch

**Note**: Realtime uses PostgreSQL's logical replication, so it needs to be enabled per table.

### Step 2: Verify Environment Variables

Make sure these are set in Vercel:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...  # Public anon key
```

The config endpoint (`/api/config`) will automatically expose these to the frontend.

### Step 3: Test the Integration

1. Open the website in your browser
2. Open browser console (F12)
3. Look for: `✅ Supabase Realtime subscription active`
4. In Dashboard, press "Run Solvet" on a product
5. Watch the console - you should see:
   - `🔄 Product change detected via Realtime: UPDATE`
   - `✅ Products reloaded after Realtime update`
6. The website should automatically update without refresh!

## 📊 How It Works

### Flow Diagram

```
Dashboard → pushProduct() → Supabase (UPDATE)
                                    ↓
                          PostgreSQL Replication
                                    ↓
                          Supabase Realtime Server
                                    ↓
                          WebSocket Connection
                                    ↓
                          Website (script.js)
                                    ↓
                          loadProductsFromSupabase()
                                    ↓
                          Auto-refresh UI
```

### Event Types

The subscription listens for:
- **INSERT**: New product created
- **UPDATE**: Product updated (title, price, description, etc.)
- **DELETE**: Product deleted (though filtered to only active products)

### Filtering

Only active products trigger updates:
- Filter: `status=eq.active`
- Draft or archived products won't trigger website updates

## 🐛 Troubleshooting

### Realtime Not Connecting

**Check 1**: Is Realtime enabled for the `products` table?
- Go to Supabase Dashboard → Database → Replication
- Verify `products` table has replication enabled

**Check 2**: Are environment variables set?
- Check Vercel environment variables
- Test `/api/config` endpoint: `curl https://your-site.vercel.app/api/config`

**Check 3**: Check browser console
- Look for error messages
- Check if `window.supabase` is available

### Products Not Updating

**Check 1**: Is the product status `active`?
- Realtime filter only listens for `status = 'active'`
- Draft products won't trigger updates

**Check 2**: Check Supabase logs
- Go to Supabase Dashboard → Logs → Realtime
- Look for connection errors

**Check 3**: Check browser console
- Look for `🔄 Product change detected` messages
- Check for errors during reload

### Fallback Behavior

If Realtime fails:
- Website continues to work normally
- Products still load on page refresh
- No breaking errors - Realtime is optional

## 💰 Cost

- **Free Plan**: 2 million messages/month (plenty for product updates)
- **Pro Plan**: 5 million messages/month included
- **Your Usage**: ~1-2 messages per product update
- **Estimated Cost**: $0 (well within free tier)

## 🎯 Next Steps

1. Enable Realtime replication in Supabase Dashboard
2. Test by updating a product in Dashboard
3. Watch website auto-update without refresh
4. Monitor usage in Supabase Dashboard

---

**Status**: ✅ Implemented and ready to use  
**Last Updated**: 2025-01-XX


