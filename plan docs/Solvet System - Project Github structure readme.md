# SOLVET System - Project GitHub Structure Guide
## Multi-Repository Local Development Workspace

This guide explains how to set up and manage the SOLVET System's multi-repository architecture locally while maintaining full context for Cursor/Claude AI coding assistant.

---

## 🎯 Overview

The SOLVET System uses a **multi-repository architecture** where each component is an independent GitHub repository, but all repos are organized in a single local workspace folder for development convenience.

**Key Principle:** Parent folder is NOT a git repo; each subfolder is its own independent repository.

---

## 📂 Recommended Local Workspace Structure

```
SOLVET System V1/                    # Local parent folder (NOT a git repo)
├── .vscode/
│   └── solvet.code-workspace       # Cursor/VS Code workspace config
├── solvet-system/                  # Git repo 1 - Shared resources
│   ├── .git/
│   ├── schemas/
│   ├── docs/
│   └── scripts/
├── no3d-tools-library/             # Git repo 2 - Asset database (existing)
│   ├── .git/
│   └── [Product folders]/
├── no3d-tools-website/             # Git repo 3 - Website
│   ├── .git/
│   ├── next.config.js
│   └── [website files]/
├── no3d-tools-addon/               # Git repo 4 - Blender add-on
│   ├── .git/
│   └── [addon files]/
├── .gitignore                      # Workspace-level ignore (not in git)
├── README.md                       # Workspace overview (not in git)
├── update-all.sh                   # Helper script (not in git)
└── status-all.sh                   # Helper script (not in git)
```

### Repository Breakdown

| Repository | Purpose | Technology | Deployment |
|------------|---------|------------|------------|
| **solvet-system** | Shared schemas, docs, scripts | JSON, Markdown | N/A |
| **no3d-tools-library** | Asset database (GitHub as DB) | .blend, JSON, images | GitHub raw content |
| **no3d-tools-website** | E-commerce website | Next.js, React | Vercel/Netlify |
| **no3d-tools-addon** | Blender add-on | Python | GitHub Releases |

---

## 🔧 VS Code/Cursor Workspace Configuration

### Create Workspace File

Create `.vscode/solvet.code-workspace` in the parent folder:

```json
{
  "folders": [
    {
      "path": "./solvet-system",
      "name": "📚 Shared Resources"
    },
    {
      "path": "./no3d-tools-library",
      "name": "🗄️ Asset Database"
    },
    {
      "path": "./no3d-tools-website",
      "name": "🌐 Website"
    },
    {
      "path": "./no3d-tools-addon",
      "name": "🔧 Blender Add-on"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/.git": false,
      "**/node_modules": true,
      "**/__pycache__": true,
      "**/.next": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/bower_components": true,
      "**/.next": true
    },
    "editor.formatOnSave": true,
    "git.enableSmartCommit": true,
    "git.confirmSync": false
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "ms-python.python",
      "GitHub.copilot"
    ]
  }
}
```

### Opening the Workspace

```bash
# Option 1: From command line
cursor /path/to/SOLVET\ System\ V1/.vscode/solvet.code-workspace

# Option 2: From within the folder
cd "SOLVET System V1"
cursor .vscode/solvet.code-workspace

# Option 3: File > Open Workspace from File in Cursor
```

---

## 🔄 Git Workflow

### Initial Setup

```bash
# 1. Create parent workspace folder
mkdir "SOLVET System V1"
cd "SOLVET System V1"

# 2. Clone existing repo
git clone https://github.com/node-dojo/no3d-tools-library.git

# 3. Clone/create new repos (when ready)
git clone https://github.com/your-org/solvet-system.git
git clone https://github.com/your-org/no3d-tools-website.git
git clone https://github.com/your-org/no3d-tools-addon.git

# 4. Create workspace config
mkdir .vscode
# (create solvet.code-workspace as shown above)

# 5. Create workspace-level README
cat > README.md << 'EOF'
# SOLVET System Development Workspace

This folder contains multiple independent Git repositories for the SOLVET System.

## Repositories:
- solvet-system: Shared resources
- no3d-tools-library: Asset database
- no3d-tools-website: Website
- no3d-tools-addon: Blender add-on

## Getting Started:
1. Open solvet.code-workspace in Cursor/VS Code
2. Each repo is independent - commit/push separately
3. Use update-all.sh to pull latest from all repos

See docs/ for architecture details.
EOF
```

