#!/usr/bin/env node

/**
 * Publish Blog Posts from Obsidian Vault to Supabase
 *
 * Scans Blog/Post/ for markdown files. Every file in this folder is
 * considered published. Uses content hashing to detect changes —
 * only new or modified posts are synced.
 *
 * Wikilinks ([[Target Note]]) are converted to live blog links when
 * the target exists as a published post, otherwise rendered as plain text.
 *
 * Usage:
 *   doppler run -- node scripts/publish-blog.mjs
 *   doppler run -- node scripts/publish-blog.mjs --dry-run
 *   doppler run -- node scripts/publish-blog.mjs --slug my-post-slug
 *   doppler run -- node scripts/publish-blog.mjs --force   # re-sync all, ignore hashes
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import matter from 'gray-matter';

// --- Configuration ---
const VAULT_PATH = path.resolve(
  process.env.HOME,
  'Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault_001'
);
const POST_DIR = path.join(VAULT_PATH, 'Blog', 'Post');
const ATTACHMENTS_DIR = path.join(VAULT_PATH, 'The Well Notebook/attachments');
const CLOUDINARY_FOLDER = 'no3d-blog';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm']);

// --- Content Hashing ---

function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

// --- Cloudinary (REST API, no SDK) ---

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

function sanitizePublicId(name) {
  return name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-/]/g, '');
}

function getOptimizedUrl(cloudName, publicId, resourceType = 'image') {
  const encodedId = publicId.split('/').map(encodeURIComponent).join('/');
  if (resourceType === 'video') {
    return `https://res.cloudinary.com/${cloudName}/video/upload/f_auto,q_auto/${encodedId}`;
  }
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_auto/${encodedId}`;
}

async function checkCloudinaryExists(cloudName, apiKey, apiSecret, publicId, resourceType) {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload/${publicId}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'),
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function uploadToCloudinary(filePath, publicId, resourceType, { cloudName, apiKey, apiSecret }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

  const fileBuffer = fs.readFileSync(filePath);
  const mime = resourceType === 'video' ? 'video/mp4' : 'image/png';
  const fileBase64 = `data:${mime};base64,${fileBuffer.toString('base64')}`;

  const formData = new URLSearchParams();
  formData.append('file', fileBase64);
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${errorText}`);
  }

  return await res.json();
}

// --- Wikilink Resolution ---

/**
 * Build a map of all published post titles/filenames to their slugs.
 * Used to convert [[wikilinks]] to live blog URLs.
 */
function buildWikilinkIndex(postFiles) {
  const index = new Map();

  for (const filePath of postFiles) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data: fm } = matter(raw);
    const filename = path.basename(filePath, '.md');

    const slug = fm.slug || filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const title = fm.title || filename;

    // Index by both filename and title (case-insensitive)
    index.set(filename.toLowerCase(), { slug, title });
    index.set(title.toLowerCase(), { slug, title });
  }

  return index;
}

// --- Obsidian Syntax Conversion ---

function convertObsidianSyntax(content, wikilinkIndex) {
  // Step 1: Convert media embeds ![[file.ext]] and ![[file.ext|width]]
  content = content.replace(
    /!\[\[([^\]|]+?)(?:\|(\d+))?\]\]/g,
    (match, filename, width) => {
      const ext = path.extname(filename).slice(1).toLowerCase();
      if (VIDEO_EXTS.has(ext)) {
        const widthAttr = width ? ` width="${width}"` : '';
        return `<video src="${filename}"${widthAttr} controls></video>`;
      }
      if (IMAGE_EXTS.has(ext) || ext === '') {
        const widthMeta = width ? `{width=${width}}` : '';
        return `![${path.basename(filename)}](${filename})${widthMeta}`;
      }
      return match;
    }
  );

  // Step 2: Convert wikilinks [[Note|display]] to blog links or plain text
  content = content.replace(
    /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g,
    (match, target, display) => {
      const displayText = display || target;
      const entry = wikilinkIndex.get(target.toLowerCase());
      if (entry) {
        return `[${displayText}](/blog/${entry.slug})`;
      }
      // Target doesn't exist as a published post — render as plain text
      return displayText;
    }
  );

  // Step 3: Strip inline tags like #content #reel (but not inside code blocks or URLs)
  content = content.replace(
    /(?<=\s|^)#([a-zA-Z][a-zA-Z0-9_/-]*)/gm,
    ''
  );

  return content;
}

// --- Media Resolution ---

