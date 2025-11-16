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

## Next Steps

1. Verify GitHub integration in Vercel dashboard
2. Test auto-deployment with a new commit
3. Monitor deployments to ensure they trigger automatically

