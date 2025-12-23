#!/usr/bin/env node
/**
 * Simple HTTP server for previewing the pop-up modal
 * Serves the no3d-tools-website directory on port 3002
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3002;
const BASE_DIR = __dirname;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Parse URL
  let urlPath = req.url.split('?')[0]; // Remove query params first
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  filePath = path.join(BASE_DIR, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Get file extension
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Read and serve file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>404 - Not Found</title></head>
            <body>
              <h1>404 - File Not Found</h1>
              <p>The requested file was not found on this server.</p>
              <p><a href="/">Go to homepage</a></p>
            </body>
          </html>
        `);
      } else {
        // Server error
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Preview server running on http://localhost:${PORT}`);
  console.log(`\n📋 Pop-up Testing:`);
  console.log(`   • Normal: http://localhost:${PORT}`);
  console.log(`   • Force show: http://localhost:${PORT}/?showPopup=true`);
  console.log(`\n💡 Tip: Open browser console and run:`);
  console.log(`   clearLandingPopupCache()`);
  console.log(`   or`);
  console.log(`   showLandingPopupNow()`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
});






















