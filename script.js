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
    initializeMobileMenu();
    initializeSidebarEventListeners();
    initializeSidebarScrollbar();
    updateHeaderLogo('tools');
    expandProductType('tools');
    renderHomeGrid();
    updateViewState(false); // Start with home grid visible
    await checkUrlParameters(); // Check for checkout success from redirect
    initializeCart();
    initializeCheckoutModal();
    initializeLandingPopup();
    initializeChristmasPopup();
    initializeThemeToggle();
    initializeMobileSearch();
    updateFooterShortcut();
    updateFooterCommit();
    console.log('✅ Website initialized successfully');
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
          polarProductId: product.polar_product_id,
          polarPriceId: product.polar_price_id, // Capture price ID
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
}

function deselectProduct() {
  currentProduct = null;
  updateActiveStates(null);
  updateViewState(false); // Show home grid
}

async function updateProductDisplay(productId) {
  const product = products[productId];
  if (!product) return;

  productTitle.textContent = product.name;
  productPrice.textContent = `PRICE: ${product.price}`;
  
  if (product.description) {
    productDescription.innerHTML = typeof marked !== 'undefined' ? marked.parse(product.description) : `<p>${product.description}</p>`;
    originalDescriptionContent = productDescription.innerHTML;
  } else {
    productDescription.innerHTML = '';
    originalDescriptionContent = '';
  }

  updateButtonVisibility();

  // Dynamically fetch and set the href for the "BUY NOW" button from the API endpoint
  if (buyNowButton && product.polarProductId) {
    // Reset button state and clear any existing handlers
    buyNowButton.classList.remove('loading');
    buyNowButton.removeAttribute('data-polar-checkout'); 
    buyNowButton.onclick = null; // Clear any old handlers
    
    // Use a custom click handler for the BUY NOW button
    buyNowButton.onclick = async (e) => {
      e.preventDefault();
      
      if (buyNowButton.classList.contains('loading')) return;
      
      buyNowButton.classList.add('loading');
      console.log(`🚀 Initiating checkout for ${product.name}...`);
      
      try {
        const response = await fetch('/api/polar-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            productId: product.polarProductId,
            productPriceId: product.polarPriceId // Send Price ID if available
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        const { checkout_url, clientSecret } = data;
        
        if (checkout_url) {
          console.log('✅ Checkout session created:', { id: data.id, hasSecret: !!clientSecret });
          
          if (window.Polar && window.Polar.EmbedCheckout) {
            console.log('🚀 Opening Polar modal with clientSecret...');
            try {
              let checkout;
              // Prefer clientSecret if available, fallback to URL
              if (clientSecret) {
                checkout = await window.Polar.EmbedCheckout.create({
                  clientSecret: clientSecret,
                  theme: "light"
                });
              } else {
                checkout = await window.Polar.EmbedCheckout.create(checkout_url, "light");
              }
              
              if (checkout) {
                console.log('✅ Polar modal opened successfully');
                
                // Store the checkout ID we created - we'll need it for the success handler
                const createdCheckoutId = data.id;
                
                // Listen for success event using correct Polar SDK method
                // Per Polar docs: use addEventListener("success", ...) not .on("checkout.succeeded", ...)
                checkout.addEventListener("success", async (event) => {
                  console.log('💰 Checkout success event received:', event);
                  console.log('💰 Event detail:', event.detail);
                  
                  // Get checkout ID from event or use stored one
                  const eventData = event.detail || {};
                  const checkoutId = eventData.id || eventData.checkoutId || createdCheckoutId;
                  
                  console.log('💰 Redirecting to success page with checkout ID:', checkoutId);
                  
                  // REDIRECT TO SUCCESS PAGE
                  // This is the cleanest flow - let success.html handle the order display
                  // and provide the link to Polar's Customer Portal for downloads
                  window.location.href = `/success.html?checkout_id=${checkoutId}`;
                });
                
                // Also listen for close event to clean up state
                checkout.addEventListener("close", (event) => {
                  console.log('📦 Checkout modal closed');
                });
              }
            } catch (embedError) {
              console.error('❌ Polar Embed error:', embedError);
              window.location.href = checkout_url; // Fallback
            }
          } else {
            console.warn('⚠️ Polar SDK not loaded, falling back to redirect');
            window.location.href = checkout_url;
          }
        } else {
          throw new Error('No checkout URL returned from API');
        }
      } catch (error) {
        console.error('❌ Checkout initiation failed:', error);
        alert('Unable to start checkout. Please try again or contact support.');
      } finally {
        buyNowButton.classList.remove('loading');
      }
    };
    
    console.log(`✅ BUY NOW handler ready for: ${product.name}`);
  }


  await initializeCarousel(productId);
  console.log(`🔄 Display updated for product: ${product.name}`);
}

function updateViewState(showProductCard) {
  console.log(`Updating view state, showProductCard: ${showProductCard}`);
  const homeGridContainer = document.getElementById('home-grid-container');
  const productCardContainer = document.querySelector('.product-card-container');
  const closeButton = document.getElementById('product-close-button');

  if (showProductCard) {
    homeGridContainer.classList.add('hidden');
    productCardContainer.classList.remove('hidden');
    if (closeButton) closeButton.style.display = 'flex';
  } else {
    homeGridContainer.classList.remove('hidden');
    productCardContainer.classList.add('hidden');
    if (closeButton) closeButton.style.display = 'none';
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

function updateHeaderLogo(typeKey) {
}

async function initializeCarousel(productId) {
  const track = document.getElementById('carousel-track');
  const leftArrow = document.getElementById('carousel-arrow-left');
  const rightArrow = document.getElementById('carousel-arrow-right');
  
  if (!track) return;
  track.innerHTML = '';

  const product = products[productId];
  if (!product) return;
  
  carouselCurrentIndex = 0; // Reset carousel to first item

  // Populate carouselItems from product data
  carouselItems = [];

  // Prioritize carousel_media if available
  if (product.carousel_media && product.carousel_media.length > 0 && product.hosted_media) {
    product.carousel_media.forEach(mediaKey => {
      if (product.hosted_media[mediaKey]) {
        carouselItems.push({ url: product.hosted_media[mediaKey], name: mediaKey });
      }
    });
  } 
  
  // Fall back to product.icon if no carousel media or hosted media found
  if (carouselItems.length === 0 && product.icon) {
    carouselItems.push({ url: product.icon, name: 'Main Image' });
  }

  if (carouselItems.length === 0) {
    track.innerHTML = '<div class="carousel-item"><div class="model-viewer-placeholder">No media available</div></div>';
    // Hide arrows if no items
    if (leftArrow) leftArrow.classList.remove('visible');
    if (rightArrow) rightArrow.classList.remove('visible');
    return;
  }

  carouselItems.forEach((asset, index) => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.dataset.index = index;

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

  if (leftArrow) { 
    leftArrow.onclick = () => navigateCarousel('prev');
  }
  if (rightArrow) { 
    rightArrow.onclick = () => navigateCarousel('next');
  }
}

function navigateCarousel(direction) {
  if (carouselItems.length === 0) return;

  if (direction === 'prev') {
    carouselCurrentIndex = Math.max(0, carouselCurrentIndex - 1);
  } else if (direction === 'next') {
    carouselCurrentIndex = Math.min(carouselItems.length - 1, carouselCurrentIndex + 1);
  }

  updateCarouselPosition();
  updateCarouselArrows();
}

function updateCarouselPosition() {
  const track = document.getElementById('carousel-track');
  if (!track) return;
  const offset = -carouselCurrentIndex * 100;
  track.style.transform = `translateX(${offset}%)`;
}

function updateCarouselArrows() {
  const leftArrow = document.getElementById('carousel-arrow-left');
  const rightArrow = document.getElementById('carousel-arrow-right');

  const hasMultipleItems = carouselItems.length > 1;
  const canGoLeft = carouselCurrentIndex > 0;
  const canGoRight = carouselCurrentIndex < carouselItems.length - 1;

  if (leftArrow) {
    leftArrow.classList.toggle('visible', canGoLeft && hasMultipleItems);
  }
  if (rightArrow) {
    rightArrow.classList.toggle('visible', canGoRight && hasMultipleItems);
  }
}

// ============================================================================
// PURCHASE FLOW AND ENTITLEMENTS
// ============================================================================

function updateButtonVisibility() {
  const product = products[currentProduct];
  if (!product || !buyNowButton || !downloadButton) return;

  const hasAccess = purchasedProducts.has(currentProduct) || checkSubscriptionStatus();

  if (hasAccess) {
    buyNowButton.style.display = 'none';
    downloadButton.style.display = 'flex';
  } else {
    buyNowButton.style.display = 'flex';
    downloadButton.style.display = 'none';
  }
}

function checkSubscriptionStatus() {
  // Dummy function: In a real app, this would check user's membership status
  return false;
}


// ============================================================================
// EVENT LISTENERS AND DUMMY FUNCTIONS
// ============================================================================

function initializeEventListeners() {
  // Header logo click handler - always return to home grid
  const headerLogo = document.getElementById('header-logo');
  if (headerLogo) {
    headerLogo.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🏠 Header logo clicked - returning to home grid');
      deselectProduct();
      renderHomeGrid();
      // Clear any URL parameters/hash to ensure clean state
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
    // Make logo cursor pointer to indicate it's clickable
    headerLogo.style.cursor = 'pointer';
  }

  document.addEventListener('click', e => {
    const productItem = e.target.closest('.product-item') || e.target.closest('.home-grid-item');
    if (productItem) {
      const productId = productItem.dataset.product || productItem.dataset.productId;
      if (productId) {
        selectProduct(productId);
      }
    }
    if (e.target.closest('#product-close-button')) {
      deselectProduct();
    }
    
    // Handle buy button clicks - prevent navigation if URL is invalid
    if (e.target.closest('#buy-now-button')) {
      const button = e.target.closest('#buy-now-button');
      // If we're using the programmatic handler (no data-polar-checkout), don't interfere
      if (button.hasAttribute('data-polar-checkout')) {
        if (!button.href || button.href === '#' ) {
          e.preventDefault();
          console.warn('⚠️ Checkout URL not ready yet. Please wait...');
          return false;
        }
      }
    }
  });
}

function initializeMobileMenu() {
  const hamburgerButton = document.getElementById('hamburger-menu-button');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  
  if (!hamburgerButton || !sidebar || !sidebarBackdrop) {
    console.warn('Mobile menu elements not found');
    return;
  }
  
  // Toggle sidebar open/closed
  function toggleSidebar() {
    const isOpen = sidebar.classList.contains('open');
    
    if (isOpen) {
      // Close sidebar
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
      hamburgerButton.classList.remove('active');
      // Change icon back to hamburger
      const icon = hamburgerButton.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-bars';
      }
    } else {
      // Open sidebar
      sidebar.classList.add('open');
      sidebarBackdrop.classList.add('active');
      hamburgerButton.classList.add('active');
      // Change icon to X
      const icon = hamburgerButton.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-times';
      }
    }
  }
  
  // Open sidebar
  function openSidebar() {
    if (!sidebar.classList.contains('open')) {
      toggleSidebar();
    }
  }
  
  // Close sidebar
  function closeSidebar() {
    if (sidebar.classList.contains('open')) {
      toggleSidebar();
    }
  }
  
  // Hamburger button click handler
  hamburgerButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
  
  // Backdrop click handler - close sidebar when backdrop is clicked
  sidebarBackdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSidebar();
  });
  
  // Close sidebar on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });
  
  // Close sidebar when resizing from mobile to desktop
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // If window is wider than mobile breakpoint, close sidebar
      if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
        closeSidebar();
      }
    }, 150);
  });
  
  // Expose close function for use by other functions
  window.closeMobileSidebar = closeSidebar;
  window.openMobileSidebar = openSidebar;
  
  console.log('✅ Mobile menu initialized');
}

