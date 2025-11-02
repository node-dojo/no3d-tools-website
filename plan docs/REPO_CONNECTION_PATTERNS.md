# Repository Connection Patterns
## Practical Implementation Guide for SOLVET Multi-Repo System

This document provides concrete code examples and implementation patterns for connecting the SOLVET system's multiple repositories.

---

## Architecture Overview

```
┌─────────────────────┐
│  Blender Add-on     │ ──exports to──▶ ┌──────────────────┐
│  Repository         │                  │  Asset Database  │
│                     │                  │  Repository       │
└─────────────────────┘                  │  (GitHub as DB)   │
                                         └──────────────────┘
                                                  │
                                                  │ (GitHub API)
                                                  ▼
                                         ┌──────────────────┐
                                         │  Website         │
                                         │  Repository      │
                                         │  (Next.js/Vercel)│
                                         └──────────────────┘
```

---

## Pattern 1: GitHub API (Recommended)

### Website → Asset Database

**Current Implementation (Basic):**
```javascript
// no3d-tools-site/script.js
const REPO_CONFIG = {
  owner: 'node-dojo',
  repo: 'no3d-tools-library',
  branch: 'main'
};

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
```

### Improved Implementation with Authentication

**1. Environment Configuration:**
```javascript
// no3d-tools-site/lib/github-config.js
export const GITHUB_CONFIG = {
  owner: process.env.NEXT_PUBLIC_GITHUB_OWNER || 'node-dojo',
  repo: process.env.NEXT_PUBLIC_GITHUB_REPO || 'no3d-tools-library',
  branch: process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main',
  token: process.env.GITHUB_TOKEN, // Server-side only
};

export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
```

**2. API Client with Caching:**
```javascript
// no3d-tools-site/lib/github-api.js
import { GITHUB_CONFIG, GITHUB_API_BASE } from './github-config';

// In-memory cache (or use Redis for production)
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

async function fetchWithAuth(endpoint, options = {}) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    ...options.headers,
  };

  if (GITHUB_CONFIG.token) {
    headers['Authorization'] = `token ${GITHUB_CONFIG.token}`;
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 403) {
      // Rate limit hit
      const resetTime = response.headers.get('X-RateLimit-Reset');
      throw new Error(`Rate limit exceeded. Resets at ${new Date(resetTime * 1000)}`);
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function getCached(key, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

export async function getProductFolders() {
  const cacheKey = `folders-${GITHUB_CONFIG.branch}`;
  
  return getCached(cacheKey, async () => {
    const contents = await fetchWithAuth(
      `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents?ref=${GITHUB_CONFIG.branch}`
    );
    
    // Filter for directories containing .blend files
    return contents.filter(item => item.type === 'dir');
  });
}

export async function getProductMetadata(productFolder) {
  const cacheKey = `metadata-${productFolder}-${GITHUB_CONFIG.branch}`;
  
  return getCached(cacheKey, async () => {
    const productName = productFolder.replace(/\.blend$/, '');
    const url = `${GITHUB_RAW_BASE}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${productFolder}/${productName}.json`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    return response.json();
  });
}

export async function getProductImage(productFolder, imageType = 'icon') {
  const productName = productFolder.replace(/\.blend$/, '');
  const imageName = imageType === 'icon' 
    ? `icon_${productName}.png`
    : `${productName}.png`;
  
  return `${GITHUB_RAW_BASE}/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${productFolder}/${imageName}`;
}

// Rate limit monitoring
export async function getRateLimitStatus() {
  const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
    headers: GITHUB_CONFIG.token ? {
      'Authorization': `token ${GITHUB_CONFIG.token}`
    } : {}
  });
  
  return response.json();
}
```

**3. Next.js API Route (Server-Side):**
```javascript
// no3d-tools-site/pages/api/products.js
import { getProductFolders, getProductMetadata } from '../../lib/github-api';

export default async function handler(req, res) {
  try {
    const folders = await getProductFolders();
    const products = await Promise.all(
      folders.map(async (folder) => {
        const metadata = await getProductMetadata(folder.name);
        return metadata ? { ...metadata, folder: folder.name } : null;
      })
    );

    const validProducts = products.filter(Boolean);
    
    res.status(200).json({
      products: validProducts,
      count: validProducts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
}
```

