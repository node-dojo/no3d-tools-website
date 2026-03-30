/**
 * List all product JSON files
 * 
 * Returns a list of all .json files in the assets/product-data directory
 * This allows the website to dynamically load all products instead of using a hardcoded list
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { setCorsHeaders } from './lib/cors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function handler(req, res) {
  if (setCorsHeaders(req, res, { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const productDataDir = path.join(__dirname, '..', 'assets', 'product-data')
    const files = fs.readdirSync(productDataDir)
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .sort()

    return res.status(200).json({
      files: jsonFiles,
      count: jsonFiles.length
    })
  } catch (error) {
    console.error('Error listing product files:', error)
    return res.status(500).json({
      error: 'Failed to list products',
      files: [],
      count: 0
    })
  }
}