function initializeSidebarScrollbar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  let scrollTimeout;
  
  // Add 'scrolling' class when user scrolls
  sidebar.addEventListener('scroll', () => {
    sidebar.classList.add('scrolling');
    
    // Remove 'scrolling' class after scrolling stops
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      sidebar.classList.remove('scrolling');
    }, 1000); // Hide scrollbar 1 second after scrolling stops
  });
  
  // Also remove class when mouse leaves sidebar
  sidebar.addEventListener('mouseleave', () => {
    sidebar.classList.remove('scrolling');
  });
  
  console.log('✅ Sidebar scrollbar visibility initialized');
}

function initializeSidebarEventListeners() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  // Handle product type header clicks (expand/collapse)
  sidebar.addEventListener('click', (e) => {
    const typeHeader = e.target.closest('.type-header');
    if (typeHeader) {
      e.preventDefault();
      e.stopPropagation();
      
      const productType = typeHeader.closest('.product-type');
      if (productType) {
        const isExpanded = productType.classList.contains('expanded');
        
        if (isExpanded) {
          productType.classList.remove('expanded');
          const carrot = typeHeader.querySelector('.carrot');
          if (carrot) {
            carrot.textContent = '▶';
            carrot.classList.remove('expanded');
          }
        } else {
          productType.classList.add('expanded');
          const carrot = typeHeader.querySelector('.carrot');
          if (carrot) {
            carrot.textContent = '▼';
            carrot.classList.add('expanded');
          }
        }
      }
    }
    
    // Handle product item clicks
    const productItem = e.target.closest('.product-item');
    if (productItem) {
      const productId = productItem.dataset.product;
      if (productId) {
        // Close mobile sidebar when product is selected (on mobile only)
        if (window.innerWidth <= 768) {
          if (window.closeMobileSidebar) {
            window.closeMobileSidebar();
          }
        }
        selectProduct(productId);
      }
    }
  });
  
  console.log('✅ Sidebar event listeners initialized');
}
function initializeDevCustomerId() {}
function getPolarProductData() { return null; }
function initializeAccountMenu() {}
function updateFooterShortcut() {}
function updateFooterCommit() {}
function initializeMobileSearch() {
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileSearchButton = document.getElementById('mobile-search-button');
  const searchModal = document.getElementById('search-modal');
  const searchModalBackdrop = document.getElementById('search-modal-backdrop');
  const searchInput = document.getElementById('search-input');
  
  if (!mobileSearchInput || !mobileSearchButton) {
    console.warn('Mobile search elements not found');
    return;
  }
  
  // Handle typing in mobile search - open modal and sync with main search
  mobileSearchInput.addEventListener('input', () => {
    // Open modal if not already open
    if (searchModal && !searchModal.classList.contains('active')) {
      if (typeof openSearchModal === 'function') {
        openSearchModal();
      } else {
        // Fallback: manually open modal
        if (searchModal) searchModal.classList.add('active');
        if (searchModalBackdrop) searchModalBackdrop.classList.add('active');
      }
    }
    
    // Sync with main search input
    if (searchInput) {
      searchInput.value = mobileSearchInput.value;
      // Trigger input event on search input to trigger search
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Trigger search if performSearch function exists
    if (typeof performSearch === 'function') {
      performSearch(mobileSearchInput.value);
    }
  });
  
  // Handle button click - open modal and focus
  mobileSearchButton.addEventListener('click', () => {
    // Open modal
    if (typeof openSearchModal === 'function') {
      openSearchModal();
    } else {
      // Fallback: manually open modal
      if (searchModal) searchModal.classList.add('active');
      if (searchModalBackdrop) searchModalBackdrop.classList.add('active');
    }
    
    // Pre-fill with mobile input value if exists
    if (mobileSearchInput.value) {
      if (searchInput) {
        searchInput.value = mobileSearchInput.value;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (typeof performSearch === 'function') {
        performSearch(mobileSearchInput.value);
      }
    } else {
      // Focus the mobile input if empty
      mobileSearchInput.focus();
    }
  });
  
  // Handle Enter key in mobile search
  mobileSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Open modal if not open
      if (searchModal && !searchModal.classList.contains('active')) {
        if (typeof openSearchModal === 'function') {
          openSearchModal();
        } else {
          if (searchModal) searchModal.classList.add('active');
          if (searchModalBackdrop) searchModalBackdrop.classList.add('active');
        }
      }
      
      // If there are results, select the first one
      const firstResult = document.querySelector('.search-result-item');
      if (firstResult) {
        firstResult.click();
      } else if (typeof performSearch === 'function') {
        performSearch(mobileSearchInput.value);
      }
    }
  });
  
  // Sync mobile search when modal search input changes
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (searchModal && searchModal.classList.contains('active')) {
        mobileSearchInput.value = searchInput.value;
      }
    });
  }
  
  // Clear mobile search when modal closes
  if (searchModalBackdrop) {
    searchModalBackdrop.addEventListener('click', () => {
      mobileSearchInput.value = '';
    });
  }
  
  // Also clear when ESC is pressed
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
      mobileSearchInput.value = '';
    }
  });
  
  // ============================================
  // Mobile Keyboard Handling - Visual Viewport API
  // ============================================
  const mobileSearchBar = document.getElementById('mobile-search-bar');
  if (mobileSearchBar) {
    let keyboardHeight = 0;
    let isKeyboardOpen = false;
    let viewportChangeTimeout = null;
    const DEBOUNCE_DELAY = 100; // ms
    
    // Helper function to calculate and apply keyboard positioning
    function updateSearchBarPosition() {
      if (!mobileSearchBar || !mobileSearchInput) return;
      
      const windowHeight = window.innerHeight;
      let newKeyboardHeight = 0;
      let shouldBeAboveKeyboard = false;
      
      // Use Visual Viewport API if available (modern browsers)
      if (window.visualViewport) {
        const visualViewport = window.visualViewport;
        const viewportHeight = visualViewport.height;
        const heightDifference = windowHeight - viewportHeight;
        
        // Consider keyboard open if height difference is significant (more than 150px)
        if (heightDifference > 150) {
          newKeyboardHeight = heightDifference;
          shouldBeAboveKeyboard = true;
        }
      } else {
        // Fallback: Use window resize for older browsers
        const currentViewportHeight = window.innerHeight;
        const storedViewportHeight = window.initialViewportHeight || windowHeight;
        
        if (storedViewportHeight && currentViewportHeight < storedViewportHeight - 150) {
          newKeyboardHeight = storedViewportHeight - currentViewportHeight;
          shouldBeAboveKeyboard = true;
        }
      }
      
      // Only update if there's a meaningful change (avoid jitter)
      if (Math.abs(newKeyboardHeight - keyboardHeight) > 10 || shouldBeAboveKeyboard !== isKeyboardOpen) {
        keyboardHeight = newKeyboardHeight;
        isKeyboardOpen = shouldBeAboveKeyboard;
        
        if (isKeyboardOpen && keyboardHeight > 0) {
          // Position search bar above keyboard
          mobileSearchBar.style.bottom = `${keyboardHeight}px`;
          mobileSearchBar.classList.add('keyboard-open');
          
          // Adjust site container height to account for keyboard
          const siteContainer = document.querySelector('.site-container');
          if (siteContainer && window.visualViewport) {
            const viewportHeight = window.visualViewport.height;
            siteContainer.style.minHeight = `${viewportHeight}px`;
          }
        } else {
          // Reset to bottom when keyboard closes
          mobileSearchBar.style.bottom = '0';
          mobileSearchBar.classList.remove('keyboard-open');
          
          // Reset site container height
          const siteContainer = document.querySelector('.site-container');
          if (siteContainer) {
            siteContainer.style.minHeight = '';
          }
        }
      }
    }
    
    // Debounced viewport change handler
    function handleViewportChange() {
      clearTimeout(viewportChangeTimeout);
      viewportChangeTimeout = setTimeout(() => {
        updateSearchBarPosition();
      }, DEBOUNCE_DELAY);
    }
    
    // Visual Viewport API handler (preferred method)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    
    // Fallback: Window resize handler for browsers without Visual Viewport API
    let lastWindowHeight = window.innerHeight;
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      // Only trigger if height changed significantly (likely keyboard)
      if (Math.abs(currentHeight - lastWindowHeight) > 100) {
        lastWindowHeight = currentHeight;
        // Store initial viewport height for fallback calculation
        if (!window.initialViewportHeight) {
          window.initialViewportHeight = Math.max(
            window.initialViewportHeight || 0,
            currentHeight
          );
        }
        handleViewportChange();
      }
    });
    
    // Store initial viewport height on load
    window.initialViewportHeight = window.innerHeight;
    
    // Handle focus events to trigger position update
    let savedScrollPosition = 0;
    let isRestoringScroll = false;
    
    mobileSearchInput.addEventListener('focus', () => {
      // Store current scroll position to prevent jumping
      savedScrollPosition = window.scrollY || window.pageYOffset;
      isRestoringScroll = true;
      
      // Monitor and restore scroll position if browser tries to change it
      const restoreScroll = () => {
        const currentScroll = window.scrollY || window.pageYOffset;
        // If scroll position changed significantly (browser auto-scrolled)
        if (isRestoringScroll && Math.abs(currentScroll - savedScrollPosition) > 20) {
          window.scrollTo({
            top: savedScrollPosition,
            behavior: 'auto' // Instant, no animation
          });
        }
      };
      
      // Check scroll position periodically for a short time
      const scrollCheckInterval = setInterval(() => {
        restoreScroll();
        if (!isRestoringScroll) {
          clearInterval(scrollCheckInterval);
        }
      }, 50);
      
      // Stop monitoring after keyboard animation completes
      setTimeout(() => {
        isRestoringScroll = false;
        clearInterval(scrollCheckInterval);
      }, 600);
      
      // Small delay to allow keyboard animation to start
      setTimeout(() => {
        updateSearchBarPosition();
      }, 100);
    });
    
    // Handle blur events to reset position
    mobileSearchInput.addEventListener('blur', () => {
      // Delay to check if keyboard actually closed (user might tap elsewhere)
      setTimeout(() => {
        // Only reset if input is not focused (keyboard truly closed)
        if (document.activeElement !== mobileSearchInput) {
          keyboardHeight = 0;
          isKeyboardOpen = false;
          mobileSearchBar.style.bottom = '0';
          mobileSearchBar.classList.remove('keyboard-open');
          
          // Reset site container height
          const siteContainer = document.querySelector('.site-container');
          if (siteContainer) {
            siteContainer.style.minHeight = '';
          }
        }
      }, 100);
    });
    
    // Handle orientation change (landscape/portrait)
    window.addEventListener('orientationchange', () => {
      // Reset and recalculate after orientation change
      setTimeout(() => {
        window.initialViewportHeight = window.innerHeight;
        keyboardHeight = 0;
        isKeyboardOpen = false;
        updateSearchBarPosition();
      }, 500); // Allow time for orientation change to complete
    });
    
    // Initial position check
    updateSearchBarPosition();
  }
  
  console.log('✅ Mobile search initialized');
}
function updateHorizontalIconGrid() {}
function switchTab() {}
function downloadProduct() {}
function toggleTabIcon() {}
function toggleChangelogIcon() {}
function initializeThemeToggle() {}
function initializeCart() {}
function initializeCheckoutModal() {}
function initializeLandingPopup() {}
function initializeChristmasPopup() {}
function getDevMemberToggle() { return false; }
function setDevMemberToggle() {}
function getDevCustomerId() { return null; }
function updateMemberCTAVisibility() {}
function initializeMemberCTA() {}
function performSearch() {}
function handleProductTypeToggle() {}
function handleProductGroupToggle() {}
function handleToolsFilterToggle() {}
function updateIconGrid() {}
function updateChangelog() {}
function loadProductDocs() {}
function load3DModel() {}
function openSearchModal() {}
function closeSearchModal() {}
function openCartModal() {}
function closeCartModal() {}
function openCheckoutModalUI() {}
function closeCheckoutModalUI() {}
function showDownloadModal() {}
function downloadProductFile() {}
function handleCheckout() {}
function shouldShowChristmasPopup() { return false; }
function showChristmasPopup() {}
function hideChristmasPopup() {}
function handleChristmasPurchase() {}
function handleChristmasDismiss() {}
function shouldShowLandingPopup() { return false; }
function showLandingPopup() {}
function hideLandingPopup() {}
function handleLandingPopupSubscribe() {}
function handleLandingPopupBrowse() {}
function getTheme() { return 'light'; }
function setTheme() {}
function toggleTheme() {}
function getThemedIconPath() { return ''; }
function getThemedLogoPath() { return ''; }
function updateThemeIcon() {}
function closeAccountMenu() {}

