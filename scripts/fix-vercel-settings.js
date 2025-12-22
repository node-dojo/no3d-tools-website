#!/usr/bin/env node
/**
 * Fix Vercel project settings via API
 * 
 * This script fixes:
 * 1. Root Directory (clears it to empty/blank)
 * 2. Resolves configuration mismatches
 * 
 * Usage:
 *   node scripts/fix-vercel-settings.js
 * 
 * Requires:
 *   - VERCEL_TOKEN environment variable (get from: vercel whoami --token)
 *   - Or run: vercel login first
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Project configuration
const PROJECT_ID = 'prj_KsuvpKJ4rz8k5Zki1DbDALBrF4gR';
const TEAM_ID = 'team_L9uKDHc687Ib743Z6V5Y8zAj';
const PROJECT_NAME = 'no3dtoolssite';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getVercelToken() {
  // Try environment variable first (works with doppler run)
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_TOKEN.trim().length > 0) {
    return process.env.VERCEL_TOKEN.trim();
  }

  // Try to get from local .vercel directory first (project-specific)
  try {
    const localConfigPath = join(PROJECT_ROOT, '.vercel', 'auth.json');
    if (existsSync(localConfigPath)) {
      const config = JSON.parse(readFileSync(localConfigPath, 'utf-8'));
      if (config.token) {
        return config.token;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  // Try to get from Vercel CLI global config
  try {
    const configPath = join(process.env.HOME || process.env.USERPROFILE || '', '.vercel', 'auth.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.token) {
        return config.token;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  // Try to get token via CLI
  try {
    const token = execSync('vercel whoami --token', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (token && token.length > 0) {
      return token;
    }
  } catch (error) {
    // Ignore errors
  }

  return null;
}

async function updateProjectSettings(token) {
  const apiUrl = `https://api.vercel.com/v10/projects/${PROJECT_ID}`;
  
  // Get current project settings first
  log('\n📋 Fetching current project settings...', 'cyan');
  const getResponse = await fetch(`${apiUrl}?teamId=${TEAM_ID}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!getResponse.ok) {
    const error = await getResponse.text();
    throw new Error(`Failed to fetch project: ${getResponse.status} ${error}`);
  }

  const currentProject = await getResponse.json();
  log(`   Current root directory: "${currentProject.rootDirectory || '(empty)'}"`, 'yellow');

  // Prepare update payload
  const updatePayload = {
    // Clear root directory (set to null/empty)
    rootDirectory: null,
    // Keep other settings from current project
    framework: currentProject.framework || null,
    nodeVersion: currentProject.nodeVersion || '22.x',
  };

  log('\n🔧 Updating project settings...', 'cyan');
  log(`   Setting rootDirectory to: (empty)`, 'yellow');
  
  const updateResponse = await fetch(`${apiUrl}?teamId=${TEAM_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to update project: ${updateResponse.status} ${error}`);
  }

  const updatedProject = await updateResponse.json();
  log(`   ✅ Root directory updated to: "${updatedProject.rootDirectory || '(empty)'}"`, 'green');
  
  return updatedProject;
}

async function triggerRedeploy(token) {
  log('\n🚀 Triggering new deployment to apply settings...', 'cyan');
  
  // Get latest deployment
  const deploymentsUrl = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=1`;
  const deploymentsResponse = await fetch(deploymentsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!deploymentsResponse.ok) {
    log('   ⚠️  Could not fetch deployments, but settings are updated', 'yellow');
    return;
  }

  const deployments = await deploymentsResponse.json();
  if (deployments.deployments && deployments.deployments.length > 0) {
    const latestDeployment = deployments.deployments[0];
    log(`   Latest deployment: ${latestDeployment.url}`, 'blue');
    log(`   ✅ Settings will be applied on next deployment`, 'green');
    log(`   💡 To trigger immediately: vercel --prod`, 'cyan');
  }
}

async function main() {
  log('🔧 Vercel Project Settings Fixer', 'cyan');
  log('='.repeat(50), 'cyan');

  // Get Vercel token
  log('\n🔑 Getting Vercel authentication token...', 'cyan');
  const token = getVercelToken();
  
  if (!token) {
    log('\n❌ Error: Vercel token not found!', 'red');
    log('\nPlease do one of the following:', 'yellow');
    log('  1. Run: vercel login', 'yellow');
    log('  2. Or set VERCEL_TOKEN environment variable', 'yellow');
    log('  3. Or get token: vercel whoami --token', 'yellow');
    process.exit(1);
  }

  log('   ✅ Token found', 'green');

  try {
    // Update project settings
    const updatedProject = await updateProjectSettings(token);
    
    // Trigger redeploy suggestion
    await triggerRedeploy(token);

    log('\n' + '='.repeat(50), 'cyan');
    log('✅ Successfully updated Vercel project settings!', 'green');
    log('\n📝 Summary:', 'cyan');
    log(`   Project: ${PROJECT_NAME} (${PROJECT_ID})`, 'blue');
    log(`   Root Directory: (empty)`, 'green');
    log(`   Framework: ${updatedProject.framework || 'auto-detect'}`, 'blue');
    
    log('\n🚀 Next steps:', 'cyan');
    log('   1. Settings are updated in Vercel dashboard', 'yellow');
    log('   2. Next deployment will use the new settings', 'yellow');
    log('   3. To deploy now: cd no3d-tools-website && vercel --prod', 'yellow');
    log('   4. Or push to GitHub to trigger auto-deployment', 'yellow');
    
  } catch (error) {
    log('\n❌ Error updating project settings:', 'red');
    log(`   ${error.message}`, 'red');
    
    if (error.message.includes('401') || error.message.includes('403')) {
      log('\n💡 Authentication issue. Try:', 'yellow');
      log('   vercel login', 'yellow');
      log('   Or check your VERCEL_TOKEN', 'yellow');
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});








