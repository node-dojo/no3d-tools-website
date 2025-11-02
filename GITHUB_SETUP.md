# GitHub Setup Guide
## Creating and Connecting Your SOLVET System Repositories

This guide walks you through creating the GitHub repositories and connecting them to your local workspace.

---

## 📋 Overview

You need to create **3 new repositories** on GitHub:

1. ✅ **solvet-system** - Shared resources (schemas, scripts, docs)
2. ✅ **no3d-tools-website** - Website repository
3. ✅ **no3d-tools-addon** - Blender add-on repository

**Note:** `no3d-tools-library` already exists on GitHub (node-dojo/no3d-tools-library)

---

## 🌐 Step 1: Create GitHub Repositories

### Option A: Using GitHub Web Interface (Recommended)

#### 1. Create solvet-system Repository

1. Go to [github.com/new](https://github.com/new)
2. Fill in the details:
   - **Repository name**: `solvet-system`
   - **Description**: `Shared schemas, scripts, and documentation for SOLVET System`
   - **Visibility**: Public (or Private if preferred)
   - **Initialize**: ❌ **DO NOT** check any boxes (no README, no .gitignore, no license)
3. Click "Create repository"
4. **Keep the page open** - you'll need the commands shown

#### 2. Create no3d-tools-website Repository

1. Go to [github.com/new](https://github.com/new)
2. Fill in the details:
   - **Repository name**: `no3d-tools-website`
   - **Description**: `NO3D Tools e-commerce website - Retro-futuristic design with GitHub API integration`
   - **Visibility**: Public (recommended for Vercel deployment)
   - **Initialize**: ❌ **DO NOT** check any boxes
3. Click "Create repository"
4. **Keep the page open**

#### 3. Create no3d-tools-addon Repository

1. Go to [github.com/new](https://github.com/new)
2. Fill in the details:
   - **Repository name**: `no3d-tools-addon`
   - **Description**: `Blender 4.5+ add-on for exporting NO3D Tools assets with metadata`
   - **Visibility**: Public (recommended)
   - **Initialize**: ❌ **DO NOT** check any boxes
3. Click "Create repository"
4. **Keep the page open**

### Option B: Using GitHub CLI (gh)

If you have GitHub CLI installed:

```bash
# Create the three repos
gh repo create solvet-system --public --description "Shared schemas, scripts, and documentation for SOLVET System"
gh repo create no3d-tools-website --public --description "NO3D Tools e-commerce website"
gh repo create no3d-tools-addon --public --description "Blender 4.5+ add-on for exporting NO3D Tools assets"
```

---

## 🔗 Step 2: Connect Local Repos to GitHub

### Prerequisites

Make sure you're in the SOLVET System V1 workspace folder:

```bash
cd "/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/SOLVET System V1"
```

### Connect solvet-system

```bash
cd solvet-system

# Add GitHub remote (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/solvet-system.git

# Push to GitHub
git push -u origin main

cd ..
```

**Example:**
```bash
# If your username is "node-dojo":
git remote add origin https://github.com/node-dojo/solvet-system.git
git push -u origin main
```

### Connect no3d-tools-website

```bash
cd no3d-tools-website

# Add GitHub remote
git remote add origin https://github.com/YOUR-USERNAME/no3d-tools-website.git

# Push to GitHub
git push -u origin main

cd ..
```

### Connect no3d-tools-addon

```bash
cd no3d-tools-addon

# Add GitHub remote
git remote add origin https://github.com/YOUR-USERNAME/no3d-tools-addon.git

# Push to GitHub
git push -u origin main

cd ..
```

---

## 📥 Step 3: Clone no3d-tools-library

Clone the existing asset database repository:

```bash
# From the workspace root
git clone https://github.com/node-dojo/no3d-tools-library.git
```

---

## ✅ Step 4: Verify Setup

Run the status script to verify all repos are connected:

```bash
./status-all.sh
```

You should see:
- ✅ All 4 repositories listed
- ✅ Remotes configured for each
- ✅ Clean working trees
- ✅ "Up to date with remote" for the 3 new repos

---

## 🚀 Step 5: Deploy Website to Vercel

### Update Vercel to Use New Repository

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Find your `no3dtools.com` project

2. **Update Git Integration**
   - Go to Project Settings → Git
   - Click "Disconnect" on the old repository
   - Click "Connect Git Repository"
   - Select the new `no3d-tools-website` repository

3. **Configure Build Settings** (if needed)
   - Framework Preset: `Other` (since it's vanilla HTML/CSS/JS)
   - Build Command: Leave empty
   - Output Directory: `./` (root)
   - Install Command: Leave empty

4. **Deploy**
   - Click "Deploy"
   - Vercel will deploy the `main` branch
   - Your site should now be live at no3dtools.com

### Vercel Configuration (Optional)

Create `vercel.json` in the no3d-tools-website repo:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

Then commit and push:

```bash
cd no3d-tools-website
git add vercel.json
git commit -m "Add Vercel configuration"
git push
```

---

## 📊 Step 6: Update Repository URLs in Documentation

Update the README files to reflect your actual GitHub URLs:

### In solvet-system/README.md

Find and replace `YOUR-USERNAME` or `your-org` with your actual GitHub username:

```bash
cd solvet-system
# Edit README.md and update URLs
git add README.md
git commit -m "Update repository URLs"
git push
```

---

## 🔐 Optional: Set Up GitHub Secrets for Automation

If you plan to use GitHub Actions for webhooks (as described in MULTI_REPO_ARCHITECTURE.md):

### For Website Repository Dispatch

1. Go to your profile Settings → Developer settings → Personal access tokens
2. Generate new token (classic):
   - Name: `WEBSITE_DISPATCH_TOKEN`
   - Scopes: `repo` (full control)
3. Copy the token

4. In the `no3d-tools-library` repo:
   - Settings → Secrets and variables → Actions
   - New repository secret:
     - Name: `WEBSITE_DISPATCH_TOKEN`
     - Value: [paste token]

5. Add website repo name:
   - New repository secret:
     - Name: `WEBSITE_REPO`
     - Value: `YOUR-USERNAME/no3d-tools-website`

---

## 🎯 Final Checklist

- [ ] Created 3 new GitHub repositories
- [ ] Connected local repos to GitHub remotes
- [ ] Pushed all code to GitHub
- [ ] Cloned no3d-tools-library
- [ ] Updated Vercel to deploy from no3d-tools-website
- [ ] Verified website deploys correctly
- [ ] Ran `./status-all.sh` to verify setup
- [ ] Updated documentation URLs (optional)

---

## 📝 Your Repository URLs

Once created, your repositories will be at:

```
https://github.com/YOUR-USERNAME/solvet-system
https://github.com/YOUR-USERNAME/no3d-tools-website
https://github.com/YOUR-USERNAME/no3d-tools-addon
https://github.com/node-dojo/no3d-tools-library (existing)
```

Replace `YOUR-USERNAME` with your actual GitHub username.

---

## 🚨 Troubleshooting

### Permission Denied When Pushing

If you get a permission error:

```bash
# Use HTTPS with token or SSH with keys
git remote set-url origin git@github.com:YOUR-USERNAME/repo-name.git

# Or authenticate with GitHub CLI
gh auth login
```

### Wrong Repository Connected in Vercel

1. Disconnect the current repository
2. Reconnect to the correct `no3d-tools-website` repo
3. Trigger a new deployment

### Repository Already Has Content

If GitHub shows instructions for an existing repo:

```bash
# Push existing repository
git remote add origin https://github.com/YOUR-USERNAME/repo-name.git
git branch -M main
git push -u origin main
```

This is normal if you didn't uncheck the initialization options.

---

## 💡 Next Steps

After completing this setup:

1. **Open the workspace**: `cursor .vscode/solvet.code-workspace`
2. **Test the workflow**: Make a small change and commit to each repo
3. **Verify Vercel**: Check that website updates when you push
4. **Set up GitHub Actions**: Configure webhooks (optional, see MULTI_REPO_ARCHITECTURE.md)

---

**Setup Complete!** 🎉

You now have a fully functional multi-repo SOLVET System workspace with:
- ✅ All code on GitHub
- ✅ Website deployed on Vercel
- ✅ Full Cursor/Claude context across all repos
- ✅ Independent version control per component

See [README.md](README.md) for daily workflow and usage instructions.
