# Vercel Deployment Setup Guide

## Current Configuration

- **Project**: `no3dtoolssite`
- **Repository**: `node-dojo/no3d-tools-website`
- **Branch**: `main`
- **Root Directory**: `no3d-tools-website`
- **Framework**: Vite

## Environment Variables

✅ Configured:
- `GITHUB_TOKEN` (Production, Preview, Development)
- `POLAR_API_TOKEN` (Production, Preview, Development)
- `POLAR_ORG_ID` (Production, Preview, Development)

## GitHub Integration Setup

### Verify Integration Status

1. Go to: https://vercel.com/node-dojos-projects/no3dtoolssite/settings/git
2. Verify:
   - Repository: `node-dojo/no3d-tools-website`
   - Production Branch: `main`
   - Root Directory: `no3d-tools-website`
   - Auto-deploy: Enabled

### If Integration is Not Working

**Option 1: Reconnect GitHub Integration**
1. Go to: https://vercel.com/node-dojos-projects/no3dtoolssite/settings/git
2. Click "Disconnect" (if connected)
3. Click "Connect Git Repository"
4. Select `node-dojo/no3d-tools-website`
5. Configure:
   - Root Directory: `no3d-tools-website`
   - Production Branch: `main`
   - Framework Preset: Vite (or leave as auto-detect)

**Option 2: Check GitHub Webhooks**
1. Go to: https://github.com/node-dojo/no3d-tools-website/settings/hooks
2. Verify there's a Vercel webhook configured
3. If missing, Vercel should create it automatically when you reconnect

**Option 3: Manual Redeploy**
If auto-deployment isn't working, manually redeploy:
1. Go to: https://vercel.com/node-dojos-projects/no3dtoolssite/deployments
2. Click "Redeploy" on the latest deployment
3. Or create a new deployment from the latest commit

## Testing Auto-Deployment

After fixing the integration:
1. Make a small change (e.g., update a comment)
2. Commit and push to `main`
3. Check Vercel dashboard - a new deployment should start within 30 seconds

## Troubleshooting

### Issue: Commits not triggering deployments
- Check GitHub webhook is active
- Verify repository connection in Vercel settings
- Ensure Root Directory matches repository structure
- Check Vercel project logs for errors

### Issue: Environment variables not available
- Verify variables are set for correct environments (Production/Preview/Development)
- Redeploy after adding new variables
- Check variable names match code exactly

### Issue: Build failures
- Check build logs in Vercel dashboard
- Verify `package.json` and dependencies
- Check framework detection (should be Vite)

## Current Status

- ✅ Environment variables configured
- ✅ Repository structure correct
- ⚠️ GitHub webhook integration needs verification
- ⚠️ Auto-deployment not currently working (manual redeploy required)

## Fixing the GitHub Integration (Required Now)

The GitHub integration is currently not detecting new commits. Follow these steps to fix it:

### Step 1: Verify GitHub Integration Connection

1. Go to: https://vercel.com/node-dojos-projects/no3dtoolssite/settings/git
2. Check if repository shows: `node-dojo/no3d-tools-website`
3. Verify Production Branch is: `main`
4. Verify Root Directory is: `no3d-tools-website`

### Step 2: Reconnect GitHub Integration (If Needed)

If the repository shows as disconnected or incorrect:

1. Click **"Disconnect"** (if connected)
2. Click **"Connect Git Repository"**
3. Select **"node-dojo/no3d-tools-website"**
4. Configure settings:
   - **Root Directory**: `no3d-tools-website`
   - **Production Branch**: `main`
   - **Framework Preset**: Leave as "Other" or "Vite"
5. Click **"Connect"**

### Step 3: Verify GitHub Webhook

1. Go to: https://github.com/node-dojo/no3d-tools-website/settings/hooks
2. Look for a webhook with URL containing `vercel.com`
3. Verify it's **Active** and listening to:
   - `push` events
   - `pull_request` events (optional)
4. If webhook is missing or inactive, Vercel should create it automatically when you reconnect

### Step 4: Test Auto-Deployment

After reconnecting:

1. Make a small change (e.g., add a comment to `script.js`)
2. Commit and push: `git commit -am "Test: Verify auto-deployment" && git push`
3. Check Vercel dashboard within 30 seconds - a new deployment should start automatically
4. Verify the deployment shows the correct commit SHA

### Step 5: Manual Redeploy Current Commits

To deploy the fixes immediately while fixing the integration:

1. Go to: https://vercel.com/node-dojos-projects/no3dtoolssite/deployments
2. Click the three dots (⋯) on the latest deployment
3. Select **"Redeploy"**
4. Or go to: https://vercel.com/node-dojos-projects/no3dtoolssite and click **"Redeploy"**

This will deploy commit `9a9f2b2` which includes:
- ✅ Fixed JavaScript errors (`a43de38`)
- ✅ Fixed price matching logic
- ✅ GITHUB_TOKEN environment variable
- ✅ Fixed vercel.json syntax

## Next Steps

1. ✅ Fix GitHub integration in Vercel dashboard (follow steps above)
2. ✅ Manually redeploy to get fixes live immediately
3. ✅ Test auto-deployment with a new commit
4. ✅ Monitor deployments to ensure they trigger automatically going forward