**4. Client-Side Usage:**
```javascript
// no3d-tools-site/components/ProductList.jsx
import { useState, useEffect } from 'react';
import { getProductImage } from '../lib/github-api';

export function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  if (loading) return <div>Loading products...</div>;

  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.handle} product={product} />
      ))}
    </div>
  );
}
```

---

## Pattern 2: GitHub Actions Webhook

### Asset Database → Website Trigger

**1. Workflow in Asset Database Repo:**
```yaml
# .github/workflows/notify-website.yml
name: Notify Website

on:
  push:
    branches: [main]
    paths:
      - '**/*.json'
      - '**/*.blend'
      - '**/icon_*.png'

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Website Rebuild
        uses: peter-evans/repository-dispatch@v2
        with:
          token: ${{ secrets.WEBSITE_DISPATCH_TOKEN }}
          repository: ${{ secrets.WEBSITE_REPO }}
          event-type: asset-updated
          client-payload: |
            {
              "commit": "${{ github.sha }}",
              "ref": "${{ github.ref }}",
              "author": "${{ github.actor }}",
              "changed_files": "${{ github.event.head_commit.modified }}"
            }
```

**2. Workflow in Website Repo:**
```yaml
# .github/workflows/update-assets.yml
name: Update Assets

on:
  repository_dispatch:
    types: [asset-updated]
  workflow_dispatch: # Manual trigger

jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Clear Cache
        run: |
          # Clear Next.js cache
          rm -rf .next/cache
      
      - name: Rebuild Site
        run: |
          npm install
          npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Pattern 3: Shared Schema Repository

### Option A: Git Dependency (Recommended for Schemas)

**1. Create Schema Repository:**
```
no3d-tools-schemas/
├── package.json
├── schemas/
│   ├── product-metadata.schema.json
│   └── bundle-metadata.schema.json
└── README.md
```

**2. Install in Add-on:**
```json
// send-no3ds-export utility/package.json
{
  "dependencies": {
    "@your-org/product-schemas": "git+https://github.com/org/no3d-tools-schemas.git#v1.0.0"
  }
}
```

**3. Use in Add-on:**
```python
# send-no3ds-export utility/utils.py
import json
import os

SCHEMA_PATH = os.path.join(
    os.path.dirname(__file__),
    '..', 'node_modules', '@your-org', 'product-schemas',
    'schemas', 'product-metadata.schema.json'
)

def validate_metadata(metadata):
    with open(SCHEMA_PATH, 'r') as f:
        schema = json.load(f)
    # Use jsonschema library
    jsonschema.validate(instance=metadata, schema=schema)
```

**4. Use in Website:**
```javascript
// no3d-tools-site/lib/validation.js
import productSchema from '@your-org/product-schemas/schemas/product-metadata.schema.json';
import Ajv from 'ajv';

const ajv = new Ajv();
const validate = ajv.compile(productSchema);

export function validateProductMetadata(product) {
  const valid = validate(product);
  if (!valid) {
    return {
      valid: false,
      errors: validate.errors,
    };
  }
  return { valid: true };
}
```

### Option B: GitHub Raw URL (For Public Schemas)

```javascript
// Schema URL pattern
const SCHEMA_URL = `https://raw.githubusercontent.com/org/no3d-tools-schemas/main/schemas/product-metadata.schema.json`;

async function fetchSchema() {
  const response = await fetch(SCHEMA_URL);
  return response.json();
}
```

---

## Pattern 4: Environment-Based Configuration

### Shared Configuration Pattern

**1. Create Config Package:**
```typescript
// shared-config/src/index.ts
export interface RepoConfig {
  assetDatabase: {
    owner: string;
    repo: string;
    branch: string;
  };
  website: {
    repo: string;
    deploymentUrl: string;
  };
  addon: {
    repo: string;
    version: string;
  };
}

export const getConfig = (): RepoConfig => ({
  assetDatabase: {
    owner: process.env.ASSET_REPO_OWNER || 'node-dojo',
    repo: process.env.ASSET_REPO_NAME || 'no3d-tools-library',
    branch: process.env.ASSET_REPO_BRANCH || 'main',
  },
  website: {
    repo: process.env.WEBSITE_REPO || 'org/no3d-tools-website',
    deploymentUrl: process.env.WEBSITE_URL || 'https://no3dtools.com',
  },
  addon: {
    repo: process.env.ADDON_REPO || 'org/no3d-tools-addon',
    version: process.env.ADDON_VERSION || '1.0.0',
  },
});
```

**2. Use in Each Repo:**
```javascript
// Website
import { getConfig } from '@your-org/shared-config';
const config = getConfig();
const { assetDatabase } = config;
```

```python
# Add-on
import os
ASSET_REPO_OWNER = os.getenv('ASSET_REPO_OWNER', 'node-dojo')
ASSET_REPO_NAME = os.getenv('ASSET_REPO_NAME', 'no3d-tools-library')
```

---

## Pattern 5: Manifest File Fallback

### Generate Static Manifest (Backup for API)

**1. GitHub Action to Generate Manifest:**
```yaml
# .github/workflows/generate-manifest.yml
name: Generate Manifest