### Daily Workflow

```bash
# Update all repos at once
cd "SOLVET System V1"
./update-all.sh

# Work in specific repo
cd no3d-tools-website
git checkout -b feature/new-feature
# Make changes...
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Switch to different repo
cd ../no3d-tools-addon
git checkout -b feature/export-improvements
# Work on add-on...
git commit -am "Improve export performance"
git push

# Cursor/Claude can still see and reference files from all repos
```

### Git Operations Per Repo

Each repository is completely independent:
- Separate branches
- Separate commit history
- Separate remotes
- Independent versioning

But Cursor's Source Control panel shows changes across all workspace folders.

---

## 🛠️ Helper Scripts

### update-all.sh

Create in workspace root:

```bash
#!/bin/bash
# Updates all repositories

echo "🔄 Updating all repositories..."

repos=("solvet-system" "no3d-tools-library" "no3d-tools-website" "no3d-tools-addon")

for repo in "${repos[@]}"; do
  if [ -d "$repo" ]; then
    echo ""
    echo "📦 Updating $repo..."
    cd "$repo"

    # Stash any local changes
    if [[ -n $(git status -s) ]]; then
      echo "  ⚠️  Stashing local changes..."
      git stash
    fi

    # Fetch and pull
    git fetch --all
    current_branch=$(git branch --show-current)
    git pull origin "$current_branch"

    cd ..
  else
    echo "⚠️  Directory $repo not found"
  fi
done

echo ""
echo "✅ All repos updated!"
```

Make executable:
```bash
chmod +x update-all.sh
```

### status-all.sh

```bash
#!/bin/bash
# Check status of all repos

echo "📊 Status of all repositories:"
echo ""

repos=("solvet-system" "no3d-tools-library" "no3d-tools-website" "no3d-tools-addon")

for repo in "${repos[@]}"; do
  if [ -d "$repo" ]; then
    echo "=========================================="
    echo "📦 $repo"
    echo "=========================================="
    cd "$repo"

    # Show current branch
    branch=$(git branch --show-current)
    echo "🌿 Branch: $branch"

    # Show status
    status=$(git status -s)
    if [ -z "$status" ]; then
      echo "✅ Clean working tree"
    else
      echo "📝 Changes:"
      git status -s
    fi

    # Show commits ahead/behind
    git fetch --quiet
    ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null)
    behind=$(git rev-list --count HEAD..@{u} 2>/dev/null)

    if [ -n "$ahead" ] && [ "$ahead" -gt 0 ]; then
      echo "⬆️  $ahead commit(s) ahead of remote"
    fi
    if [ -n "$behind" ] && [ "$behind" -gt 0 ]; then
      echo "⬇️  $behind commit(s) behind remote"
    fi

    cd ..
    echo ""
  fi
done
```

Make executable:
```bash
chmod +x status-all.sh
```

### commit-all.sh (Use with caution!)

```bash
#!/bin/bash
# Commit changes in all repos with same message
# Usage: ./commit-all.sh "Your commit message"

if [ -z "$1" ]; then
  echo "❌ Error: Commit message required"
  echo "Usage: ./commit-all.sh \"Your commit message\""
  exit 1
fi

COMMIT_MSG="$1"
repos=("solvet-system" "no3d-tools-library" "no3d-tools-website" "no3d-tools-addon")

echo "📝 Committing to all repos with message: $COMMIT_MSG"
echo ""

for repo in "${repos[@]}"; do
  if [ -d "$repo" ]; then
    cd "$repo"

    if [[ -n $(git status -s) ]]; then
      echo "📦 Committing in $repo..."
      git add .
      git commit -m "$COMMIT_MSG"
    else
      echo "⏭️  Skipping $repo (no changes)"
    fi

    cd ..
  fi
done

echo ""
echo "✅ Done! Don't forget to push: ./push-all.sh"
```

