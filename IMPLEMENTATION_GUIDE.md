# SOLVET System - Automation Implementation Guide
## Complete Product Sync: no3d-tools-library → Website + Polar

**Status**: ✅ Implementation Complete - Ready for Testing

---

## What's Been Built

A fully automated system that synchronizes products from your private `no3d-tools-library` repository to:

1. **no3d-tools-website** - Public product images and metadata
2. **Polar.sh** - Secure .blend file hosting and e-commerce

**Trigger**: Push to `main` branch in no3d-tools-library
**Result**: Products automatically published everywhere

---

## Files Created

### Configuration & Templates

```
solvet-system/
├── AUTOMATION_SETUP.md                    # Complete setup instructions
└── templates/
    └── product-metadata-template.json     # JSON template for products
```

### Automation Scripts

```
no3d-tools-library/
├── .github/
│   └── workflows/
│       └── sync-products.yml              # Main GitHub Actions workflow
├── scripts/
│   ├── sync-to-polar.js                   # Polar upload automation
│   ├── sync-images-to-website.sh          # Image sync script
│   └── test-polar-connection.js           # API connection test
├── package.json                           # Node.js dependencies
├── .gitignore                             # Security (excludes secrets)
└── AUTOMATION.md                          # User documentation
```

---

## Next Steps (In Order)

### Step 1: Install Dependencies

```bash
cd no3d-tools-library
npm install
```

This installs `@polar-sh/sdk` for Polar API integration.

---

### Step 2: Generate API Tokens

#### A. Polar API Token