function resolveMediaPaths(content, postDir) {
  const mediaRefs = new Map();

  const patterns = [
    { regex: /!\[([^\]]*)\]\(([^)]+)\)/g, groupIndex: 2 },
    { regex: /<video[^>]*src=["']([^"']+)["'][^>]*>/gi, groupIndex: 1 },
  ];

  for (const { regex, groupIndex } of patterns) {
    let m;
    while ((m = regex.exec(content)) !== null) {
      const ref = m[groupIndex].trim();
      if (ref.startsWith('http://') || ref.startsWith('https://')) continue;
      if (mediaRefs.has(ref)) continue;

      const candidates = [
        path.join(postDir, ref),
        path.join(ATTACHMENTS_DIR, ref),
        path.join(ATTACHMENTS_DIR, path.basename(ref)),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          mediaRefs.set(ref, candidate);
          break;
        }
      }

      if (!mediaRefs.has(ref)) {
        console.warn(`  Warning: Media not found: ${ref}`);
      }
    }
  }

  return mediaRefs;
}

// --- Media Upload ---

async function uploadMedia(mediaRefs, slug) {
  const creds = parseCloudinaryCredentials();
  const urlMap = new Map();

  for (const [localRef, absolutePath] of mediaRefs.entries()) {
    const ext = path.extname(absolutePath).slice(1).toLowerCase();
    const isVideo = VIDEO_EXTS.has(ext);
    const resourceType = isVideo ? 'video' : 'image';
    const basename = path.basename(absolutePath, path.extname(absolutePath));
    const publicId = `${CLOUDINARY_FOLDER}/${slug}/${sanitizePublicId(basename)}`;

    const exists = await checkCloudinaryExists(
      creds.cloudName, creds.apiKey, creds.apiSecret, publicId, resourceType
    );

    if (exists) {
      const optimized = getOptimizedUrl(creds.cloudName, publicId, resourceType);
      urlMap.set(localRef, optimized);
      console.log(`  [ok] Already exists: ${publicId}`);
      continue;
    }

    console.log(`  [upload] ${localRef} -> ${publicId}`);
    try {
      await uploadToCloudinary(absolutePath, publicId, resourceType, creds);
      const optimized = getOptimizedUrl(creds.cloudName, publicId, resourceType);
      urlMap.set(localRef, optimized);
      console.log(`  [ok] Uploaded: ${optimized}`);
    } catch (err) {
      console.error(`  [fail] Upload failed for ${localRef}: ${err.message}`);
    }
  }

  return urlMap;
}

// --- URL Replacement ---

function replaceMediaUrls(content, urlMap) {
  content = content.replace(
    /!\[([^\]]*)\]\(([^)]+)\)(?:\{width=(\d+)\})?/g,
    (match, alt, src, width) => {
      const url = urlMap.get(src.trim());
      if (!url) return match;
      const finalUrl = width
        ? url.replace('/upload/', `/upload/w_${width}/`)
        : url;
      return `![${alt}](${finalUrl})`;
    }
  );

  content = content.replace(
    /<video([^>]*)src=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const url = urlMap.get(src.trim());
      if (!url) return match;
      return `<video${before}src="${url}"${after}>`;
    }
  );

  return content;
}

// --- Featured Image ---

async function resolveFeaturedImage(featuredImage, slug, postDir) {
  if (!featuredImage) return null;
  if (featuredImage.startsWith('http')) return featuredImage;

  let filename = featuredImage
    .replace(/^!\[\[/, '')
    .replace(/\]\]$/, '')
    .replace(/\|.*$/, '');

  const candidates = [
    path.join(postDir, filename),
    path.join(ATTACHMENTS_DIR, filename),
    path.join(ATTACHMENTS_DIR, path.basename(filename)),
  ];

  let absolutePath = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) { absolutePath = c; break; }
  }
  if (!absolutePath) {
    console.warn(`  Warning: Featured image not found: ${filename}`);
    return null;
  }

  const mediaRefs = new Map([[filename, absolutePath]]);
  const urlMap = await uploadMedia(mediaRefs, slug);
  return urlMap.get(filename) || null;
}

// --- Supabase Operations ---

async function fetchExistingHashes(supabase) {
  const { data, error } = await supabase
    .from('articles')
    .select('slug, metadata')
    .eq('status', 'published');

  if (error) {
    console.warn('Warning: Could not fetch existing articles:', error.message);
    return new Map();
  }

  const hashes = new Map();
  for (const row of data || []) {
    const hash = row.metadata?.content_hash;
    if (hash) hashes.set(row.slug, hash);
  }
  return hashes;
}

async function upsertArticle(supabase, article) {
  const { data, error } = await supabase
    .from('articles')
    .upsert(
      {
        slug: article.slug,
        title: article.title,
        content: article.content,
        raw_content: article.rawContent,
        excerpt: article.excerpt || null,
        tags: article.tags || [],
        featured_image: article.featuredImage || null,
        status: 'published',
        published_at: article.publishedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: article.metadata || {},
      },
      { onConflict: 'slug' }
    )
    .select();

  if (error) throw error;
  return data[0];
}

/**
 * Remove articles from Supabase that no longer have a file in Blog/Post/.
 */
