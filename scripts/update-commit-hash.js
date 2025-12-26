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
  
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    commitHash = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
    console.log(`✅ Found Vercel commit hash: ${commitHash}`);
  } else {
    try {
      commitHash = execSync('git rev-parse --short HEAD', {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'] // Suppress stderr to avoid log noise
      }).trim();
      console.log(`✅ Found git commit hash: ${commitHash}`);
    } catch (error) {
      // If git is not available or not in a git repo, use fallback
      console.warn('⚠️ Could not get git commit hash, using fallback');
      commitHash = 'dev';
      console.log(`   Using: ${commitHash}`);
    }
  }

  // Get the current git branch name
  let branchName;
  
  if (process.env.VERCEL_GIT_COMMIT_REF) {
    branchName = process.env.VERCEL_GIT_COMMIT_REF;
    console.log(`✅ Found Vercel branch: ${branchName}`);
  } else {
    try {
      branchName = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'] // Suppress stderr
      }).trim();
      console.log(`✅ Found git branch: ${branchName}`);
    } catch (error) {
      // If git is not available or not in a git repo, use fallback
      console.warn('⚠️ Could not get git branch, using fallback');
      branchName = 'dev';
      console.log(`   Using: ${branchName}`);
    }
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

  // Update or add the branch name meta tag
  const branchMetaTagRegex = /<meta\s+name=["']deployment-branch["']\s+content=["'][^"']*["']\s*>/i;
  const newBranchMetaTag = `<meta name="deployment-branch" content="${branchName}">`;

  if (branchMetaTagRegex.test(html)) {
    html = html.replace(branchMetaTagRegex, newBranchMetaTag);
    console.log(`✅ Updated branch meta tag to: ${branchName}`);
  } else {
    // If branch meta tag doesn't exist, add it after the deployment-version meta tag
    const deploymentVersionRegex = /(<meta\s+name=["']deployment-version["'][^>]*>)/i;
    if (deploymentVersionRegex.test(html)) {
      html = html.replace(deploymentVersionRegex, `$1\n    ${newBranchMetaTag}`);
      console.log(`✅ Added branch meta tag with: ${branchName}`);
    } else {
      console.warn('⚠️ Could not find deployment-version meta tag to insert branch, adding after viewport');
      const viewportRegex = /(<meta\s+name=["']viewport["'][^>]*>)/i;
      if (viewportRegex.test(html)) {
        html = html.replace(viewportRegex, `$1\n    ${newBranchMetaTag}`);
        console.log(`✅ Added branch meta tag with: ${branchName}`);
      }
    }
  }

  // Write the updated HTML back to the file
  writeFileSync(indexPath, html, 'utf-8');
  console.log(`✅ Successfully updated ${indexPath}`);

} catch (error) {
  console.error('❌ Error updating commit hash:', error.message);
  process.exit(1);
}

