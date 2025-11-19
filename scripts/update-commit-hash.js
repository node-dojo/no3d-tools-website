#!/usr/bin/env node

/**
 * Updates the deployment-version meta tag in index.html with the current git commit hash
 * This script should be run during the build process
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const indexPath = join(rootDir, 'index.html');

try {
  // Get the current git commit hash (short version)
  let commitHash;
  try {
    commitHash = execSync('git rev-parse --short HEAD', {
      cwd: rootDir,
      encoding: 'utf-8'
    }).trim();
    console.log(`✅ Found git commit hash: ${commitHash}`);
  } catch (error) {
    // If git is not available or not in a git repo, use fallback
    console.warn('⚠️ Could not get git commit hash, using fallback');
    commitHash = process.env.VERCEL_GIT_COMMIT_SHA 
      ? process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7)
      : 'dev';
    console.log(`   Using: ${commitHash}`);
  }

  // Read the index.html file
  let html = readFileSync(indexPath, 'utf-8');

  // Update the meta tag with the commit hash
  const metaTagRegex = /<meta\s+name=["']deployment-version["']\s+content=["'][^"']*["']\s*>/i;
  const newMetaTag = `<meta name="deployment-version" content="${commitHash}">`;

  if (metaTagRegex.test(html)) {
    html = html.replace(metaTagRegex, newMetaTag);
    console.log(`✅ Updated meta tag to: ${commitHash}`);
  } else {
    // If meta tag doesn't exist, add it after the viewport meta tag
    const viewportRegex = /(<meta\s+name=["']viewport["'][^>]*>)/i;
    if (viewportRegex.test(html)) {
      html = html.replace(viewportRegex, `$1\n    ${newMetaTag}`);
      console.log(`✅ Added meta tag with: ${commitHash}`);
    } else {
      console.error('❌ Could not find viewport meta tag to insert deployment-version');
      process.exit(1);
    }
  }

  // Write the updated HTML back to the file
  writeFileSync(indexPath, html, 'utf-8');
  console.log(`✅ Successfully updated ${indexPath}`);

} catch (error) {
  console.error('❌ Error updating commit hash:', error.message);
  process.exit(1);
}