// ============================================================================
// POLAR POST-PURCHASE FLOW
// ============================================================================

/**
 * Check URL for checkout parameters
 * If checkout params are found on the main page, redirect to the success page
 * This keeps the success flow centralized in success.html
 */
async function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  
  const checkoutId = urlParams.get('checkout_id') || urlParams.get('checkout_session_id') || urlParams.get('id');
  const checkoutSuccess = urlParams.get('checkout_success');
  const customerSessionToken = urlParams.get('customer_session_token');
  
  console.log('🔍 URL Parameters:', { checkoutId, checkoutSuccess, hasToken: !!customerSessionToken });
  
  // If we detect any checkout-related params, redirect to success page
  if (checkoutId) {
    console.log('🎯 Redirecting to success page with checkout_id');
    window.location.href = `/success.html?checkout_id=${checkoutId}`;
    return;
  }
  
  if (checkoutSuccess === 'true') {
    console.log('🎯 Redirecting to success page with checkout_success params');
    // Pass through the customer session token if present
    const successParams = new URLSearchParams();
    successParams.set('checkout_success', 'true');
    if (customerSessionToken) {
      successParams.set('customer_session_token', customerSessionToken);
    }
    window.location.href = `/success.html?${successParams.toString()}`;
    return;
  }
  
  // No checkout params - normal page load, do nothing
}