async function removeDeletedPosts(supabase, currentSlugs) {
  const { data: existing } = await supabase
    .from('articles')
    .select('slug')
    .eq('status', 'published')
    .is('metadata->>type', null); // only blog posts, not newsletters

  if (!existing) return;

  const toDelete = existing.filter(row => !currentSlugs.has(row.slug));
  for (const row of toDelete) {
    console.log(`  [remove] ${row.slug} (file no longer in Blog/Post/)`);
    await supabase
      .from('articles')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('slug', row.slug);
  }
}

// --- Collect Post Files ---

function collectPostFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(dir, entry.name));
    } else if (entry.isDirectory()) {
      // Support posts in subdirectories (for co-located media)
      const subFiles = fs.readdirSync(path.join(dir, entry.name))
        .filter(f => f.endsWith('.md'))
        .map(f => path.join(dir, entry.name, f));
      files.push(...subFiles);
    }
  }

  return files;
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const slugArgIdx = args.indexOf('--slug');
  const targetSlug = slugArgIdx !== -1 ? args[slugArgIdx + 1] : null;

  if (!fs.existsSync(POST_DIR)) {
    console.log(`Blog/Post/ directory not found at: ${POST_DIR}`);
    console.log('Creating it now...');
    fs.mkdirSync(POST_DIR, { recursive: true });
    console.log('Created. Add markdown files to Blog/Post/ and run again.');
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Collect all post files
  const files = collectPostFiles(POST_DIR);
  console.log(`Found ${files.length} markdown file(s) in Blog/Post/\n`);

  if (files.length === 0) return;

  // Build wikilink index for cross-linking
  const wikilinkIndex = buildWikilinkIndex(files);

  // Fetch existing content hashes from Supabase
  const existingHashes = force ? new Map() : await fetchExistingHashes(supabase);

  let synced = 0;
  let skipped = 0;
  let unchanged = 0;
  const currentSlugs = new Set();

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(raw);
    const filename = path.basename(filePath, '.md');

    // Title: frontmatter > filename
    const title = frontmatter.title || filename;

    // Slug: frontmatter > derived from filename
    const slug = frontmatter.slug || filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    currentSlugs.add(slug);

    if (targetSlug && slug !== targetSlug) continue;

    // Check content hash — skip if unchanged
    const contentHash = hashContent(raw);
    if (!force && existingHashes.get(slug) === contentHash) {
      unchanged++;
      continue;
    }

    console.log(`[sync] ${title} (${slug})`);

    // Auto-generate excerpt from first paragraph if missing
    const excerpt = frontmatter.excerpt ||
      body.trim().split(/\n\n/)[0]?.replace(/[#*_\[\]!]/g, '').trim().slice(0, 280) ||
      null;

    // Convert Obsidian syntax (wikilinks become blog links)
    let content = convertObsidianSyntax(body, wikilinkIndex);

    // Resolve and upload media
    const postDir = path.dirname(filePath);
    const mediaRefs = resolveMediaPaths(content, postDir);

    if (mediaRefs.size > 0) {
      console.log(`  Found ${mediaRefs.size} media reference(s)`);
    }

    if (!dryRun && mediaRefs.size > 0) {
      const urlMap = await uploadMedia(mediaRefs, slug);
      content = replaceMediaUrls(content, urlMap);
    }

    // Resolve featured image
    const featuredImage = dryRun
      ? frontmatter.featured_image || null
      : await resolveFeaturedImage(frontmatter.featured_image, slug, postDir);

    if (dryRun) {
      console.log(`  [dry-run] Would upsert: ${slug}`);
      console.log(`  Tags: ${(frontmatter.tags || []).join(', ') || '(none)'}`);
      console.log(`  Excerpt: ${excerpt?.slice(0, 80) || '(none)'}...`);
      console.log(`  Hash: ${contentHash.slice(0, 12)}...`);
      console.log();
      synced++;
      continue;
    }

    // Determine published_at: keep existing if updating, use frontmatter date or now if new
    const publishedAt = frontmatter.date || new Date().toISOString();

    const article = await upsertArticle(supabase, {
      slug,
      title,
      content,
      rawContent: body,
      excerpt,
      tags: frontmatter.tags || [],
      featuredImage,
      publishedAt,
      metadata: {
        source_file: path.relative(POST_DIR, filePath),
        content_hash: contentHash,
        date: frontmatter.date,
      },
    });

    console.log(`  [ok] Upserted (updated_at: ${article.updated_at})\n`);
    synced++;
  }

  // Clean up articles whose source files were removed
  if (!dryRun && !targetSlug) {
    await removeDeletedPosts(supabase, currentSlugs);
  }

  console.log(`\nDone. ${synced} synced, ${unchanged} unchanged, ${skipped} skipped.`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
