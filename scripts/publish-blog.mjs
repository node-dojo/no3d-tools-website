#!/usr/bin/env node

/**
 * Publish Blog Posts from Obsidian Vault to Supabase
 *
 * Scans BOTH Blog/4-Ready/ (new posts) and Blog/5-Published/ (already-live
 * posts that may have been edited). Uses content hashing to detect changes —
 * only new or modified posts are synced. Posts with a future `date` in
 * frontmatter are skipped until that date arrives.
 *
 * Auto-move on first publish: when a post in Blog/4-Ready/ is successfully
 * upserted, the file is moved to Blog/5-Published/ with a "YYYY-MM-DD "
 * filename prefix (pulled from frontmatter date) for chronological sort.
 * The prefix is decorative — stripped before deriving title or slug, never
 * reaches the website. Sort survives edits, syncs, and mtime touches.
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
const POST_DIR = path.join(VAULT_PATH, 'Blog', '4-Ready');
const PUBLISHED_DIR = path.join(VAULT_PATH, 'Blog', '5-Published');
const ATTACHMENTS_DIR = path.join(VAULT_PATH, 'The Well Notebook/attachments');
const CLOUDINARY_FOLDER = 'no3d-blog';

// --- Filename Date Prefix Helpers ---
//
// Published posts in Blog/5-Published/ are prefixed with "YYYY-MM-DD " (ISO)
// so the file explorer sorts them chronologically by filename — robust against
// edits, syncs, and any tool that touches mtime. The prefix is decorative;
// it MUST be stripped before deriving title/slug so it never reaches the
// website. Posts in Blog/4-Ready/ may also have the prefix; same rule.

const DATE_PREFIX_REGEX = /^\d{4}-\d{2}-\d{2}\s+/;

function stripDatePrefix(filename) {
  return filename.replace(DATE_PREFIX_REGEX, '');
}

function formatDatePrefix(dateInput) {
  // Accepts a YAML-parsed Date object, a "YYYY-MM-DD" string, or null.
  // Returns "YYYY-MM-DD". Always reads UTC components to avoid the
  // timezone bug where YAML parses "2026-04-04" as midnight UTC and the
  // local-time getter returns the previous day in negative-offset zones.
  if (!dateInput) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (typeof dateInput === 'string') {
    // Already-formatted "YYYY-MM-DD" — return the first 10 chars verbatim if they match.
    const m = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    // Fall through to Date parsing for unusual string formats.
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formatDatePrefix(null);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return formatDatePrefix(null);
    return `${dateInput.getUTCFullYear()}-${String(dateInput.getUTCMonth() + 1).padStart(2, '0')}-${String(dateInput.getUTCDate()).padStart(2, '0')}`;
  }
  return formatDatePrefix(null);
}

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

function getOptimizedUrl(cloudName, publicId, resourceType = 'image', { isGif = false } = {}) {
  const encodedId = publicId.split('/').map(encodeURIComponent).join('/');
  if (resourceType === 'video') {
    return `https://res.cloudinary.com/${cloudName}/video/upload/f_auto,q_auto/${encodedId}`;
  }
  // Animated GIFs need fl_animated to preserve animation (f_auto alone converts to static WebP)
  const transforms = isGif ? 'f_auto,q_auto,w_auto,fl_animated' : 'f_auto,q_auto,w_auto';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${encodedId}`;
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
  let mime;
  if (resourceType === 'video') mime = 'video/mp4';
  else if (resourceType === 'raw') mime = 'application/octet-stream';
  else mime = 'image/png';
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

// --- Proof of Life Sidecar ---
//
// If a .proofoflife/<path>.jsonl sidecar exists for this note, upload it
// as a Cloudinary "raw" resource so the web <proof-of-life> component can
// fetch and replay it. Returns { url, stats } or null.
//
// Stats are computed by a single pass over the JSONL lines: count sessions,
// count events, sum deltaMs per session (clamped to exclude the initial 0
// between session header and first event).

async function uploadProofOfLifeSidecar(vaultRelPath, slug) {
  const sidecarAbs = path.join(
    VAULT_PATH,
    '.proofoflife',
    vaultRelPath.replace(/\.md$/i, '.jsonl')
  );
  if (!fs.existsSync(sidecarAbs)) return null;

  const raw = fs.readFileSync(sidecarAbs, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());
  let sessions = 0;
  let totalEvents = 0;
  let totalTimeMs = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (Array.isArray(parsed)) {
        totalEvents++;
        totalTimeMs += parsed[0] || 0;
      } else if (parsed.v !== undefined) {
        sessions++;
      }
    } catch {
      // Skip malformed lines
    }
  }

  if (totalEvents === 0) {
    console.log(`  [proof-of-life] Sidecar exists but has no events — skipping upload`);
    return null;
  }

  const creds = parseCloudinaryCredentials();
  // For raw resources, Cloudinary keeps the extension as part of the
  // public_id and serves the file at that exact path. Including ".jsonl"
  // preserves the content-type for the browser.
  const publicId = `${CLOUDINARY_FOLDER}/${slug}/proof-of-life.jsonl`;

  console.log(`  [proof-of-life] ${sessions} session(s), ${totalEvents} events, ${(totalTimeMs / 1000).toFixed(1)}s writing time`);
  console.log(`  [proof-of-life] uploading ${sidecarAbs.replace(VAULT_PATH, '')} → ${publicId}`);

  try {
    await uploadToCloudinary(sidecarAbs, publicId, 'raw', creds);
    const encodedId = publicId.split('/').map(encodeURIComponent).join('/');
    const url = `https://res.cloudinary.com/${creds.cloudName}/raw/upload/${encodedId}`;
    console.log(`  [proof-of-life] [ok] ${url}`);
    return {
      url,
      stats: { sessions, totalEvents, totalTimeMs },
    };
  } catch (err) {
    console.error(`  [proof-of-life] [fail] ${err.message}`);
    return null;
  }
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
  // Step 1: Convert media embeds ![[file.ext]], ![[file.ext|width]], ![[file.ext|alt text]]
  content = content.replace(
    /!\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g,
    (match, filename, pipeValue) => {
      const ext = path.extname(filename).slice(1).toLowerCase();
      const isWidth = pipeValue && /^\d+$/.test(pipeValue);
      const width = isWidth ? pipeValue : null;
      const alt = isWidth ? path.basename(filename) : (pipeValue || path.basename(filename));
      if (VIDEO_EXTS.has(ext)) {
        const widthAttr = width ? ` width="${width}"` : '';
        return `<video src="${filename}"${widthAttr} controls></video>`;
      }
      if (IMAGE_EXTS.has(ext) || ext === '') {
        const widthMeta = width ? `{width=${width}}` : '';
        return `![${alt}](${filename})${widthMeta}`;
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

    const isGif = ext === 'gif';

    if (exists) {
      const optimized = getOptimizedUrl(creds.cloudName, publicId, resourceType, { isGif });
      urlMap.set(localRef, optimized);
      console.log(`  [ok] Already exists: ${publicId}`);
      continue;
    }

    console.log(`  [upload] ${localRef} -> ${publicId}`);
    try {
      await uploadToCloudinary(absolutePath, publicId, resourceType, creds);
      const optimized = getOptimizedUrl(creds.cloudName, publicId, resourceType, { isGif });
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
 * Remove articles from Supabase that no longer have a source file in EITHER
 * Blog/4-Ready/ OR Blog/5-Published/. The currentSlugs set is built from
 * both folders during the main loop, so anything missing here is a true
 * orphan (file was deleted, not just moved between folders).
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
    console.log(`  [remove] ${row.slug} (file no longer in 4-Ready/ or 5-Published/)`);
    await supabase
      .from('articles')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('slug', row.slug);
  }
}

// --- Collect Post Files ---
//
// Two post shapes are supported:
//
// 1. Flat post:        4-Ready/my-post.md
// 2. Folder-note post: 4-Ready/my-post/my-post.md  (+ children: my-post.log.md,
//                      research.md, screenshot.png, etc — children NEVER publish)
//
// Folder-note posts in 5-Published/ may have their parent folder date-prefixed
// for chronological sort: 5-Published/2026-04-09 my-post/my-post.md
//
// Inside a folder-note post directory we publish exactly ONE file: {dirname}.md
// (where {dirname} is the parent folder name with any date prefix stripped).
// Every other file in that directory is treated as a vault-only sidecar and
// is never sent to Supabase. See Vault_001/Agent/Reference/Folder-Note-Convention.md

function collectPostFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      // Flat post — picked up directly. Skip *.log.md sidecars from the
      // legacy flat-with-sibling-log shape; logs are vault-only artifacts
      // and should never become Supabase articles.
      if (entry.name.endsWith('.log.md')) continue;
      files.push(path.join(dir, entry.name));
    } else if (entry.isDirectory()) {
      // Folder-note post: only the inner {dirname}.md gets published.
      // Date prefix on the folder (5-Published/2026-04-09 my-post/) is
      // stripped when computing the expected inner filename.
      const folderName = stripDatePrefix(entry.name);
      const expectedInnerFile = `${folderName}.md`;
      const innerPath = path.join(dir, entry.name, expectedInnerFile);
      if (fs.existsSync(innerPath)) {
        files.push(innerPath);
      }
      // Anything else in the subdirectory is a sidecar (logs, research, media,
      // unrelated .md files) and is intentionally skipped.
    }
  }

  return files;
}

// True if filePath is the folder note of a folder-note post —
// i.e. its parent directory name (with any date prefix stripped) equals the
// file's basename without extension.
function isFolderNotePost(filePath) {
  const fileStem = path.basename(filePath, '.md');
  const parentName = stripDatePrefix(path.basename(path.dirname(filePath)));
  return parentName === fileStem;
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const slugArgIdx = args.indexOf('--slug');
  const targetSlug = slugArgIdx !== -1 ? args[slugArgIdx + 1] : null;

  if (!fs.existsSync(POST_DIR)) {
    console.log(`Blog/4-Ready/ directory not found at: ${POST_DIR}`);
    console.log('Creating it now...');
    fs.mkdirSync(POST_DIR, { recursive: true });
    console.log('Created. Add markdown files to Blog/4-Ready/ and run again.');
    return;
  }

  // Ensure 5-Published exists; needed for first-publish moves
  if (!fs.existsSync(PUBLISHED_DIR)) {
    fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Collect post files from BOTH folders.
  // - 4-Ready/ holds new or pending-first-publish posts
  // - 5-Published/ holds already-published posts that may have been edited
  const readyFiles = collectPostFiles(POST_DIR);
  const publishedFiles = collectPostFiles(PUBLISHED_DIR);
  const files = [...readyFiles, ...publishedFiles];
  console.log(`Found ${readyFiles.length} in Blog/4-Ready/, ${publishedFiles.length} in Blog/5-Published/ (${files.length} total)\n`);

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
    const rawFilename = path.basename(filePath, '.md');
    // Strip "DD MMM YYYY " prefix used in 5-Published/ for sorting.
    // The prefix is decorative — never let it leak into title or slug.
    const filename = stripDatePrefix(rawFilename);
    const isInPublished = filePath.startsWith(PUBLISHED_DIR);

    // Title: frontmatter > stripped filename
    const title = frontmatter.title || filename;

    // Slug: frontmatter > derived from stripped filename
    const slug = frontmatter.slug || filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    currentSlugs.add(slug);

    if (targetSlug && slug !== targetSlug) continue;

    // Skip posts with a future date (scheduled publishing)
    if (frontmatter.date) {
      const postDate = new Date(frontmatter.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (postDate > today) {
        console.log(`[scheduled] ${title} (${slug}) — publishes ${frontmatter.date}`);
        skipped++;
        continue;
      }
    }

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

    // Upload Proof of Life sidecar if one exists for this note.
    // The sidecar path mirrors the vault path under .proofoflife/ with .md → .jsonl.
    const vaultRelPath = path.relative(VAULT_PATH, filePath);
    const proofOfLife = dryRun ? null : await uploadProofOfLifeSidecar(vaultRelPath, slug);

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
        source_file: path.relative(path.join(VAULT_PATH, 'Blog'), filePath),
        content_hash: contentHash,
        date: frontmatter.date,
        shortlink: frontmatter.shortlink || null,
        ...(proofOfLife && {
          proofoflife_url: proofOfLife.url,
          proofoflife_stats: proofOfLife.stats,
        }),
      },
    });

    console.log(`  [ok] Upserted (updated_at: ${article.updated_at})`);

    // First-publish move: if the post lives in 4-Ready/, move it to
    // 5-Published/ with a "YYYY-MM-DD " prefix for chronological sort.
    // Already-published posts (in 5-Published/) stay where they are; they're
    // editable and will re-sync to the website on subsequent runs by slug.
    //
    // Two shapes:
    //   - Flat post:        rename the .md file with a date prefix.
    //   - Folder-note post: rename the PARENT FOLDER with a date prefix.
    //                       The inner {dirname}.md file keeps its name.
    //                       Children (log, research, media) come along intact
    //                       because we're moving the whole folder.
    //
    // Uses STRIPPED names so we never produce double prefixes if a draft was
    // manually pre-prefixed.
    if (!isInPublished) {
      const datePrefix = formatDatePrefix(frontmatter.date);

      if (isFolderNotePost(filePath)) {
        // Move the entire parent folder.
        const parentDir = path.dirname(filePath);
        const parentName = stripDatePrefix(path.basename(parentDir));
        const newFolderName = `${datePrefix} ${parentName}`;
        const destFolder = path.join(PUBLISHED_DIR, newFolderName);
        try {
          fs.renameSync(parentDir, destFolder);
          console.log(`  [moved] → 5-Published/${newFolderName}/ (folder-note post, children intact)`);
        } catch (moveErr) {
          console.warn(`  [warn] Upsert succeeded but folder move failed: ${moveErr.message}`);
          console.warn(`  [warn] Manually move ${parentDir} to ${destFolder}`);
        }
      } else {
        // Flat post: rename the file.
        const newFilename = `${datePrefix} ${filename}.md`;
        const destPath = path.join(PUBLISHED_DIR, newFilename);
        try {
          fs.renameSync(filePath, destPath);
          console.log(`  [moved] → 5-Published/${newFilename}`);
        } catch (moveErr) {
          console.warn(`  [warn] Upsert succeeded but file move failed: ${moveErr.message}`);
          console.warn(`  [warn] Manually move ${filePath} to ${destPath}`);
        }

        // Mirror the move for the Proof of Life sidecar so future re-syncs
        // can still find it. Only needed for flat posts — folder-note posts
        // are handled by moving the whole parent directory above, and the
        // sidecar lives outside that directory under .proofoflife/.
        const oldSidecar = path.join(
          VAULT_PATH,
          '.proofoflife',
          path.relative(VAULT_PATH, filePath).replace(/\.md$/i, '.jsonl')
        );
        if (fs.existsSync(oldSidecar)) {
          const newSidecar = path.join(
            VAULT_PATH,
            '.proofoflife',
            path.relative(VAULT_PATH, destPath).replace(/\.md$/i, '.jsonl')
          );
          try {
            fs.mkdirSync(path.dirname(newSidecar), { recursive: true });
            fs.renameSync(oldSidecar, newSidecar);
            console.log(`  [moved] proof-of-life sidecar → ${path.relative(VAULT_PATH, newSidecar)}`);
          } catch (sidecarErr) {
            console.warn(`  [warn] Sidecar move failed: ${sidecarErr.message}`);
          }
        }
      }
    }

    console.log();
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
