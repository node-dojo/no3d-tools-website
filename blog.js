/**
 * Blog client-side logic.
 * Handles listing, tag filtering, article rendering, and URL routing.
 */

// --- Marked.js config ---
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

function sanitizeHTML(html) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ['video', 'source'],
      ADD_ATTR: ['controls', 'autoplay', 'loop', 'muted', 'playsinline', 'width'],
    });
  }
  return html;
}

// --- Routing ---
function getSlugFromUrl() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts[0] === 'blog' && pathParts[1]) return pathParts[1];
  return null;
}

// --- API ---
async function fetchArticles(tag) {
  let url = '/api/articles?limit=50';
  if (tag) url += '&tag=' + encodeURIComponent(tag);
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

async function fetchArticle(slug) {
  const res = await fetch('/api/articles/' + encodeURIComponent(slug));
  if (!res.ok) return null;
  return res.json();
}

// --- Rendering: Listing ---
function renderListing(articles) {
  const grid = document.getElementById('article-grid');
  grid.innerHTML = '';

  if (articles.length === 0) {
    grid.innerHTML = '<p class="empty-message">No posts yet. Check back soon.</p>';
    return;
  }

  for (const article of articles) {
    const card = document.createElement('a');
    card.href = '/blog/' + article.slug;
    card.className = 'article-card';
    card.onclick = (e) => {
      e.preventDefault();
      window.history.pushState({ slug: article.slug }, '', '/blog/' + article.slug);
      showArticle(article.slug);
    };

    const date = article.published_at
      ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const tags = (article.tags || [])
      .map(t => '<span class="tag">' + t + '</span>')
      .join('');

    let thumbHtml = '';
    if (article.featured_image) {
      thumbHtml = '<div class="card-thumb"><img src="' + article.featured_image + '" alt="" loading="lazy"></div>';
    }

    card.innerHTML =
      thumbHtml +
      '<div class="card-body">' +
        '<h2 class="card-title">' + article.title + '</h2>' +
        '<time class="card-date">' + date + '</time>' +
        (article.excerpt ? '<p class="card-excerpt">' + article.excerpt + '</p>' : '') +
        (tags ? '<div class="card-tags">' + tags + '</div>' : '') +
      '</div>';

    grid.appendChild(card);
  }
}

function renderTagFilters(articles) {
  const container = document.getElementById('tag-filters');
  const allTags = new Set();
  for (const a of articles) {
    for (const t of (a.tags || [])) allTags.add(t);
  }

  if (allTags.size === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '<button class="tag-btn active" data-tag="">ALL</button>';
  for (const tag of [...allTags].sort()) {
    html += '<button class="tag-btn" data-tag="' + tag + '">' + tag.toUpperCase() + '</button>';
  }
  container.innerHTML = html;

  // Store all articles for client-side filtering
  container._allArticles = articles;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;

    container.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const tag = btn.dataset.tag;
    if (tag) {
      const filtered = container._allArticles.filter(a => (a.tags || []).includes(tag));
      renderListing(filtered);
    } else {
      renderListing(container._allArticles);
    }
  });
}

// --- Rendering: Article ---
function renderArticle(article) {
  document.getElementById('blog-listing').style.display = 'none';
  document.getElementById('blog-article').style.display = 'block';

  document.getElementById('article-title').textContent = article.title;

  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  document.getElementById('article-date').textContent = date;

  const tagsEl = document.getElementById('article-tags');
  tagsEl.innerHTML = (article.tags || [])
    .map(t => '<span class="tag">' + t + '</span>')
    .join('');

  // Render markdown content
  const contentEl = document.getElementById('article-content');
  if (article.content && typeof marked !== 'undefined') {
    contentEl.innerHTML = sanitizeHTML(marked.parse(article.content));
  } else {
    contentEl.textContent = article.content || '';
  }

  updateMetaTags(article);
}

function renderPrevNext(currentSlug, allArticles) {
  const idx = allArticles.findIndex(a => a.slug === currentSlug);
  const prevEl = document.getElementById('prev-article');
  const nextEl = document.getElementById('next-article');

  if (idx > 0) {
    const prev = allArticles[idx - 1];
    prevEl.href = '/blog/' + prev.slug;
    prevEl.textContent = '\u2190 ' + prev.title;
    prevEl.style.display = 'inline-block';
    prevEl.onclick = (e) => {
      e.preventDefault();
      window.history.pushState({ slug: prev.slug }, '', '/blog/' + prev.slug);
      showArticle(prev.slug);
    };
  } else {
    prevEl.style.display = 'none';
  }

  if (idx < allArticles.length - 1) {
    const next = allArticles[idx + 1];
    nextEl.href = '/blog/' + next.slug;
    nextEl.textContent = next.title + ' \u2192';
    nextEl.style.display = 'inline-block';
    nextEl.onclick = (e) => {
      e.preventDefault();
      window.history.pushState({ slug: next.slug }, '', '/blog/' + next.slug);
      showArticle(next.slug);
    };
  } else {
    nextEl.style.display = 'none';
  }
}

// --- Meta tags ---
function updateMetaTags(article) {
  document.title = article.title + ' - NO3D Tools Blog';

  const setMeta = (property, content) => {
    let el = document.querySelector('meta[property="' + property + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('og:title', article.title);
  setMeta('og:description', article.excerpt || '');
  setMeta('og:type', 'article');
  if (article.featured_image) setMeta('og:image', article.featured_image);

  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta && article.excerpt) descMeta.content = article.excerpt;
}

// --- Navigation helper ---
let _cachedArticles = null;

async function showArticle(slug) {
  const article = await fetchArticle(slug);
  if (!article) {
    document.getElementById('blog-listing').style.display = 'block';
    document.getElementById('blog-article').style.display = 'none';
    return;
  }

  renderArticle(article);
  window.scrollTo(0, 0);

  if (!_cachedArticles) {
    _cachedArticles = await fetchArticles();
  }
  renderPrevNext(slug, _cachedArticles);
}

function showListing() {
  document.getElementById('blog-listing').style.display = 'block';
  document.getElementById('blog-article').style.display = 'none';
  document.title = 'Blog - NO3D Tools';
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  const slug = getSlugFromUrl();

  if (slug) {
    await showArticle(slug);
  } else {
    const articles = await fetchArticles();
    _cachedArticles = articles;
    renderListing(articles);
    renderTagFilters(articles);
  }
});

// Handle browser back/forward
window.addEventListener('popstate', async () => {
  const slug = getSlugFromUrl();
  if (slug) {
    await showArticle(slug);
  } else {
    showListing();
    if (_cachedArticles) {
      renderListing(_cachedArticles);
      renderTagFilters(_cachedArticles);
    }
  }
});
