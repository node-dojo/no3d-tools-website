#!/usr/bin/env node

/**
 * Send Newsletter from Obsidian Vault
 *
 * Reads a markdown file from Blog/Newsletter/, converts it to HTML,
 * sends it to all active subscribers via Resend, records it in Supabase,
 * and locks the source file to read-only (chmod 444).
 *
 * Drafts live in Blog/Newsletter/ alongside sent newsletters.
 * Sent newsletters are distinguished by their read-only file permissions.
 *
 * Usage:
 *   doppler run -- node scripts/send-newsletter.mjs "Newsletter Title"
 *   doppler run -- node scripts/send-newsletter.mjs "Newsletter Title" --dry-run
 *   doppler run -- node scripts/send-newsletter.mjs --list
 *
 * The --list flag shows all newsletters and their status (draft vs sent).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import matter from 'gray-matter';

// --- Configuration ---
const VAULT_PATH = path.resolve(
  process.env.HOME,
  'Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault_001'
);
const NEWSLETTER_DIR = path.join(VAULT_PATH, 'Blog', 'Newsletter');
const SITE_URL = process.env.SITE_URL || 'https://no3dtools.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'NO3D Tools <onboarding@resend.dev>';

// --- Helpers ---

function isReadOnly(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.W_OK);
    return false;
  } catch {
    return true;
  }
}

function lockFile(filePath) {
  fs.chmodSync(filePath, 0o444);
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

// --- Markdown to HTML ---

function markdownToHtml(markdown) {
  // Simple markdown-to-HTML for newsletter (no external dep needed)
  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Wikilinks — convert to blog links
    .replace(/\[\[([^\]|]+?)\|([^\]]+)\]\]/g, (_, target, display) => {
      const slug = target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<a href="${SITE_URL}/blog/${slug}">${display}</a>`;
    })
    .replace(/\[\[([^\]]+)\]\]/g, (_, target) => {
      const slug = target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<a href="${SITE_URL}/blog/${slug}">${target}</a>`;
    })
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Paragraphs (blank line separated)
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br>');

  // Wrap list items
  html = html.replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');

  // Strip inline tags
  html = html.replace(/(?<=\s|^|>)#([a-zA-Z][a-zA-Z0-9_/-]*)/gm, '');

  return `<p>${html}</p>`;
}

function wrapInEmailTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border: 2px solid #000;
      padding: 40px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 2px;
    }
    h1 { font-size: 24px; margin-bottom: 20px; }
    h2 { font-size: 20px; margin: 24px 0 12px; }
    h3 { font-size: 16px; margin: 20px 0 8px; }
    a { color: #000; text-decoration: underline; }
    ul { padding-left: 20px; }
    li { margin: 6px 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
    img { max-width: 100%; height: auto; border: 1px solid #ddd; }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NO3D TOOLS</div>
    </div>
    ${bodyHtml}
    <div class="footer">
      <p><a href="${SITE_URL}/blog">Read more on the blog</a></p>
      <p>&copy; ${new Date().getFullYear()} NO3D Tools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// --- List Mode ---

function listNewsletters() {
  if (!fs.existsSync(NEWSLETTER_DIR)) {
    console.log('Blog/Newsletter/ does not exist yet.');
    return;
  }

  const files = fs.readdirSync(NEWSLETTER_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.log('No newsletter files found in Blog/Newsletter/');
    return;
  }

  console.log('Newsletters in Blog/Newsletter/:\n');

  for (const file of files) {
    const filePath = path.join(NEWSLETTER_DIR, file);
    const locked = isReadOnly(filePath);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data: fm } = matter(raw);
    const title = fm.title || path.basename(file, '.md');
    const status = locked ? '[SENT]' : '[DRAFT]';
    const sentDate = fm.sent_at ? ` (${new Date(fm.sent_at).toLocaleDateString()})` : '';

    console.log(`  ${status} ${title}${sentDate}`);
  }

  console.log();
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    listNewsletters();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const titleOrFile = args.find(a => !a.startsWith('--'));

  if (!titleOrFile) {
    console.error('Usage: node scripts/send-newsletter.mjs "Newsletter Title" [--dry-run]');
    console.error('       node scripts/send-newsletter.mjs --list');
    process.exit(1);
  }

  if (!fs.existsSync(NEWSLETTER_DIR)) {
    console.log(`Blog/Newsletter/ not found at: ${NEWSLETTER_DIR}`);
    console.log('Creating it now...');
    fs.mkdirSync(NEWSLETTER_DIR, { recursive: true });
    console.log('Created. Add a markdown newsletter file and run again.');
    return;
  }

  // Find the file — match by title in frontmatter or by filename
  const files = fs.readdirSync(NEWSLETTER_DIR).filter(f => f.endsWith('.md'));
  let matchedFile = null;

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
      matchedFile = filePath;
      break;
    }
  }

  if (!matchedFile) {
    console.error(`No newsletter found matching: "${titleOrFile}"`);
    console.error('Available newsletters:');
    listNewsletters();
    process.exit(1);
  }

  // Safety: refuse to re-send locked files
  if (isReadOnly(matchedFile)) {
    console.error(`This newsletter has already been sent (file is read-only): ${path.basename(matchedFile)}`);
    console.error('To re-send, manually unlock: chmod 644 "' + matchedFile + '"');
    process.exit(1);
  }

  // Parse the newsletter
  const raw = fs.readFileSync(matchedFile, 'utf-8');
  const { data: frontmatter, content: body } = matter(raw);
  const title = frontmatter.title || path.basename(matchedFile, '.md');
  const subject = frontmatter.subject || title;

  console.log(`Newsletter: ${title}`);
  console.log(`Subject:    ${subject}`);
  console.log(`File:       ${path.basename(matchedFile)}`);

  // Convert to HTML
  const bodyHtml = markdownToHtml(body);
  const html = wrapInEmailTemplate(title, bodyHtml);
  const plainText = body
    .replace(/\[\[([^\]|]+?)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1: $2')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/(?<=\s|^)#([a-zA-Z][a-zA-Z0-9_/-]*)/gm, '');

  // Get subscribers
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: subscribers, error: subError } = await supabase
    .from('subscriptions')
    .select('email')
    .eq('status', 'active');

  if (subError) {
    console.error('Failed to fetch subscribers:', subError.message);
    process.exit(1);
  }

  const emails = (subscribers || []).map(s => s.email).filter(Boolean);
  console.log(`Recipients: ${emails.length} active subscriber(s)`);

  if (emails.length === 0) {
    console.warn('No active subscribers found. Nothing to send.');
    return;
  }

  if (dryRun) {
    console.log('\n[dry-run] Would send to:');
    for (const email of emails) console.log(`  - ${email}`);
    console.log('\n[dry-run] Subject:', subject);
    console.log('[dry-run] HTML preview length:', html.length, 'chars');
    console.log('[dry-run] Would lock file after sending.');
    return;
  }

  // Confirm before sending
  console.log(`\nAbout to send to ${emails.length} subscriber(s). This cannot be undone.`);
  console.log('Sending in 5 seconds... (Ctrl+C to abort)');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Send via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
        text: plainText,
      });
      sent++;
      console.log(`  [ok] ${email}`);
    } catch (err) {
      failed++;
      console.error(`  [fail] ${email}: ${err.message}`);
    }
  }

  console.log(`\nSent: ${sent}, Failed: ${failed}`);

  // Record in Supabase as a newsletter article
  const slug = `newsletter-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const contentHash = hashContent(raw);

  try {
    await supabase
      .from('articles')
      .upsert(
        {
          slug,
          title,
          content: bodyHtml,
          raw_content: body,
          excerpt: frontmatter.excerpt || body.trim().split(/\n\n/)[0]?.replace(/[#*_\[\]!]/g, '').trim().slice(0, 280) || null,
          tags: ['newsletter', ...(frontmatter.tags || [])],
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            type: 'newsletter',
            content_hash: contentHash,
            source_file: path.basename(matchedFile),
            recipients: sent,
            sent_at: new Date().toISOString(),
          },
        },
        { onConflict: 'slug' }
      );
    console.log(`[ok] Recorded in Supabase as: ${slug}`);
  } catch (err) {
    console.error(`[warn] Failed to record in Supabase: ${err.message}`);
  }

  // Update frontmatter with sent_at timestamp
  const updatedRaw = raw.replace(
    /^---\n/,
    `---\nsent_at: "${new Date().toISOString()}"\n`
  );
  fs.writeFileSync(matchedFile, updatedRaw, 'utf-8');

  // Lock the file (read-only)
  lockFile(matchedFile);
  console.log(`[ok] File locked (read-only): ${path.basename(matchedFile)}`);

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
