#!/usr/bin/env node

/**
 * Send Newsletter from Obsidian Vault
 *
 * Reads a markdown file from Blog/Newsletter/Ready/, converts it to HTML,
 * sends it to all active subscribers via Resend, records it in Supabase,
 * and locks the source file to read-only (chmod 444).
 *
 * Drafts ready to send live in Blog/Newsletter/Ready/.
 * Sent newsletters are moved manually to Blog/Newsletter/Sent/ after sending.
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
const NEWSLETTER_DIR = path.join(VAULT_PATH, 'Blog', 'Newsletter', 'Ready');
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

function loadRenderedManifest(title) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const manifestPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..', 'email', '.rendered', `${slug}.json`
  );
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }
  return null;
}

function wrapInEmailTemplate(title, bodyHtml, renderedUrls) {
  const heroImg = renderedUrls?.hero
    ? `<tr><td><img src="${renderedUrls.hero}" alt="${title}" width="600" style="width:100%;display:block;"></td></tr>`
    : '';
  const calloutImg = renderedUrls?.callout
    ? `<tr><td><img src="${renderedUrls.callout}" alt="Callout" width="600" style="width:100%;display:block;"></td></tr>`
    : '';
  const bannerImg = renderedUrls?.banner
    ? `<tr><td><img src="${renderedUrls.banner}" alt="Banner" width="600" style="width:100%;display:block;"></td></tr>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#333333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#333333;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#eaeaea;">
          ${heroImg}
          ${calloutImg}
          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;background-color:#eaeaea;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.6;color:#000000;text-align:justify;">
              ${bodyHtml}
            </td>
          </tr>
          ${bannerImg}
          <!-- Footer -->
          <tr>
            <td style="background-color:#202020;padding:32px 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:'Courier New',Courier,monospace;color:#b8b8b8;vertical-align:top;">
                    <div style="font-size:14px;font-weight:bold;margin-bottom:12px;">NO3D TOOLS</div>
                    <div style="font-size:10px;line-height:1.8;">
                      <a href="https://no3dtools.com" style="color:#b8b8b8;text-decoration:underline;">no3dtools.com</a><br>
                      <a href="https://no3dtools.com/blog" style="color:#b8b8b8;text-decoration:underline;">Blog</a><br>
                      <a href="https://no3dtools.com/library" style="color:#b8b8b8;text-decoration:underline;">Tool Library</a>
                    </div>
                  </td>
                  <td style="font-family:'Courier New',Courier,monospace;color:#b8b8b8;text-align:right;vertical-align:top;">
                    <div style="font-size:14px;font-weight:bold;margin-bottom:12px;">Stay Foolish.</div>
                    <div style="font-size:10px;line-height:1.8;">
                      <a href="https://www.reddit.com/user/no3dtools/" style="color:#b8b8b8;text-decoration:underline;">Reddit</a><br>
                      <a href="https://www.youtube.com/@no3dtools" style="color:#b8b8b8;text-decoration:underline;">YouTube</a><br>
                      <a href="https://bsky.app/profile/no3dtools.com" style="color:#b8b8b8;text-decoration:underline;">Bluesky</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Unsubscribe + legal -->
          <tr>
            <td style="background-color:#202020;padding:0 48px 24px;text-align:center;font-family:'Courier New',Courier,monospace;">
              <div style="border-top:1px solid #333;padding-top:16px;">
                <a href="{{UNSUBSCRIBE_URL}}" style="color:#666666;font-size:10px;text-decoration:underline;">Unsubscribe</a>
                <span style="color:#444;font-size:10px;"> &middot; </span>
                <a href="${SITE_URL}/blog" style="color:#666666;font-size:10px;text-decoration:underline;">View in browser</a>
              </div>
              <div style="color:#444;font-size:9px;margin-top:8px;">
                &copy; ${new Date().getFullYear()} NO3D Tools. You received this because you subscribed at no3dtools.com.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// --- List Mode ---

function listNewsletters() {
  if (!fs.existsSync(NEWSLETTER_DIR)) {
    console.log('Blog/Newsletter/Ready/ does not exist yet.');
    return;
  }

  const files = fs.readdirSync(NEWSLETTER_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.log('No newsletter files found in Blog/Newsletter/Ready/');
    return;
  }

  console.log('Newsletters in Blog/Newsletter/Ready/:\n');

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
    console.log(`Blog/Newsletter/Ready/ not found at: ${NEWSLETTER_DIR}`);
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

  // Load rendered section images (from render-email-sections.mjs)
  const manifest = loadRenderedManifest(title);
  if (manifest?.urls) {
    console.log(`Rendered:   hero=${manifest.urls.hero ? 'yes' : 'no'}, callout=${manifest.urls.callout ? 'yes' : 'no'}, banner=${manifest.urls.banner ? 'yes' : 'no'}`);
  } else {
    console.log('Rendered:   No rendered sections found. Run render-email-sections.mjs first for custom typography.');
    console.log('            Sending with text-only template.');
  }

  // Convert to HTML
  const bodyHtml = markdownToHtml(body);
  const html = wrapInEmailTemplate(title, bodyHtml, manifest?.urls);
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
    .select('email, unsubscribe_token')
    .eq('status', 'active')
    .or('newsletter_opted_out.is.null,newsletter_opted_out.eq.false');

  if (subError) {
    console.error('Failed to fetch subscribers:', subError.message);
    process.exit(1);
  }

  const recipientList = (subscribers || []).filter(s => s.email);
  console.log(`Recipients: ${recipientList.length} active subscriber(s) (opted-out excluded)`);

  if (recipientList.length === 0) {
    console.warn('No active subscribers found. Nothing to send.');
    return;
  }

  if (dryRun) {
    console.log('\n[dry-run] Would send to:');
    for (const s of recipientList) console.log(`  - ${s.email}`);
    console.log('\n[dry-run] Subject:', subject);
    console.log('[dry-run] HTML preview length:', html.length, 'chars');
    console.log('[dry-run] Would lock file after sending.');
    return;
  }

  // Confirm before sending
  console.log(`\nAbout to send to ${recipientList.length} subscriber(s). This cannot be undone.`);
  console.log('Sending in 5 seconds... (Ctrl+C to abort)');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Send via Resend — personalized unsubscribe link per recipient
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  for (const subscriber of recipientList) {
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;
    const personalizedHtml = html.replace('{{UNSUBSCRIBE_URL}}', unsubscribeUrl);
    const personalizedText = plainText + `\n\nUnsubscribe: ${unsubscribeUrl}`;
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: subscriber.email,
        subject,
        html: personalizedHtml,
        text: personalizedText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      sent++;
      console.log(`  [ok] ${subscriber.email}`);
    } catch (err) {
      failed++;
      console.error(`  [fail] ${subscriber.email}: ${err.message}`);
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
