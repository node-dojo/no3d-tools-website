// NO3D TOOLS WEBSITE INTERACTIVITY
// Following Figma Design System Rules

// Configure marked (loaded from CDN)
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
    smartLists: true,
    smartypants: true
  });
}

// Resolve URL from hosted_media entry (supports string or {url, checksum} format)
function resolveHostedUrl(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry.url) return entry.url;
  return null;
}

// Sanitize HTML through DOMPurify when available, passthrough otherwise
function sanitizeHTML(html) {
  if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(html);
  return html.replace(/<[^>]*>/g, '');
}

// Escape plain text for safe innerHTML insertion (names, prices, labels)
function escapeText(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

// ============================================================================
// ANALYTICS — lightweight event tracking to Supabase
// ============================================================================
const _sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

function track(event, properties) {
  const payload = {
    event,
    properties: properties || {},
    page: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    session_id: _sessionId,
  };
  // Fire and forget — never block UI
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

// Global state variables
let products = {};
let currentProduct = null;
let productDataByType = {};
let activeProductType = null;
let expandedProductGroups = new Set();
let activeToolFilters = new Set(['all']);
const purchasedProducts = new Set(); // To track purchased products

// Carousel-specific global variables
let carouselCurrentIndex = 0;
let carouselItems = [];
let carouselTouchStartX = 0;
let carouselTouchStartY = 0;
let carouselTouchEndX = 0;
let carouselTouchEndY = 0;
let carouselIsDragging = false;

// DOM elements
const productTitle = document.getElementById('product-title');
const productPrice = document.getElementById('product-price');
const productDescription = document.getElementById('product-description');
const downloadButton = document.getElementById('download-button');
const buyNowButton = document.getElementById('buy-now-button');

// ============================================================================ 
// INITIALIZATION AND DATA FETCHING
// ============================================================================ 

document.addEventListener('DOMContentLoaded', async function() {
  track('page_view');
  // Don't hide loading screen immediately - wait for data to load
  try {
    await fetchUnifiedProducts();
    organizeProductsByType();
    renderSidebar();
    initializeEventListeners();
    initializeMobileMenu();
    initializeSidebarEventListeners();
    initializeSidebarScrollbar();
    updateHeaderLogo('tools');
    renderHomeGrid();
    initializeDeepLinks();
    updateViewState(false); // Start with home grid visible
    await checkUrlParameters(); // Check for checkout success from redirect
    initializeMemberCTA();
    initializeAccountDropdown();
    initializeDownloadButton();
    initFeedbackModal();
    // Auto-open download modal if ?download=true
    if (new URLSearchParams(window.location.search).get('download') === 'true') {
      openDownloadModal();
      history.replaceState(null, '', window.location.pathname);
    }
    console.log('Website initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing website:', error);
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = '<div class="error-message"><h1>Error loading products</h1><p>We encountered an issue loading the product catalog. Please try again later or contact support.</p></div>';
    }
  } finally {
    // Always hide loading screen when done (success or error)
    hideLoadingScreen();
  }
});

async function fetchUnifiedProducts() {
  console.log('🔄 Fetching unified product data from /api/get-all-products...');
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('/api/get-all-products', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const productsData = await response.json();
    console.log(`✅ Received ${productsData.length} products from /api/get-all-products`);
    
    products = {};
    if (productsData && productsData.length > 0) {
      productsData.forEach(product => {
        if (!product.id || !product.handle || !product.title) {
          console.warn(`Skipping product: Missing critical fields (id, handle, or title).`, product);
          return;
        }
        products[product.id] = {
          id: product.id,
          name: product.title.toUpperCase(),
          title: product.title,
          price: product.price || 'FREE',
          description: product.description,
          changelog: product.changelog || [],
          image: product.image || null,
          icon: product.image || null,
          productType: product.product_type || 'tools',
          groups: product.tags || [],
          tags: product.tags || [],
          handle: product.handle,
          folderName: product.handle,
          hosted_media: product.hosted_media || {},
          carousel_media: product.carousel_media || [],
          releaseStatus: product.release_status || 'stable',
          releaseVersion: product.release_version || null,
          sku: product.sku || null,
          vendor: product.vendor || null,
          metafields: product.metafields || [],
        };
      });
      console.log(`✅ Populated 'products' object with ${Object.keys(products).length} products.`);
    } else {
      console.warn('⚠️ No products returned from /api/get-all-products');
    }

    // Fetch blog articles (exclude newsletters) and merge into docs category
    try {
      const articlesRes = await fetch('/api/articles?limit=50');
      if (articlesRes.ok) {
        const articles = await articlesRes.json();
        for (const a of articles) {
          if ((a.tags || []).includes('newsletter')) continue;
          const id = 'blog-' + a.slug;
          products[id] = {
            id,
            name: a.title.toUpperCase(),
            price: '',
            description: a.excerpt || '',
            changelog: [],
            image: a.featured_image || null,
            icon: a.featured_image || null,
            productType: 'docs',
            groups: a.tags || [],
            handle: a.slug,
            folderName: a.slug,
            hosted_media: {},
            carousel_media: [],
            releaseStatus: 'stable',
            releaseVersion: null,
            _isBlogPost: true,
            _blogSlug: a.slug,
            _publishedAt: a.published_at,
          };
        }
        console.log(`✅ Added ${articles.length} blog article(s) to sidebar`);
      }
    } catch (blogErr) {
      console.warn('⚠️ Could not fetch blog articles:', blogErr.message);
    }
  } catch (error) {
    console.error('Error in fetchUnifiedProducts:', error);
    if (error.name === 'AbortError') {
      console.error('❌ Request timed out after 10 seconds');
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => loadingScreen.remove(), 300);
  }
}

// ============================================================================ 
// UI RENDERING AND STATE MANAGEMENT
// ============================================================================ 

function organizeProductsByType() {
  productDataByType = {
    tools: {},
    tutorials: {},
    prints: {},
    apps: {},
    docs: {}
  };
  Object.keys(products).forEach(productId => {
    const product = products[productId];
    const type = product.productType || 'tools';
    if (!productDataByType[type]) {
      productDataByType[type] = {};
    }
    productDataByType[type][productId] = product;
  });
}

function renderSidebar() {
  const sidebarContent = document.getElementById('sidebar-content');
  if (!sidebarContent) return;
  
  sidebarContent.innerHTML = '';
  
  const productTypes = [
    { key: 'docs', label: 'THE WELL BLOG' },
    { key: 'tools', label: 'TOOLS' },
    { key: 'tutorials', label: 'TUTORIALS' },
    { key: 'prints', label: 'PRINTS' },
    { key: 'apps', label: 'APPS' }
  ];
  
  productTypes.forEach(type => {
    const typeProducts = productDataByType[type.key] || {};
    const hasProducts = Object.keys(typeProducts).length > 0;
    
    const productTypeDiv = document.createElement('div');
    productTypeDiv.className = 'product-type';
    productTypeDiv.dataset.type = type.key;
    if (!hasProducts) {
      productTypeDiv.classList.add('empty');
    } else if (type.key === activeProductType) {
      productTypeDiv.classList.add('expanded');
    }
    
    const typeHeader = document.createElement('div');
    typeHeader.className = 'type-header';
    const isExpanded = type.key === activeProductType;
    typeHeader.innerHTML = `<span class="carrot ${isExpanded ? 'expanded' : 'collapsed'}">${isExpanded ? '▼' : '▶'}</span><span class="category-name">${escapeText(type.label)}</span>`;
    
    const groupsContainer = document.createElement('div');
    groupsContainer.className = 'product-groups-container';
    
    if (!hasProducts) {
      const comingSoonDiv = document.createElement('div');
      comingSoonDiv.className = 'coming-soon-message';
      comingSoonDiv.textContent = 'coming soon!';
      groupsContainer.appendChild(comingSoonDiv);
    } else {
      const productList = document.createElement('div');
      productList.className = 'group-product-list';
      
      // Sort: blog posts by date (newest first), others by release status then name
      const releaseOrder = { stable: 0, beta: 1, alpha: 2, coming_soon: 3 };
      Object.values(typeProducts)
        .sort((a, b) => {
          if (a._isBlogPost && b._isBlogPost) {
            return new Date(b._publishedAt) - new Date(a._publishedAt);
          }
          const ra = releaseOrder[a.releaseStatus] || 0;
          const rb = releaseOrder[b.releaseStatus] || 0;
          return ra - rb || a.name.localeCompare(b.name);
        })
        .forEach(product => {
          const productItem = document.createElement('div');
          const rs = product.releaseStatus;
          let extraClass = product.id === currentProduct ? ' active' : '';
          if (rs === 'coming_soon') extraClass += ' sidebar-coming-soon';
          productItem.className = `product-item${extraClass}`;
          productItem.dataset.product = product.id;
          let badge = '';
          if (rs === 'beta') badge = ' <span class="sidebar-badge sidebar-badge-beta">BETA</span>';
          else if (rs === 'alpha') badge = ' <span class="sidebar-badge sidebar-badge-alpha">ALPHA</span>';
          else if (rs === 'coming_soon') badge = ' <span class="sidebar-badge sidebar-badge-soon">SOON</span>';
          productItem.innerHTML = `<span class="product-name">${escapeText(product.name)}</span>${badge}`;
          productList.appendChild(productItem);
        });
      
      groupsContainer.appendChild(productList);
    }
    
    productTypeDiv.appendChild(typeHeader);
    productTypeDiv.appendChild(groupsContainer);
    sidebarContent.appendChild(productTypeDiv);
  });

  // Add latest blog post preview card below the blog section
  const blogProducts = productDataByType['docs'] || {};
  const latestPost = Object.values(blogProducts)
    .filter(p => p._isBlogPost && p._publishedAt)
    .sort((a, b) => new Date(b._publishedAt) - new Date(a._publishedAt))[0];

  if (latestPost) {
    const preview = document.createElement('a');
    preview.href = '/blog/' + latestPost._blogSlug;
    preview.className = 'sidebar-blog-preview';
    preview.onclick = (e) => { e.preventDefault(); window.location.href = '/blog/' + latestPost._blogSlug; };

    const date = new Date(latestPost._publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const excerpt = latestPost.description ? latestPost.description.slice(0, 120) + (latestPost.description.length > 120 ? '...' : '') : '';
    const thumbHtml = latestPost.image ? `<img class="sidebar-blog-preview-thumb" src="${latestPost.image}" alt="">` : '';

    preview.innerHTML =
      '<span class="sidebar-blog-preview-flag">*NEW*</span>' +
      thumbHtml +
      '<span class="sidebar-blog-preview-title">' + escapeText(latestPost.name) + '</span>' +
      '<span class="sidebar-blog-preview-date">' + date + '</span>' +
      (excerpt ? '<span class="sidebar-blog-preview-excerpt">' + escapeText(excerpt) + '</span>' : '');

    sidebarContent.appendChild(preview);
  }

  // Add Help section below product list
  const helpSection = document.createElement('div');
  helpSection.className = 'product-type';
  helpSection.dataset.type = 'help';

  const helpHeader = document.createElement('div');
  helpHeader.className = 'type-header';
  helpHeader.innerHTML = '<span class="carrot collapsed">▶</span><span class="category-name">HELP</span>';

  const helpList = document.createElement('div');
  helpList.className = 'product-groups-container';
  helpList.innerHTML = `
    <div class="group-product-list">
      <a href="/guide.html" class="product-item sidebar-help-link"><span class="product-name">Getting Started</span></a>
      <a href="/ai-help.html" class="product-item sidebar-help-link"><span class="product-name">AI Help</span></a>
    </div>
  `;

  helpSection.appendChild(helpHeader);
  helpSection.appendChild(helpList);
  sidebarContent.appendChild(helpSection);
}

function renderHomeGrid() {
  const homeGrid = document.getElementById('home-grid');
  if (!homeGrid) return;

  homeGrid.innerHTML = '';
  const productsArray = Object.values(products).filter(p => !p._isBlogPost).sort((a, b) => a.name.localeCompare(b.name));

  productsArray.forEach(product => {
    const gridItem = document.createElement('div');
    gridItem.className = 'home-grid-item';
    gridItem.dataset.productId = product.id;
    gridItem.addEventListener('click', () => selectProduct(product.id));

    // Check for animated video thumbnail (mp4/webm in hosted_media)
    const videoExts = ['.mp4', '.webm', '.mov'];
    let animatedUrl = null;
    if (product.hosted_media) {
      for (const [filename, entry] of Object.entries(product.hosted_media)) {
        if (videoExts.some(ext => filename.toLowerCase().endsWith(ext))) {
          animatedUrl = resolveHostedUrl(entry);
          break;
        }
      }
    }

    let thumb;
    if (animatedUrl) {
      thumb = document.createElement('video');
      thumb.className = 'home-grid-item-thumbnail';
      thumb.src = animatedUrl;
      thumb.autoplay = true;
      thumb.loop = true;
      thumb.muted = true;
      thumb.playsInline = true;
      thumb.setAttribute('playsinline', '');
      thumb.alt = product.name;
    } else {
      thumb = document.createElement('img');
      thumb.className = 'home-grid-item-thumbnail';
      thumb.src = product.icon || '';
      thumb.alt = product.name;
      thumb.loading = 'lazy';
      thumb.onerror = () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f0f0f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12px" fill="#aaa">No Image</text></svg>';
        thumb.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        thumb.onerror = null;
      };
    }

    const title = document.createElement('div');
    title.className = 'home-grid-item-title';
    title.textContent = product.name;

    gridItem.appendChild(thumb);
    gridItem.appendChild(title);

    // Release status badges
    const rs = product.releaseStatus;
    if (rs === 'coming_soon') {
      gridItem.classList.add('coming-soon');
      gridItem.removeEventListener('click', () => {});
      gridItem.style.pointerEvents = 'none';
      const label = document.createElement('span');
      label.className = 'coming-soon-label';
      label.textContent = 'COMING SOON';
      gridItem.appendChild(label);
    } else if (rs === 'beta' || rs === 'alpha') {
      const badge = document.createElement('span');
      badge.className = `release-badge release-badge-${rs}`;
      badge.textContent = rs.toUpperCase();
      gridItem.appendChild(badge);
    }

    homeGrid.appendChild(gridItem);
  });
  console.log(`✅ Home grid rendered with ${productsArray.length} products`);
}

async function selectProduct(productId) {
  console.log(`Product clicked: ${productId}`);
  if (!products[productId]) {
    console.warn(`Product ${productId} not found`);
    return;
  }
  // Blog posts navigate to /blog/{slug} instead of opening detail panel
  if (products[productId]._isBlogPost) {
    window.location.href = '/blog/' + products[productId]._blogSlug;
    return;
  }
  if (products[productId].releaseStatus === 'coming_soon') return;
  currentProduct = productId;
  track('product_view', { product_handle: products[productId].handle, product_name: products[productId].name });

  // Auto-expand the sidebar section containing this product
  const productType = products[productId].productType || 'tools';
  const section = document.querySelector(`.product-type[data-type="${productType}"]`);
  if (section && !section.classList.contains('expanded')) {
    section.classList.add('expanded');
    const carrot = section.querySelector('.carrot');
    if (carrot) {
      carrot.classList.add('expanded');
      carrot.classList.remove('collapsed');
      carrot.textContent = '▼';
    }
  }

  await updateProductDisplay(productId);
  updateActiveStates(productId);
  updateViewState(true); // Show product card

  // Update browser history for back/forward navigation
  const url = new URL(window.location);
  url.searchParams.set('product', productId);
  window.history.pushState({ product: productId }, '', url);
}

function deselectProduct() {
  currentProduct = null;
  updateActiveStates(null);
  updateViewState(false); // Show home grid

  // Update browser history
  const url = new URL(window.location);
  url.searchParams.delete('product');
  window.history.pushState({ product: null }, '', url);
}

async function updateProductDisplay(productId) {
  const product = products[productId];
  if (!product) return;

  productTitle.textContent = product.name;
  productPrice.textContent = `PRICE: ${product.price}`;

  // --- Parse description: extract changelog and strip boilerplate ---
  let descriptionText = '';
  let changelogMd = '';
  if (product.description) {
    descriptionText = typeof product.description === 'string'
      ? product.description
      : String(product.description || '');

    // Extract changelog section
    const clIdx = descriptionText.indexOf('## Changelog');
    if (clIdx !== -1) {
      const afterChangelog = descriptionText.substring(clIdx + '## Changelog'.length);
      const nextSection = afterChangelog.search(/\n## (?!#)/);
      changelogMd = nextSection !== -1 ? afterChangelog.substring(0, nextSection).trim() : afterChangelog.trim();
      // Remove changelog and everything after from description
      descriptionText = descriptionText.substring(0, clIdx).trim();
    }
    // Strip Support and License boilerplate sections
    descriptionText = descriptionText.replace(/## Support[\s\S]*?(?=## |$)/, '').trim();
    descriptionText = descriptionText.replace(/## License[\s\S]*?(?=## |$)/, '').trim();
  }

  if (descriptionText) {
    if (typeof marked !== 'undefined') {
      productDescription.innerHTML = sanitizeHTML(marked.parse(descriptionText));
    } else {
      productDescription.innerHTML = sanitizeHTML(`<p>${descriptionText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`);
    }
  } else {
    productDescription.innerHTML = '';
  }

  // --- Render meta table ---
  renderProductMetaTable(product);

  // --- Render changelog ---
  renderProductChangelog(changelogMd);

  updateButtonVisibility();

  // Subscribe button handler
  if (buyNowButton) {
    buyNowButton.onclick = async (e) => {
      e.preventDefault();
      if (buyNowButton.classList.contains('loading')) return;
      track('checkout_start', { product_handle: products[currentProduct]?.handle });
      buyNowButton.classList.add('loading');
      buyNowButton.textContent = 'LOADING...';
      try {
        const response = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        const url = data.checkout_url || data.url;
        if (url) {
          window.location.href = url;
        } else {
          throw new Error('No checkout URL');
        }
      } catch (error) {
        console.error('Checkout failed:', error);
        alert('Unable to start checkout. Please try again.');
      } finally {
        buyNowButton.classList.remove('loading');
        buyNowButton.textContent = 'SUBSCRIBE';
      }
    };
  }

  await initializeCarousel(productId);
}

// ============================================================================
// PRODUCT META TABLE, CHANGELOG, AND FEEDBACK MODAL
// ============================================================================

function getMetafield(product, key) {
  const mf = (product.metafields || []).find(m => m.key === key);
  return mf ? mf.value : null;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function renderProductMetaTable(product) {
  const container = document.getElementById('product-meta-table');
  if (!container) return;

  const assetType = getMetafield(product, 'asset_type') || product.productType || '';
  const blenderVersion = getMetafield(product, 'blender_version');
  const exportDate = getMetafield(product, 'export_date');
  const status = product.releaseStatus || 'stable';
  const statusClass = status === 'stable' ? 'meta-badge-stable'
    : status === 'beta' ? 'meta-badge-beta'
    : status === 'alpha' ? 'meta-badge-alpha' : 'meta-badge-dark';

  const tags = product.tags || product.groups || [];
  const tagsHtml = tags.map(t =>
    `<span class="meta-tag-pill">${t}</span>`
  ).join('');

  container.innerHTML = `
    <table>
      <tr><td class="meta-label">Type</td><td class="meta-value"><span class="meta-badge meta-badge-dark">${assetType}</span></td></tr>
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="meta-badge ${statusClass}">${status}${product.releaseVersion ? ' v' + product.releaseVersion : ''}</span></td></tr>
      ${blenderVersion ? `<tr><td class="meta-label">Blender</td><td class="meta-value">${blenderVersion}</td></tr>` : ''}
      ${exportDate ? `<tr><td class="meta-label">Updated</td><td class="meta-value">${formatDate(exportDate)}</td></tr>` : ''}
      ${tags.length ? `<tr><td class="meta-label">Tags</td><td class="meta-value"><div class="meta-tags-container">${tagsHtml}</div></td></tr>` : ''}
    </table>
  `;
}

function renderProductChangelog(changelogMd) {
  const container = document.getElementById('product-changelog');
  if (!container) return;

  if (!changelogMd) {
    container.innerHTML = '';
    return;
  }

  const releaseCount = (changelogMd.match(/###\s+[Vv]/g) || []).length;
  let renderedContent = changelogMd;
  if (typeof marked !== 'undefined') {
    renderedContent = typeof DOMPurify !== 'undefined'
      ? DOMPurify.sanitize(marked.parse(changelogMd))
      : marked.parse(changelogMd);
  }

  container.innerHTML = `
    <div class="changelog-header">
      <span class="changelog-title">Changelog</span>
      <span class="changelog-count">${releaseCount} release${releaseCount !== 1 ? 's' : ''}</span>
    </div>
    <div class="changelog-body">${renderedContent}</div>
  `;
}

// --- Feedback modal logic ---
function initFeedbackModal() {
  const modal = document.getElementById('feedback-modal');
  const modalTitle = document.getElementById('feedback-modal-title');
  const closeBtn = document.getElementById('feedback-modal-close');
  if (!modal || !closeBtn) return;

  let selectedType = 'bug';
  let selectedShare = 'yes';

  // Tag selection for type
  document.querySelectorAll('#feedback-type-tags .feedback-tag-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#feedback-type-tags .feedback-tag-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedType = btn.dataset.value;
    });
  });

  // Tag selection for share preference
  document.querySelectorAll('#feedback-share-tags .feedback-tag-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#feedback-share-tags .feedback-tag-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedShare = btn.dataset.value;
    });
  });

  // Close modal
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  // Build message helper
  function buildMessage() {
    const asset = document.getElementById('feedback-form-asset').value;
    const name = document.getElementById('feedback-form-name').value;
    const email = document.getElementById('feedback-form-email').value;
    const subject = document.getElementById('feedback-form-subject').value;
    const details = document.getElementById('feedback-form-details').value;
    const blender = document.getElementById('feedback-form-blender').value;
    const os = document.getElementById('feedback-form-os').value;
    const typeBtn = document.querySelector('#feedback-type-tags .feedback-tag-option.selected');
    const typeLabel = typeBtn ? typeBtn.textContent.trim() : 'Bug';

    const subjectLine = `[no3d-tools] [${typeLabel}] ${asset}: ${subject}`;
    const body = [
      `Asset: ${asset}`,
      `Type: ${typeLabel}`,
      `Blender: ${blender || 'not specified'}`,
      `OS: ${os || 'not specified'}`,
      name ? `From: ${name}` : '',
      email ? `Email: ${email}` : '',
      `Share publicly: ${selectedShare}`,
      '',
      '---',
      '',
      details,
      '',
      '---',
      'Sent from no3dtools.com product page'
    ].filter(Boolean).join('\n');

    return { subjectLine, body };
  }

  // Send via email
  document.getElementById('feedback-send-email').addEventListener('click', () => {
    const { subjectLine, body } = buildMessage();
    track('feedback_send', { method: 'email', type: selectedType, product_handle: products[currentProduct]?.handle });
    window.location.href = `mailto:Joe@welltarot.com?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
    modal.classList.remove('active');
  });

  // Copy to clipboard
  document.getElementById('feedback-copy-clipboard').addEventListener('click', async () => {
    const { subjectLine, body } = buildMessage();
    track('feedback_send', { method: 'clipboard', type: selectedType, product_handle: products[currentProduct]?.handle });
    const fullText = `To: Joe@welltarot.com\nSubject: ${subjectLine}\n\n${body}`;
    const status = document.getElementById('feedback-status');

    try {
      await navigator.clipboard.writeText(fullText);
      status.textContent = 'Copied to clipboard!';
      status.style.color = '#1a5c15';
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      status.textContent = 'Copied to clipboard!';
      status.style.color = '#1a5c15';
    }
    setTimeout(() => {
      status.textContent = 'Choose: open your email client, or copy the full message to paste anywhere';
      status.style.color = '#999';
    }, 3000);
  });

  // Open modal function
  window.openFeedbackModal = function(type) {
    track('feedback_open', { type: type || 'bug', product_handle: products[currentProduct]?.handle });
    selectedType = type || 'bug';
    document.querySelectorAll('#feedback-type-tags .feedback-tag-option').forEach(b => {
      b.classList.toggle('selected', b.dataset.value === selectedType);
    });
    modalTitle.textContent = type === 'feature' ? 'Request Feature' : type === 'bug' ? 'Report Issue' : 'Send Feedback';
    document.getElementById('feedback-form-asset').value = productTitle.textContent.trim();
    document.getElementById('feedback-form-subject').value = '';
    document.getElementById('feedback-form-details').value = '';
    document.getElementById('feedback-form-name').value = '';
    document.getElementById('feedback-form-email').value = '';
    document.getElementById('feedback-form-blender').selectedIndex = 0;
    document.getElementById('feedback-form-os').selectedIndex = 0;
    const status = document.getElementById('feedback-status');
    status.textContent = 'Choose: open your email client, or copy the full message to paste anywhere';
    status.style.color = '#999';
    modal.classList.add('active');
  };

  // Wire up buttons
  document.getElementById('btn-report-issue').addEventListener('click', () => openFeedbackModal('bug'));
  document.getElementById('btn-request-feature').addEventListener('click', () => openFeedbackModal('feature'));
}

function updateViewState(showProductCard) {
  const homeGridContainer = document.getElementById('home-grid-container');
  const productCardContainer = document.querySelector('.product-card-container');

  if (showProductCard) {
    homeGridContainer.classList.add('hidden');
    productCardContainer.classList.remove('hidden');
  } else {
    homeGridContainer.classList.remove('hidden');
    productCardContainer.classList.add('hidden');
  }
}

function updateActiveStates(productId) {
  document.querySelectorAll('.product-item, .home-grid-item, .horizontal-icon-item').forEach(item => {
    item.classList.toggle('active', item.dataset.productId === productId || item.dataset.product === productId);
  });
}

function expandProductType(typeKey) {
  activeProductType = typeKey;
}

function updateHeaderLogo(typeKey) {}

async function initializeCarousel(productId) {
  const track = document.getElementById('carousel-track');
  const leftArrow = document.getElementById('carousel-arrow-left');
  const rightArrow = document.getElementById('carousel-arrow-right');
  
  if (!track) return;
  track.innerHTML = '';

  const product = products[productId];
  if (!product) return;
  
  carouselCurrentIndex = 0;
  carouselItems = [];

  if (product.carousel_media && product.carousel_media.length > 0 && product.hosted_media) {
    product.carousel_media.forEach(mediaKey => {
      const url = resolveHostedUrl(product.hosted_media[mediaKey]);
      if (url) {
        carouselItems.push({ url, name: mediaKey });
      }
    });
  } 
  
  if (carouselItems.length === 0 && product.icon) {
    carouselItems.push({ url: product.icon, name: 'Main Image' });
  }

  if (carouselItems.length === 0) {
    track.innerHTML = '<div class="carousel-item"><div class="model-viewer-placeholder">No media available</div></div>';
    if (leftArrow) leftArrow.classList.remove('visible');
    if (rightArrow) rightArrow.classList.remove('visible');
    return;
  }

  carouselItems.forEach((asset, index) => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    const ext = (asset.name || '').split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      const img = document.createElement('img');
      img.src = asset.url;
      img.alt = asset.name;
      item.appendChild(img);
    } else if (['mp4', 'webm', 'mov'].includes(ext)) {
      const video = document.createElement('video');
      video.src = asset.url;
      video.controls = true;
      item.appendChild(video);
    }
    track.appendChild(item);
  });

  updateCarouselPosition();
  updateCarouselArrows();

  if (leftArrow) leftArrow.onclick = () => navigateCarousel('prev');
  if (rightArrow) rightArrow.onclick = () => navigateCarousel('next');

  // Add touch/swipe support
  const viewport = track.parentElement; // carousel-viewport
  if (viewport) {
    initializeCarouselTouchEvents(viewport);
  }
}

function initializeCarouselTouchEvents(viewport) {
  if (!viewport) return;

  // Remove existing listeners to prevent duplicates
  viewport.removeEventListener('touchstart', handleCarouselTouchStart);
  viewport.removeEventListener('touchmove', handleCarouselTouchMove);
  viewport.removeEventListener('touchend', handleCarouselTouchEnd);
  viewport.removeEventListener('mousedown', handleCarouselMouseDown);
  viewport.removeEventListener('mousemove', handleCarouselMouseMove);
  viewport.removeEventListener('mouseup', handleCarouselMouseUp);
  viewport.removeEventListener('mouseleave', handleCarouselMouseUp);

  // Add touch event listeners
  viewport.addEventListener('touchstart', handleCarouselTouchStart, { passive: false });
  viewport.addEventListener('touchmove', handleCarouselTouchMove, { passive: false });
  viewport.addEventListener('touchend', handleCarouselTouchEnd, { passive: true });
  
  // Also support mouse drag for desktop touch devices (trackpads, etc.)
  viewport.addEventListener('mousedown', handleCarouselMouseDown);
  viewport.addEventListener('mousemove', handleCarouselMouseMove);
  viewport.addEventListener('mouseup', handleCarouselMouseUp);
  viewport.addEventListener('mouseleave', handleCarouselMouseUp);
}

function handleCarouselTouchStart(e) {
  if (carouselItems.length <= 1) return;
  
  const touch = e.touches[0];
  carouselTouchStartX = touch.clientX;
  carouselTouchStartY = touch.clientY;
  carouselIsDragging = true;
  
  // Prevent scrolling while swiping horizontally
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.transition = 'none'; // Disable smooth transition during drag
  }
}

function handleCarouselTouchMove(e) {
  if (!carouselIsDragging || carouselItems.length <= 1) return;
  
  const touch = e.touches[0];
  const deltaX = touch.clientX - carouselTouchStartX;
  const deltaY = touch.clientY - carouselTouchStartY;
  
  // Only prevent default if horizontal swipe (more horizontal than vertical)
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    e.preventDefault(); // Prevent page scroll during horizontal swipe
    
    const track = document.getElementById('carousel-track');
    if (track) {
      // Calculate drag offset (limited to prevent over-scrolling)
      const maxOffset = track.offsetWidth;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
      const baseOffset = -carouselCurrentIndex * 100;
      track.style.transform = `translateX(calc(${baseOffset}% + ${offset}px))`;
    }
  }
}

function handleCarouselTouchEnd(e) {
  if (!carouselIsDragging || carouselItems.length <= 1) {
    carouselIsDragging = false;
    return;
  }
  
  const touch = e.changedTouches[0];
  carouselTouchEndX = touch.clientX;
  carouselTouchEndY = touch.clientY;
  
  const deltaX = carouselTouchEndX - carouselTouchStartX;
  const deltaY = carouselTouchEndY - carouselTouchStartY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);
  
  // Minimum swipe distance (in pixels) to trigger navigation
  const minSwipeDistance = 50;
  
  // Only navigate if horizontal swipe is more significant than vertical
  if (absDeltaX > minSwipeDistance && absDeltaX > absDeltaY) {
    if (deltaX > 0) {
      // Swipe right - go to previous
      navigateCarousel('prev');
    } else {
      // Swipe left - go to next
      navigateCarousel('next');
    }
  } else {
    // Reset position if swipe wasn't significant enough
    updateCarouselPosition();
  }
  
  // Re-enable smooth transition
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.transition = 'transform 0.3s ease';
  }
  
  carouselIsDragging = false;
}

// Mouse drag support for desktop touch devices (e.g., trackpads)
let carouselMouseDown = false;
let carouselMouseStartX = 0;

function handleCarouselMouseDown(e) {
  if (carouselItems.length <= 1) return;
  carouselMouseDown = true;
  carouselMouseStartX = e.clientX;
  carouselIsDragging = true;
  
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.transition = 'none';
  }
}

function handleCarouselMouseMove(e) {
  if (!carouselMouseDown || !carouselIsDragging || carouselItems.length <= 1) return;
  
  const deltaX = e.clientX - carouselMouseStartX;
  const track = document.getElementById('carousel-track');
  if (track) {
    const maxOffset = track.offsetWidth;
    const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    const baseOffset = -carouselCurrentIndex * 100;
    track.style.transform = `translateX(calc(${baseOffset}% + ${offset}px))`;
  }
}

function handleCarouselMouseUp(e) {
  if (!carouselMouseDown) return;
  
  const deltaX = e.clientX - carouselMouseStartX;
  const minSwipeDistance = 50;
  
  if (Math.abs(deltaX) > minSwipeDistance) {
    if (deltaX > 0) {
      navigateCarousel('prev');
    } else {
      navigateCarousel('next');
    }
  } else {
    updateCarouselPosition();
  }
  
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.transition = 'transform 0.3s ease';
  }
  
  carouselMouseDown = false;
  carouselIsDragging = false;
}

function navigateCarousel(direction) {
  if (carouselItems.length === 0) return;
  if (direction === 'prev') carouselCurrentIndex = Math.max(0, carouselCurrentIndex - 1);
  else if (direction === 'next') carouselCurrentIndex = Math.min(carouselItems.length - 1, carouselCurrentIndex + 1);
  updateCarouselPosition();
  updateCarouselArrows();
}

function updateCarouselPosition() {
  const track = document.getElementById('carousel-track');
  if (!track) return;
  track.style.transform = `translateX(${-carouselCurrentIndex * 100}%)`;
}

function updateCarouselArrows() {
  const leftArrow = document.getElementById('carousel-arrow-left');
  const rightArrow = document.getElementById('carousel-arrow-right');
  const hasMultipleItems = carouselItems.length > 1;
  if (leftArrow) leftArrow.classList.toggle('visible', carouselCurrentIndex > 0 && hasMultipleItems);
  if (rightArrow) rightArrow.classList.toggle('visible', carouselCurrentIndex < carouselItems.length - 1 && hasMultipleItems);
}

function updateButtonVisibility() {
  const product = products[currentProduct];
  if (!product) return;
  const hasAccess = purchasedProducts.has(currentProduct) || checkSubscriptionStatus();
  if (buyNowButton) {
    buyNowButton.style.display = hasAccess ? 'none' : 'flex';
    buyNowButton.textContent = 'SUBSCRIBE';
  }
  if (downloadButton) {
    downloadButton.style.display = hasAccess ? 'flex' : 'none';
    downloadButton.textContent = 'DOWNLOAD';
  }
}

function checkSubscriptionStatus() {
  const licenseKey = localStorage.getItem('no3d_license_key');
  if (!licenseKey) return false;

  const cachedValid = localStorage.getItem('no3d_license_valid');
  const cachedTime = localStorage.getItem('no3d_license_checked');
  const ONE_HOUR = 60 * 60 * 1000;

  if (cachedValid === 'true' && cachedTime && (Date.now() - parseInt(cachedTime, 10)) < ONE_HOUR) {
    return true;
  }

  // Trigger async validation (non-blocking)
  validateLicenseAsync(licenseKey);
  return cachedValid === 'true';
}

async function validateLicenseAsync(licenseKey) {
  try {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: licenseKey }),
    });
    const data = await response.json();
    const isValid = data.valid === true && (data.status === 'active' || data.status === 'grace');
    localStorage.setItem('no3d_license_valid', isValid ? 'true' : 'false');
    localStorage.setItem('no3d_license_checked', Date.now().toString());
    if (currentProduct) updateButtonVisibility();
    if (isValid) updateMemberCTA(true);
  } catch (err) {
    console.error('License validation failed:', err);
  }
}

function updateMemberCTA(isMember) {
  if (!isMember) return;
  document.querySelectorAll('.member-cta-button, .mobile-member-cta-button, [data-member-cta]').forEach(btn => {
    replaceCTAWithWelcome(btn);
  });
}

function initializeEventListeners() {
  const headerLogo = document.getElementById('header-logo');
  if (headerLogo) {
    headerLogo.addEventListener('click', (e) => {
      e.preventDefault();
      deselectProduct();
      renderHomeGrid();
    });
  }

  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.product) {
      if (products[e.state.product]) {
        currentProduct = e.state.product;
        updateProductDisplay(e.state.product);
        updateActiveStates(e.state.product);
        updateViewState(true);
      }
    } else {
      currentProduct = null;
      updateActiveStates(null);
      updateViewState(false);
    }
  });

  document.addEventListener('click', e => {
    // Sidebar section collapse/expand
    const typeHeader = e.target.closest('.type-header');
    if (typeHeader) {
      const section = typeHeader.closest('.product-type');
      if (section && !section.classList.contains('empty')) {
        section.classList.toggle('expanded');
        const carrot = typeHeader.querySelector('.carrot');
        if (carrot) {
          carrot.classList.toggle('expanded');
          carrot.classList.toggle('collapsed');
          carrot.textContent = section.classList.contains('expanded') ? '▼' : '▶';
        }
      }
      return;
    }

    const productItem = e.target.closest('.product-item') || e.target.closest('.home-grid-item');
    if (productItem) {
      const productId = productItem.dataset.product || productItem.dataset.productId;
      if (productId) selectProduct(productId);
    }
  });
}


function initializeMobileMenu() {
  const hamburgerButton = document.getElementById('hamburger-menu-button');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  if (!hamburgerButton || !sidebar || !sidebarBackdrop) return;
  
  const toggleSidebar = () => {
    const isOpen = sidebar.classList.toggle('open');
    sidebarBackdrop.classList.toggle('active', isOpen);
    hamburgerButton.classList.toggle('active', isOpen);
    const icon = hamburgerButton.querySelector('i');
    if (icon) icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
  };
  
  hamburgerButton.addEventListener('click', e => { e.stopPropagation(); toggleSidebar(); });
  sidebarBackdrop.addEventListener('click', e => { e.stopPropagation(); if (sidebar.classList.contains('open')) toggleSidebar(); });
}

function initializeSidebarScrollbar() {}
function initializeSidebarEventListeners() {}
function initializeCart() {}
function initializeCheckoutModal() {}
function initializeLandingPopup() {}
function initializeChristmasPopup() {}
function initializeThemeToggle() {}
// ==================== DOWNLOAD EMAIL CAPTURE ====================

function openDownloadModal() {
  track('download_modal_open');
  const backdrop = document.getElementById('download-modal-backdrop');
  const modal = document.getElementById('download-modal');
  if (!backdrop || !modal) return;
  backdrop.style.display = '';
  modal.style.display = '';
  backdrop.classList.add('active');
  modal.classList.add('active');
  // Reset state
  document.getElementById('download-email-form').style.display = '';
  document.getElementById('download-modal-status').style.display = 'none';
  document.getElementById('download-modal-success').style.display = 'none';
  document.getElementById('download-submit-btn').disabled = false;
  document.getElementById('download-submit-btn').textContent = 'Get Add-on';
  const input = document.getElementById('download-email-input');
  input.value = '';
  setTimeout(() => input.focus(), 100);
}

function closeDownloadModal() {
  const backdrop = document.getElementById('download-modal-backdrop');
  const modal = document.getElementById('download-modal');
  if (backdrop) { backdrop.classList.remove('active'); backdrop.style.display = 'none'; }
  if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
}

// Close on backdrop click or Esc
document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('download-modal-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeDownloadModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('download-modal');
      if (modal && modal.classList.contains('active')) closeDownloadModal();
    }
  });

  const form = document.getElementById('download-email-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('download-email-input').value.trim();
      if (!email) return;

      const btn = document.getElementById('download-submit-btn');
      const status = document.getElementById('download-modal-status');
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      status.style.display = 'block';
      status.textContent = '';

      try {
        const response = await fetch('/api/create-free-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();

        if (!response.ok) {
          status.textContent = data.error || 'Something went wrong. Try again.';
          btn.disabled = false;
          btn.textContent = 'Get Add-on';
          return;
        }

        // Show license key
        track('free_account_created', { email_domain: email.split('@')[1] });
        document.getElementById('download-email-form').style.display = 'none';
        status.style.display = 'none';
        document.getElementById('download-modal-success').style.display = 'block';
        document.getElementById('download-license-key').textContent = data.license_key;

        // Save to localStorage
        if (data.license_key) {
          localStorage.setItem('no3d_license_key', data.license_key);
        }

        // Trigger addon download
        window.open('/api/download-addon', '_blank');

        // Redirect to guide after a moment
        setTimeout(() => {
          closeDownloadModal();
          window.location.href = '/guide.html';
        }, 4000);
      } catch (err) {
        status.textContent = 'Network error. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Get Add-on';
      }
    });
  }
});

// ==================== CMD+K SEARCH FUNCTIONALITY ====================

const searchModal = document.getElementById('search-modal');
const searchModalBackdrop = document.getElementById('search-modal-backdrop');
const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results-container');
const searchResultsEmpty = document.getElementById('search-results-empty');

let searchResults = [];
let selectedResultIndex = -1;

// Open search modal with CMD+K or Ctrl+K
document.addEventListener('keydown', function(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openSearchModal();
  }
  if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
    closeSearchModal();
  }
});

function openSearchModal() {
  if (!searchModal || !searchModalBackdrop || !searchInput) return;
  searchModal.classList.add('active');
  searchModalBackdrop.classList.add('active');
  searchInput.value = '';
  searchInput.focus();
  performSearch('');
}

function closeSearchModal() {
  if (!searchModal || !searchModalBackdrop) return;
  searchModal.classList.remove('active');
  searchModalBackdrop.classList.remove('active');
  if (searchResultsContainer) searchResultsContainer.classList.remove('active');
  if (searchResultsEmpty) searchResultsEmpty.classList.remove('active');
  selectedResultIndex = -1;
}

if (searchModalBackdrop) searchModalBackdrop.addEventListener('click', closeSearchModal);

if (searchInput) {
  searchInput.addEventListener('input', function(e) {
    performSearch(e.target.value);
  });

  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedResultIndex = Math.min(selectedResultIndex + 1, searchResults.length - 1);
      updateSearchSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
      updateSearchSelection();
    } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
      e.preventDefault();
      const productId = searchResults[selectedResultIndex];
      (async () => { await selectProduct(productId); })();
      closeSearchModal();
    }
  });
}

let _searchTrackTimeout = null;
function performSearch(query) {
  const searchTerm = query.toLowerCase().trim();
  const allProducts = Object.keys(products);

  // Debounced search tracking — fires 1s after user stops typing
  if (searchTerm.length >= 2) {
    clearTimeout(_searchTrackTimeout);
    _searchTrackTimeout = setTimeout(() => {
      track('search', { query: searchTerm });
    }, 1000);
  }

  if (searchTerm === '') {
    searchResults = allProducts;
  } else {
    searchResults = allProducts.filter(productId => {
      const product = products[productId];
      const name = (product.name || '').toLowerCase();
      const desc = (product.description || '').toLowerCase();

      if (name.includes(searchTerm) || desc.includes(searchTerm)) return true;

      if (product.changelog && Array.isArray(product.changelog)) {
        if (product.changelog.some(item => {
          if (typeof item === 'string') return item.toLowerCase().includes(searchTerm);
          if (item && typeof item === 'object') return JSON.stringify(item).toLowerCase().includes(searchTerm);
          return false;
        })) return true;
      }

      if (product.productType && product.productType.toLowerCase().includes(searchTerm)) return true;

      if (product.groups && Array.isArray(product.groups)) {
        if (product.groups.some(group => (group || '').toLowerCase().includes(searchTerm))) return true;
      }

      return false;
    });
  }

  selectedResultIndex = searchResults.length > 0 ? 0 : -1;
  renderSearchResults();
}

function renderSearchResults() {
  if (!searchResultsContainer || !searchResultsEmpty) return;
  searchResultsContainer.innerHTML = '';

  if (searchResults.length === 0) {
    searchResultsContainer.classList.remove('active');
    searchResultsEmpty.classList.add('active');
    return;
  }

  searchResultsEmpty.classList.remove('active');
  searchResultsContainer.classList.add('active');

  searchResults.forEach((productId, index) => {
    const product = products[productId];
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    if (index === selectedResultIndex) resultItem.classList.add('selected');

    resultItem.innerHTML = `
      <div class="search-result-content">
        <div class="search-result-title">${escapeText(product.name)}</div>
        <div class="search-result-price">${escapeText(product.price)}</div>
      </div>
    `;

    resultItem.addEventListener('click', async () => {
      await selectProduct(productId);
      closeSearchModal();
    });

    searchResultsContainer.appendChild(resultItem);
  });
}

function updateSearchSelection() {
  const resultItems = searchResultsContainer.querySelectorAll('.search-result-item');
  resultItems.forEach((item, index) => {
    if (index === selectedResultIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      item.classList.remove('selected');
    }
  });
}

function initializeMobileSearch() {
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileSearchButton = document.getElementById('mobile-search-button');

  if (mobileSearchInput && mobileSearchButton) {
    mobileSearchInput.addEventListener('input', () => {
      if (!searchModal.classList.contains('active')) openSearchModal();
      searchInput.value = mobileSearchInput.value;
      performSearch(mobileSearchInput.value);
    });

    mobileSearchButton.addEventListener('click', () => {
      openSearchModal();
      if (mobileSearchInput.value) {
        searchInput.value = mobileSearchInput.value;
        performSearch(mobileSearchInput.value);
      } else {
        mobileSearchInput.focus();
      }
    });

    mobileSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstResult = document.querySelector('.search-result-item');
        if (firstResult) firstResult.click();
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (searchModal.classList.contains('active')) {
          mobileSearchInput.value = searchInput.value;
        }
      });
    }

    if (searchModalBackdrop) {
      searchModalBackdrop.addEventListener('click', () => { mobileSearchInput.value = ''; });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
        mobileSearchInput.value = '';
      }
    });
  }
}
function initializeMemberCTA() {
  const isMember = checkSubscriptionStatus();
  document.querySelectorAll('.member-cta-button, .mobile-member-cta-button, [data-member-cta]').forEach(btn => {
    if (isMember) {
      replaceCTAWithWelcome(btn);
    } else {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        track('member_cta_click');
        window.location.href = '/subscribe.html';
      });
    }
  });
}

function replaceCTAWithWelcome(btn) {
  // Hide the mobile footer CTA bar entirely for members
  const mobileFooter = document.getElementById('mobile-footer-cta');
  if (mobileFooter && mobileFooter.contains(btn)) {
    mobileFooter.style.display = 'none';
    return;
  }
  const welcome = document.createElement('span');
  welcome.className = 'member-welcome-text';
  welcome.textContent = 'WELCOME, YOUNG INITIATE';
  welcome.addEventListener('click', () => { window.location.href = '/account.html'; });
  btn.replaceWith(welcome);
}
function initializeAccountDropdown() {
  const toggle = document.getElementById('account-link');
  const menu = document.getElementById('account-dropdown-menu');
  if (!toggle || !menu) return;

  const isMember = checkSubscriptionStatus();

  // Build menu items based on auth state
  menu.innerHTML = '';
  if (isMember) {
    menu.innerHTML = `
      <a href="account.html" class="account-dropdown-item">ACCOUNT</a>
      <a href="/api/download-addon" class="account-dropdown-item" download>DOWNLOAD ADD-ON</a>
      <button class="account-dropdown-item" id="copy-license-key">COPY NO3D LINK KEY</button>
      <button class="account-dropdown-item" id="logout-button">LOGOUT</button>
    `;
  } else {
    menu.innerHTML = `
      <a href="account.html" class="account-dropdown-item">LOGIN</a>
      <a href="subscribe.html" class="account-dropdown-item">SUBSCRIBE</a>
    `;
  }

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.account-dropdown')) {
      menu.classList.remove('open');
    }
  });

  const copyBtn = document.getElementById('copy-license-key');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const key = localStorage.getItem('no3d_license_key');
      if (key) {
        navigator.clipboard.writeText(key);
        copyBtn.textContent = 'COPIED!';
        setTimeout(() => { copyBtn.textContent = 'COPY NO3D LINK KEY'; }, 2000);
      }
      menu.classList.remove('open');
    });
  }

  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('no3d_license_key');
      localStorage.removeItem('no3d_license_valid');
      localStorage.removeItem('no3d_license_checked');
      menu.classList.remove('open');
      window.location.reload();
    });
  }
}

function updateFooterShortcut() {}
function updateFooterCommit() {}

function initializeDownloadButton() {
  if (!downloadButton) return;
  downloadButton.onclick = async (e) => {
    e.preventDefault();
    const product = products[currentProduct];
    if (!product) return;

    const licenseKey = localStorage.getItem('no3d_license_key');
    if (!licenseKey) {
      alert('No3D Link key not found. Please enter your No3D Link License Key on the Account page.');
      return;
    }

    downloadButton.classList.add('loading');
    downloadButton.textContent = 'DOWNLOADING...';

    try {
      const response = await fetch(`/api/download/${product.handle}?license_key=${encodeURIComponent(licenseKey)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          localStorage.removeItem('no3d_license_valid');
          alert('Your subscription has expired. Please re-subscribe to download.');
          updateButtonVisibility();
          return;
        }
        throw new Error(errorData.error || 'Download failed');
      }
      const data = await response.json();
      if (data.url) {
        const a = document.createElement('a');
        a.href = data.url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      downloadButton.classList.remove('loading');
      downloadButton.textContent = 'DOWNLOAD';
    }
  };
}

function initializeDeepLinks() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('product');
  if (productId && products[productId]) {
    selectProduct(productId);
  }
}
async function checkUrlParameters() {}
function showPurchaseProcessing() {}
async function pollForDownloads() {}
function showDownloadSuccess() {}
function showDownloadFallback() {}