/**
 * Handle purchase success using a customer session token
 * This is called when Polar redirects with checkout_success=true and a token
 */
async function handlePurchaseSuccessWithToken(token) {
  console.log('✅ Processing purchase with customer session token');
  
  // Show processing state
  showPurchaseProcessing();
  
  try {
    // Use the customer session token to fetch downloads directly
    const result = await fetchDownloadsWithToken(token);
    
    if (result.success && result.downloads.length > 0) {
      // Mark products as purchased if we can identify them
      if (result.productIds) {
        result.productIds.forEach(polarId => {
          const ourProduct = Object.values(products).find(p => p.polarProductId === polarId);
          if (ourProduct) {
            purchasedProducts.add(ourProduct.id);
            console.log(`✅ Marked as owned: ${ourProduct.name}`);
          }
        });
      }
      
      // Select the first purchased product to show context
      if (result.productIds && result.productIds.length > 0) {
        const firstPolarId = result.productIds[0];
        const ourProduct = Object.values(products).find(p => p.polarProductId === firstPolarId);
        if (ourProduct && currentProduct !== ourProduct.id) {
          await selectProduct(ourProduct.id);
        }
      }
      
      showDownloadSuccess(result.downloads, result.customerEmail);
      updateButtonVisibility();
    } else {
      showDownloadFallback(result.customerEmail);
    }
  } catch (error) {
    console.error('❌ Error processing purchase with token:', error);
    showDownloadFallback(null);
  }
}

