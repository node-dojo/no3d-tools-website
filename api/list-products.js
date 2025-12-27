/**
 * List all product JSON files
 * 
 * Returns a list of all .json files in the assets/product-data directory
 * This allows the website to dynamically load all products instead of using a hardcoded list
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Path to product-data directory (relative to this API file)
    const productDataDir = path.join(__dirname, '..', 'assets', 'product-data')
    
    // Read all files in the directory
    const files = fs.readdirSync(productDataDir)
    
    // Filter to only .json files
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .sort() // Sort alphabetically for consistency
    
    return res.status(200).json({
      files: jsonFiles,
      count: jsonFiles.length
    })
  } catch (error) {
    console.error('Error listing product files:', error)
    return res.status(500).json({
      error: error.message,
      files: [],
      count: 0
    })
  }
}
