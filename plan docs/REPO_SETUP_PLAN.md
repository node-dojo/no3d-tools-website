# SOLVET Multi-Repository Structure Setup Plan

## Overview

Reorganize the SOLVET System into a multi-repository structure with independent git repos while preserving the existing `no3d-tools-library` git history and connections.

---

## Current State

- **SOLVET System V1/** - Parent folder (local workspace, NOT a git repo)
  - Contains: `no3d-tools-site/`, `send-no3ds-export utility/`, `schemas/`, `scripts/`, `templates/`, `plan docs/`
  
- **no3d-tools-library** - Existing git repo at separate location:
  - **Current Path:** `/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/Product Listing Management/The Well Product Catalog/no3d-tools-library`
  - **GitHub Remote:** `https://github.com/node-dojo/no3d-tools-library`
  - **Status:** Already exists on GitHub with git history

---

## Target Structure

```
SOLVET System V1/                    # Local parent folder (NOT a git repo)
├── .vscode/
│   └── solvet.code-workspace       # Workspace configuration
├── solvet-system/                  # New Git repo 1
│   ├── .git/
│   ├── schemas/
│   ├── docs/ (from plan docs/)
│   ├── scripts/
│   └── templates/
├── no3d-tools-library/             # Git repo 2 (existing - clone/move)
│   ├── .git/ (preserve existing)
│   └── [Product folders]/
├── no3d-tools-website/             # New Git repo 3
│   ├── .git/
│   └── [website files from no3d-tools-site/]
├── no3d-tools-addon/               # New Git repo 4
│   ├── .git/
│   └── [addon files from send-no3ds-export utility/]
├── README.md                       # Workspace overview (not in git)
└── .gitignore                     # Workspace-level ignore
```

---

## Phase 1: Handle Existing no3d-tools-library Repo

### Decision Required: Clone vs Move

**Option A: Clone into parent folder (Recommended)**
- Clone `no3d-tools-library` from GitHub into `SOLVET System V1/` folder
- Keeps original repo untouched as backup
- Creates new working copy in workspace
- **Command:**
  ```bash
  cd "/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/SOLVET System V1"
  git clone https://github.com/node-dojo/no3d-tools-library.git
  ```

**Option B: Move existing repo**
- Move the existing repo folder into `SOLVET System V1/`
- Preserves full git history in place
- Requires updating any local paths/references
- **Command:**
  ```bash
  mv "/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/Product Listing Management/The Well Product Catalog/no3d-tools-library" "/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/SOLVET System V1/no3d-tools-library"
  ```

### Recommendation
Use **Option A (Clone)** because:
- Preserves original as backup
- No risk of breaking existing workflow
- Can clean up original later if needed

---

## Phase 2: Create New Repositories

### 2.1 Create solvet-system Repository

**Purpose:** Shared resources (schemas, scripts, templates, documentation)

**Steps:**
1. Create GitHub repository: `github.com/[org]/solvet-system`
2. Create folder and initialize git:
   ```bash
   mkdir solvet-system
   cd solvet-system
   git init
   git remote add origin https://github.com/[org]/solvet-system.git
   ```
3. Move files:
   - `schemas/` → `solvet-system/schemas/`
   - `scripts/` → `solvet-system/scripts/`
   - `templates/` → `solvet-system/templates/`
   - `plan docs/` → `solvet-system/docs/`
4. Create `solvet-system/README.md`:
   - Describe purpose: Shared schemas, scripts, templates
   - Document structure
   - Link to other repos
5. Initial commit and push:
   ```bash
   git add .
   git commit -m "Initial commit: Shared SOLVET system resources"
   git branch -M main
   git push -u origin main
   ```

### 2.2 Create no3d-tools-website Repository

**Purpose:** E-commerce website

**Steps:**
1. Create GitHub repository: `github.com/[org]/no3d-tools-website`
2. Create folder and initialize git:
   ```bash
   mkdir no3d-tools-website
   cd no3d-tools-website
   git init
   git remote add origin https://github.com/[org]/no3d-tools-website.git
   ```
3. Move files:
   - `no3d-tools-site/*` → `no3d-tools-website/`
   - Preserve existing website structure
4. Create `no3d-tools-website/README.md`:
   - Describe purpose: E-commerce website
   - Document setup and deployment
   - Link to asset database repo
5. Initial commit and push:
   ```bash
   git add .
   git commit -m "Initial commit: NO3D Tools website"
   git branch -M main
   git push -u origin main
   ```

### 2.3 Create no3d-tools-addon Repository

**Purpose:** Blender add-on

**Steps:**
1. Create GitHub repository: `github.com/[org]/no3d-tools-addon`
2. Create folder and initialize git:
   ```bash
   mkdir no3d-tools-addon
   cd no3d-tools-addon
   git init
   git remote add origin https://github.com/[org]/no3d-tools-addon.git
   ```
3. Move files:
   - `send-no3ds-export utility/*` → `no3d-tools-addon/`
   - Preserve existing add-on structure
4. Create `no3d-tools-addon/README.md`:
   - Describe purpose: Blender add-on
   - Document installation and usage
   - Link to asset database repo
5. Initial commit and push:
   ```bash
   git add .
   git commit -m "Initial commit: NO3D Tools Blender add-on"
   git branch -M main
   git push -u origin main
   ```

---

## Phase 3: Workspace Configuration

### 3.1 Create VS Code/Cursor Workspace File

**File:** `.vscode/solvet.code-workspace`

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

### 3.2 Create Workspace-Level Files

**File:** `README.md` (workspace root, not in git)

```markdown
# SOLVET System V1 - Multi-Repository Workspace

This workspace contains multiple independent git repositories that work together in the SOLVET system.

## Repositories

- **solvet-system/** - Shared resources (schemas, scripts, templates, docs)
- **no3d-tools-library/** - Asset database (GitHub as database)
- **no3d-tools-website/** - E-commerce website
- **no3d-tools-addon/** - Blender add-on

## Setup

1. Open this folder in VS Code/Cursor
2. Open workspace file: `.vscode/solvet.code-workspace`
3. Each folder is an independent git repository

## See Also

- [Repository Structure Documentation](./solvet-system/docs/REPOSITORY_STRUCTURE.md)
- [Multi-Repo Architecture](./solvet-system/docs/MULTI_REPO_ARCHITECTURE.md)
```

---

## Phase 4: Update Documentation

### 4.1 Update REPOSITORY_STRUCTURE.md

Update `solvet-system/docs/REPOSITORY_STRUCTURE.md` to reflect:
- New multi-repo structure
- Each repository's purpose
- Updated paths and references
- Workspace configuration

### 4.2 Update MULTI_REPO_ARCHITECTURE.md

Update `solvet-system/docs/MULTI_REPO_ARCHITECTURE.md` to reflect:
- Actual repository names (`no3d-tools-website`, `no3d-tools-addon`, etc.)
- Updated connection patterns
- Workspace setup instructions

### 4.3 Create Migration Notes

Document:
- What was moved where
- Path changes
- How to update any references

---

## Phase 5: Verify and Cleanup

### 5.1 Verify Git Repositories

For each repo folder:
```bash
cd [repo-name]
git status
git remote -v
```

Verify:
- Each folder has `.git/`
- Remotes are set correctly
- Each repo works independently

### 5.2 Update Code References

Update any hardcoded paths in:
- Scripts (`solvet-system/scripts/`)
- Website code (`no3d-tools-website/`)
- Add-on code (`no3d-tools-addon/`)
- Schema references

### 5.3 Cleanup Old Structure

- Remove empty folders from parent
- Archive old structure if needed
- Update any external documentation

---

## Files to Create/Modify

### New Files
- `.vscode/solvet.code-workspace` - Workspace configuration
- `README.md` (workspace root) - Workspace overview
- `solvet-system/.git/` - New git repo
- `solvet-system/README.md` - Repo documentation
- `no3d-tools-website/.git/` - New git repo
- `no3d-tools-website/README.md` - Repo documentation
- `no3d-tools-addon/.git/` - New git repo
- `no3d-tools-addon/README.md` - Repo documentation

### Files to Move
- `schemas/` → `solvet-system/schemas/`
- `scripts/` → `solvet-system/scripts/`
- `templates/` → `solvet-system/templates/`
- `plan docs/` → `solvet-system/docs/`
- `no3d-tools-site/*` → `no3d-tools-website/`
- `send-no3ds-export utility/*` → `no3d-tools-addon/`

### Files to Update
- `plan docs/REPOSITORY_STRUCTURE.md` → Move and update paths
- `plan docs/MULTI_REPO_ARCHITECTURE.md` → Move and update repo names/paths
- `no3d-tools-site/script.js` → Update GitHub API paths if needed

---

## Git Repository Setup Details

### solvet-system
- **GitHub repo:** `github.com/[org]/solvet-system`
- **Purpose:** Shared schemas, scripts, templates, documentation
- **Type:** Core infrastructure
- **Contents:**
  - `schemas/` - JSON schemas for validation
  - `scripts/` - Utility scripts (validation, optimization)
  - `templates/` - Product templates
  - `docs/` - Documentation (moved from `plan docs/`)

### no3d-tools-library (existing)
- **GitHub repo:** `github.com/node-dojo/no3d-tools-library` (keep existing)
- **Purpose:** Asset database
- **Type:** Asset storage
- **Status:** Already exists - clone into workspace

### no3d-tools-website
- **GitHub repo:** `github.com/[org]/no3d-tools-website`
- **Purpose:** E-commerce website
- **Type:** Frontend application
- **Contents:** Files from `no3d-tools-site/`

### no3d-tools-addon
- **GitHub repo:** `github.com/[org]/no3d-tools-addon`
- **Purpose:** Blender add-on
- **Type:** Plugin/extension
- **Contents:** Files from `send-no3ds-export utility/`

---

## Important Considerations

1. **Preserve git history:** Clone existing repos rather than recreating
2. **Update references:** Any code that references old paths needs updating
3. **Workspace setup:** Cursor/VS Code will see all repos simultaneously
4. **Independent deployment:** Each repo can be deployed independently
5. **Shared resources:** Schemas and scripts live in solvet-system and can be referenced by other repos

---

## Questions to Confirm Before Execution

1. **GitHub organization:** What GitHub org/username should new repos be under?
   - Current: `node-dojo` (for no3d-tools-library)
   - New repos: Same org or different?

2. **no3d-tools-library location:** Clone into workspace or move existing?
   - Recommendation: Clone (preserves original as backup)

3. **Migration approach:** Do we want to preserve old folder structure as backup?
   - Yes: Keep original `SOLVET System V1/` structure somewhere
   - No: Move everything and delete old structure

---

## Execution Order

1. **Clone no3d-tools-library** into workspace
2. **Create GitHub repos** for solvet-system, no3d-tools-website, no3d-tools-addon
3. **Move files** into new repo folders
4. **Initialize and push** each new repo
5. **Create workspace configuration**
6. **Update documentation**
7. **Verify everything works**
8. **Cleanup old structure** (if desired)

---

**Status:** Plan ready - awaiting confirmation on questions above