---

## 🤖 How Cursor/Claude Accesses Context

### Full Cross-Repo Context

When you open the workspace, Cursor/Claude has access to ALL files across ALL repositories:

**Example Workflow:**
```
1. You're editing: no3d-tools-website/pages/index.js

2. You ask Claude: "Add validation using the product schema"

3. Claude can:
   ✅ Read: solvet-system/schemas/product-metadata.schema.json
   ✅ Read: no3d-tools-library/ExampleProduct/ExampleProduct.json
   ✅ Write: no3d-tools-website/lib/validation.js
   ✅ Reference: solvet-system/docs/MULTI_REPO_ARCHITECTURE.md

4. All in one operation, with full context!
```

### Search Across All Repos

- **Cmd+Shift+F** (Ctrl+Shift+F): Searches ALL workspace folders
- **Cmd+P** (Ctrl+P): Opens files from ANY repo
- **Symbol search**: Finds functions/classes across all repos
- **Reference finding**: Works across repo boundaries

### File References in Code

```javascript
// While in no3d-tools-website, you can reference:
// "../solvet-system/schemas/product-metadata.schema.json"

// Cursor's autocomplete will suggest files from sibling repos
// Claude understands relative paths between repos
```

---

## 🔗 Setting Up Shared Dependencies

### Option 1: Relative Path Imports (Development)

```javascript
// no3d-tools-website/lib/schema-loader.js
import fs from 'fs';
import path from 'path';

// Load schema from sibling repo
const schemaPath = path.join(
  __dirname,
  '../../solvet-system/schemas/product-metadata.schema.json'
);

export const productSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
```

**Pros:** Simple, works in development
**Cons:** Doesn't work in production deployment

### Option 2: NPM Link (Best for Development)

```bash
# In solvet-system repo
cd solvet-system
npm init -y  # If not already a package

# Edit package.json:
{
  "name": "@solvet/shared",
  "version": "1.0.0",
  "main": "index.js",
  "exports": {
    "./schemas": "./schemas/product-metadata.schema.json"
  }
}

npm link  # Creates global symlink

# In website repo
cd ../no3d-tools-website
npm link @solvet/shared  # Links to local version

# Now import normally:
import productSchema from '@solvet/shared/schemas';
```

**Pros:** Clean imports, works like normal npm package
**Cons:** Needs setup, have to run `npm link` on each machine

### Option 3: Copy on Build (Production)

```javascript
// no3d-tools-website/scripts/copy-schemas.js
const fs = require('fs-extra');

// Copy schemas from sibling repo during build
fs.copySync(
  '../solvet-system/schemas',
  './schemas',
  { overwrite: true }
);

console.log('✅ Schemas copied from solvet-system');
```

Add to `package.json`:
```json
{
  "scripts": {
    "prebuild": "node scripts/copy-schemas.js",
    "build": "next build",
    "dev": "node scripts/copy-schemas.js && next dev"
  }
}
```

**Pros:** Works in both dev and production
**Cons:** Files are duplicated, can get out of sync

### Option 4: Environment-Based Loading (Recommended)

```javascript
// no3d-tools-website/lib/config.js
const path = require('path');

const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalWorkspace = process.env.USE_LOCAL_WORKSPACE === 'true';

export const SCHEMA_PATH = isDevelopment && isLocalWorkspace
  ? path.join(__dirname, '../../solvet-system/schemas')  // Local dev
  : path.join(__dirname, '../schemas');                   // Production (copied)

// .env.local
USE_LOCAL_WORKSPACE=true
```

