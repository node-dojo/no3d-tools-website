#!/usr/bin/env node

/**
 * Export Mobile Layout Elements as PNGs
 * Captures screenshots of main mobile layout DOM elements
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MOBILE_VIEWPORT = {
  width: 375,
  height: 812,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

const EXPORT_DIR = path.join(__dirname, '..', 'mobile-layout-exports');

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Main mobile layout elements to capture
const ELEMENTS_TO_CAPTURE = [
  {
    name: 'site-header',
    selector: '.site-header',
    description: 'Site header with hamburger menu and logo',
  },
  {
    name: 'sidebar-open',
    selector: '.sidebar',
    description: 'Sidebar navigation (open state)',
    action: async (page) => {
      // Click hamburger to open sidebar
      await page.click('.hamburger-menu-button');
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for animation
    },
  },
  {
    name: 'product-card-container',
    selector: '.product-card-container',
    description: 'Product card container with left and right sections',
  },
  {
    name: 'product-left-section',
    selector: '.product-left-section',
    description: 'Product left section with image carousel and details',
  },
  {
    name: 'product-right-section',
    selector: '.product-right-section',
    description: 'Product right section with tabs and description',
  },
  {
    name: 'mobile-footer-cta',
    selector: '.mobile-footer-cta',
    description: 'Mobile footer CTA button',
  },
  {
    name: 'mobile-search-bar',
    selector: '.mobile-search-bar',
    description: 'Mobile search bar at bottom',
  },
  {
    name: 'horizontal-icon-grid',
    selector: '.horizontal-icon-grid-container',
    description: 'Horizontal scrolling icon grid',
  },
  {
    name: 'full-page-mobile',
    selector: 'body',
    description: 'Full mobile page view',
    fullPage: true,
  },
];

async function captureElement(page, element, index) {
  try {
    console.log(`\n[${index + 1}/${ELEMENTS_TO_CAPTURE.length}] Capturing: ${element.name}`);
    
    // Wait for element to be visible
    await page.waitForSelector(element.selector, { 
      visible: true, 
      timeout: 10000 
    }).catch(() => {
      console.warn(`  ⚠️  Element ${element.selector} not found or not visible`);
      return null;
    });

    // Perform any required actions (e.g., open sidebar)
    if (element.action) {
      await element.action(page);
    }

    // Get element bounding box
    const boundingBox = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }, element.selector);

    if (!boundingBox) {
      console.warn(`  ⚠️  Could not get bounding box for ${element.selector}`);
      return null;
    }

    // Capture screenshot
    const filePath = path.join(EXPORT_DIR, `${element.name}.png`);
    
    if (element.fullPage) {
      // Full page screenshot
      await page.screenshot({
        path: filePath,
        fullPage: true,
      });
    } else {
      // Element screenshot
      await page.screenshot({
        path: filePath,
        clip: {
          x: Math.max(0, boundingBox.x),
          y: Math.max(0, boundingBox.y),
          width: Math.min(boundingBox.width, MOBILE_VIEWPORT.width - boundingBox.x),
          height: Math.min(boundingBox.height, MOBILE_VIEWPORT.height - boundingBox.y),
        },
      });
    }

    console.log(`  ✅ Saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`  ❌ Error capturing ${element.name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting mobile layout export...\n');
  console.log(`📁 Export directory: ${EXPORT_DIR}`);
  console.log(`📱 Mobile viewport: ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Set mobile viewport
    await page.setViewport(MOBILE_VIEWPORT);
    
    // Set user agent for mobile
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    );

    // Get the HTML file path
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const fileUrl = `file://${htmlPath}`;
    
    console.log(`📄 Loading: ${fileUrl}`);
    await page.goto(fileUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture all elements
    const results = [];
    for (let i = 0; i < ELEMENTS_TO_CAPTURE.length; i++) {
      const element = ELEMENTS_TO_CAPTURE[i];
      const result = await captureElement(page, element, i);
      if (result) {
        results.push({
          name: element.name,
          path: result,
          description: element.description,
        });
      }
    }

    // Create a summary file
    const summaryPath = path.join(EXPORT_DIR, 'README.md');
    const summaryContent = `# Mobile Layout Exports

Generated: ${new Date().toISOString()}

## Exported Elements

${results.map((r, i) => `${i + 1}. **${r.name}** - ${r.description}\n   - File: \`${path.basename(r.path)}\``).join('\n\n')}

## Viewport Settings

- Width: ${MOBILE_VIEWPORT.width}px
- Height: ${MOBILE_VIEWPORT.height}px
- Device Scale Factor: ${MOBILE_VIEWPORT.deviceScaleFactor}x
- Device: iPhone 12/13 Pro (375x812)

## Notes

- Elements are captured at mobile viewport size (375x812)
- Some elements may require interaction to be visible (e.g., sidebar)
- Full page screenshot includes all content
`;

    fs.writeFileSync(summaryPath, summaryContent);
    console.log(`\n📝 Summary saved: ${summaryPath}`);

    console.log(`\n✅ Export complete! ${results.length}/${ELEMENTS_TO_CAPTURE.length} elements captured`);
    console.log(`📁 Files saved to: ${EXPORT_DIR}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if executed directly
main().catch(console.error);

export { captureElement, ELEMENTS_TO_CAPTURE };

