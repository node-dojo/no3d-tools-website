# Multi-Repository Architecture Guide
## SOLVET System Repository Connections

This document describes best practices for managing multiple GitHub repositories that work together in the SOLVET system.

---

## Repository Structure

### Repository 1: Website Repository
**Purpose:** E-commerce website that displays and sells digital assets  
**Location:** `no3d-tools-site/`  
**Remote:** `github.com/[org]/no3d-tools-website`  
**Tech Stack:** Next.js/React, deployed on Vercel

### Repository 2: Asset Database Repository  
**Purpose:** Digital asset storage and metadata (GitHub as database)  
**Location:** External repo  
**Remote:** `github.com/node-dojo/no3d-tools-library`  
**Content:** Product folders with `.blend`, `.json`, images, descriptions

### Repository 3: Blender Add-on Repository
**Purpose:** Blender add-on that generates and exports assets  
**Location:** `send-no3ds-export utility/`  
**Remote:** `github.com/[org]/no3d-tools-addon`  
**Tech Stack:** Python, Blender API

---

## Connection Methods

### 1. GitHub API (Primary - Currently Used)

**Best For:**
- Reading product data from database repo
- Fetching metadata and file listings
- Real-time updates from asset database

**Implementation Pattern:**
```javascript
// Website → Asset Database
const REPO_CONFIG = {
  owner: 'node-dojo',
  repo: 'no3d-tools-library',
  branch: 'main'
};

// Access via GitHub API
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
```

**Advantages:**
- ✅ No coupling between repos
- ✅ Independent deployment cycles
- ✅ Clear ownership boundaries
- ✅ Easy to scale each component

**Disadvantages:**
- ⚠️ GitHub API rate limits (5000 req/hour authenticated)
- ⚠️ Requires API token for production
- ⚠️ Network dependency for data

**Best Practices:**
1. Use authenticated requests in production (increase rate limit)
2. Implement caching to reduce API calls
3. Use webhooks for real-time updates (see GitHub Actions section)
4. Fallback to static JSON manifest file for critical data

---

### 2. GitHub Submodules (Not Recommended for This Use Case)

**When to Use:**
- Sharing common code/libraries between repos
- Keeping specific versions of shared utilities

**Why Not Here:**
- ❌ Creates tight coupling
- ❌ Complex version management
- ❌ Not ideal for asset database (too large, changes frequently)
- ❌ Website needs latest assets, not specific commits

---

### 3. Git Subtrees (Not Recommended)

**When to Use:**
- Sharing code that needs to be modified in consuming repo
- One-way code sharing

**Why Not Here:**
- ❌ Complex merge history
- ❌ Not suitable for asset database
- ❌ Better alternatives available

---

### 4. Package Managers (For Shared Code Only)

**Use For:**
- Shared TypeScript/JavaScript utilities
- Common validation schemas
- Shared UI components

**Implementation:**

**Option A: NPM Package (Recommended for code)**
```json
// In website repo package.json
{
  "dependencies": {
    "@your-org/product-schema": "^1.0.0",
    "@your-org/shared-utils": "^1.0.0"
  }
}
```

**Option B: Git URL Dependencies**
```json
{
  "dependencies": {
    "@your-org/shared-utils": "git+https://github.com/org/shared-utils.git#v1.0.0"
  }
}
```

---

### 5. GitHub Actions Webhooks & Automation

**Best Practice:** Use GitHub Actions to coordinate repos

**Workflow Pattern:**

```yaml
# In asset-database repo: .github/workflows/sync-to-website.yml
name: Sync to Website

on:
  push:
    branches: [main]
    paths:
      - '**/*.json'
      - '**/*.blend'
      - '**/*.png'

jobs:
  notify-website:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger website rebuild
        uses: peter-evans/repository-dispatch@v2
        with:
          token: ${{ secrets.WEBSITE_DISPATCH_TOKEN }}
          repository: org/no3d-tools-website
          event-type: asset-updated
          client-payload: |
            {
              "commit": "${{ github.sha }}",
              "ref": "${{ github.ref }}"
            }
```

```yaml
# In website repo: .github/workflows/update-from-database.yml
name: Update from Database

on:
  repository_dispatch:
    types: [asset-updated]

jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Fetch latest assets
        run: |
          git clone --depth=1 \
            https://github.com/node-dojo/no3d-tools-library.git \
            temp-assets
          # Process and update website content
          
      - name: Deploy
        run: vercel deploy --prod
```

---

### 6. API Gateway Pattern (Advanced)

**For Production Scale:**

Create a centralized API service that:
- Aggregates data from multiple repos
- Provides unified API for website
- Handles caching, rate limiting, webhooks

**Architecture:**
```
Website → API Gateway → [Asset Database Repo API]
                      → [Polar API]
                      → [Other Services]
```

---

## Configuration Management