**Pros:** Flexible, works everywhere
**Cons:** Slightly more complex

---

## 📋 Practical Development Examples

### Example 1: Adding a New Feature Across Multiple Repos

**Scenario:** Add a new "bundle" product type

```bash
# 1. Update schema in shared repo
cd solvet-system
git checkout -b feature/bundle-schema
# Edit schemas/product-metadata.schema.json
git commit -am "Add bundle product type to schema"
git push origin feature/bundle-schema

# 2. Update website to use new schema
cd ../no3d-tools-website
git checkout -b feature/bundle-support
# Update lib/validation.js to support bundles
# Update components/ProductCard.jsx to display bundles
git commit -am "Add bundle product support"
git push origin feature/bundle-support

# 3. Update add-on to export bundles
cd ../no3d-tools-addon
git checkout -b feature/bundle-export
# Update export logic
git commit -am "Add bundle export functionality"
git push origin feature/bundle-export

# 4. Test locally - all repos are accessible in workspace
# 5. Create PRs in each repo
# 6. Merge in order: schema → addon → website
```

### Example 2: Debugging Across Repos

**Scenario:** Website not displaying product correctly

```bash
# Open workspace
cursor .vscode/solvet.code-workspace

# Ask Claude:
"The product 'Modern Chair' isn't displaying correctly.
Check:
1. The product JSON in no3d-tools-library
2. The schema validation in no3d-tools-website
3. The display component"

# Claude can:
# - Read: no3d-tools-library/Modern-Chair/Modern-Chair.json
# - Read: solvet-system/schemas/product-metadata.schema.json
# - Read: no3d-tools-website/lib/validation.js
# - Read: no3d-tools-website/components/ProductCard.jsx
# - Identify the issue across all these files
# - Suggest fixes
```

### Example 3: Working with a Team Member

**Team member setup:**
```bash
# Team member clones same structure
mkdir "SOLVET System V1"
cd "SOLVET System V1"

# Clone all repos
git clone https://github.com/your-org/solvet-system.git
git clone https://github.com/node-dojo/no3d-tools-library.git
git clone https://github.com/your-org/no3d-tools-website.git
git clone https://github.com/your-org/no3d-tools-addon.git

# Get workspace config (could be in one of the repos)
cp solvet-system/workspace/solvet.code-workspace .vscode/

# Open and start working
cursor .vscode/solvet.code-workspace
```

---

## ✅ Benefits of This Structure

### 1. Full AI Context
- ✅ Cursor/Claude sees all repos simultaneously
- ✅ Can reference files across repos
- ✅ Search works across all code
- ✅ Autocomplete includes all repos

### 2. Independent Git History
- ✅ Each repo has clean history
- ✅ Separate commits/branches per component
- ✅ Can version independently
- ✅ Easy to trace changes per component

### 3. Flexible Development
- ✅ Work on multiple components simultaneously
- ✅ Test integration locally before deployment
- ✅ Easy to share code snippets between repos
- ✅ Can run multiple dev servers at once

### 4. Team Collaboration
- ✅ Team members clone only repos they need
- ✅ Or clone all for full context
- ✅ Workspace config can be shared
- ✅ Clear ownership per repo

### 5. CI/CD Friendly
- ✅ Each repo deploys independently
- ✅ Can still test integration locally
- ✅ Production uses proper package versions
- ✅ No monorepo complexity

---

## 🚀 Migration Path

### Moving Existing Code to New Structure

**Current State:**
```
SOLVET System V1/  (single git repo)
├── .git/
├── send-no3ds-export utility/
├── no3d-tools-site/
└── schemas/
```

**Migration Steps:**

