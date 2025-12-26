#!/usr/bin/env node

/**
 * Generate Library Configuration for Website
 * 
 * Reads from config/libraries.config.json (workspace root) and generates
 * a website-specific library config that maps website sections to GitHub repos.
 * 
 * Usage: node scripts/generate-library-config.js [output-path]
 * Default output: config/library-config.js
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Find workspace root by looking for config/libraries.config.json
 */
function findWorkspaceRoot(startPath) {
  let currentPath = startPath
  
  // Try up to 5 levels up
  for (let i = 0; i < 5; i++) {
    const configPath = join(currentPath, 'config', 'libraries.config.json')
    if (existsSync(configPath)) {
      return currentPath
    }
    const parent = dirname(currentPath)
    if (parent === currentPath) {
      break // Reached filesystem root
    }
    currentPath = parent
  }
  
  return null
}

/**
 * Convert library config to website LIBRARY_CONFIG format
 */
function convertToWebsiteConfig(librariesConfig) {
  const websiteConfig = {}
  
  for (const library of librariesConfig.libraries) {
    if (!library.enabled) {
      continue
    }
    
    // Map library type and websiteSection to website section keys
    const websiteSection = library.sync?.websiteSection || library.type
    
    // Determine if we should use local assets
    // Use local assets if websiteDestination is set (files are synced locally)
    const useLocalAssets = !!library.sync?.websiteDestination
    
    // Create config entry
    const configEntry = {
      owner: library.github.owner,
      repo: library.github.repo,
      branch: library.github.branch,
      useLocalAssets: useLocalAssets,
      // Additional metadata
      libraryId: library.id,
      folderPrefix: library.products.folderPrefix,
      iconPattern: library.products.iconPattern,
      websiteDestination: library.sync?.websiteDestination || 'assets/product-images',
    }
    
    // Map to website section(s)
    // Some libraries might map to multiple sections
    if (websiteSection === 'tools' || library.id === 'no3d-tools') {
      websiteConfig.tools = configEntry
      websiteConfig.tutorials = { ...configEntry } // Tutorials often share tools repo
      websiteConfig.apps = { ...configEntry } // Apps often share tools repo
    } else if (websiteSection === 'docs' || library.type === 'blog') {
      websiteConfig.docs = configEntry
    } else if (websiteSection === 'prints' || library.id === 'no3d-prints') {
      websiteConfig.prints = configEntry
    } else {
      // Use library ID as section key
      websiteConfig[library.id] = configEntry
    }
  }
  
  return websiteConfig
}

/**
 * Generate JavaScript config file
 */
function generateJSConfig(websiteConfig, outputPath) {
  const jsContent = `// Auto-generated Library Configuration
// Generated from config/libraries.config.json
// DO NOT EDIT MANUALLY - Run: node scripts/generate-library-config.js

export const LIBRARY_CONFIG = ${JSON.stringify(websiteConfig, null, 2)};

// For backward compatibility with script.js
if (typeof window !== 'undefined') {
  window.LIBRARY_CONFIG = LIBRARY_CONFIG;
}
`
  
  return jsContent
}

/**
 * Main function
 */
async function main() {
  try {
    // Find workspace root
    const websiteRoot = resolve(__dirname, '..')
    const workspaceRoot = findWorkspaceRoot(websiteRoot)
    
    if (!workspaceRoot) {
      throw new Error('Could not find workspace root containing config/libraries.config.json')
    }
    
    console.log(`📁 Workspace root: ${workspaceRoot}`)
    
    // Read central library config
    const configPath = join(workspaceRoot, 'config', 'libraries.config.json')
    if (!existsSync(configPath)) {
      throw new Error(`Library config not found: ${configPath}`)
    }
    
    console.log(`📖 Reading: ${configPath}`)
    const configContent = await readFile(configPath, 'utf-8')
    const librariesConfig = JSON.parse(configContent)
    
    // Convert to website format
    const websiteConfig = convertToWebsiteConfig(librariesConfig)
    
    // Determine output path
    const outputPath = process.argv[2] 
      ? resolve(process.argv[2])
      : join(websiteRoot, 'config', 'library-config.js')
    
    // Ensure output directory exists
    const outputDir = dirname(outputPath)
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }
    
    // Generate JavaScript config
    const jsContent = generateJSConfig(websiteConfig, outputPath)
    
    // Write file
    await writeFile(outputPath, jsContent, 'utf-8')
    
    console.log(`✅ Generated: ${outputPath}`)
    console.log(`📊 Configured ${Object.keys(websiteConfig).length} website sections`)
    
    // Show summary
    console.log('\n📋 Website Sections:')
    for (const [section, config] of Object.entries(websiteConfig)) {
      console.log(`   ${section}: ${config.owner}/${config.repo} (${config.useLocalAssets ? 'local assets' : 'GitHub'})`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()