/**
 * Fetch downloads using a customer session token via our backend proxy
 * This avoids CORS issues by going through our own API
 */
async function fetchDownloadsWithToken(token) {
  try {
    console.log('🔄 Fetching downloadables via backend proxy...');
    
    // Call our own API which proxies to Polar (avoids CORS issues)
    const response = await fetch(`/api/get-downloads-by-token?token=${encodeURIComponent(token)}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Backend proxy error:', response.status, errorData);
      return { success: false, downloads: [], fallbackToEmail: errorData.fallbackToEmail };
    }
    
    const data = await response.json();
    
    console.log(`✅ Received ${data.downloads?.length || 0} downloadable items`);
    
    return {
      success: data.success && data.downloads?.length > 0,
      downloads: data.downloads || [],
      productIds: data.productIds || [],
      customerEmail: null // Token doesn't give us email directly
    };
    
  } catch (error) {
    console.error('❌ Error fetching with token:', error);
    return { success: false, downloads: [] };
  }
}

/**
 * Handle successful purchase with intelligent polling
 */
async function handlePurchaseSuccess(data) {
  const checkoutId = data.checkoutId || data.id || data.checkout_id || data.checkout_session_id;
  
  if (!checkoutId) {
    console.error('❌ No checkout ID found in event data');
    return;
  }

  console.log('✅ Processing purchase for checkout:', checkoutId);

  // Show processing state
  showPurchaseProcessing();

  // Poll for downloads with timeout
  const result = await pollForDownloads(checkoutId, {
    maxAttempts: 15, // Increase attempts for safety
    intervalMs: 2000,
    maxWaitMs: 45000 // Total 45 seconds max wait
  });

  if (result.success && result.downloads.length > 0) {
    // Mark products as purchased
    if (result.productIds) {
      result.productIds.forEach(polarId => {
        const ourProduct = Object.values(products).find(p => p.polarProductId === polarId);
        if (ourProduct) {
          purchasedProducts.add(ourProduct.id);
          console.log(`✅ Marked as owned: ${ourProduct.name}`);
        }
      });
    }
    
    // Select the first purchased product to show the context
    if (result.productIds && result.productIds.length > 0) {
      const firstPolarId = result.productIds[0];
      const ourProduct = Object.values(products).find(p => p.polarProductId === firstPolarId);
      if (ourProduct && currentProduct !== ourProduct.id) {
        await selectProduct(ourProduct.id);
      }
    }
    
    showDownloadSuccess(result.downloads, result.customerEmail);
    updateButtonVisibility();
  } else {
    // Show fallback UI
    showDownloadFallback(result.customerEmail);
  }
}

/**
 * Poll the new API endpoint with backoff
 */
async function pollForDownloads(checkoutId, options = {}) {
  const { 
    maxAttempts = 10, 
    intervalMs = 2000,
    maxWaitMs = 30000 
  } = options;
  
  const startTime = Date.now();
  let attempt = 0;

  while (attempt < maxAttempts && (Date.now() - startTime) < maxWaitMs) {
    attempt++;
    console.log(`🔄 Polling attempt ${attempt}/${maxAttempts}...`);

    try {
      const response = await fetch(`/api/get-order-downloads?checkoutId=${checkoutId}`);
      
      if (response.status === 404) {
        // Not found at all - might be too early for even the record to exist
        await sleep(intervalMs);
        continue;
      }

      const data = await response.json();

      // Success - downloads ready
      if (response.ok && data.downloads?.length > 0) {
        console.log(`✅ Downloads ready after ${attempt} attempts`);
        return { success: true, ...data };
      }

      // 202 = Still processing, should retry
      if (response.status === 202 && data.retry) {
        console.log(`⏳ Still processing (${data.status || 'pending'}), retrying...`);
        await sleep(intervalMs);
        continue;
      }

      // Other error - check if we should stop
      if (!response.ok) {
        console.warn(`⚠️ API error: ${data.error}`);
        
        // If we get fallbackToEmail, stop immediately
        if (data.fallbackToEmail) {
          return { success: false, customerEmail: data.customerEmail };
        }
      }

      // Empty downloads but success status - keep trying briefly
      if (response.ok && (!data.downloads || data.downloads.length === 0)) {
        await sleep(intervalMs);
        continue;
      }

    } catch (error) {
      console.error(`❌ Poll attempt ${attempt} failed:`, error);
    }

    await sleep(intervalMs);
  }

  console.warn('⚠️ Polling exhausted without finding downloads');
  return { success: false };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show processing state in UI
 */
function showPurchaseProcessing() {
  const existingBox = document.querySelector('.purchase-success-box, .purchase-processing, .purchase-error');
  if (existingBox) existingBox.remove();

  const html = `
    <div class="purchase-processing">
      <div class="success-header">
        <i class="fas fa-spinner fa-spin"></i>
        <h3>PURCHASE VERIFIED!</h3>
      </div>
      <p>Preparing your secure download links...</p>
      <p class="processing-subtext" style="font-size: 12px; margin-top: 10px; opacity: 0.8;">This usually takes just a few seconds while we finalize your order with Polar.</p>
    </div>
  `;

  if (productDescription) {
    productDescription.insertAdjacentHTML('afterbegin', html);
    // Transition to card view if not already there
    updateViewState(true);
  }
}

/**
 * Display download links and success message to the user
 */
function showDownloadSuccess(downloads, email) {
  if (!downloads || downloads.length === 0) {
    console.log('ℹ️ No downloads to show');
    return;
  }
  
  // Remove any existing processing box
  const existingBox = document.querySelector('.purchase-processing, .purchase-success-box, .purchase-error');
  if (existingBox) existingBox.remove();
  
  const downloadLinksHtml = downloads.map(d => 
    `<li>
      <a href="${d.url}" class="download-link-item" target="_blank">
        <i class="fas fa-download"></i> Download ${d.filename}
      </a>
    </li>`
  ).join('');
  
  const emailMsg = email 
    ? `A confirmation email has been sent to <strong>${email}</strong>.`
    : `A confirmation email should be sent to your inbox.`;

  const successHtml = `
    <div class="purchase-success-box">
      <div class="success-header">
        <i class="fas fa-check-circle"></i>
        <h3>PURCHASE SUCCESSFUL!</h3>
      </div>
      <p>Thank you for your order. Your files are ready for download:</p>
      <ul class="purchase-download-links">
        ${downloadLinksHtml}
      </ul>
      <div class="success-footer">
        <p class="email-notice">${emailMsg}</p>
        <p class="support-notice">If you don't see the email, please check your spam folder.</p>
      </div>
    </div>
  `;
  
  if (productDescription) {
    productDescription.insertAdjacentHTML('afterbegin', successHtml);
    setTimeout(() => {
      document.querySelector('.purchase-success-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

/**
 * Show fallback when downloads can't be fetched
 */
function showDownloadFallback(email) {
  const existingBox = document.querySelector('.purchase-success-box, .purchase-processing, .purchase-error');
  if (existingBox) existingBox.remove();

  const emailMsg = email 
    ? `We've sent download links to <strong>${email}</strong>.`
    : `Download links have been sent to your email.`;

  const html = `
    <div class="purchase-success-box purchase-fallback">
      <div class="success-header">
        <i class="fas fa-check-circle"></i>
        <h3>PURCHASE SUCCESSFUL!</h3>
      </div>
      <p>Thank you for your order!</p>
      <p>${emailMsg}</p>
      <div class="success-footer">
        <p class="support-notice">
          The downloads are still being processed. Please check your email in a few minutes or 
          <a href="mailto:support@no3dtools.com">contact support</a> if they don't arrive.
        </p>
      </div>
    </div>
  `;

  if (productDescription) {
    productDescription.insertAdjacentHTML('afterbegin', html);
  }
}

