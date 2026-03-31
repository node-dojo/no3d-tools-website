#!/usr/bin/env node

/**
 * Render Email Sections
 *
 * Reads newsletter frontmatter from Blog/Newsletter/, renders the hero,
 * callout, and banner sections as images using Puppeteer, uploads them
 * to Cloudinary, and optionally opens a full email preview in the browser.
 *
 * Frontmatter fields:
 *   title:          Newsletter title (used for subject line in hero)
 *   subject:        Override for subject line text (optional, falls back to title)
 *   callout:        Callout section text (optional — section omitted if empty)
 *   banner:         Banner section text (optional — section omitted if empty)
 *   hero_image:     Path to hero image relative to vault attachments (optional)
 *   hero_rotation:  Rotation in degrees for hero image (optional, e.g. 15, -10)
 *   caption:        Hero image caption (optional)
 *
 * Usage:
 *   doppler run -- node scripts/render-email-sections.mjs "Newsletter Title"
 *   doppler run -- node scripts/render-email-sections.mjs "Newsletter Title" --preview
 *
 * Output:
 *   Writes a JSON manifest to email/.rendered/<slug>.json with Cloudinary URLs
 *   for each rendered section. send-newsletter.mjs reads this manifest.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EMAIL_DIR = path.join(PROJECT_ROOT, 'email');
const RENDERED_DIR = path.join(EMAIL_DIR, '.rendered');

const VAULT_PATH = path.resolve(
  process.env.HOME,
  'Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault_001'
);
const NEWSLETTER_DIR = path.join(VAULT_PATH, 'Blog', 'Newsletter');
const ATTACHMENTS_DIR = path.join(VAULT_PATH, 'The Well Notebook', 'attachments');
const SITE_URL = process.env.SITE_URL || 'https://no3dtools.com';
const CLOUDINARY_FOLDER = 'no3d-newsletter';

// --- Cloudinary (same pattern as publish-blog.mjs) ---

function parseCloudinaryCredentials() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  let apiKey = process.env.CLOUDINARY_API_KEY;
  let apiSecret = process.env.CLOUDINARY_API_SECRET;

  if ((!cloudName || !apiKey || !apiSecret) && process.env.CLOUDINARY_URL) {
    const match = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    if (match) {
      apiKey = apiKey || match[1];
      apiSecret = apiSecret || match[2];
      cloudName = cloudName || match[3];
    }
  }

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Missing Cloudinary credentials. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET');
  }

  return { cloudName, apiKey, apiSecret };
}

async function uploadBufferToCloudinary(buffer, publicId, { cloudName, apiKey, apiSecret }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

  const fileBase64 = `data:image/png;base64,${buffer.toString('base64')}`;

  const formData = new URLSearchParams();
  formData.append('file', fileBase64);
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

// --- Template rendering ---

function loadTemplate(name) {
  return fs.readFileSync(path.join(EMAIL_DIR, `${name}-template.html`), 'utf-8');
}

function injectVars(html, vars) {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value || '');
  }
  return result;
}

async function renderSection(browser, templateName, vars, slug) {
  const html = injectVars(loadTemplate(templateName), vars);

  // Write temp file so fonts resolve via relative paths
  const tempPath = path.join(EMAIL_DIR, `.tmp-${templateName}.html`);
  fs.writeFileSync(tempPath, html);

  const page = await browser.newPage();
  await page.setViewport({ width: 600, height: 1, deviceScaleFactor: 2 });
  await page.goto(`file://${tempPath}`, { waitUntil: 'networkidle0' });

  // Let fonts load
  await page.evaluate(() => document.fonts.ready);

  // Get body dimensions for tight crop
  const bodyHandle = await page.$('body');
  const box = await bodyHandle.boundingBox();

  const buffer = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: Math.ceil(box.width), height: Math.ceil(box.height) },
  });

  await page.close();
  fs.unlinkSync(tempPath);

  // Save locally
  const localPath = path.join(RENDERED_DIR, `${slug}-${templateName}.png`);
  fs.writeFileSync(localPath, buffer);
  console.log(`  [ok] Rendered ${templateName} → ${path.basename(localPath)}`);

  return { buffer, localPath };
}

// --- Newsletter finder (shared logic with send-newsletter.mjs) ---

function findNewsletter(titleOrFile) {
  const files = fs.readdirSync(NEWSLETTER_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(NEWSLETTER_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data: fm } = matter(raw);
    const title = fm.title || path.basename(file, '.md');
    const filename = path.basename(file, '.md');

    if (
      title.toLowerCase() === titleOrFile.toLowerCase() ||
      filename.toLowerCase() === titleOrFile.toLowerCase() ||
      file.toLowerCase() === titleOrFile.toLowerCase()
    ) {
      return { filePath, raw, frontmatter: fm, title };
    }
  }

  return null;
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// --- Preview HTML ---

function buildPreviewHtml(slug, frontmatter, bodyMarkdown, manifest) {
  // Simple markdown to HTML (same as send-newsletter.mjs)
  let bodyHtml = bodyMarkdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  bodyHtml = bodyHtml.replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');

  const heroImg = manifest.hero
    ? `<img src="${manifest.hero}" alt="${frontmatter.subject || frontmatter.title}" style="width:100%;display:block;">`
    : '';
  const calloutImg = manifest.callout
    ? `<img src="${manifest.callout}" alt="Callout" style="width:100%;display:block;">`
    : '';
  const bannerImg = manifest.banner
    ? `<img src="${manifest.banner}" alt="${frontmatter.banner}" style="width:100%;display:block;">`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${frontmatter.title}</title>
  <style>
    body { margin: 0; padding: 40px; background: #333; font-family: 'Courier New', Courier, monospace; }
    .email-frame { max-width: 600px; margin: 0 auto; background: #eaeaea; }
    .body-section { padding: 40px 48px; background: #eaeaea; }
    .body-section p { font-size: 12px; line-height: 1.6; color: #000; text-align: justify; margin: 0 0 16px; }
    .body-section a { color: #000; }
    .body-section h1, .body-section h2, .body-section h3 { margin: 0 0 12px; }
    .body-section ul { padding-left: 20px; margin: 0 0 16px; }
    .body-section li { font-size: 12px; margin: 4px 0; }
    .body-section hr { border: none; border-top: 1px solid #b3b3b3; margin: 24px 0; }
    .body-section img { max-width: 100%; }
    .footer { background: #202020; padding: 32px 48px; display: flex; justify-content: space-between; align-items: flex-start; }
    .footer-left, .footer-right { color: #b8b8b8; font-size: 10px; line-height: 1.8; }
    .footer-brand { font-size: 14px; font-weight: bold; color: #b8b8b8; margin-bottom: 12px; }
    .footer-tagline { font-size: 14px; font-weight: bold; color: #b8b8b8; margin-bottom: 12px; }
    .footer a { color: #b8b8b8; text-decoration: underline; }
    .footer-right { text-align: right; }
    .footer-bottom { background: #202020; padding: 0 48px 24px; text-align: center; border-top: 1px solid #333; }
    .footer-bottom a { color: #666; font-size: 10px; text-decoration: underline; }
    .footer-bottom .legal { color: #444; font-size: 9px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="email-frame">
    ${heroImg}
    ${calloutImg}
    <div class="body-section">
      <p>${bodyHtml}</p>
    </div>
    ${bannerImg}
    <div class="footer">
      <div class="footer-left">
        <div class="footer-brand">NO3D TOOLS</div>
        <a href="https://no3dtools.com">no3dtools.com</a><br>
        <a href="https://no3dtools.com/blog">Blog</a><br>
        <a href="https://no3dtools.com/library">Tool Library</a>
      </div>
      <div class="footer-right">
        <div class="footer-tagline">Stay Foolish.</div>
        <a href="https://www.reddit.com/user/no3dtools/">Reddit</a><br>
        <a href="https://www.youtube.com/@no3dtools">YouTube</a><br>
        <a href="https://bsky.app/profile/no3dtools.com">Bluesky</a>
      </div>
    </div>
    <div class="footer-bottom" style="padding-top:16px;">
      <a href="#">Unsubscribe</a>
      <span style="color:#444;"> &middot; </span>
      <a href="#">View in browser</a>
      <div class="legal">&copy; 2025 NO3D Tools. You received this because you subscribed at no3dtools.com.</div>
    </div>
  </div>
</body>
</html>`;
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const preview = args.includes('--preview');
  const titleOrFile = args.find(a => !a.startsWith('--'));

  if (!titleOrFile) {
    console.error('Usage: node scripts/render-email-sections.mjs "Newsletter Title" [--preview]');
    process.exit(1);
  }

  const newsletter = findNewsletter(titleOrFile);
  if (!newsletter) {
    console.error(`No newsletter found matching: "${titleOrFile}"`);
    process.exit(1);
  }

  const { frontmatter, raw } = newsletter;
  const { content: bodyMarkdown } = matter(raw);
  const title = frontmatter.title || newsletter.title;
  const subject = frontmatter.subject || title;
  const slug = slugify(title);

  console.log(`Rendering sections for: ${title}`);
  console.log(`  Subject:  ${subject}`);
  console.log(`  Callout:  ${frontmatter.callout || '(none)'}`);
  console.log(`  Banner:   ${frontmatter.banner || '(none)'}`);

  // Ensure output dir
  fs.mkdirSync(RENDERED_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const manifest = { slug, title, sections: {} };

  try {
    // Hero inner image — desaturated, multiply blend, optional rotation
    let heroInnerHtml = '';
    if (frontmatter.hero_image) {
      const imgPath = path.resolve(ATTACHMENTS_DIR, frontmatter.hero_image);
      if (fs.existsSync(imgPath)) {
        const rotation = frontmatter.hero_rotation ? `transform:rotate(${frontmatter.hero_rotation}deg) scale(1.2);` : '';
        heroInnerHtml = `<img class="hero-image-inner" src="file://${imgPath}" alt="${subject}" style="${rotation}">`;
      } else {
        console.warn(`  [warn] Hero image not found: ${imgPath}`);
      }
    }

    // Render hero
    const hero = await renderSection(browser, 'hero', {
      SUBJECT: subject,
      HERO_INNER_IMAGE: heroInnerHtml,
      CAPTION: frontmatter.caption || '',
    }, slug);
    manifest.sections.hero = hero.localPath;

    // Render callout (if provided)
    if (frontmatter.callout) {
      const callout = await renderSection(browser, 'callout', {
        CALLOUT: frontmatter.callout,
      }, slug);
      manifest.sections.callout = callout.localPath;
    }

    // Render banner (if provided)
    if (frontmatter.banner) {
      const banner = await renderSection(browser, 'banner', {
        BANNER: frontmatter.banner,
      }, slug);
      manifest.sections.banner = banner.localPath;
    }

    // Upload to Cloudinary
    console.log('\nUploading to Cloudinary...');
    const creds = parseCloudinaryCredentials();
    const urls = {};

    for (const [section, localPath] of Object.entries(manifest.sections)) {
      const buffer = fs.readFileSync(localPath);
      const publicId = `${CLOUDINARY_FOLDER}/${slug}/${section}`;
      const url = await uploadBufferToCloudinary(buffer, publicId, creds);
      urls[section] = url;
      console.log(`  [ok] ${section} → ${url}`);
    }

    // Write manifest
    const manifestPath = path.join(RENDERED_DIR, `${slug}.json`);
    const manifestData = {
      slug,
      title,
      subject,
      rendered_at: new Date().toISOString(),
      urls,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
    console.log(`\nManifest: ${manifestPath}`);

    // Preview
    if (preview) {
      const previewHtml = buildPreviewHtml(slug, frontmatter, bodyMarkdown, urls);
      const previewPath = path.join(RENDERED_DIR, `${slug}-preview.html`);
      fs.writeFileSync(previewPath, previewHtml);
      console.log(`\nOpening preview...`);

      const { exec } = await import('child_process');
      exec(`open "${previewPath}"`);
    }
  } finally {
    await browser.close();
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