on:
  push:
    branches: [main]
    paths:
      - '**/*.json'

jobs:
  manifest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Generate Manifest
        run: |
          node scripts/generate-manifest.js
      
      - name: Commit Manifest
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add manifest.json
          git commit -m "Update manifest" || exit 0
          git push
```

**2. Manifest Generator:**
```javascript
// scripts/generate-manifest.js
const fs = require('fs');
const path = require('path');

function generateManifest() {
  const products = [];
  const productDirs = fs.readdirSync('.').filter(item => {
    return fs.statSync(item).isDirectory() && 
           fs.existsSync(path.join(item, `${item}.json`));
  });

  productDirs.forEach(dir => {
    const metadataPath = path.join(dir, `${dir}.json`);
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    products.push({
      handle: metadata.handle,
      title: metadata.title,
      folder: dir,
      updated: new Date().toISOString(),
    });
  });

  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    products: products,
  };

  fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
}

generateManifest();
```

**3. Use Manifest as Fallback:**
```javascript
// Website fallback logic
async function loadProducts() {
  try {
    // Try GitHub API first
    return await fetchProductsFromAPI();
  } catch (error) {
    console.warn('API failed, using manifest:', error);
    // Fallback to manifest
    const manifest = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/main/manifest.json`
    ).then(r => r.json());
    
    return manifest.products;
  }
}
```

---

## Pattern 6: Version Pinning

### Pin to Specific Versions/Tags

```javascript
// Website can pin to specific asset database version
const ASSET_DB_VERSION = 'v2.0.0'; // or 'main' for latest

const productUrl = `https://raw.githubusercontent.com/node-dojo/no3d-tools-library/${ASSET_DB_VERSION}/ProductName/ProductName.json`;
```

### Use GitHub Releases

```bash
# Tag asset database releases
git tag -a v2.0.0 -m "Stable version with 50 products"
git push origin v2.0.0
```

---

## Best Practices Checklist

### ✅ For Each Repository:

1. **Document Connections**
   - List all connected repos
   - Document API contracts
   - Include setup instructions

2. **Environment Variables**
   - Never hardcode repo references
   - Use .env.example files
   - Document required secrets

3. **Error Handling**
   - Handle API rate limits
   - Implement retry logic
   - Provide fallback mechanisms

4. **Caching Strategy**
   - Cache API responses
   - Set appropriate TTL
   - Invalidate on updates

5. **Monitoring**
   - Track API usage
   - Monitor rate limits
   - Alert on failures

### ✅ Cross-Repo Coordination:

1. **Version Compatibility**
   - Document schema versions
   - Test version combinations
   - Maintain changelog

2. **Deployment Coordination**
   - Deploy in correct order
   - Test integrations
   - Rollback procedures

3. **Communication**
   - Use GitHub Discussions for coordination
   - Document breaking changes
   - Maintain migration guides

---

## Quick Reference

### Repository URLs Template

```javascript
// GitHub API
const API_URL = `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`;

// Raw Content
const RAW_URL = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

// Repository Dispatch (Webhook)
const DISPATCH_URL = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
```

### Environment Variables Template

```bash
# .env.example (Website)
GITHUB_TOKEN=ghp_xxx
GITHUB_OWNER=node-dojo
GITHUB_REPO=no3d-tools-library
GITHUB_BRANCH=main

# .env.example (Add-on)
ASSET_REPO_PATH=/path/to/repo
ASSET_REPO_REMOTE=https://github.com/node-dojo/no3d-tools-library.git
GITHUB_TOKEN=ghp_xxx
```

---

**Last Updated:** January 2025  
**See Also:** [MULTI_REPO_ARCHITECTURE.md](./MULTI_REPO_ARCHITECTURE.md)