```bash
# 1. Backup everything
cp -r "SOLVET System V1" "SOLVET System V1 BACKUP"

# 2. Create new workspace folder
mkdir "SOLVET System V1 NEW"
cd "SOLVET System V1 NEW"

# 3. Clone existing repo
git clone https://github.com/node-dojo/no3d-tools-library.git

# 4. Create new repos on GitHub, then:
# For website:
mkdir no3d-tools-website
cd no3d-tools-website
git init
# Copy files from old: ../SOLVET System V1/no3d-tools-site/
cp -r "../../SOLVET System V1/no3d-tools-site/"* .
git add .
git commit -m "Initial commit: migrate website"
git remote add origin https://github.com/your-org/no3d-tools-website.git
git push -u origin main

# Repeat for addon and shared resources...

# 5. Create workspace config
mkdir .vscode
# Create solvet.code-workspace

# 6. Verify everything works
cursor .vscode/solvet.code-workspace

# 7. Once verified, can delete old structure
```

---

## 📝 Best Practices

### DO:
1. ✅ Keep parent folder name consistent across team
2. ✅ Use workspace file for Cursor/VS Code
3. ✅ Commit and push each repo separately
4. ✅ Use helper scripts for bulk operations
5. ✅ Document cross-repo dependencies
6. ✅ Keep workspace-level README updated
7. ✅ Use relative paths in development
8. ✅ Use proper packages in production

### DON'T:
1. ❌ Make parent folder a git repository
2. ❌ Commit files from one repo to another
3. ❌ Use git submodules (makes it complex)
4. ❌ Hardcode absolute paths between repos
5. ❌ Forget to push all affected repos
6. ❌ Mix production and development dependencies
7. ❌ Assume all team members use same folder names
8. ❌ Deploy with relative path imports

---

## 🔍 Troubleshooting

### Workspace Not Showing All Folders

**Problem:** Some repos not visible in Cursor sidebar

**Solution:**
```bash
# Check workspace file
cat .vscode/solvet.code-workspace

# Ensure all paths are correct (relative to workspace file)
# Reopen workspace
cursor .vscode/solvet.code-workspace
```

### Git Operations Affecting Wrong Repo

**Problem:** Accidentally committed to wrong repo

**Solution:**
```bash
# Check which repo you're in
pwd
git remote -v

# If wrong repo, undo commit
git reset HEAD~1

# Navigate to correct repo
cd ../correct-repo
```

### Claude Can't Find Files

**Problem:** Claude says file doesn't exist

**Solution:**
1. Verify file exists: `ls -la path/to/file`
2. Check workspace includes the repo
3. Reload window: Cmd+Shift+P → "Reload Window"
4. Verify path is relative to workspace root

### Shared Dependencies Not Working

**Problem:** Import errors from shared repos

**Solution:**
```bash
# For npm link issues:
cd solvet-system
npm link

cd ../no3d-tools-website
npm link @solvet/shared

# Or use environment variables:
# .env.local
USE_LOCAL_WORKSPACE=true
```

---

## 📚 Related Documentation

- [MULTI_REPO_ARCHITECTURE.md](./MULTI_REPO_ARCHITECTURE.md) - Architecture patterns
- [REPO_CONNECTION_PATTERNS.md](./REPO_CONNECTION_PATTERNS.md) - Integration examples
- [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md) - Individual repo structure

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Open workspace
cursor .vscode/solvet.code-workspace

# Update all repos
./update-all.sh

# Check status of all repos
./status-all.sh

# Work in specific repo
cd repo-name
git checkout -b feature/new-feature
# work...
git commit -am "Changes"
git push

# Switch repos
cd ../other-repo
```

### File Paths Between Repos

```javascript
// From website to schema:
'../../solvet-system/schemas/product-metadata.schema.json'

// From website to example product:
'../../no3d-tools-library/ExampleProduct/ExampleProduct.json'

// From addon to schema:
'../solvet-system/schemas/product-metadata.schema.json'
```

---

**Last Updated:** January 2025
**Maintained By:** SOLVET System Team

**For questions or suggestions, see the main repository documentation or open an issue in the solvet-system repo.**