1. Visit [polar.sh](https://polar.sh)
2. Go to Settings → API → Access Tokens
3. Click "Create New Token"
4. **Scopes** (select all three):
   - ✅ `products:write`
   - ✅ `benefits:write`
   - ✅ `files:write`
5. Copy the token (you won't see it again!)
6. Copy your Organization ID from Settings → General

#### B. GitHub Personal Access Token

1. Visit [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. **Scopes**:
   - ✅ `repo` (full control of private repositories)
   - ✅ `workflow` (update GitHub Actions workflows)
4. Expiration: 90 days recommended
5. Copy the token

---

### Step 3: Add GitHub Secrets

In the **no3d-tools-library** repository:

```bash
cd no3d-tools-library

# Add secrets via GitHub CLI
gh secret set POLAR_API_TOKEN
# Paste Polar token when prompted

gh secret set POLAR_ORG_ID
# Paste Polar org ID

gh secret set PAT_REPO_ACCESS
# Paste GitHub PAT

gh secret set WEBSITE_REPO
# Enter: node-dojo/no3d-tools-website
```

Or via GitHub web UI:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret" for each

---

### Step 4: Test Polar Connection

Before running automation, test that Polar API access works:

```bash
cd no3d-tools-library

POLAR_API_TOKEN="your-token-here" \
POLAR_ORG_ID="your-org-id-here" \
npm run test:polar
```

**Expected output**:
```
✅ All tests passed!
Your Polar API connection is working correctly.
```

If you see errors, check:
- Token has correct scopes
- Organization ID is correct UUID format
- Token hasn't expired

---

### Step 5: Prepare a Test Product

Before enabling automation for all products, test with one:

#### Option A: Use Existing Product

Pick an existing product folder (e.g., "Dojo Bool v5") and verify it has:

```bash
ls "Dojo Bool v5"
```

Required files:
- ✅ `Dojo Bool v5.blend` - Product file
- ✅ `Dojo Bool v5.json` - Metadata
- ✅ `icon_Dojo Bool v5.png` - Icon image

#### Option B: Create Test Product

```bash
mkdir "Dojo Test Product"
cd "Dojo Test Product"

# Create a small test .blend file
# Or copy an existing one
cp "../Dojo Bool v5/Dojo Bool v5.blend" "Dojo Test Product.blend"

# Copy metadata template
cp "../../solvet-system/templates/product-metadata-template.json" "Dojo Test Product.json"

# Create test icon (or copy existing)
cp "../Dojo Bool v5/icon_Dojo Bool v5.png" "icon_Dojo Test Product.png"

# Edit metadata
vim "Dojo Test Product.json"
```

Update the JSON:
```json
{
  "title": "Dojo Test Product",
  "handle": "dojo-test-product",
  "description": "Test product for automation workflow",
  "variants": [{
    "price": "0.99",
    "sku": "NO3D-TOOLS-TEST"
  }],
  "files": {
    "product": "Dojo Test Product.blend",
    "icon": "icon_Dojo Test Product.png"
  }
}
```

---

### Step 6: Test Locally (Dry Run)

Test the Polar sync without actually uploading:

```bash
cd no3d-tools-library

POLAR_API_TOKEN="your-token" \
POLAR_ORG_ID="your-org-id" \
DRY_RUN=true \
npm run sync:polar
```

**Expected output**:
```
📦 Processing: Dojo Test Product
   📄 Metadata loaded
   📁 Product file: Dojo Test Product.blend (X.XX MB)
   📤 Uploading...
   ⏭️  [DRY RUN] Skipping actual upload
   🎁 Creating downloadable benefit...
   ⏭️  [DRY RUN] Skipping benefit creation
   🏷️  Creating/updating product...
   ⏭️  [DRY RUN] Skipping product creation
   ✅ Dojo Test Product synced successfully!
```

If you see errors, fix them before proceeding.

---

### Step 7: Test Real Upload (One Product)

Now do a real upload for your test product:

```bash
POLAR_API_TOKEN="your-token" \
POLAR_ORG_ID="your-org-id" \
npm run sync:polar
```

**Expected output**:
```
📦 Processing: Dojo Test Product
   📄 Metadata loaded
   📁 Product file: Dojo Test Product.blend (X.XX MB)
   📤 Uploading Dojo Test Product.blend...
   ✅ File uploaded successfully (ID: file_xxxxx)
   🎁 Creating downloadable benefit...
   ✅ Benefit created (ID: ben_xxxxx)
   🏷️  Creating/updating product (SKU: NO3D-TOOLS-TEST)...
   ✅ Product created successfully (ID: prod_xxxxx)
   💾 Updated metadata with Polar IDs
   ✅ Dojo Test Product synced successfully!
```

**Verify in Polar Dashboard**:
1. Go to [polar.sh](https://polar.sh)
2. Click "Products"
3. You should see "Dojo Test Product"
4. Click to view details
5. Verify file is attached

---

### Step 8: Test GitHub Actions Workflow

Now test the full automation via GitHub Actions:

#### Commit Your Test Product

```bash
cd no3d-tools-library

git add "Dojo Test Product/"
git commit -m "Test: Add test product for automation workflow"
git push origin main
```

#### Watch the Workflow

1. Go to GitHub → Actions tab
2. You should see "Sync Products to Website and Polar" running
3. Click to view details
4. Watch each job:
   - ✅ **Sync Images** - Should copy images to website repo
   - ✅ **Sync to Polar** - Should upload product
   - ✅ **Verify Deployment** - Summary

#### Check Results

**In Polar**:
- Product should be created/updated

**In no3d-tools-website repo**:
- Check `assets/product-images/`
- Should contain `icon_Dojo Test Product.png`

**On Website**:
- Visit [no3dtools.com](https://no3dtools.com)
- Product images should display

---

### Step 9: Enable for All Products

Once testing is successful, you can enable automation for all products.

#### Update All Products

For existing products without metadata, create JSON files:

```bash
cd no3d-tools-library

# For each product folder
for dir in Dojo*/; do
  product_name="${dir%/}"
  if [ ! -f "$dir/$product_name.json" ]; then
    echo "Creating metadata for: $product_name"
    cp "../solvet-system/templates/product-metadata-template.json" "$dir/$product_name.json"
    # TODO: Edit this file with correct product details
  fi
done
```

Then edit each JSON file with correct:
- Title
- Description
- Price
- SKU

#### Push All Products

```bash
git add "Dojo*/*.json"
git commit -m "Add metadata for all products"
git push origin main
```

The automation will process all products!

---

### Step 10: Monitor and Verify

#### Check GitHub Actions

```bash
# View workflow runs
gh run list

# View specific run
gh run view [run-id]

# Watch live
gh run watch
```

#### Check Polar Dashboard

1. Products → Should see all products
2. Files → Should see all .blend files
3. Benefits → Should see downloadable benefits

#### Check Website

1. Visit [no3dtools.com](https://no3dtools.com)
2. All product images should display
3. Product data should be current

---

## Daily Workflow

Once automation is set up, your workflow becomes:

### Add New Product

```bash
mkdir "Dojo New Product"
# Add .blend, .json, icon
git add "Dojo New Product/"
git commit -m "Add Dojo New Product"
git push
# ✨ Automatically published!
```

### Update Product

```bash
vim "Dojo Product/Dojo Product.json"  # Update price/description
git commit -am "Update Dojo Product pricing"
git push
# ✨ Automatically updated!
```

### Manual Sync

```bash
# Re-sync all products (ignores "already synced")
gh workflow run sync-products.yml -f force_sync=true

# Preview changes without uploading
gh workflow run sync-products.yml -f dry_run=true
```

---

## Troubleshooting

### Workflow Not Triggering

**Check**:
1. Workflow file exists: `.github/workflows/sync-products.yml`
2. Changes are in `Dojo*/` folders
3. Pushed to `main` branch

**Fix**:
```bash
# Manually trigger
gh workflow run sync-products.yml
```

### Images Not Syncing

**Check**:
1. `PAT_REPO_ACCESS` secret is set
2. PAT has `repo` scope
3. Image files exist and named correctly

**Fix**:
```bash
# Re-run workflow
gh workflow run sync-products.yml
```

### Polar Upload Fails

**Check**:
1. `POLAR_API_TOKEN` secret is set
2. `POLAR_ORG_ID` is correct
3. Token has required scopes
4. .blend file exists

**Fix**:
```bash
# Test connection
POLAR_API_TOKEN=xxx POLAR_ORG_ID=xxx npm run test:polar

# Re-run with force
gh workflow run sync-products.yml -f force_sync=true
```

---

## Security Checklist

Before going live:

- [ ] All secrets set in GitHub (not in code)
- [ ] `.gitignore` excludes `node_modules/` and `.env`
- [ ] `.blend` files never committed to public repo
- [ ] GitHub PAT has minimum required scopes
- [ ] Polar token has minimum required scopes
- [ ] Tokens set to expire in 90 days

---

## Documentation Reference

- **[AUTOMATION_SETUP.md](solvet-system/AUTOMATION_SETUP.md)** - Detailed setup guide
- **[AUTOMATION.md](no3d-tools-library/AUTOMATION.md)** - User guide
- **[Product Metadata Template](solvet-system/templates/product-metadata-template.json)** - JSON schema

---

## Summary

### What You Have Now

✅ Complete automation infrastructure
✅ GitHub Actions workflows
✅ Polar API integration
✅ Image sync to website
✅ Comprehensive documentation
✅ Test scripts

### What You Need To Do

1. Install dependencies (`npm install`)
2. Generate API tokens (Polar + GitHub)
3. Add GitHub Secrets
4. Test with one product
5. Enable for all products

### Time Estimate

- Setup: 30-60 minutes
- Testing: 15-30 minutes
- Full deployment: 1-2 hours

---

## Support

If you encounter issues:

1. Check GitHub Actions logs (detailed error messages)
2. Run test scripts locally
3. Verify all secrets are set correctly
4. Review documentation files

**Ready to get started?**

Begin with [Step 1: Install Dependencies](#step-1-install-dependencies)