### Environment Variables

**Website Repository:**
```bash
# .env.production
GITHUB_TOKEN=ghp_xxx
ASSET_REPO_OWNER=node-dojo
ASSET_REPO_NAME=no3d-tools-library
ASSET_REPO_BRANCH=main

# Cache settings
CACHE_TTL=3600
ENABLE_CACHE=true
```

**Add-on Repository:**
```python
# config.py
ASSET_REPO_PATH = "/path/to/asset/repo"
ASSET_REPO_REMOTE = "https://github.com/node-dojo/no3d-tools-library.git"
METADATA_SCHEMA_URL = "https://raw.githubusercontent.com/org/schemas/main/product-metadata.schema.json"
```

---

## Versioning & Compatibility

### Schema Versioning

**Shared Schema Repository:**
```
schemas-repo/
├── product-metadata/
│   ├── v1.0.0.json
│   ├── v1.1.0.json
│   └── latest.json → v1.1.0.json
```

**Version in Metadata:**
```json
{
  "schema_version": "1.1.0",
  "title": "Product Name",
  ...
}
```

### API Versioning

**GitHub API Pattern:**
```javascript
// Use tags/releases for versioned access
const ASSET_REPO_TAG = 'v2.0.0'; // or 'main' for latest

// Access specific version
const url = `https://api.github.com/repos/node-dojo/no3d-tools-library/contents?ref=${ASSET_REPO_TAG}`;
```

---

## Documentation Between Repos

### Cross-Repo Documentation

**In each repo, maintain:**

1. **REPOSITORY_CONNECTIONS.md**
   ```markdown
   ## Connected Repositories
   
   - **Asset Database:** github.com/node-dojo/no3d-tools-library
   - **Website:** github.com/org/no3d-tools-website
   - **Add-on:** github.com/org/no3d-tools-addon
   
   ## API Contracts
   - Product JSON schema: [link]
   - GitHub API endpoints: [link]
   - Webhook events: [link]
   ```

2. **DEPENDENCIES.md**
   ```markdown
   ## External Dependencies
   - Asset Database Repo (node-dojo/no3d-tools-library)
     - Version: main branch (latest)
     - Access: GitHub API
     - Rate Limit: 5000 req/hour (authenticated)
   ```

---

## Best Practices Summary

### ✅ DO:

1. **Use GitHub API for read operations**
   - Website reading from asset database
   - Add-on reading schema definitions

2. **Use GitHub Actions for coordination**
   - Webhook triggers between repos
   - Automated syncing workflows

3. **Maintain clear contracts**
   - Document API expectations
   - Version schemas properly
   - Use semantic versioning

4. **Implement caching**
   - Reduce API calls
   - Improve performance
   - Handle rate limits

5. **Use environment variables**
   - Don't hardcode repo references
   - Support different environments
   - Secure token management

### ❌ DON'T:

1. **Don't use submodules for asset database**
   - Too large, changes too frequently
   - Creates tight coupling

2. **Don't duplicate code**
   - Use shared packages or git dependencies
   - Keep schema definitions in one place

3. **Don't hardcode repo references**
   - Use environment variables
   - Support different branches/environments

4. **Don't bypass GitHub API**
   - Direct file access breaks versioning
   - Harder to cache and manage

---

## Implementation Roadmap

### Phase 1: Current State (GitHub API)
- ✅ Website reads from asset database via GitHub API
- ✅ Add-on exports to asset database structure
- ⚠️ Add authentication for production
- ⚠️ Implement caching

### Phase 2: Automation
- [ ] GitHub Actions webhook from asset repo to website
- [ ] Automated website rebuild on asset updates
- [ ] Automated validation workflows

### Phase 3: Optimization
- [ ] Implement API caching layer
- [ ] Create static manifest file (fallback)
- [ ] Add monitoring and alerting

### Phase 4: Scale
- [ ] Consider API gateway for high traffic
- [ ] Implement CDN for asset delivery
- [ ] Add GraphQL endpoint (optional)

---

## Monitoring & Maintenance

### Key Metrics to Track:

1. **API Usage**
   - GitHub API rate limit usage
   - Request frequency
   - Error rates

2. **Sync Performance**
   - Time to sync assets to website
   - Build/deploy times
   - Cache hit rates

3. **Data Consistency**
   - Schema validation errors
   - Missing asset errors
   - Version mismatches

### Alerting:

Set up alerts for:
- GitHub API rate limit warnings (>80%)
- Failed sync operations
- Schema validation failures
- Website build failures

---

## Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Repository Dispatch Event](https://docs.github.com/en/rest/reference/repos#create-a-repository-dispatch-event)
- [Git Submodules vs Subtrees](https://www.atlassian.com/git/tutorials/git-submodule)

---

**Last Updated:** January 2025  
**Maintained By:** SOLVET System Team


