// NO3D TOOLS WEBSITE INTERACTIVITY
// Following Figma Design System Rules

// Configure marked (loaded from CDN) with security options
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false, // We'll sanitize manually if needed
    smartLists: true,
    smartypants: true
  });
}

// Global state variables
let products = {};
let currentProduct = null;
let productDataByType = {};
let activeProductType = 'tools';
let expandedProductGroups = new Set();
let activeToolFilters = new Set(['all']);
let originalDescriptionContent = '';
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
  // Don't hide loading screen immediately - wait for data to load
  try {
    await fetchUnifiedProducts();
    organizeProductsByType();
    renderSidebar();
    initializeEventListeners();
    initializeTabs(); // Initialize the tab system
    initializeMobileMenu();
    initializeSidebarEventListeners();
    initializeSidebarScrollbar();
    updateHeaderLogo('tools');
    expandProductType('tools');
    renderHomeGrid();
    initializeDeepLinks();
    updateViewState(false); // Start with home grid visible
    await checkUrlParameters(); // Check for checkout success from redirect
    initializeMemberCTA();
    initializeDownloadButton();
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
          price: product.price || 'FREE',
          description: product.description,
          changelog: product.changelog || [], // Ensure changelog is included
          image: product.image || null, // Main image for grid/icon
          icon: product.image || null, // Using main image for icon
          productType: product.product_type || 'tools',
          groups: product.tags || [], // Tags for product groups
          handle: product.handle,
          folderName: product.handle,
          hosted_media: product.hosted_media || {},
          carousel_media: product.carousel_media || [],
        };
      });
      console.log(`✅ Populated 'products' object with ${Object.keys(products).length} products.`);
    } else {
      console.warn('⚠️ No products returned from /api/get-all-products');
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
    { key: 'tools', label: 'TOOLS' },
    { key: 'tutorials', label: 'TUTORIALS' },
    { key: 'prints', label: 'PRINTS' },
    { key: 'apps', label: 'APPS' },
    { key: 'docs', label: 'DOCS/BLOG' }
  ];
  
  productTypes.forEach(type => {
    const typeProducts = productDataByType[type.key] || {};
    const hasProducts = Object.keys(typeProducts).length > 0;
    
    const productTypeDiv = document.createElement('div');
    productTypeDiv.className = 'product-type';
    productTypeDiv.dataset.type = type.key;
    if (type.key === activeProductType) {
      productTypeDiv.classList.add('expanded');
    }
    
    const typeHeader = document.createElement('div');
    typeHeader.className = 'type-header';
    typeHeader.innerHTML = `<span class="carrot expanded">▼</span><span class="category-name">${type.label}</span>`;
    
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
      
      Object.values(typeProducts).sort((a, b) => a.name.localeCompare(b.name)).forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = `product-item ${product.id === currentProduct ? 'active' : ''}`;
        productItem.dataset.product = product.id;
        productItem.innerHTML = `<span class="product-name">${product.name}</span>`;
        productList.appendChild(productItem);
      });
      
      groupsContainer.appendChild(productList);
    }
    
    productTypeDiv.appendChild(typeHeader);
    productTypeDiv.appendChild(groupsContainer);
    sidebarContent.appendChild(productTypeDiv);
  });
}

function renderHomeGrid() {
  const homeGrid = document.getElementById('home-grid');
  if (!homeGrid) return;

  homeGrid.innerHTML = '';
  const productsArray = Object.values(products).sort((a, b) => a.name.localeCompare(b.name));

  productsArray.forEach(product => {
    const gridItem = document.createElement('div');
    gridItem.className = 'home-grid-item';
    gridItem.dataset.productId = product.id;
    gridItem.addEventListener('click', () => selectProduct(product.id));

    const img = document.createElement('img');
    img.className = 'home-grid-item-thumbnail';
    img.src = product.icon || '';
    img.alt = product.name;
    img.loading = 'lazy';
    img.onerror = () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f0f0f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12px" fill="#aaa">No Image</text></svg>';
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      img.onerror = null;
    };

    const title = document.createElement('div');
    title.className = 'home-grid-item-title';
    title.textContent = product.name;

    gridItem.appendChild(img);
    gridItem.appendChild(title);
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
  currentProduct = productId;
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
  
  if (product.description) {
    const descriptionText = typeof product.description === 'string' 
      ? product.description 
      : String(product.description || '');
    
    if (typeof marked !== 'undefined') {
      productDescription.innerHTML = marked.parse(descriptionText);
    } else {
      productDescription.innerHTML = `<p>${descriptionText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
    }
    originalDescriptionContent = productDescription.innerHTML;
  } else {
    productDescription.innerHTML = '';
    originalDescriptionContent = '';
  }

  updateButtonVisibility();
  resetTabs(); // Reset tabs to description when product changes

  // Subscribe button handler
  if (buyNowButton) {
    buyNowButton.onclick = async (e) => {
      e.preventDefault();
      if (buyNowButton.classList.contains('loading')) return;
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
      if (product.hosted_media[mediaKey]) {
        carouselItems.push({ url: product.hosted_media[mediaKey], name: mediaKey });
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
  } catch (err) {
    console.error('License validation failed:', err);
  }
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
    const productItem = e.target.closest('.product-item') || e.target.closest('.home-grid-item');
    if (productItem) {
      const productId = productItem.dataset.product || productItem.dataset.productId;
      if (productId) selectProduct(productId);
    }
  });
}

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.product-tabs .tab');
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const targetTab = e.target.dataset.tab;
      if (targetTab) switchTab(targetTab);
    });
  });
}

function switchTab(targetTabId) {
  const tabButtons = document.querySelectorAll('.product-tabs .tab');
  const tabIcons = document.querySelectorAll('.product-tabs .tab-icon');
  const contentElements = [
    document.getElementById('product-description-content'),
    document.getElementById('product-docs-content'),
    document.getElementById('changelog-content')
  ];

  tabButtons.forEach(button => button.classList.toggle('active', button.dataset.tab === targetTabId));
  tabIcons.forEach(icon => {
    const isTarget = icon.dataset.tab === targetTabId;
    icon.classList.toggle('expanded', isTarget);
    icon.classList.toggle('collapsed', !isTarget);
    const arrow = icon.querySelector('.tab-arrow');
    if (arrow) arrow.textContent = isTarget ? '▼' : '▶';
  });

  contentElements.forEach(content => {
    if (content) content.classList.toggle('active', content.dataset.tabId === targetTabId);
  });
}

function resetTabs() { switchTab('description'); }

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
function initializeMobileSearch() {}
function initializeMemberCTA() {
  document.querySelectorAll('.member-cta-button, .mobile-member-cta-button, [data-member-cta]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/subscribe.html';
    });
  });
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
      alert('License key not found. Please enter your license key on the Account page.');
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
