// NO3D TOOLS WEBSITE INTERACTIVITY
// Following Figma Design System Rules
// Test: GitHub-Vercel integration auto-deployment verification

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

// Multi-Library Configuration - Maps sections to GitHub repositories
// Each section loads ALL products from its corresponding GitHub repo
// Loaded dynamically from config/library-config.js (generated from config/libraries.config.json)
let LIBRARY_CONFIG = null;

// Fallback configuration (used if dynamic load fails)
const FALLBACK_LIBRARY_CONFIG = {
  tools: {
    owner: 'node-dojo',
    repo: 'no3d-tools-library',
    branch: 'main',
    useLocalAssets: true // Use local assets for tools
  },
  tutorials: {
    owner: 'node-dojo',
    repo: 'no3d-tools-library',
    branch: 'main',
    useLocalAssets: true
  },
  prints: {
    owner: 'node-dojo',
    repo: 'no3d-prints-library',
    branch: 'main',
    useLocalAssets: false // Load from GitHub
  },
  apps: {
    owner: 'node-dojo',
    repo: 'no3d-tools-library',
    branch: 'main',
    useLocalAssets: true
  },
  docs: {
    owner: 'node-dojo',
    repo: 'no3d-not3s-library',
    branch: 'main',
    useLocalAssets: false // Load from GitHub
  }
};

/**
 * Load library configuration dynamically
 * Tries to load from config/library-config.js, falls back to FALLBACK_LIBRARY_CONFIG
 */
async function loadLibraryConfig() {
  // Check if already loaded via script tag
  if (typeof window !== 'undefined' && window.LIBRARY_CONFIG) {
    LIBRARY_CONFIG = window.LIBRARY_CONFIG;
    console.log('📚 Library config loaded from window.LIBRARY_CONFIG');
    return LIBRARY_CONFIG;
  }

  try {
    // Try to load as ES module
    const configModule = await import('/config/library-config.js');
    if (configModule.LIBRARY_CONFIG) {
      LIBRARY_CONFIG = configModule.LIBRARY_CONFIG;
      console.log('📚 Library config loaded from ES module');
      return LIBRARY_CONFIG;
    }
  } catch (error) {
    console.warn('⚠️ Could not load library config as ES module:', error.message);
  }

  try {
    // Try to fetch as JSON (if generated as JSON instead of JS)
    const response = await fetch('/config/library-config.json');
    if (response.ok) {
      const config = await response.json();
      LIBRARY_CONFIG = config;
      console.log('📚 Library config loaded from JSON');
      return LIBRARY_CONFIG;
    }
  } catch (error) {
    console.warn('⚠️ Could not load library config as JSON:', error.message);
  }

  // Fallback to hardcoded config
  console.warn('⚠️ Using fallback library configuration. Run: node scripts/generate-library-config.js');
  LIBRARY_CONFIG = FALLBACK_LIBRARY_CONFIG;
  return LIBRARY_CONFIG;
}

// Initialize library config (will be awaited before use)
let libraryConfigPromise = loadLibraryConfig();

// GitHub Repository Configuration (kept for reference, but using local assets now)
const REPO_CONFIG = {
  owner: 'node-dojo',
  repo: 'no3d-tools-library',
  branch: 'main'
};

// Local assets directory for product images
const ASSETS_BASE = '/assets/product-images';

// Generate local asset URL for product images
function getProductImageUrl(imageFileName) {
  return `${ASSETS_BASE}/${imageFileName}`;
}

// Generate local asset URL for product icon
function getProductIconUrl(productName) {
  return getProductImageUrl(`icon_${productName}.png`);
}

// Resolve media URL - checks hosted_media first, then falls back to provided URL
// This ensures Cloudinary URLs are used when available for fast loading
function resolveMediaUrl(jsonData, fileName, fallbackUrl) {
  // First check hosted_media mapping
  if (jsonData && jsonData.hosted_media && jsonData.hosted_media[fileName]) {
    return jsonData.hosted_media[fileName];
  }
  
  // Check metafields for hosted_url
  if (jsonData && jsonData.metafields) {
    const field = jsonData.metafields.find(f => f.value === fileName);
    if (field && field.hosted_url) {
      return field.hosted_url;
    }
  }
  
  // Fallback to provided URL (could be GitHub URL, local URL, or null)
  return fallbackUrl || null;
}

// Check if Polar products are loaded
console.log('=== Script Loading ===');
console.log('POLAR_PRODUCTS available:', typeof POLAR_PRODUCTS !== 'undefined');
if (typeof POLAR_PRODUCTS !== 'undefined') {
  console.log('Polar products loaded:', Object.keys(POLAR_PRODUCTS).length, 'products');
  console.log('Available product IDs:', Object.keys(POLAR_PRODUCTS));
}

// Product data structure - will be populated from GitHub
let products = {};

// Default product data (fallback)
const defaultProducts = {
  'dojo-slug-tool': {
    name: 'DOJO SLUG TOOL',
    price: '$5.55',
    description: `Introducing FlowBoard, the ultimate workspace companion designed to streamline your creative process and keep your ideas flowing effortlessly. Whether you're a designer, developer, or team leader, FlowBoard combines the clarity of a whiteboard with the precision of a task manager—bridging the gap between freeform creativity and structured productivity. Every interaction feels fluid and intuitive, giving you a workspace that adapts to how you think, not the other way around.

At its core, FlowBoard is built around real-time collaboration and visual modularity. Each board can host sketches, notes, images, and embedded tasks that update instantly across devices. The drag-and-drop interface feels alive, responding smoothly to every gesture, while the built-in AI assistant organizes your ideas, detects dependencies, and even suggests next steps based on your workflow patterns. It's not just another project management app—it's a dynamic extension of your creative mind.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-slug-tool-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-slug-tool-icon.png'
  },
  'dojo-squircle': {
    name: 'DOJO SQUIRCLE',
    price: '$7.99',
    description: `The Dojo Squircle tool revolutionizes 3D modeling with its unique approach to creating organic, flowing shapes. Perfect for character design, architectural elements, and artistic sculptures, this tool combines the mathematical precision of circles with the dynamic energy of squares.

Advanced algorithms ensure smooth transitions between curved and straight edges, giving you unprecedented control over form and function. Whether you're designing futuristic interfaces or organic architectural elements, Dojo Squircle adapts to your creative vision.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-squircle-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-squircle-icon.png'
  },
  'dojo-mesh-repair': {
    name: 'DOJO MESH REPAIR',
    price: '$12.50',
    description: `Professional mesh repair and optimization tool designed for 3D artists and engineers. Dojo Mesh Repair automatically detects and fixes common mesh issues including holes, non-manifold edges, overlapping faces, and inverted normals.

With its intelligent algorithms, the tool preserves the original geometry while ensuring watertight meshes suitable for 3D printing, rendering, and simulation. Save hours of manual cleanup with automated repair processes that maintain the artistic integrity of your models.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-mesh-repair-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-mesh-repair-icon.png'
  },
  'dojo-print-viz': {
    name: 'DOJO PRINT VIZ',
    price: '$9.99',
    description: `Visualize your 3D models in real-world print scenarios with Dojo Print Viz. This powerful tool simulates 3D printing processes, showing layer-by-layer construction, support material requirements, and potential printing issues before you commit to a print.

Perfect for makers, designers, and educators, Dojo Print Viz helps optimize models for successful 3D printing while providing educational insights into additive manufacturing processes.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-print-viz-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-print-viz-icon.png'
  },
  'dojo-print-bed': {
    name: 'DOJO PRINT BED',
    price: '$6.75',
    description: `Optimize your 3D printing setup with Dojo Print Bed. This tool helps you arrange multiple models on your print bed for maximum efficiency, calculates optimal print settings, and provides real-time feedback on print feasibility.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-print-bed-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-print-bed-icon.png'
  },
  'dojo-gluefinity-grid': {
    name: 'DOJO GLUEFINITY GRID',
    price: '$8.25',
    description: `Create complex grid-based structures with Dojo Gluefinity Grid. Perfect for architectural visualization, game environments, and parametric design, this tool generates infinite grid patterns with customizable parameters.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-gluefinity-grid-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-gluefinity-grid-icon.png'
  },
  'dojo-knob': {
    name: 'DOJO KNOB',
    price: '$4.50',
    description: `Precision control interface for 3D modeling operations. Dojo Knob provides intuitive parameter adjustment with haptic feedback simulation, making complex modeling tasks more accessible and enjoyable.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-knob-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-knob-icon.png'
  },
  'dojo-bolt-gen': {
    name: 'DOJO BOLT GEN',
    price: '$11.99',
    description: `Generate realistic threaded fasteners and mechanical components with Dojo Bolt Gen. From simple screws to complex threaded assemblies, this tool creates accurate 3D models ready for engineering and manufacturing.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-bolt-gen-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-bolt-gen-icon.png'
  },
  'dojo-calipers': {
    name: 'DOJO CALIPERS',
    price: '$5.25',
    description: `Precision measurement tool for 3D modeling and reverse engineering. Dojo Calipers provides accurate distance, angle, and dimension measurements with real-time feedback and export capabilities.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-calipers-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-calipers-icon.png'
  },
  'dojo-crv-wrapper': {
    name: 'DOJO CRV WRAPPER',
    price: '$7.50',
    description: `Advanced curve manipulation and wrapping tool for complex 3D modeling tasks. Perfect for creating organic shapes, architectural elements, and artistic sculptures with precise curve control.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-crv-wrapper-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-crv-wrapper-icon.png'
  },
  'dojo-bool': {
    name: 'DOJO BOOL',
    price: '$9.50',
    description: `Boolean operations made simple and powerful. Dojo Bool provides intuitive union, intersection, and difference operations for complex 3D modeling with real-time preview and error checking.`,
    changelog: [], // Changelog loaded from JSON files
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-bool-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-bool-icon.png'
  }
};

// Current selected product
// Default to null (no product selected on page load - show home grid)
let currentProduct = null;

// 3-Tier Sidebar State
let productDataByType = {};
let activeProductType = 'tools';
let expandedProductGroups = new Set();
let activeToolFilters = new Set(['all']); // Default to 'all' filter

// DOM elements
const productTitle = document.getElementById('product-title');
const productPrice = document.getElementById('product-price');
let originalDescriptionContent = ''; // Store original description to restore when switching tabs
const productDescription = document.getElementById('product-description');
// product3dImage removed - now using carousel
const downloadButton = document.getElementById('download-button');

// Initialize the application
// Price refresh interval (refresh every 5 minutes)
let priceRefreshInterval = null;

// Start periodic price refresh
function startPriceRefresh() {
  // Only refresh in production (not local development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }

  // Refresh prices every 5 minutes
  priceRefreshInterval = setInterval(async () => {
    console.log('Periodic price refresh...');
    await refreshPricesFromPolar();
  }, 5 * 60 * 1000); // 5 minutes

  console.log('Price refresh interval started (every 5 minutes)');
}

// Stop periodic price refresh
function stopPriceRefresh() {
  if (priceRefreshInterval) {
    clearInterval(priceRefreshInterval);
    priceRefreshInterval = null;
    console.log('Price refresh interval stopped');
  }
}

// Expose refresh function globally for manual refresh
window.refreshPolarPrices = refreshPricesFromPolar;

// Initialize dev customer ID on page load if needed
initializeDevCustomerId();

// Supabase Realtime subscription
let supabaseClient = null;
let supabaseRealtimeChannel = null;

/**
 * Initialize Supabase client and set up Realtime subscription
 */
async function initializeSupabaseRealtime() {
  try {
    // Wait for Supabase client to load from CDN (with timeout)
    let createClient = null;
    const maxWaitTime = 5000; // 5 seconds
    const checkInterval = 100; // Check every 100ms
    let waited = 0;
    
    while (!createClient && waited < maxWaitTime) {
      if (window.supabase && window.supabase.createClient) {
        createClient = window.supabase.createClient;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
    
    if (!createClient) {
      console.warn('⚠️ Supabase client not loaded from CDN after timeout, skipping Realtime');
      return;
    }

    // Fetch public config
    const configResponse = await fetch('/api/config');
    if (!configResponse.ok) {
      console.warn('⚠️ Could not fetch Supabase config, skipping Realtime');
      return;
    }

    const config = await configResponse.json();
    if (!config.supabase || !config.supabase.url || !config.supabase.anonKey) {
      console.warn('⚠️ Supabase not configured, skipping Realtime');
      return;
    }

    // Initialize Supabase client
    supabaseClient = createClient(config.supabase.url, config.supabase.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    // Set up Realtime subscription for products table
    supabaseRealtimeChannel = supabaseClient
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'products',
          filter: 'status=eq.active' // Only listen for active products
        },
        async (payload) => {
          console.log('🔄 Product change detected via Realtime:', payload.eventType, payload.new || payload.old);
          
          // Reload products when changes are detected
          try {
            await loadProductsFromSupabase();
            console.log('✅ Products reloaded after Realtime update');
            
            // Re-organize and re-render
            organizeProductsByType();
            renderSidebar();
            
            // Update display if a product is currently selected
            if (currentProduct && products[currentProduct]) {
              await updateProductDisplay(currentProduct);
            } else {
              // If on home grid, re-render it
              renderHomeGrid();
            }
            
            updateViewState();
          } catch (error) {
            console.error('❌ Error reloading products after Realtime update:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Supabase Realtime channel error');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Supabase Realtime subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Supabase Realtime subscription closed');
        }
      });

    console.log('✅ Supabase Realtime initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Supabase Realtime (non-critical):', error);
    // Don't throw - Realtime is optional, polling will still work
  }
}

/**
 * Clean up Realtime subscription
 */
function cleanupSupabaseRealtime() {
  if (supabaseRealtimeChannel) {
    supabaseClient?.removeChannel(supabaseRealtimeChannel);
    supabaseRealtimeChannel = null;
    console.log('🧹 Supabase Realtime subscription cleaned up');
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanupSupabaseRealtime);

document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Try to load from Supabase first, fallback to JSON
    try {
      await loadProductsFromSupabase();
      console.log('✅ Products loaded from Supabase');
      
      // Initialize Realtime subscription after successful load
      await initializeSupabaseRealtime();
    } catch (supabaseError) {
      console.warn('⚠️ Failed to load from Supabase, falling back to JSON:', supabaseError);
      await loadProductsFromJSON();
      console.log('✅ Products loaded from JSON files');
    }
    
    organizeProductsByType();
    renderSidebar();
    initializeEventListeners();
    initializeMobileMenu();
    initializeSidebarEventListeners();
    updateHeaderLogo('tools');
    // Set Tools as default expanded type
    expandProductType('tools');
    // Show home grid on initial load (no product selected)
    renderHomeGrid();
    updateViewState();

    // Start periodic price refresh
    startPriceRefresh();
  } catch (error) {
    console.warn('Failed to load products, using fallback data:', error);
    products = defaultProducts;
    // Add productType to default products
    Object.keys(products).forEach(key => {
      products[key].productType = 'tools';
    });
    organizeProductsByType();
    renderSidebar();
    initializeEventListeners();
    initializeMobileMenu();
    initializeSidebarEventListeners();
    updateHeaderLogo('tools');
    expandProductType('tools');
    // Show home grid on initial load (no product selected)
    renderHomeGrid();
    updateViewState();

    // Start periodic price refresh even with fallback data
    startPriceRefresh();
  }
});

// Sync prices from Polar API
async function syncPricesFromPolar() {
  try {
    // Skip in local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('⚠️ Skipping price sync in local development');
      return {};
    }

    console.log('🔄 Fetching prices from Polar API...');
    const response = await fetch('/api/get-polar-prices');
    
    if (!response.ok) {
      console.error('❌ Failed to fetch Polar prices:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return {};
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error in Polar prices response:', data.error);
      return {};
    }

    if (!data.prices || Object.keys(data.prices).length === 0) {
      console.warn('⚠️ No prices returned from Polar API');
      return {};
    }

    console.log('✅ Fetched prices for', Object.keys(data.prices).length, 'products from Polar');
    console.log('📊 Available product IDs:', Object.keys(data.prices));
    return data.prices;
  } catch (error) {
    console.error('❌ Error syncing prices from Polar:', error);
    console.error('Error details:', error.message, error.stack);
    return {};
  }
}

// Update product prices from Polar and refresh display
async function refreshPricesFromPolar() {
  try {
    const polarPrices = await syncPricesFromPolar();
    let updatedCount = 0;

    // Update prices for all products using stored polarProductId
    for (const productId in products) {
      const product = products[productId];
      if (product.polarProductId) {
        const polarPrice = polarPrices[product.polarProductId];
        
        if (polarPrice && polarPrice.formatted) {
          const oldPrice = product.price;
          product.price = polarPrice.formatted;
          
          if (oldPrice !== polarPrice.formatted) {
            updatedCount++;
            console.log(`Updated price for ${productId}: ${oldPrice} → ${polarPrice.formatted}`);
          }
        }
      }
    }

    // Update display if a product is currently selected
    if (currentProduct && products[currentProduct]) {
      await updateProductDisplay(currentProduct);
    }

    if (updatedCount > 0) {
      console.log(`Refreshed ${updatedCount} product prices from Polar`);
    }

    return updatedCount;
  } catch (error) {
    console.error('Error refreshing prices:', error);
    return 0;
  }
}

// Load Products from Supabase API
async function loadProductsFromSupabase() {
  try {
    console.log('🔄 Loading products from Supabase...');
    
    const response = await fetch('/api/products');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle both old array format and new paginated format
    const supabaseProducts = Array.isArray(data) ? data : (data.products || []);

    if (supabaseProducts.length === 0) {
      console.warn('⚠️ No products returned from Supabase, falling back to JSON');
      throw new Error('No products from Supabase');
    }

    if (data.total !== undefined) {
      console.log(`📊 Total products available: ${data.total}`);
    }

    products = {};
    
    // Fetch Polar prices first (for price updates)
    const polarPrices = await syncPricesFromPolar();
    
    for (const productData of supabaseProducts) {
      try {
        const productId = productData.handle ||
          productData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Define folderName early so it's available throughout the product processing
        const folderName = productData.handle || productId;

        // Get thumbnail/image
        let thumbnail = productData.image || null;
        
        // Check hosted_media for thumbnail
        if (!thumbnail && productData.hosted_media) {
          if (productData.thumbnail_image && productData.hosted_media[productData.thumbnail_image]) {
            thumbnail = productData.hosted_media[productData.thumbnail_image];
          } else {
            // Try to find any image in hosted_media
            const mediaKeys = Object.keys(productData.hosted_media);
            const imageKey = mediaKeys.find(key => 
              key.match(/\.(png|jpg|jpeg|gif|webp)$/i)
            );
            if (imageKey) {
              thumbnail = productData.hosted_media[imageKey];
            }
          }
        }
        
        // Fallback to local icon if no hosted image
        if (!thumbnail) {
          thumbnail = getProductIconUrl(folderName);
        }
        
        // Get price from Polar if available, otherwise use Supabase price
        let price = productData.price || '$0.00';
        
        // Try to get updated price from Polar
        const polarProductId = productData.polarProductId || productData.polar?.product_id || productData.polar_product_id;
        if (polarProductId && polarPrices[polarProductId]) {
          const polarPrice = polarPrices[polarProductId];
          if (polarPrice && polarPrice.formatted) {
            price = polarPrice.formatted;
            console.log(`✅ Synced price for ${productId}: ${price} from Polar`);
          }
        }
        
        // Extract product groups from tags
        const productGroups = (productData.tags || []).filter(tag => {
          return tag && (tag !== tag.toLowerCase() || tag.includes(' '));
        });
        
        // Normalize changelog format
        let changelog = [];
        if (productData.changelog && Array.isArray(productData.changelog)) {
          productData.changelog.forEach(entry => {
            if (typeof entry === 'string') {
              changelog.push({
                version: '',
                date: '',
                changes: [entry]
              });
            } else if (entry && entry.changes) {
              const normalizedEntry = {
                version: entry.version || '',
                date: entry.date || '',
                changes: []
              };
              
              if (Array.isArray(entry.changes)) {
                normalizedEntry.changes = entry.changes
                  .filter(change => change && change.trim())
                  .map(change => change.trim());
              } else if (typeof entry.changes === 'string' && entry.changes.trim()) {
                normalizedEntry.changes = [entry.changes.trim()];
              }
              
              if (normalizedEntry.changes.length > 0) {
                changelog.push(normalizedEntry);
              }
            }
          });
        }
        
        // Get description (use from Supabase or try to load from markdown)
        let description = productData.description;
        
        // If description is missing, empty, or looks like a short summary (< 200 chars), 
        // try to load the full documentation from the markdown file.
        // This ensures users see the full docs even if Supabase hasn't been updated with the full markdown yet.
        if (!description || description.length < 200) {
          // folderName is already defined at the start of the product processing loop
          try {
            const descBasePath = `/assets/product-docs/${folderName}`;
            const descPatterns = [
              `desc_${folderName}.md`,
              `desc_${folderName.toLowerCase().replace(/\s+/g, '-')}.md`,
              `${folderName}_desc.md`
            ];
            
            let descUrl = null;
            for (const pattern of descPatterns) {
              const pathParts = descBasePath.split('/').filter(part => part.length > 0);
              const encodedPathParts = pathParts.map(part => encodeURIComponent(part));
              const encodedBasePath = '/' + encodedPathParts.join('/');
              const encodedPattern = encodeURIComponent(pattern);
              const testUrl = `${encodedBasePath}/${encodedPattern}`;
              
              try {
                const testResponse = await fetch(testUrl, { method: 'HEAD' });
                if (testResponse.ok) {
                  descUrl = testUrl;
                  break;
                }
              } catch (e) {
                try {
                  const testResponse = await fetch(testUrl);
                  if (testResponse.ok) {
                    descUrl = testUrl;
                    break;
                  }
                } catch (e2) {
                  // Continue to next pattern
                }
              }
            }
            
            if (descUrl) {
              const descResponse = await fetch(descUrl);
              if (descResponse.ok) {
                const fullMarkdown = await descResponse.text();
                // Only replace if the fetched markdown is actually longer/better
                if (fullMarkdown.length > (description || '').length) {
                  description = fullMarkdown;
                  console.log(`✅ Enhanced description loaded from ${descUrl} (${description.length} chars)`);
                }
              }
            }
          } catch (error) {
            // Use Supabase description if markdown load fails
            console.debug(`Could not load desc_*.md for ${folderName}, using default description`);
          }
        }

        // Final fallback
        if (!description) {
          description = generateDescription(productData.title);
        }
        
        products[productId] = {
          name: productData.title.toUpperCase(),
          price: price,
          description: description,
          changelog: changelog,
          image3d: thumbnail,
          icon: thumbnail,
          productType: productData.type || 'tools',
          groups: productGroups,
          handle: productData.handle || productId,
          jsonData: productData, // Store full data for hosted_media access
          polarProductId: productData.polarProductId || productData.polar?.product_id || productData.polar_product_id || null,
          folderName: folderName,
          metafields: productData.metafields || [],
          folder: folderName,
          library: 'no3d-tools-library'
        };
      } catch (error) {
        console.warn(`Failed to process product ${productData.handle || productData.title}:`, error);
      }
    }
    
    if (Object.keys(products).length === 0) {
      throw new Error('No products loaded from Supabase');
    }
    
    console.log(`✅ Loaded ${Object.keys(products).length} products from Supabase`);
    
    // Log price summary
    const productsWithPrices = Object.keys(products).filter(id => 
      products[id].price && products[id].price !== '$0.00'
    );
    const productsWithoutPrices = Object.keys(products).filter(id => 
      !products[id].price || products[id].price === '$0.00'
    );
    
    console.log(`📊 Price Summary: ${productsWithPrices.length} products with prices, ${productsWithoutPrices.length} products without prices`);
    
    // Update display if a product is currently selected
    if (currentProduct && products[currentProduct]) {
      await updateProductDisplay(currentProduct);
    }
    
    return products;
  } catch (error) {
    console.error('Error loading products from Supabase:', error);
    throw error;
  }
}

// Load Products from JSON Files (from GitHub repository)
async function loadProductsFromJSON() {
  try {
    const productFiles = [
      'Dojo Bolt Gen v05.json',
      'Dojo Bolt Gen v05_Obj.json',
      'Dojo Bool v5.json',
      'Dojo Calipers.json',
      'Dojo Crv Wrapper v4.json',
      'Dojo Gluefinity Grid_obj.json',
      'Dojo Knob.json',
      'Dojo Knob_obj.json',
      'Dojo Mesh Repair.json',
      'Dojo Print Viz_V4.5.json',
      'Dojo Squircle v4.5_obj.json',
      'Dojo_Squircle v4.5.json',
      'Print Bed Preview_obj.json',
      'Chrome Crayon.json',
      'NODE CHROME.json',
      // Gift Cards
      '3 Month Membership Gift.json',
      'Dojo Christmas Gift Card $33.json',
      'Dojo Christmas Gift Card $55.json',
      'Dojo Christmas Gift Card $77.json'
    ];
    
    products = {};
    
    // Fetch Polar prices first
    const polarPrices = await syncPricesFromPolar();
    
    for (const fileName of productFiles) {
      try {
        // Load JSON from local assets directory
        const jsonUrl = `/assets/product-data/${fileName}`;

        const response = await fetch(jsonUrl);
        if (!response.ok) {
          console.warn(`Failed to load ${fileName}:`, response.status);
          continue;
        }

        const jsonData = await response.json();

        // Create product ID from handle
        const productId = jsonData.handle || jsonData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Get thumbnail from JSON thumbnail_image field, metafields, or use local icon
        // Product folder name matches the JSON filename (without .json extension)
        const productFolderName = fileName.replace('.json', '');
        let thumbnail = null;

        // Priority 1: Check for thumbnail_image field (set by co-aug dashboard)
        if (jsonData.thumbnail_image && jsonData.hosted_media && jsonData.hosted_media[jsonData.thumbnail_image]) {
          thumbnail = jsonData.hosted_media[jsonData.thumbnail_image];
          console.log(`📷 Using thumbnail_image for ${productId}: ${jsonData.thumbnail_image}`);
        }

        // Priority 2: Check metafields for thumbnail
        let thumbnailFileName = `icon_${productFolderName}.png`;
        if (!thumbnail && jsonData.metafields) {
          const thumbnailField = jsonData.metafields.find(f => f.key === 'thumbnail');
          if (thumbnailField) {
            thumbnailFileName = thumbnailField.value || thumbnailFileName;
            // Check metafield hosted_url first
            if (thumbnailField.hosted_url) {
              thumbnail = thumbnailField.hosted_url;
            }
          }
        }

        // Priority 3: Use helper function to resolve media URL (checks hosted_media, then local)
        if (!thumbnail) {
          const fallbackUrl = jsonData.metafields?.find(f => f.key === 'thumbnail')
            ? getProductImageUrl(thumbnailFileName)
            : getProductIconUrl(productFolderName);
          thumbnail = resolveMediaUrl(jsonData, thumbnailFileName, fallbackUrl);
        }
        
        // Get price from Polar if available, otherwise use JSON variant price
        let price = null;
        
        // Try to find matching Polar product using polar.product_id from JSON
        if (jsonData.polar && jsonData.polar.product_id) {
          const polarProductId = jsonData.polar.product_id;
          const polarPrice = polarPrices[polarProductId];
          
          if (polarPrice && polarPrice.formatted) {
            // Use price from Polar API
            price = polarPrice.formatted;
            console.log(`✅ Synced price for ${productId}: ${price} from Polar (productId: ${polarProductId})`);
          } else {
            console.warn(`⚠️ No Polar price found for ${productId} (polarProductId: ${polarProductId}). Available prices:`, Object.keys(polarPrices));
          }
        } else {
          console.warn(`⚠️ No polar.product_id found in JSON for product: ${productId}`);
        }
        
        // Fallback to JSON variant price if Polar price not available
        if (!price && jsonData.variants && jsonData.variants[0] && jsonData.variants[0].price) {
          price = `$${parseFloat(jsonData.variants[0].price).toFixed(2)}`;
          console.log(`📦 Using JSON variant price for ${productId}: ${price}`);
        }
        
        // Final fallback: use default price or show error
        if (!price) {
          console.error(`❌ No price found for ${productId}. Polar mapping: ${typeof POLAR_PRODUCTS !== 'undefined' && POLAR_PRODUCTS[productId] ? 'exists' : 'missing'}, JSON variants: ${jsonData.variants ? jsonData.variants.length : 'none'}`);
          price = '$0.00'; // Default fallback
        }
        
        // Extract product groups from tags (tags that are capitalized or contain spaces)
        const productGroups = (jsonData.tags || []).filter(tag => {
          // Product groups are tags that are capitalized or contain spaces
          return tag && (tag !== tag.toLowerCase() || tag.includes(' '));
        });

        // Normalize changelog format - preserve full entry structure with version and date
        let changelog = [];
        if (jsonData.changelog && Array.isArray(jsonData.changelog) && jsonData.changelog.length > 0) {
          // Process each changelog entry and preserve structure
          jsonData.changelog.forEach(entry => {
            if (typeof entry === 'string') {
              // Simple string entry - convert to object format
              changelog.push({
                version: '',
                date: '',
                changes: [entry]
              });
            } else if (entry && entry.changes) {
              // Handle object format: {version, date, changes}
              const normalizedEntry = {
                version: entry.version || '',
                date: entry.date || '',
                changes: []
              };
              
              if (Array.isArray(entry.changes)) {
                // Multiple changes in one entry
                normalizedEntry.changes = entry.changes
                  .filter(change => change && change.trim())
                  .map(change => change.trim());
              } else if (typeof entry.changes === 'string' && entry.changes.trim()) {
                // Single change as string
                normalizedEntry.changes = [entry.changes.trim()];
              }
              
              // Only add entry if it has changes
              if (normalizedEntry.changes.length > 0) {
                changelog.push(normalizedEntry);
              }
            }
          });
        }
        
        // Extract folder name from file path for docs filename
        // For local JSON files, the folder name is the filename without .json extension
        const folderName = fileName.replace('.json', '');
        
        // Try to load description from desc_*.md file
        // Supports both new format (desc_ProductName.md) and legacy format (ProductName_desc.md)
        let description = jsonData.description || generateDescription(jsonData.title);
        try {
          const descBasePath = `/assets/product-docs/${folderName}`;
          const descPatterns = [
            // New format: desc_ProductName.md
            `desc_${folderName}.md`,
            `desc_${folderName.toLowerCase().replace(/\s+/g, ' ')}.md`,
            `desc_${folderName.toLowerCase().replace(/\s+/g, '-')}.md`,
            `desc_${folderName.toLowerCase().replace(/\s+/g, '_')}.md`,
            // Legacy format: ProductName_desc.md
            `${folderName}_desc.md`,
            `${folderName.toLowerCase().replace(/\s+/g, ' ')}_desc.md`,
            `${folderName.toLowerCase().replace(/\s+/g, '-')}_desc.md`,
            `${folderName.toLowerCase().replace(/\s+/g, '_')}_desc.md`,
          ];
          
          // Try to find desc_*.md file
          let descUrl = null;
          for (const pattern of descPatterns) {
            // URL encode the path components to handle spaces and special characters
            // Split path, encode each part except empty strings (for leading/trailing slashes)
            const pathParts = descBasePath.split('/').filter(part => part.length > 0);
            const encodedPathParts = pathParts.map(part => encodeURIComponent(part));
            const encodedBasePath = '/' + encodedPathParts.join('/');
            const encodedPattern = encodeURIComponent(pattern);
            const testUrl = `${encodedBasePath}/${encodedPattern}`;
            try {
              const testResponse = await fetch(testUrl, { method: 'HEAD' });
              if (testResponse.ok) {
                descUrl = testUrl;
                console.log(`✅ Found description file: ${testUrl}`);
                break;
              }
            } catch (e) {
              // Try GET if HEAD fails
              try {
                const testResponse = await fetch(testUrl);
                if (testResponse.ok) {
                  descUrl = testUrl;
                  console.log(`✅ Found description file (GET): ${testUrl}`);
                  break;
                }
              } catch (e2) {
                // Continue to next pattern
                console.debug(`⚠️ Failed to load ${testUrl}: ${e2.message}`);
              }
            }
          }
          
          // If found, load the description
          if (descUrl) {
            const descResponse = await fetch(descUrl);
            if (descResponse.ok) {
              description = await descResponse.text();
              console.log(`✅ Loaded description from ${descUrl} (${description.length} chars)`);
            } else {
              console.warn(`⚠️ Failed to load description content from ${descUrl}: ${descResponse.status}`);
            }
          } else {
            console.debug(`⚠️ No description file found for ${folderName}, using JSON description`);
          }
        } catch (error) {
          // If loading desc_*.md fails, fall back to JSON description
          console.debug(`Could not load desc_*.md for ${folderName}, using JSON description:`, error);
        }
        
        products[productId] = {
          name: jsonData.title.toUpperCase(),
          price: price,
          description: description,
          changelog: changelog, // Array of {version, date, changes[]} objects
          image3d: thumbnail, // Use hosted or local assets
          icon: thumbnail, // Use hosted or local assets
          productType: jsonData.productType || 'tools',
          groups: productGroups,
          handle: jsonData.handle || productId,
          jsonData: jsonData, // Store JSON data for hosted_media access
          polarProductId: jsonData.polar?.product_id || null, // Store Polar product ID for price updates
          folderName: folderName, // Store folder name for docs filename construction
          metafields: jsonData.metafields || [], // Include metafields for thumbnail access
          folder: folderName, // Store folder for icon path construction
          library: 'no3d-tools-library' // Default library name
        };
      } catch (error) {
        console.warn(`Failed to load ${fileName}:`, error);
      }
    }
    
    if (Object.keys(products).length === 0) {
      throw new Error('No products loaded from JSON files');
    }
    
    console.log('Loaded products from JSON:', Object.keys(products).length, 'products');
    
    // Log price summary
    const productsWithPrices = Object.keys(products).filter(id => products[id].price && products[id].price !== '$0.00');
    const productsWithoutPrices = Object.keys(products).filter(id => !products[id].price || products[id].price === '$0.00');
    
    console.log(`📊 Price Summary: ${productsWithPrices.length} products with prices, ${productsWithoutPrices.length} products without prices`);
    if (productsWithoutPrices.length > 0) {
      console.warn('⚠️ Products missing prices:', productsWithoutPrices);
      console.warn('Polar prices available:', Object.keys(polarPrices).length, 'products');
    }
    
    // Update display if a product is currently selected
    if (currentProduct && products[currentProduct]) {
      await updateProductDisplay(currentProduct);
    }
    
    // If we're missing prices, try to refresh them once more after a short delay
    if (productsWithoutPrices.length > 0 && Object.keys(polarPrices).length > 0) {
      console.log('🔄 Attempting to refresh missing prices...');
      setTimeout(async () => {
        await refreshPricesFromPolar();
      }, 1000);
    }
  } catch (error) {
    console.error('Error loading products from JSON:', error);
    throw error;
  }
}

// Product Type Definitions with Descriptions
const productTypeDefinitions = {
  tools: {
    label: 'TOOLS',
    logo: 'no3d-tools',
    description: 'Advanced 3D modeling enhancements for Blender users designing real world products, built with 3D printing and laser cutting in mind!'
  },
  tutorials: {
    label: 'TUTORIALS',
    logo: 'no3d-dojo',
    description: 'Welcome to Node Dojo! Here you\'ll find tutorials on Blender and Geometry nodes. The Node Dojo Modules are famous for being interactive video game style tutorials built right into Blender.'
  },
  prints: {
    label: 'PRINTS',
    logo: 'no3d-prints',
    description: 'Here are downloadable 3D print, CNC and laser cut files that you can use to build your own projects.'
  },
  apps: {
    label: 'APPS',
    logo: 'no3d-code',
    description: 'Here are some vibe coded apps and Blender Add-ons to enhance your design workflows and make NO3D Tools even more usable.'
  },
  docs: {
    label: 'DOCS/BLOG',
    logo: 'no3d-not3s',
    description: 'Some documentation, some musings.'
  }
};

// Organize Products by Product Type
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
  
  console.log('Organized products by type:', productDataByType);
}

// Render 3-Tier Sidebar
function renderSidebar() {
  const sidebarContent = document.getElementById('sidebar-content');
  if (!sidebarContent) return;
  
  sidebarContent.innerHTML = '';
  
  // Product Type mapping
  const productTypes = [
    { key: 'tools', label: productTypeDefinitions.tools.label },
    { key: 'tutorials', label: productTypeDefinitions.tutorials.label },
    { key: 'prints', label: productTypeDefinitions.prints.label },
    { key: 'apps', label: productTypeDefinitions.apps.label },
    { key: 'docs', label: productTypeDefinitions.docs.label }
  ];
  
  productTypes.forEach(type => {
    const typeProducts = productDataByType[type.key] || {};
    const hasProducts = Object.keys(typeProducts).length > 0;
    
    // Create Product Type container
    const productTypeDiv = document.createElement('div');
    productTypeDiv.className = 'product-type';
    productTypeDiv.dataset.type = type.key;
    if (type.key === activeProductType) {
      productTypeDiv.classList.add('expanded');
    }
    
    // Type header
    const typeHeader = document.createElement('div');
    typeHeader.className = 'type-header';
    typeHeader.innerHTML = `
      <span class="carrot ${type.key === activeProductType ? 'expanded' : 'collapsed'}">${type.key === activeProductType ? '▼' : '▶'}</span>
      <span class="category-name">${type.label}</span>
    `;
    
    // Product groups container
    const groupsContainer = document.createElement('div');
    groupsContainer.className = 'product-groups-container';
    
    // Show "coming soon!" if no products
    if (!hasProducts) {
      const comingSoonDiv = document.createElement('div');
      comingSoonDiv.className = 'coming-soon-message';
      comingSoonDiv.textContent = 'coming soon!';
      groupsContainer.appendChild(comingSoonDiv);
    } else {
      // Special handling for tools: flat list, no groups
      if (type.key === 'tools') {
        // Collect all unique groups from tools products
        const allGroups = new Set();
        Object.keys(typeProducts).forEach(productId => {
          const product = typeProducts[productId];
          if (product.groups && product.groups.length > 0) {
            product.groups.forEach(group => allGroups.add(group));
          }
        });
        const sortedGroups = Array.from(allGroups).sort();
        
        // Add filter toggles (desktop only) - insert after type header
        if (sortedGroups.length > 0) {
          const filterContainer = document.createElement('div');
          filterContainer.className = 'tools-filter-container';
          
          // "All" filter toggle
          const allFilter = document.createElement('button');
          allFilter.className = `tools-filter-toggle ${activeToolFilters.has('all') ? 'active' : ''}`;
          allFilter.dataset.filter = 'all';
          allFilter.textContent = 'ALL';
          filterContainer.appendChild(allFilter);
          
          // Category filter toggles
          sortedGroups.forEach(group => {
            const filterToggle = document.createElement('button');
            filterToggle.className = `tools-filter-toggle ${activeToolFilters.has(group) ? 'active' : ''}`;
            filterToggle.dataset.filter = group;
            filterToggle.textContent = group.toUpperCase();
            filterContainer.appendChild(filterToggle);
          });
          
          groupsContainer.appendChild(filterContainer);
        }
        
        // Collect all products into a single flat list
        const allProducts = [];
        Object.keys(typeProducts).forEach(productId => {
          allProducts.push({ id: productId, ...typeProducts[productId] });
        });
        
        // Filter products based on active filters
        const filteredProducts = allProducts.filter(product => {
          // If "all" is active, show all products
          if (activeToolFilters.has('all')) {
            return true;
          }
          // Otherwise, show products that match at least one active filter
          if (product.groups && product.groups.length > 0) {
            return product.groups.some(group => activeToolFilters.has(group));
          }
          // Products without groups are hidden when specific filters are active
          return false;
        });
        
        // Sort products by name
        filteredProducts.sort((a, b) => {
          const nameA = (a.name || '').toUpperCase();
          const nameB = (b.name || '').toUpperCase();
          return nameA.localeCompare(nameB);
        });
        
        // Create a single product list container
        const productList = document.createElement('div');
        productList.className = 'group-product-list';
        
        filteredProducts.forEach(product => {
          const productItem = document.createElement('div');
          productItem.className = `product-item ${product.id === currentProduct ? 'active' : ''}`;
          productItem.dataset.product = product.id;
          productItem.innerHTML = `<span class="product-name">${product.name}</span>`;
          productList.appendChild(productItem);
        });
        
        groupsContainer.appendChild(productList);
      } else {
        // For other product types, use the original grouped structure
        // Organize products by groups
        const productsByGroup = {};
        const ungroupedProducts = [];
        
        // Track which products have been assigned to groups
        const productsInGroups = new Set();
        
        Object.keys(typeProducts).forEach(productId => {
          const product = typeProducts[productId];
          if (product.groups && product.groups.length > 0) {
            product.groups.forEach(group => {
              if (!productsByGroup[group]) {
                productsByGroup[group] = [];
              }
              productsByGroup[group].push({ id: productId, ...product });
              productsInGroups.add(productId);
            });
          }
        });
        
        // Add ungrouped products (those not in any group)
        Object.keys(typeProducts).forEach(productId => {
          if (!productsInGroups.has(productId)) {
            ungroupedProducts.push({ id: productId, ...typeProducts[productId] });
          }
        });
        
        // Render product groups
        Object.keys(productsByGroup).sort().forEach(groupName => {
          const groupDiv = document.createElement('div');
          groupDiv.className = 'product-group';
          groupDiv.dataset.group = groupName.toLowerCase().replace(/\s+/g, '-');
          if (expandedProductGroups.has(groupName)) {
            groupDiv.classList.add('expanded');
          }
          
          // Group header
          const groupHeader = document.createElement('div');
          groupHeader.className = 'group-header';
          groupDiv.dataset.groupName = groupName; // Store original group name
          groupHeader.innerHTML = `
            <span class="carrot ${expandedProductGroups.has(groupName) ? 'expanded' : 'collapsed'}">${expandedProductGroups.has(groupName) ? '▼' : '▶'}</span>
            <span class="category-name">${groupName.toUpperCase()}</span>
          `;
          
          // Product list
          const productList = document.createElement('div');
          productList.className = 'group-product-list';
          
          productsByGroup[groupName].forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = `product-item ${product.id === currentProduct ? 'active' : ''}`;
            productItem.dataset.product = product.id;
            productItem.innerHTML = `<span class="product-name">${product.name}</span>`;
            productList.appendChild(productItem);
          });
          
          groupDiv.appendChild(groupHeader);
          groupDiv.appendChild(productList);
          groupsContainer.appendChild(groupDiv);
        });
        
        // Render ungrouped products (if any)
        if (ungroupedProducts.length > 0) {
          const ungroupedDiv = document.createElement('div');
          ungroupedDiv.className = 'product-group';
          ungroupedDiv.dataset.group = 'ungrouped';
          ungroupedDiv.dataset.groupName = 'OTHER'; // Store group name for toggle functionality
          
          const groupHeader = document.createElement('div');
          groupHeader.className = 'group-header';
          groupHeader.innerHTML = `
            <span class="carrot collapsed">▶</span>
            <span class="category-name">OTHER</span>
          `;
          
          const productList = document.createElement('div');
          productList.className = 'group-product-list';
          
          ungroupedProducts.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = `product-item ${product.id === currentProduct ? 'active' : ''}`;
            productItem.dataset.product = product.id;
            productItem.innerHTML = `<span class="product-name">${product.name}</span>`;
            productList.appendChild(productItem);
          });
          
          ungroupedDiv.appendChild(groupHeader);
          ungroupedDiv.appendChild(productList);
          groupsContainer.appendChild(ungroupedDiv);
        }
      }
    }
    
    productTypeDiv.appendChild(typeHeader);
    productTypeDiv.appendChild(groupsContainer);
    sidebarContent.appendChild(productTypeDiv);
  });
}

// Load products from GitHub API for a specific library
// Loads ALL directories from the repo (no prefix filtering)
async function loadProductsFromGitHubLibrary(libraryKey) {
  // Ensure library config is loaded
  const libraryConfig = await libraryConfigPromise;
  const config = libraryConfig[libraryKey];
  if (!config) {
    console.error(`No library config found for: ${libraryKey}`);
    return {};
  }

  // If using local assets, skip GitHub loading
  if (config.useLocalAssets) {
    console.log(`Using local assets for ${libraryKey}, skipping GitHub load`);
    return {};
  }

  try {
    console.log(`🔄 Loading products from GitHub for ${libraryKey}:`, config);
    
    // Use authenticated API endpoint to list repository contents
    const apiUrl = `/api/get-github-contents?owner=${encodeURIComponent(config.owner)}&repo=${encodeURIComponent(config.repo)}&branch=${encodeURIComponent(config.branch)}`;
    console.log(`📡 Fetching from API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ API request failed:`, response.status, response.statusText, errorData);
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error || errorData.message || ''}`);
    }

    const data = await response.json();
    console.log(`📥 API response received:`, data);
    
    // Handle API errors
    if (data.error) {
      console.error(`❌ GitHub API error: ${data.error}`);
      throw new Error(`GitHub API error: ${data.error}`);
    }

    const contents = data.contents || [];
    console.log(`📁 Repository contents:`, contents.length, 'items');
    
    // Get ALL directories (no prefix filtering)
    const productDirs = contents.filter(item => item.type === 'dir');
    console.log(`📂 Found ${productDirs.length} directories in ${config.repo}`);
    
    if (productDirs.length === 0) {
      console.warn(`⚠️ No directories found. All items:`, contents.map(item => ({ name: item.name, type: item.type })));
    }
    
    if (productDirs.length === 0) {
      console.warn(`No directories found in ${config.repo}. Repository might be empty or private.`);
    }

    const loadedProducts = {};

    // Load each product's metadata.json file
    for (const dir of productDirs) {
      try {
        // Skip common non-product directories
        if (['.git', 'node_modules', 'scripts', 'archive'].includes(dir.name)) {
          continue;
        }

        // Try to find metadata.json in the directory using authenticated API
        const dirContentsUrl = `/api/get-github-contents?owner=${encodeURIComponent(config.owner)}&repo=${encodeURIComponent(config.repo)}&branch=${encodeURIComponent(config.branch)}&path=${encodeURIComponent(dir.name)}`;
        const dirResponse = await fetch(dirContentsUrl);
        
        if (!dirResponse.ok) continue;

        const dirData = await dirResponse.json();
        if (dirData.error) continue;

        const dirContents = dirData.contents || [];
        const jsonFile = dirContents.find(item => 
          item.type === 'file' && (item.name === 'metadata.json' || item.name.endsWith('.json'))
        );

        if (!jsonFile) continue;

        // Fetch the JSON file content
        // Use download_url if available, otherwise construct raw URL
        let jsonUrl = jsonFile.download_url;
        if (!jsonUrl && jsonFile.path) {
          jsonUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${jsonFile.path}`;
        }
        
        const jsonResponse = await fetch(jsonUrl);
        if (!jsonResponse.ok) continue;

        const jsonData = await jsonResponse.json();

        // Create product ID from handle or title
        const productId = jsonData.handle || jsonData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Find thumbnail/icon image - prioritize thumbnail_image from dashboard, then hosted URLs
        let thumbnail = null;

        // Priority 1: Check for thumbnail_image field (set by co-aug dashboard)
        if (jsonData.thumbnail_image && jsonData.hosted_media && jsonData.hosted_media[jsonData.thumbnail_image]) {
          thumbnail = jsonData.hosted_media[jsonData.thumbnail_image];
          console.log(`📷 Using thumbnail_image for ${productId}: ${jsonData.thumbnail_image}`);
        }

        // Priority 2: Determine thumbnail filename from metafields
        let thumbnailFileName = `icon_${dir.name}.png`;
        if (!thumbnail && jsonData.metafields) {
          const thumbnailField = jsonData.metafields.find(f => f.key === 'thumbnail');
          if (thumbnailField) {
            thumbnailFileName = thumbnailField.value || thumbnailFileName;
            // Check metafield hosted_url first
            if (thumbnailField.hosted_url) {
              thumbnail = thumbnailField.hosted_url;
            }
          }
        }

        // Priority 3: Use helper function to resolve media URL (checks hosted_media, then local)
        if (!thumbnail) {
          // Build fallback URL - try GitHub files first, then local
          let fallbackUrl = null;

          // Try common icon/thumbnail filename patterns from GitHub
          const possibleIconNames = [
            `icon_${dir.name}.png`,
            `thumbnail_${dir.name}.png`,
            `preview_${dir.name}.png`,
            `${dir.name}.png`,
            'icon.png',
            'thumbnail.png',
            'preview.png'
          ];

          const iconFile = dirContents.find(item =>
            item.type === 'file' && possibleIconNames.includes(item.name)
          );

          if (iconFile) {
            fallbackUrl = iconFile.download_url;
          } else if (jsonData.metafields) {
            const thumbnailField = jsonData.metafields.find(f => f.key === 'thumbnail');
            if (thumbnailField) {
              fallbackUrl = getProductImageUrl(thumbnailField.value);
            }
          }

          if (!fallbackUrl) {
            fallbackUrl = getProductIconUrl(dir.name);
          }

          thumbnail = resolveMediaUrl(jsonData, thumbnailFileName, fallbackUrl);
        }
        
        // If still no thumbnail, try GitHub files as final fallback
        if (!thumbnail) {
          // Try common icon/thumbnail filename patterns
          const possibleIconNames = [
            `icon_${dir.name}.png`,
            `thumbnail_${dir.name}.png`,
            `preview_${dir.name}.png`,
            `${dir.name}.png`,
            'icon.png',
            'thumbnail.png',
            'preview.png'
          ];

          const iconFile = dirContents.find(item => 
            item.type === 'file' && possibleIconNames.includes(item.name)
          );

          if (iconFile) {
            thumbnail = iconFile.download_url;
          } else if (jsonData.metafields) {
            const thumbnailField = jsonData.metafields.find(f => f.key === 'thumbnail');
            if (thumbnailField) {
              // Construct GitHub raw URL for thumbnail
              thumbnail = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${dir.name}/${thumbnailField.value}`;
            }
          }
        }

        // Get price from variants or metafields or direct price field
        let price = null;
        if (jsonData.variants && jsonData.variants[0] && jsonData.variants[0].price) {
          price = `$${parseFloat(jsonData.variants[0].price).toFixed(2)}`;
        } else if (jsonData.price) {
          price = `$${parseFloat(jsonData.price).toFixed(2)}`;
        }

        // Extract product groups from tags
        const productGroups = (jsonData.tags || []).filter(tag => {
          return tag && (tag !== tag.toLowerCase() || tag.includes(' '));
        });

        // Normalize changelog format - preserve full entry structure with version and date
        let changelog = [];
        if (jsonData.changelog && Array.isArray(jsonData.changelog) && jsonData.changelog.length > 0) {
          // Process each changelog entry and preserve structure
          jsonData.changelog.forEach(entry => {
            if (typeof entry === 'string') {
              // Simple string entry - convert to object format
              changelog.push({
                version: '',
                date: '',
                changes: [entry]
              });
            } else if (entry && entry.changes) {
              // Handle object format: {version, date, changes}
              const normalizedEntry = {
                version: entry.version || '',
                date: entry.date || '',
                changes: []
              };
              
              if (Array.isArray(entry.changes)) {
                // Multiple changes in one entry
                normalizedEntry.changes = entry.changes
                  .filter(change => change && change.trim())
                  .map(change => change.trim());
              } else if (typeof entry.changes === 'string' && entry.changes.trim()) {
                // Single change as string
                normalizedEntry.changes = [entry.changes.trim()];
              }
              
              // Only add entry if it has changes
              if (normalizedEntry.changes.length > 0) {
                changelog.push(normalizedEntry);
              }
            }
          });
        }

        loadedProducts[productId] = {
          name: jsonData.title || dir.name,
          price: price || 'Free',
          description: jsonData.description || '',
          changelog: changelog, // Array of {version, date, changes[]} objects
          image3d: thumbnail || '',
          icon: thumbnail || '',
          productType: libraryKey,
          groups: productGroups,
          handle: jsonData.handle,
          metafields: jsonData.metafields || [],
          folderName: dir.name // Store folder name for docs filename construction
        };

        console.log(`✅ Loaded product: ${productId} from ${dir.name}`);

      } catch (error) {
        console.warn(`Failed to load product from ${dir.name}:`, error);
        continue;
      }
    }

    console.log(`Loaded ${Object.keys(loadedProducts).length} products from ${config.repo}`);
    return loadedProducts;

  } catch (error) {
    console.error(`Error loading products from GitHub for ${libraryKey}:`, error);
    return {};
  }
}

// Handle Product Type Toggle (Accordion - only one expanded)
async function handleProductTypeToggle(typeKey) {
  // Close all product types
  document.querySelectorAll('.product-type').forEach(typeDiv => {
    typeDiv.classList.remove('expanded');
    const carrot = typeDiv.querySelector('.type-header .carrot');
    if (carrot) {
      carrot.classList.remove('expanded');
      carrot.classList.add('collapsed');
      carrot.textContent = '▶';
    }
  });
  
  // Expand clicked type
  const clickedType = document.querySelector(`.product-type[data-type="${typeKey}"]`);
  if (clickedType) {
    if (clickedType.classList.contains('expanded')) {
      clickedType.classList.remove('expanded');
      const carrot = clickedType.querySelector('.type-header .carrot');
      if (carrot) {
        carrot.classList.remove('expanded');
        carrot.classList.add('collapsed');
        carrot.textContent = '▶';
      }
      activeProductType = null;
      updateProductCardForType(null);
    } else {
      clickedType.classList.add('expanded');
      const carrot = clickedType.querySelector('.type-header .carrot');
      if (carrot) {
        carrot.classList.remove('collapsed');
        carrot.classList.add('expanded');
        carrot.textContent = '▼';
      }
      activeProductType = typeKey;
      updateHeaderLogo(activeProductType);
      
      // Load products from GitHub if needed for this library
      const libraryConfig = await libraryConfigPromise;
      const config = libraryConfig[typeKey];
      if (config && !config.useLocalAssets) {
        console.log(`🔄 Loading products from GitHub for ${typeKey} section...`);
        console.log(`   Repo: ${config.owner}/${config.repo}`);
        try {
          const githubProducts = await loadProductsFromGitHubLibrary(typeKey);
          
          console.log(`📦 Received ${Object.keys(githubProducts).length} products from GitHub`);
          
          if (Object.keys(githubProducts).length === 0) {
            console.warn(`⚠️ No products loaded for ${typeKey}. Check console for errors.`);
            // Show a message in the sidebar
            const typeDiv = document.querySelector(`.product-type[data-type="${typeKey}"]`);
            if (typeDiv) {
              const groupsContainer = typeDiv.querySelector('.product-groups-container');
              if (groupsContainer) {
                groupsContainer.innerHTML = '<div class="coming-soon-message">No products found. Check console for errors.</div>';
              }
            }
          } else {
            // Merge GitHub products into main products object
            Object.keys(githubProducts).forEach(productId => {
              products[productId] = githubProducts[productId];
            });
            
            // Reorganize products by type
            organizeProductsByType();
            
            // Re-render sidebar with new products
            renderSidebar();
            
            // Expand the type again after re-render
            const updatedType = document.querySelector(`.product-type[data-type="${typeKey}"]`);
            if (updatedType) {
              updatedType.classList.add('expanded');
              const updatedCarrot = updatedType.querySelector('.type-header .carrot');
              if (updatedCarrot) {
                updatedCarrot.classList.remove('collapsed');
                updatedCarrot.classList.add('expanded');
                updatedCarrot.textContent = '▼';
              }
            }
            
            console.log(`✅ Successfully loaded ${Object.keys(githubProducts).length} products for ${typeKey} section`);
            console.log(`   Product IDs:`, Object.keys(githubProducts));
          }
        } catch (error) {
          console.error(`❌ Failed to load products for ${typeKey}:`, error);
          console.error(`   Error details:`, error.message, error.stack);
          
          // Show error message in sidebar
          const typeDiv = document.querySelector(`.product-type[data-type="${typeKey}"]`);
          if (typeDiv) {
            const groupsContainer = typeDiv.querySelector('.product-groups-container');
            if (groupsContainer) {
              groupsContainer.innerHTML = `<div class="coming-soon-message">Error loading products: ${error.message}</div>`;
            }
          }
        }
      }
      
      updateProductCardForType(activeProductType);
    }

    updateIconGrid();
    updateHorizontalIconGrid();

    // Refresh home grid if no product is selected
    if (!currentProduct) {
      renderHomeGrid();
    }
  }
}

// Expand Product Type (for initial load)
function expandProductType(typeKey) {
  activeProductType = typeKey;
  const typeDiv = document.querySelector(`.product-type[data-type="${typeKey}"]`);
  if (typeDiv) {
    typeDiv.classList.add('expanded');
    const carrot = typeDiv.querySelector('.type-header .carrot');
    if (carrot) {
      carrot.classList.remove('collapsed');
      carrot.classList.add('expanded');
      carrot.textContent = '▼';
    }
    updateHeaderLogo(typeKey);
    // Only show type description if no product is selected yet
    if (!currentProduct || !products[currentProduct]) {
      updateProductCardForType(typeKey);
    }
    // Update horizontal grid visibility based on product type
    updateHorizontalIconGrid();
  }
}

// Handle Product Group Toggle (Multiple can expand)
function handleProductGroupToggle(groupDiv) {
  if (!groupDiv) return;
  
  const groupName = groupDiv.dataset.groupName; // Get original group name
  if (!groupName) return;
  
  if (groupDiv.classList.contains('expanded')) {
    groupDiv.classList.remove('expanded');
    expandedProductGroups.delete(groupName);
    const carrot = groupDiv.querySelector('.group-header .carrot');
    if (carrot) {
      carrot.classList.remove('expanded');
      carrot.classList.add('collapsed');
      carrot.textContent = '▶';
    }
  } else {
    groupDiv.classList.add('expanded');
    expandedProductGroups.add(groupName);
    const carrot = groupDiv.querySelector('.group-header .carrot');
    if (carrot) {
      carrot.classList.remove('collapsed');
      carrot.classList.add('expanded');
      carrot.textContent = '▼';
    }
  }
  
  updateIconGrid();
}

// Update Header Logo based on Product Type
function updateHeaderLogo(typeKey) {
  const headerLogo = document.getElementById('header-logo');
  if (!headerLogo) return;
  
  const typeDef = productTypeDefinitions[typeKey];
  let logoPath;
  let logoAlt;
  
  if (typeDef && typeDef.logo) {
    logoPath = typeDef.logo;
    logoAlt = typeDef.label;
  } else {
    // Fallback to tools logo if type not found
    logoPath = productTypeDefinitions.tools.logo;
    logoAlt = productTypeDefinitions.tools.label;
  }
  
  // Apply theme-appropriate version of the logo
  const currentTheme = getTheme();
  const themedLogoPath = getThemedLogoPath(logoPath, currentTheme);
  
  // Ensure path starts with / for absolute path from root
  const finalLogoPath = themedLogoPath.startsWith('/') ? themedLogoPath : '/' + themedLogoPath;
  
  headerLogo.src = finalLogoPath;
  headerLogo.setAttribute('src', finalLogoPath);
  headerLogo.alt = logoAlt;
  
  // Add error handler to debug loading issues
  headerLogo.onerror = function() {
    console.error(`Failed to load header logo: ${finalLogoPath}`);
    // Try fallback to default tools logo
    const fallbackPath = currentTheme === 'dark'
      ? '/assets/dark/no3d-tools-dark.png'
      : '/assets/light/no3d-tools.png';
    this.src = fallbackPath;
    this.setAttribute('src', fallbackPath);
  };
}

// Handle Tools Filter Toggle
function handleToolsFilterToggle(filterValue) {
  if (filterValue === 'all') {
    // Toggle "all" - if activating, clear other filters; if deactivating, activate it
    if (activeToolFilters.has('all')) {
      // If "all" is active and clicked, do nothing (can't deactivate "all" if it's the only one)
      if (activeToolFilters.size === 1) {
        return; // Keep "all" active if it's the only filter
      }
      activeToolFilters.delete('all');
    } else {
      // Activate "all" and clear other filters
      activeToolFilters.clear();
      activeToolFilters.add('all');
    }
  } else {
    // Toggle category filter
    if (activeToolFilters.has(filterValue)) {
      // Deactivate this filter
      activeToolFilters.delete(filterValue);
      // If no category filters left, activate "all"
      const hasCategoryFilters = Array.from(activeToolFilters).some(f => f !== 'all');
      if (!hasCategoryFilters) {
        activeToolFilters.clear();
        activeToolFilters.add('all');
      }
    } else {
      // Activate this filter and deactivate "all" (can't have both)
      activeToolFilters.delete('all');
      activeToolFilters.add(filterValue);
      // Multiple category filters can be active simultaneously (OR logic)
    }
  }
  
  // Re-render sidebar to update filters and product list
  renderSidebar();
  updateIconGrid();
}

// Initialize Sidebar Event Listeners
function initializeSidebarEventListeners() {
  // Product Type toggle (accordion - only one expanded)
  document.addEventListener('click', function(e) {
    if (e.target.closest('.type-header')) {
      const typeHeader = e.target.closest('.type-header');
      const productType = typeHeader.closest('.product-type');
      if (productType) {
        const typeKey = productType.dataset.type;
        handleProductTypeToggle(typeKey);
      }
    }
    
    // Tools filter toggle
    if (e.target.closest('.tools-filter-toggle')) {
      const filterToggle = e.target.closest('.tools-filter-toggle');
      const filterValue = filterToggle.dataset.filter;
      if (filterValue) {
        handleToolsFilterToggle(filterValue);
      }
    }
    
    // Product Group toggle (multiple can expand)
    if (e.target.closest('.group-header')) {
      const groupHeader = e.target.closest('.group-header');
      const productGroup = groupHeader.closest('.product-group');
      if (productGroup) {
        handleProductGroupToggle(productGroup);
      }
    }
    
    // Product item selection
    if (e.target.closest('.product-item')) {
      const productItem = e.target.closest('.product-item');
      const productId = productItem.dataset.product;
      (async () => { await selectProduct(productId); })();
    }
  });
}

// GitHub Integration Functions
async function loadProductsFromGitHub() {
  try {
    // Since direct GitHub API calls might have CORS issues, we'll use a predefined list
    // based on the repository structure we discovered earlier
    const knownProducts = [
      'Dojo Bolt Gen v05',
      'Dojo Bool v5', 
      'Dojo Calipers',
      'Dojo Crv Wrapper v4',
      'Dojo Gluefinity Grid_obj',
      'Dojo Knob',
      'Dojo Knob_obj',
      'Dojo Mesh Repair',
      'Dojo Print Viz_V4.5',
      'Dojo Squircle v4.5_obj',
      'Dojo_Squircle v4.5',
      'Gluefinity Grid_obj',
      'Print Bed Preview_obj'
    ];
    
    console.log('Using known products from repository structure:', knownProducts);
    
    // Build products object from known structure
    products = {};
    
    for (const productName of knownProducts) {
      const productId = productName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Create product data with GitHub image URLs
      const iconUrl = getProductIconUrl(productName);
      const image3dUrl = iconUrl; // Use icon as 3D image for now

      console.log(`Using GitHub images for ${productName}:`, iconUrl);
      
      products[productId] = {
        name: productName.toUpperCase(),
        price: generatePrice(),
        description: generateDescription(productName),
        changelog: [], // Changelog will be loaded from JSON files
        image3d: image3dUrl,
        icon: iconUrl
      };
    }
    
    // If no products found, use fallback
    if (Object.keys(products).length === 0) {
      throw new Error('No products found in repository');
    }
    
    console.log('Loaded products from GitHub structure:', Object.keys(products));
    
  } catch (error) {
    console.error('Error loading products from GitHub:', error);
    throw error;
  }
}

function generatePrice() {
  return '$4.44'; // Fixed price for all products
}

function generateDescription(productName) {
  const descriptions = {
    'Dojo Slug Tool': `Introducing FlowBoard, the ultimate workspace companion designed to streamline your creative process and keep your ideas flowing effortlessly. Whether you're a designer, developer, or team leader, FlowBoard combines the clarity of a whiteboard with the precision of a task manager—bridging the gap between freeform creativity and structured productivity.`,
    'Dojo Squircle': `The Dojo Squircle tool revolutionizes 3D modeling with its unique approach to creating organic, flowing shapes. Perfect for character design, architectural elements, and artistic sculptures, this tool combines the mathematical precision of circles with the dynamic energy of squares.`,
    'Dojo Mesh Repair': `Professional mesh repair and optimization tool designed for 3D artists and engineers. Dojo Mesh Repair automatically detects and fixes common mesh issues including holes, non-manifold edges, overlapping faces, and inverted normals.`,
    'Dojo Print Viz': `Visualize your 3D models in real-world print scenarios with Dojo Print Viz. This powerful tool simulates 3D printing processes, showing layer-by-layer construction, support material requirements, and potential printing issues before you commit to a print.`,
    'Dojo Bolt Gen': `Generate realistic threaded fasteners and mechanical components with Dojo Bolt Gen. From simple screws to complex threaded assemblies, this tool creates accurate 3D models ready for engineering and manufacturing.`,
    'Dojo Calipers': `Precision measurement tool for 3D modeling and reverse engineering. Dojo Calipers provides accurate distance, angle, and dimension measurements with real-time feedback and export capabilities.`,
    'Dojo Knob': `Precision control interface for 3D modeling operations. Dojo Knob provides intuitive parameter adjustment with haptic feedback simulation, making complex modeling tasks more accessible and enjoyable.`,
    'Dojo Bool': `Boolean operations made simple and powerful. Dojo Bool provides intuitive union, intersection, and difference operations for complex 3D modeling with real-time preview and error checking.`,
    'Dojo Gluefinity Grid': `Create complex grid-based structures with Dojo Gluefinity Grid. Perfect for architectural visualization, game environments, and parametric design, this tool generates infinite grid patterns with customizable parameters.`,
    'Dojo Crv Wrapper': `Advanced curve manipulation and wrapping tool for complex 3D modeling tasks. Perfect for creating organic shapes, architectural elements, and artistic sculptures with precise curve control.`
  };
  
  return descriptions[productName] || `Professional 3D modeling tool designed for creative professionals. ${productName} combines powerful functionality with intuitive design, making complex 3D modeling tasks accessible and enjoyable. Perfect for artists, designers, and engineers who demand precision and creativity in their workflow.`;
}

function generateChangelog(productName) {
  const changelogTemplates = [
    ['Added dark mode toggle for better nighttime readability.', 'Improved sync speed for cloud backups by 40%.', 'Fixed a bug causing notifications to repeat after device restart.'],
    ['Enhanced curve smoothing algorithms for better edge transitions.', 'Added new preset shape libraries for common use cases.', 'Improved performance for complex multi-segment shapes.'],
    ['Added support for complex non-manifold geometry repair.', 'Improved hole detection accuracy by 60%.', 'New batch processing mode for multiple files.'],
    ['Added support for new 3D printer profiles.', 'Enhanced support material visualization.', 'Improved print time estimation accuracy.'],
    ['Added multi-model arrangement algorithms.', 'Improved bed utilization calculations.', 'New print time estimation features.'],
    ['Added parametric grid generation.', 'Enhanced pattern customization options.', 'Improved performance for large grids.'],
    ['Added haptic feedback simulation.', 'Improved parameter precision controls.', 'New customizable interface themes.'],
    ['Added support for metric and imperial thread standards.', 'Enhanced thread detail generation.', 'New material property calculations.'],
    ['Added angle measurement capabilities.', 'Enhanced measurement precision.', 'New export formats for measurements.'],
    ['Added advanced curve wrapping algorithms.', 'Enhanced curve editing precision.', 'New preset curve libraries.'],
    ['Added real-time boolean preview.', 'Enhanced error detection and correction.', 'Improved performance for complex operations.']
  ];
  
  return changelogTemplates[Math.floor(Math.random() * changelogTemplates.length)];
}

function updateProductList() {
  const productList = document.querySelector('.product-list');
  if (!productList) return;
  
  // Clear existing items
  productList.innerHTML = '';
  
  // Add products from loaded data
  Object.keys(products).forEach((productId, index) => {
    const product = products[productId];
    const productItem = document.createElement('div');
    productItem.className = `product-item ${index === 0 ? 'active' : ''}`;
    productItem.dataset.product = productId;
    
    const productName = document.createElement('span');
    productName.className = 'product-name';
    productName.textContent = product.name;
    
    productItem.appendChild(productName);
    productList.appendChild(productItem);
  });
}

// Update Icon Grid with Filtering
function updateIconGrid() {
  const iconGrid = document.querySelector('.icon-grid');
  if (!iconGrid) return;
  
  // Clear existing items
  iconGrid.innerHTML = '';
  
  // Filter products based on active Product Type
  let filteredProducts = {};
  if (activeProductType && productDataByType[activeProductType]) {
    filteredProducts = productDataByType[activeProductType];
  } else {
    // If no type active, show all products
    filteredProducts = products;
  }
  
  // Filter by expanded Product Groups
  let productsToShow = [];
  if (expandedProductGroups.size > 0) {
    // Only show products from expanded groups (including "OTHER")
    Object.keys(filteredProducts).forEach(productId => {
      const product = filteredProducts[productId];
      if (product.groups && product.groups.length > 0) {
        // Check if product belongs to any expanded group
        const hasExpandedGroup = product.groups.some(group => expandedProductGroups.has(group));
        if (hasExpandedGroup) {
          productsToShow.push({ id: productId, ...product });
        }
      } else if (expandedProductGroups.has('OTHER')) {
        // Show ungrouped products when "OTHER" group is expanded
        productsToShow.push({ id: productId, ...product });
      }
    });
  } else {
    // No groups expanded, show all products from active type
    Object.keys(filteredProducts).forEach(productId => {
      productsToShow.push({ id: productId, ...filteredProducts[productId] });
    });
  }
  
  // Sort products by name for consistent display
  productsToShow.sort((a, b) => a.name.localeCompare(b.name));
  
  // Add icons to grid
  productsToShow.forEach((product, index) => {
    const iconItem = document.createElement('div');
    iconItem.className = `icon-item ${product.id === currentProduct ? 'active' : ''}`;
    iconItem.dataset.product = product.id;
    
    const iconImg = document.createElement('img');
    iconImg.src = product.icon;
    iconImg.alt = `${product.name} Icon`;
    iconImg.onerror = function() {
      // Fallback to a placeholder if image fails to load
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SWNvbjwvdGV4dD4KPC9zdmc+';
    };
    
    iconItem.appendChild(iconImg);
    iconGrid.appendChild(iconItem);
  });
  
  console.log(`Icon grid updated: ${productsToShow.length} products displayed (Type: ${activeProductType || 'all'}, Groups: ${expandedProductGroups.size})`);
}

// Render home grid when no product is selected
function renderHomeGrid() {
  const homeGrid = document.getElementById('home-grid');
  if (!homeGrid) return;

  // Clear existing grid
  homeGrid.innerHTML = '';

  // Filter products based on active Product Type
  let filteredProducts = {};
  if (activeProductType && productDataByType[activeProductType]) {
    filteredProducts = productDataByType[activeProductType];
  } else {
    filteredProducts = products;
  }

  // Convert to array and sort by name
  const productsArray = Object.keys(filteredProducts).map(productId => ({
    id: productId,
    ...filteredProducts[productId]
  })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Create grid items
  productsArray.forEach(product => {
    const gridItem = document.createElement('div');
    gridItem.className = 'home-grid-item';
    gridItem.dataset.productId = product.id;

    // Add click handler
    gridItem.addEventListener('click', async () => {
      await selectProduct(product.id);
    });

    // Create image
    const img = document.createElement('img');
    img.className = 'home-grid-item-thumbnail';
    img.src = product.icon || product.thumbnail || '';
    img.alt = product.name || product.title || '';
    img.loading = 'lazy';
    img.onerror = function() {
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
    };

    // Create title
    const title = document.createElement('div');
    title.className = 'home-grid-item-title';
    title.textContent = product.name || product.title || 'Untitled';

    gridItem.appendChild(img);
    gridItem.appendChild(title);
    homeGrid.appendChild(gridItem);
  });

  console.log(`Home grid rendered: ${productsArray.length} products`);
}

// Update view state based on whether a product is selected
function updateViewState() {
  const homeGridContainer = document.getElementById('home-grid-container');
  const productCardContainer = document.querySelector('.product-card-container');
  const closeButton = document.getElementById('product-close-button');

  if (currentProduct) {
    // Product selected - show product view
    if (homeGridContainer) homeGridContainer.classList.remove('visible');
    if (productCardContainer) productCardContainer.classList.remove('hidden');
    if (closeButton) closeButton.style.display = 'flex';
  } else {
    // No product selected - show home view
    if (homeGridContainer) homeGridContainer.classList.add('visible');
    if (productCardContainer) productCardContainer.classList.add('hidden');
    if (closeButton) closeButton.style.display = 'none';
  }

  console.log(`View state updated: ${currentProduct ? 'product view' : 'home view'}`);
}

// Set up event listeners
function initializeEventListeners() {
  // Use event delegation for dynamically generated content
  document.addEventListener('click', async function(e) {
    // Sidebar product selection
    if (e.target.closest('.product-item')) {
      const productItem = e.target.closest('.product-item');
      const productId = productItem.dataset.product;
      await selectProduct(productId);
    }
    
    // Icon grid selection
    if (e.target.closest('.icon-item')) {
      const iconItem = e.target.closest('.icon-item');
      const productId = iconItem.dataset.product;
      await selectProduct(productId);
    }

    // Tab icon expansion/collapse
    if (e.target.closest('.tab-icon')) {
      const tabIcon = e.target.closest('.tab-icon');
      const tabName = tabIcon.dataset.tab;
      toggleTabIcon(tabIcon, tabName);
    }

    // Changelog icon expansion/collapse
    if (e.target.closest('.changelog-icon')) {
      const changelogIcon = e.target.closest('.changelog-icon');
      toggleChangelogIcon(changelogIcon);
    }

    // Close button to return to home grid
    if (e.target.closest('#product-close-button')) {
      deselectProduct();
    }

    // Header logo click to return to home grid
    if (e.target.closest('#header-logo') || e.target.id === 'header-logo') {
      deselectProduct();
    }
  });

  // Tab navigation
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      switchTab(tabName);
    });
  });

  // Download button
  if (downloadButton) {
    console.log('Download button found, attaching event listener');
    downloadButton.addEventListener('click', function() {
      console.log('Download button clicked!');
      downloadProduct(currentProduct);
    });
  } else {
    console.error('Download button not found! Check HTML for id="download-button"');
  }

  // Category expansion/collapse
  const categoryHeaders = document.querySelectorAll('.category-header');
  categoryHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const carrot = this.querySelector('.carrot');
      const section = this.nextElementSibling;
      
      if (carrot.classList.contains('expanded')) {
        carrot.classList.remove('expanded');
        carrot.classList.add('collapsed');
        if (section) section.classList.remove('expanded');
      } else {
        carrot.classList.remove('collapsed');
        carrot.classList.add('expanded');
        if (section) section.classList.add('expanded');
      }
    });
  });
}

// Select a product and update the display
async function selectProduct(productId) {
  if (!products[productId]) {
    console.warn(`Product ${productId} not found`);
    return;
  }

  currentProduct = productId;
  // Update button visibility based on subscriber status
  updateButtonVisibility(productId);
  await updateProductDisplay(productId);
  updateActiveStates(productId);
  updateViewState();
}

// Deselect current product and return to home view
function deselectProduct() {
  currentProduct = null;
  updateActiveStates(null);
  updateViewState();
  renderHomeGrid();
  console.log('Product deselected, returning to home view');
}

// Update button visibility based on subscriber status
async function updateButtonVisibility(productId) {
  const buyNowBtn = document.getElementById('buy-now-button');

  // Check sessionStorage for purchase info
  const purchaseInfoStr = sessionStorage.getItem('purchase_info');
  let ownsProduct = false;
  let hasActiveSubscription = false;

  if (purchaseInfoStr) {
    try {
      const purchaseInfo = JSON.parse(purchaseInfoStr);
      
      // Get Polar product ID for this product
      const productSlug = productId.toLowerCase().replace(/\s+/g, '-');
      const polarProduct = getPolarProductData(productSlug);
      
      if (polarProduct && polarProduct.productId) {
        // Check if product is in owned products list
        ownsProduct = purchaseInfo.ownedProducts && purchaseInfo.ownedProducts.includes(polarProduct.productId);
        
        // Also check sessionStorage for quick lookup
        if (!ownsProduct) {
          ownsProduct = sessionStorage.getItem(`owned_${polarProduct.productId}`) === 'true';
        }
      }
    } catch (error) {
      console.error('Error checking purchase info:', error);
    }
  }

  // Check for active subscription (works with or without customer ID if dev toggle is enabled)
  let customerId = sessionStorage.getItem('polar_customer_id') || 
                   new URLSearchParams(window.location.search).get('customer_id');
  
  // If dev mode is enabled but no customer ID, use dev customer ID
  if (!customerId && getDevMemberToggle()) {
    customerId = getDevCustomerId();
    if (customerId) {
      sessionStorage.setItem('polar_customer_id', customerId);
    }
  }
  
  try {
    hasActiveSubscription = await checkSubscriptionStatus(customerId);
  } catch (error) {
    console.error('Error checking subscription status:', error);
    // On error, assume no subscription to be safe
    hasActiveSubscription = false;
  }

  // Check localStorage for persistent purchase records (optional future enhancement)
  // For now, we only use sessionStorage

  if (ownsProduct || hasActiveSubscription) {
    // Customer owns this product or has active subscription - show DOWNLOAD button
    if (downloadButton) {
      downloadButton.style.display = '';
      downloadButton.textContent = 'DOWNLOAD';
    }
    if (buyNowBtn) {
      // Hide Buy Now button for subscribers/owners
      buyNowBtn.style.display = 'none';
    }
    // Hide price for members
    if (productPrice) {
      productPrice.style.display = 'none';
    }
  } else {
    // Customer doesn't own product - show BUY NOW button
    if (downloadButton) {
      downloadButton.style.display = 'none';
    }
    if (buyNowBtn) {
      buyNowBtn.style.display = '';
      buyNowBtn.textContent = 'BUY NOW';
      // Ensure Buy Now button has the correct handler
      buyNowBtn.onclick = handleBuyNow;
    }
    // Show price for non-members
    if (productPrice) {
      productPrice.style.display = '';
    }
  }
}

// Generate 3D embed HTML code from config
function generate3DEmbedCode(modelUrl, modelName, config, fileFormat = 'glb') {
  const viewer = config.viewer || {};
  const embed = config.embed || {};
  const camera = config.camera || {};
  const performance = config.performance || {};
  const model = config.model || {};
  
  // Build style properties
  const unit = viewer.usePixels ? 'px' : '%';
  const styleProps = [];
  styleProps.push(`width: ${viewer.width || '100%'}`);
  
  if (viewer.maintainAspect && viewer.aspectRatio && viewer.aspectRatio !== 'custom') {
    const [w, h] = viewer.aspectRatio.split(':').map(Number);
    styleProps.push(`aspect-ratio: ${w} / ${h}`);
  } else {
    styleProps.push(`height: ${viewer.height || '100%'}`);
  }
  
  if (viewer.maxWidth) {
    styleProps.push(`max-width: ${viewer.maxWidth}`);
  }
  
  // Background color
  let bgStyle = 'transparent';
  let bgColorForThree = null; // For Three.js scene.background
  if (!embed.transparentBackground) {
    const bgColor = embed.backgroundColor || '#E8E8E8';
    // Skip if backgroundColor is explicitly "transparent"
    if (bgColor && bgColor.toLowerCase() !== 'transparent') {
      const bgOpacity = embed.backgroundOpacity !== undefined ? embed.backgroundOpacity : 1.0;
      if (bgColor.startsWith('#')) {
        const r = parseInt(bgColor.slice(1, 3), 16);
        const g = parseInt(bgColor.slice(3, 5), 16);
        const b = parseInt(bgColor.slice(5, 7), 16);
        bgStyle = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
        bgColorForThree = `0x${bgColor.slice(1)}`; // Hex color for Three.js
      } else {
        bgStyle = bgColor;
        // Only set bgColorForThree if it's a valid color format (hex, rgb, etc.)
        if (bgColor.match(/^(0x|#|rgb)/i)) {
          bgColorForThree = bgColor.startsWith('#') ? `0x${bgColor.slice(1)}` : bgColor;
        }
      }
    }
  }
  styleProps.push(`background-color: ${bgStyle}`);
  
  // Use Three.js for STL files, model-viewer for GLB/GLTF
  if (fileFormat === 'stl' || fileFormat === 'obj') {
    return generateThreeJSEmbed(modelUrl, modelName, config, fileFormat, styleProps, bgStyle, bgColorForThree);
  }
  
  // Build model-viewer attributes for GLB/GLTF
  let attributes = [];
  attributes.push(`src="${modelUrl}"`);
  attributes.push(`style="${styleProps.join('; ')}"`);
  
  if (camera.cameraControls !== false) {
    attributes.push('camera-controls');
  }
  
  if (camera.autoRotate) {
    attributes.push('auto-rotate');
    if (camera.rotationSpeed) {
      attributes.push(`rotation-per-second="${camera.rotationSpeed}"`);
    }
  }
  
  if (camera.cameraOrbit) {
    attributes.push(`camera-orbit="${camera.cameraOrbit}"`);
  }
  
  if (embed.enableAR) {
    attributes.push('ar');
    attributes.push('ar-modes="webxr scene-viewer quick-look"');
  }
  
  if (camera.fieldOfView) {
    attributes.push(`field-of-view="${camera.fieldOfView}"`);
  }
  
  if (camera.exposure) {
    attributes.push(`exposure="${camera.exposure}"`);
  }
  
  if (performance.enableShadows && performance.shadowIntensity) {
    attributes.push(`shadow-intensity="${performance.shadowIntensity}"`);
  } else if (performance.enableShadows === false) {
    attributes.push('shadow-intensity="0"');
  }
  
  if (performance.renderQuality && performance.renderQuality !== 'auto') {
    attributes.push(`render-quality="${performance.renderQuality}"`);
  }
  
  if (embed.loadingStrategy && embed.loadingStrategy !== 'auto') {
    attributes.push(`loading="${embed.loadingStrategy}"`);
  }
  
  if (embed.revealStrategy && embed.revealStrategy !== 'auto') {
    attributes.push(`reveal="${embed.revealStrategy}"`);
  }
  
  if (model.scale && model.scale !== '1 1 1') {
    attributes.push(`scale="${model.scale}"`);
  }
  
  // Build HTML for model-viewer
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Model: ${modelName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body, html {
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        model-viewer {
            width: 100%;
            height: 100%;
            display: block;
        }
    </style>
</head>
<body>
    <model-viewer ${attributes.join('\n        ')}></model-viewer>
    <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
</body>
</html>`;
  
  return html;
}

// Generate Three.js embed for STL/OBJ files
function generateThreeJSEmbed(modelUrl, modelName, config, fileFormat, styleProps, bgStyle, bgColorForThree = null) {
  const viewer = config.viewer || {};
  const embed = config.embed || {};
  const camera = config.camera || {};
  const performance = config.performance || {};
  const model = config.model || {};
  const material = config.material || {};
  const lighting = config.lighting || {};
  const display = config.display || {};

  // Parse camera orbit if provided
  let initialCameraPosition = { x: 0, y: 2, z: 5 };
  let autoRotate = camera.autoRotate !== false; // Default to true, only false if explicitly set to false
  const enableCameraControls = camera.cameraControls !== false; // Default to true, only false if explicitly set to false

  // Parse rotation speed from config format "0.3deg" (degrees per frame at 60fps)
  // Convert to radians per frame for THREE.js
  const rotSpeedString = camera.rotationSpeed || '1deg';
  const rotSpeedDeg = parseFloat(rotSpeedString.replace('deg', ''));
  const rotationSpeed = (rotSpeedDeg / 60) * (Math.PI / 180); // deg/frame at 60fps -> radians/frame
  const modelFill = camera.modelFill !== undefined ? parseFloat(camera.modelFill) : 1.0;
  const cameraDistance = camera.cameraDistance !== undefined ? parseFloat(camera.cameraDistance) : null;

  if (camera.cameraOrbit) {
    // Parse "0deg 75deg 1.5m" format
    const parts = camera.cameraOrbit.split(' ');
    if (parts.length >= 3) {
      const distance = parseFloat(parts[2].replace('m', ''));
      const phi = (parseFloat(parts[1].replace('deg', '')) * Math.PI) / 180;
      const theta = (parseFloat(parts[0].replace('deg', '')) * Math.PI) / 180;
      initialCameraPosition = {
        x: distance * Math.sin(phi) * Math.cos(theta),
        y: distance * Math.cos(phi),
        z: distance * Math.sin(phi) * Math.sin(theta)
      };
    }
  }

  // Parse model scale
  const scaleParts = (model.scale || '1 1 1').split(' ').map(s => parseFloat(s));
  const modelScale = scaleParts.length === 3 ? scaleParts : [1, 1, 1];

  // Field of view - parse from config "90deg" format
  const fovString = camera.fieldOfView || '45deg';
  const fov = parseFloat(fovString.replace('deg', ''));

  // Shadow settings
  const enableShadows = performance.enableShadows !== false;
  const shadowIntensity = parseFloat(performance.shadowIntensity) || 1.0;

  // Material settings
  const materialColor = material.color || '#888888';
  const metalness = material.metalness !== undefined ? parseFloat(material.metalness) : 0.3;
  const roughness = material.roughness !== undefined ? parseFloat(material.roughness) : 0.4;

  // Edge settings
  const edges = material.edges || {};
  const enableEdges = edges.enabled !== false;
  const edgeColor = edges.color || '#000000';
  const edgeThickness = edges.thickness !== undefined ? parseFloat(edges.thickness) : 2;

  // Log config values being used for debugging
  console.log(`🎨 3D Embed Config for ${modelName}:`,{
    materialColor, metalness, roughness,
    enableEdges, edgeColor, edgeThickness,
    autoRotate, rotationSpeed: rotSpeedDeg,
    modelFill, cameraDistance, fov
  });

  // Sketch mode settings
  const sketchMode = display.sketchMode || {};
  const enableSketch = sketchMode.enabled || false;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Model: ${modelName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body, html {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: ${bgStyle};
        }
        #viewer-container {
            width: 100%;
            height: 100%;
            ${styleProps.join(';\n            ')}
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #666;
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>
    <div id="viewer-container">
        <div class="loading">Loading 3D model...</div>
    </div>
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
        }
    }
    </script>
    <script type="module">
        import * as THREE from 'three';
        import { STLLoader } from 'three/addons/loaders/STLLoader.js';
        import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';${enableSketch ? `
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';` : ''}

        const container = document.getElementById('viewer-container');
        const loadingEl = container.querySelector('.loading');
        
        // Scene setup
        const scene = new THREE.Scene();
        ${bgColorForThree ? `scene.background = new THREE.Color(${bgColorForThree});` : '// Transparent background - renderer alpha handles this'}
        
        const camera = new THREE.PerspectiveCamera(${fov}, container.clientWidth / container.clientHeight, 0.01, 100000);
        camera.position.set(${initialCameraPosition.x}, ${initialCameraPosition.y}, ${initialCameraPosition.z});

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: ${embed.transparentBackground ? 'true' : 'false'} });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        ${enableShadows ? `renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;` : ''}
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        ${enableCameraControls ? `// Mouse interaction for mesh tumbling (camera stays fixed)
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let meshRotationVelocity = { x: 0, y: 0 };
        const rotationDamping = 0.95;

        renderer.domElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            meshRotationVelocity.y = deltaX * 0.01;
            meshRotationVelocity.x = deltaY * 0.01;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        renderer.domElement.addEventListener('mouseup', () => { isDragging = false; });
        renderer.domElement.addEventListener('mouseleave', () => { isDragging = false; });

        // Touch support
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        renderer.domElement.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;
            const deltaX = e.touches[0].clientX - previousMousePosition.x;
            const deltaY = e.touches[0].clientY - previousMousePosition.y;
            meshRotationVelocity.y = deltaX * 0.01;
            meshRotationVelocity.x = deltaY * 0.01;
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        renderer.domElement.addEventListener('touchend', () => { isDragging = false; });` : ''}

        // Lighting${lighting.hemisphere?.enabled !== false ? `
        const hemisphereLight = new THREE.HemisphereLight(
            ${lighting.hemisphere?.skyColor ? `0x${lighting.hemisphere.skyColor.replace('#', '')}` : '0xffffff'},
            ${lighting.hemisphere?.groundColor ? `0x${lighting.hemisphere.groundColor.replace('#', '')}` : '0x444444'},
            ${lighting.hemisphere?.intensity !== undefined ? lighting.hemisphere.intensity : 0.6}
        );
        scene.add(hemisphereLight);` : ''}
        ${lighting.ambient?.enabled !== false ? `
        const ambientLight = new THREE.AmbientLight(
            ${lighting.ambient?.color ? `0x${lighting.ambient.color.replace('#', '')}` : '0x404040'},
            ${lighting.ambient?.intensity !== undefined ? lighting.ambient.intensity : 0.2}
        );
        scene.add(ambientLight);` : ''}
        ${lighting.key?.enabled !== false ? `
        const keyLight = new THREE.DirectionalLight(
            ${lighting.key?.color ? `0x${lighting.key.color.replace('#', '')}` : '0xffffff'},
            ${lighting.key?.intensity !== undefined ? lighting.key.intensity : 0.8}
        );
        keyLight.position.set(
            ${lighting.key?.position?.x || 5},
            ${lighting.key?.position?.y || 10},
            ${lighting.key?.position?.z || 7}
        );
        ${enableShadows ? `keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;` : ''}
        scene.add(keyLight);` : ''}
        ${lighting.fill?.enabled ? `
        const fillLight = new THREE.DirectionalLight(
            ${lighting.fill?.color ? `0x${lighting.fill.color.replace('#', '')}` : '0x8888ff'},
            ${lighting.fill?.intensity !== undefined ? lighting.fill.intensity : 0.4}
        );
        fillLight.position.set(
            ${lighting.fill?.position?.x || -5},
            ${lighting.fill?.position?.y || 5},
            ${lighting.fill?.position?.z || 5}
        );
        scene.add(fillLight);` : ''}
        ${lighting.rim?.enabled ? `
        const rimLight = new THREE.DirectionalLight(
            ${lighting.rim?.color ? `0x${lighting.rim.color.replace('#', '')}` : '0xffffff'},
            ${lighting.rim?.intensity !== undefined ? lighting.rim.intensity : 0.5}
        );
        rimLight.position.set(
            ${lighting.rim?.position?.x || 0},
            ${lighting.rim?.position?.y || 3},
            ${lighting.rim?.position?.z || -10}
        );
        scene.add(rimLight);` : ''}
        
        // Load model
        const loader = '${fileFormat}' === 'stl' ? new STLLoader() : new OBJLoader();
        const modelUrl = '${modelUrl}';
        
        loader.load(
            modelUrl,
            (geometry) => {
                let mesh;
                let edgesMesh;
                if ('${fileFormat}' === 'stl') {
                    const material = new THREE.MeshStandardMaterial({
                        color: 0x${materialColor.replace('#', '')},
                        metalness: ${metalness},
                        roughness: ${roughness},
                        envMapIntensity: 1.0
                    });
                    mesh = new THREE.Mesh(geometry, material);
                    mesh.rotation.x = -Math.PI / 2;
                    ${enableEdges ? `
                    // Create edges for technical drawing look
                    const edgesGeometry = new THREE.EdgesGeometry(geometry, 30);
                    const edgesMaterial = new THREE.LineBasicMaterial({
                        color: 0x${edgeColor.replace('#', '')},
                        linewidth: ${edgeThickness}
                    });
                    edgesMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial);
                    edgesMesh.rotation.x = -Math.PI / 2;` : ''}
                } else {
                    // OBJ loader returns a group
                    mesh = geometry;
                }

                // Create a group to hold both mesh and edges
                const meshGroup = new THREE.Group();
                meshGroup.add(mesh);
                ${enableEdges ? 'if (edgesMesh) meshGroup.add(edgesMesh);' : ''}

                // Center model at origin (matching utility viewer - no scaling)
                const box = new THREE.Box3().setFromObject(meshGroup);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                // Center to middle of mesh - move model so its center is at origin
                meshGroup.position.set(-center.x, -center.y, -center.z);

                ${enableShadows ? 'mesh.traverse((child) => { if (child.isMesh) child.castShadow = true; });' : ''}

                scene.add(meshGroup);

                // Position camera to frame the model (matching utility viewer algorithm)
                const fov = camera.fov * (Math.PI / 180);
                let camDistance = Math.abs(maxDim / Math.sin(fov / 2));

                // Apply model fill (how much of viewport model occupies)
                ${modelFill !== 1.0 ? `camDistance *= ${modelFill};` : ''}

                // Apply distance multiplier
                ${cameraDistance !== null ? `camDistance *= ${cameraDistance};` : ''}

                // Position camera at (d*0.5, d*0.5, d) to match utility viewer
                camera.position.set(
                    camDistance * 0.5,
                    camDistance * 0.5,
                    camDistance
                );
                camera.lookAt(0, 0, 0);
                ${enableSketch ? `
                // Setup sketch effect composer
                const composer = new EffectComposer(renderer);
                composer.addPass(new RenderPass(scene, camera));

                // Sketch shader
                const sketchShader = {
                    uniforms: {
                        tDiffuse: { value: null },
                        lineDensity: { value: ${sketchMode.lineDensity || 0.3} },
                        lineWidth: { value: ${sketchMode.lineWidth || 1} },
                        intensity: { value: ${sketchMode.intensity || 1} },
                        noiseScale: { value: ${sketchMode.noiseScale || 1} }
                    },
                    vertexShader: \`
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    \`,
                    fragmentShader: \`
                        uniform sampler2D tDiffuse;
                        uniform float lineDensity;
                        uniform float lineWidth;
                        uniform float intensity;
                        uniform float noiseScale;
                        varying vec2 vUv;

                        float random(vec2 st) {
                            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                        }

                        void main() {
                            vec4 color = texture2D(tDiffuse, vUv);
                            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

                            // Add sketch lines
                            float noise = random(vUv * noiseScale * 100.0);
                            float lines = step(lineDensity, fract(vUv.y * 100.0 + noise * lineWidth));

                            vec3 sketch = vec3(gray) * (1.0 - (1.0 - lines) * intensity);
                            gl_FragColor = vec4(mix(color.rgb, sketch, intensity), color.a);
                        }
                    \`
                };

                const sketchPass = new ShaderPass(sketchShader);
                composer.addPass(sketchPass);` : ''}

                // Animation loop
                function animate() {
                    requestAnimationFrame(animate);

                    ${enableCameraControls ? `// Apply mesh rotation from user interaction
                    if (!isDragging) {
                        meshRotationVelocity.x *= rotationDamping;
                        meshRotationVelocity.y *= rotationDamping;
                    }
                    meshGroup.rotation.x += meshRotationVelocity.x;
                    meshGroup.rotation.y += meshRotationVelocity.y;

                    // Auto-rotation (only when not manually rotating)
                    ${autoRotate ? `if (Math.abs(meshRotationVelocity.x) < 0.001 && Math.abs(meshRotationVelocity.y) < 0.001) {
                        meshGroup.rotation.y += ${rotationSpeed};
                    }` : ''}` : `${autoRotate ? `meshGroup.rotation.y += ${rotationSpeed};` : ''}`}

                    ${enableSketch ? 'composer.render();' : 'renderer.render(scene, camera);'}
                }
                animate();
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = (progress.loaded / progress.total) * 100;
                    if (loadingEl) loadingEl.textContent = \`Loading: \${Math.round(percent)}%\`;
                }
            },
            (error) => {
                console.error('Error loading model:', error);
                if (loadingEl) loadingEl.textContent = 'Error loading model';
            }
        );
        
        // Handle resize
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);${enableSketch ? `
            composer.setSize(container.clientWidth, container.clientHeight);` : ''}
        });
    </script>
</body>
</html>`;
  
  return html;
}

// Deep merge two objects
function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Load 3D embed config with hierarchical override system
// Priority: Product-specific config > Global config > Default config
async function load3DEmbedConfig(repoConfig, folderName, cardAssetsPath, folderData) {
  // 1. Start with default config
  const defaultConfig = {
    enabled: true,
    viewer: {
      width: "100%",
      height: "100%",
      maxWidth: "100%",
      usePixels: false,
      maintainAspect: true,
      aspectRatio: "1:1"
    },
    embed: {
      backgroundColor: "transparent",
      backgroundOpacity: 0,
      transparentBackground: true,
      interactionMode: "full",
      enableAR: false,
      loadingStrategy: "auto",
      revealStrategy: "auto"
    },
    camera: {
      fieldOfView: "45deg",
      exposure: "1.0",
      cameraControls: false,
      autoRotate: true,
      rotationSpeed: "0.3deg",
      cameraOrbit: "0deg 75deg 0.9m",
      cameraDistance: 0.9,
      modelFill: 0.55
    },
    performance: {
      renderQuality: "auto",
      enableShadows: false,
      shadowIntensity: "0",
      enableToneMapping: true,
      toneMapping: "auto"
    },
    model: {
      scale: "1 1 1"
    },
    material: {
      metalness: 0.3,
      roughness: 0.4,
      color: "#888888",
      edges: {
        enabled: false,
        color: "#000000",
        thickness: 2
      }
    },
    lighting: {
      hemisphere: {
        enabled: true,
        skyColor: "#ffffff",
        groundColor: "#444444",
        intensity: 0.6
      },
      key: {
        enabled: true,
        color: "#ffffff",
        intensity: 0.8,
        position: { x: 5, y: 10, z: 7 }
      },
      fill: {
        enabled: false,
        color: "#8888ff",
        intensity: 0.4,
        position: { x: -5, y: 5, z: 5 }
      },
      rim: {
        enabled: false,
        color: "#ffffff",
        intensity: 0.5,
        position: { x: 0, y: 3, z: -10 }
      },
      ambient: {
        enabled: true,
        color: "#404040",
        intensity: 0.2
      }
    },
    display: {
      sketchMode: {
        enabled: false,
        lineDensity: 0.3,
        lineWidth: 1,
        intensity: 1,
        noiseScale: 1
      }
    }
  };

  let finalConfig = { ...defaultConfig };

  // 2. Try to load global config from website repository root (not product library)
  try {
    // Global config lives in the website repo, not the product library repo
    const websiteRepo = 'no3d-tools-website';
    const globalConfigUrl = `https://raw.githubusercontent.com/${repoConfig.owner}/${websiteRepo}/${repoConfig.branch}/3d-embed-config-global.json`;
    const globalConfigResponse = await fetch(globalConfigUrl);

    if (globalConfigResponse.ok) {
      const globalConfig = await globalConfigResponse.json();
      finalConfig = deepMerge(finalConfig, globalConfig);
      console.log('🌍 Loaded global 3D embed config from website repository root');
    }
  } catch (error) {
    console.log('ℹ️ No global config found, using defaults');
  }

  // 3. Try to load product-specific override config
  // DISABLED: Only using global config for all products
  /*
  if (folderData && folderData.contents && Array.isArray(folderData.contents)) {
    const productConfigFile = folderData.contents.find(item =>
      item.type === 'file' &&
      (item.name === '3d-embed-config.json' || item.name.toLowerCase() === '3d-embed-config.json')
    );

    if (productConfigFile) {
      try {
        const productConfigUrl = productConfigFile.download_url ||
          `https://raw.githubusercontent.com/${repoConfig.owner}/${repoConfig.repo}/${repoConfig.branch}/${cardAssetsPath}/${encodeURIComponent(productConfigFile.name)}`;

        const productConfigResponse = await fetch(productConfigUrl);
        if (productConfigResponse.ok) {
          const productConfig = await productConfigResponse.json();
          finalConfig = deepMerge(finalConfig, productConfig);
          console.log(`🎯 Loaded product-specific config override for ${folderName}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load product config for ${folderName}:`, error);
      }
    }
  }
  */

  console.log(`📋 Config hierarchy: Default → Global (product overrides disabled)`);
  return finalConfig;
}

// Load card assets for a product from GitHub
async function loadProductCardAssets(productId) {
  console.log(`📦 loadProductCardAssets called for: ${productId}`);
  const product = products[productId];
  if (!product) {
    console.warn(`⚠️ Product not found in loadProductCardAssets: ${productId}`);
    return [];
  }

  let cardAssets = [];
  const folderName = product.folderName || product.name;
  const cardAssetsFolder = `${folderName} card assets`;
  console.log(`📁 Looking for card assets folder: "${cardAssetsFolder}"`);
  const library = product.library || 'no3d-tools-library';
  const libraryConfig = await libraryConfigPromise;
  const config = libraryConfig[product.productType] || libraryConfig.tools;
  console.log(`⚙️ Using config: owner=${config.owner}, repo=${config.repo}, branch=${config.branch}`);
  
  try {
    // Check for icon GIF first - check hosted_media if available
    const iconGifName = `icon_${folderName}.gif`;
    const iconGifPath = `${folderName}/${iconGifName}`;
    
    // Try to get hosted URL first (if product has jsonData reference)
    let gifUrl = null;
    if (product.jsonData && product.jsonData.hosted_media && product.jsonData.hosted_media[iconGifName]) {
      gifUrl = product.jsonData.hosted_media[iconGifName];
      cardAssets.push({
        type: 'image',
        url: gifUrl,
        format: 'gif',
        name: iconGifName,
        isIcon: true
      });
    } else {
      // Fallback to local or GitHub URL
      try {
        gifUrl = config.useLocalAssets 
          ? getProductImageUrl(iconGifName)
          : `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${iconGifPath}`;
        
        // Test if file exists by trying to fetch it
        const testResponse = await fetch(gifUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          cardAssets.push({
            type: 'image',
            url: gifUrl,
            format: 'gif',
            name: iconGifName,
            isIcon: true
          });
        }
      } catch (e) {
        // GIF doesn't exist, that's okay
      }
    }

    // Load card assets folder contents
    // Card assets folder is a subfolder within the product folder
    const cardAssetsPath = `${folderName}/${cardAssetsFolder}`;
    let folderData = null; // Store for later use in 3D embed generation
    
    // Skip API call if using local assets or in local development
    const skipApiCall = config.useLocalAssets || 
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    if (!skipApiCall) {
      try {
        const apiUrl = `/api/get-github-contents?owner=${encodeURIComponent(config.owner)}&repo=${encodeURIComponent(config.repo)}&branch=${encodeURIComponent(config.branch)}&path=${encodeURIComponent(cardAssetsPath)}`;
        const response = await fetch(apiUrl);
      
        if (response.ok) {
          const data = await response.json();
          folderData = data; // Store for later
          // Handle both error responses and successful responses
          if (data.error) {
            // Folder doesn't exist yet, that's okay
            console.log(`ℹ️ Card assets folder doesn't exist yet for ${folderName} (this is normal if folder hasn't been pushed to GitHub)`);
          } else if (data.contents && Array.isArray(data.contents)) {
            console.log(`📁 Found ${data.contents.length} items in card assets folder for ${folderName}`);
            const supportedFormats = {
              image: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
              video: ['mp4', 'webm', 'ogg', 'mov'],
              model3d: ['glb', 'gltf', 'usd', 'obj', 'stl', 'usdz'],
              html: ['html'],
              config: ['json']
            };
            
            for (const item of data.contents) {
              if (item.type === 'file') {
                // Skip preview-embed.html files - they can't be loaded in iframes due to X-Frame-Options
                if (item.name.toLowerCase().includes('preview-embed')) {
                  console.log(`⏭️ Skipping preview file (can't be iframed): ${item.name}`);
                  continue;
                }

                const ext = item.name.split('.').pop().toLowerCase();
                let mediaType = 'other';

                if (supportedFormats.image.includes(ext)) {
                  mediaType = 'image';
                } else if (supportedFormats.video.includes(ext)) {
                  mediaType = 'video';
                } else if (supportedFormats.model3d.includes(ext)) {
                  mediaType = 'model3d';
                } else if (supportedFormats.html.includes(ext)) {
                  mediaType = 'html';
                }
                
                if (mediaType !== 'other') {
                  // Use download_url from GitHub API if available (properly encoded)
                  // Otherwise construct URL manually
                  let fileUrl;
                  if (item.download_url) {
                    // GitHub API provides properly encoded download_url
                    fileUrl = item.download_url;
                  } else {
                    // Fallback: construct URL manually with proper encoding
                    const encodedFileName = encodeURIComponent(item.name);
                    if (config.useLocalAssets) {
                      // For local assets, card assets would need to be synced to website repo
                      // For now, fall back to GitHub raw URL since card assets aren't synced yet
                      // TODO: Update sync script to copy card assets to website repo
                      fileUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${cardAssetsPath}/${encodedFileName}`;
                    } else {
                      fileUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${cardAssetsPath}/${encodedFileName}`;
                    }
                  }
                  
                  cardAssets.push({
                    type: mediaType,
                    url: fileUrl,
                    format: ext,
                    name: item.name,
                    isIcon: false
                  });
                  console.log(`📦 Added card asset: ${item.name} (${mediaType}) - URL: ${fileUrl}`);
                }
              }
            }
          }
        }
      } catch (error) {
        // Only log if it's not a 404 (which is expected when folder doesn't exist)
        if (error.message && !error.message.includes('404')) {
          console.log(`Card assets folder doesn't exist yet for ${folderName}:`, error);
        } else {
          console.log(`ℹ️ Card assets folder doesn't exist yet for ${folderName} (this is normal if folder hasn't been pushed to GitHub)`);
        }
      }
    } else {
      console.log(`ℹ️ Skipping GitHub API call for card assets (local development or useLocalAssets=true)`);
      console.log(`   Product: ${folderName}`);

      // When useLocalAssets is true, load media from JSON (Cloudinary URLs)
      // Priority: main_image first > carousel_media (curated selection) > hosted_media (all media)
      // Respect: excluded_carousel_media (files to never show)
      if (product.jsonData) {
        const hostedMedia = product.jsonData.hosted_media || {};
        const carouselMedia = product.jsonData.carousel_media || [];
        const excludedMedia = product.jsonData.excluded_carousel_media || [];
        const mainImage = product.jsonData.main_image;

        const supportedFormats = {
          image: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
          video: ['mp4', 'webm', 'ogg', 'mov']
        };

        // Helper to check if file is excluded
        const isExcluded = (filename) => excludedMedia.includes(filename);

        // Helper to add media asset
        const addMediaAsset = (filename, url, isFirst = false) => {
          if (isExcluded(filename)) {
            console.log(`🚫 Skipping excluded media: ${filename}`);
            return false;
          }

          const ext = filename.split('.').pop().toLowerCase();
          let mediaType = 'other';

          if (supportedFormats.image.includes(ext)) {
            mediaType = 'image';
          } else if (supportedFormats.video.includes(ext)) {
            mediaType = 'video';
          }

          if (mediaType !== 'other') {
            const asset = {
              type: mediaType,
              url: url,
              format: ext,
              name: filename,
              isIcon: false,
              isMainImage: isFirst
            };

            if (isFirst) {
              cardAssets.unshift(asset);
              console.log(`🌟 Added main image first: ${filename}`);
            } else {
              cardAssets.push(asset);
              console.log(`📦 Added carousel media asset: ${filename} (${mediaType})`);
            }
            return true;
          }
          return false;
        };

        // Step 1: Add main_image first if defined
        let mainImageAdded = false;
        console.log(`🖼️ main_image check: mainImage="${mainImage}", exists in hosted_media=${!!hostedMedia[mainImage]}`);
        if (mainImage && hostedMedia[mainImage]) {
          console.log(`🖼️ Adding main_image first: ${mainImage}`);
          mainImageAdded = addMediaAsset(mainImage, hostedMedia[mainImage], true);
        }

        // Step 2: If carousel_media is defined, load those specific files in order
        if (carouselMedia.length > 0) {
          console.log(`📦 Loading carousel assets from carousel_media (${carouselMedia.length} items)`);

          for (const filename of carouselMedia) {
            // Skip if already added as main image
            if (mainImageAdded && filename === mainImage) continue;

            const url = hostedMedia[filename];
            if (!url) {
              console.warn(`⚠️ Carousel media file not found in hosted_media: ${filename}`);
              continue;
            }

            addMediaAsset(filename, url);
          }
          console.log(`📊 Loaded ${cardAssets.length} assets from carousel_media`);
        }
        // Fallback: load all non-icon, non-excluded media from hosted_media
        else if (Object.keys(hostedMedia).length > 0) {
          console.log(`📦 Loading carousel assets from hosted_media (no carousel_media defined)`);

          for (const [filename, url] of Object.entries(hostedMedia)) {
            // Skip if already added as main image
            if (mainImageAdded && filename === mainImage) continue;
            // Skip icon files - they're added separately
            if (filename.toLowerCase().startsWith('icon_')) continue;

            addMediaAsset(filename, url);
          }
          console.log(`📊 Loaded ${cardAssets.length} assets from hosted_media`);
        }
      }
    }

    // Add static PNG icon - but only if carousel_media is NOT defined (user hasn't curated the carousel)
    // When carousel_media is defined, respect the user's curation and don't auto-add icons
    const hasCarouselMedia = product.jsonData?.carousel_media?.length > 0;
    if (!hasCarouselMedia) {
      const iconPngName = `icon_${folderName}.png`;
      const iconPngPath = `${folderName}/${iconPngName}`;

      // Check hosted_media first, then fallback to local/GitHub
      let iconPngUrl = null;
      if (product.jsonData && product.jsonData.hosted_media && product.jsonData.hosted_media[iconPngName]) {
        iconPngUrl = product.jsonData.hosted_media[iconPngName];
      } else {
        iconPngUrl = config.useLocalAssets
          ? getProductIconUrl(folderName)
          : `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${iconPngPath}`;
      }

      const iconPngItem = {
        type: 'image',
        url: iconPngUrl,
        format: 'png',
        name: iconPngName,
        isIcon: true
      };

      // If GIF exists, add PNG at end; otherwise add at beginning
      // BUT: If main_image is already set, don't add icon at beginning (it would override main_image position)
      const hasMainImage = cardAssets.some(item => item.isMainImage);
      if (cardAssets.some(item => item.format === 'gif' && item.isIcon)) {
        cardAssets.push(iconPngItem);
        console.log(`🖼️ Added icon PNG at end (GIF found first)`);
      } else if (hasMainImage) {
        // Don't override main_image position - add icon after main_image
        cardAssets.splice(1, 0, iconPngItem);
        console.log(`🖼️ Added icon PNG at position 1 (main_image is at position 0)`);
      } else {
        cardAssets.unshift(iconPngItem);
        console.log(`🖼️ Added icon PNG at beginning (no GIF found, no main_image)`);
      }
    } else {
      console.log(`📋 Skipping auto-icon (carousel_media is curated)`);
    }

    // Check for 3D models and generate embeds if config exists
    const model3dFiles = cardAssets.filter(asset => asset.type === 'model3d');
    if (model3dFiles.length > 0) {
      console.log(`🎯 Found ${model3dFiles.length} 3D model file(s), loading embed config...`);

      // Load global config and product-specific override
      const embedConfig = await load3DEmbedConfig(config, folderName, cardAssetsPath, folderData);
      console.log('✅ Final merged config:', embedConfig);
      
      // Generate embed for each 3D model
      if (embedConfig.enabled) {
        const processedModelFiles = [];
        for (const modelFile of model3dFiles) {
          // Generate embeds for GLB/GLTF (model-viewer) and STL/OBJ (Three.js)
          if (['glb', 'gltf', 'stl', 'obj'].includes(modelFile.format)) {
            // Fetch the model file and embed as base64 data URL to avoid CORS/sandbox issues
            try {
              const modelResponse = await fetch(modelFile.url);
              if (!modelResponse.ok) {
                throw new Error(`Failed to fetch model: ${modelResponse.statusText}`);
              }
              const modelBlob = await modelResponse.blob();
              
              // Convert blob to base64 data URL
              const reader = new FileReader();
              const modelDataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(modelBlob);
              });
              
              // Generate embed with data URL instead of GitHub URL
              // This avoids CORS and sandbox restrictions since everything is embedded
              const embedHtml = generate3DEmbedCode(modelDataUrl, modelFile.name, embedConfig, modelFile.format);
              cardAssets.push({
                type: 'html',
                url: 'data:text/html;charset=utf-8,' + encodeURIComponent(embedHtml),
                format: 'html',
                name: `${modelFile.name} (3D Viewer)`,
                isIcon: false,
                isGenerated: true
              });
              console.log(`🎨 Generated 3D embed for: ${modelFile.name} (${modelFile.format}) with embedded data URL`);
              console.log(`   Model file size: ${(modelBlob.size / 1024).toFixed(2)} KB`);
              console.log(`   Data URL length: ${modelDataUrl.length} characters`);
              console.log(`   HTML embed length: ${embedHtml.length} characters`);
              processedModelFiles.push(modelFile);
            } catch (error) {
              console.error(`❌ Failed to fetch model file for ${modelFile.name}:`, error);
              // Continue without this model rather than breaking everything
            }
          }
        }
        
        // Remove original model3d items that were successfully converted to HTML embeds
        // This prevents showing placeholders instead of the actual 3D viewer
        if (processedModelFiles.length > 0) {
          cardAssets = cardAssets.filter(asset => 
            !(asset.type === 'model3d' && processedModelFiles.includes(asset))
          );
          console.log(`🗑️ Removed ${processedModelFiles.length} original model3d item(s) after generating HTML embeds`);
        }
      }
    }

    // Remove any remaining model3d items that weren't converted to HTML embeds
    // These would create empty placeholder containers when there are already images available
    const remainingModel3d = cardAssets.filter(asset => asset.type === 'model3d');
    if (remainingModel3d.length > 0) {
      cardAssets = cardAssets.filter(asset => asset.type !== 'model3d');
      console.log(`🗑️ Removed ${remainingModel3d.length} unconverted model3d item(s) to prevent empty placeholders`);
    }

    console.log(`📊 Final carousel assets count: ${cardAssets.length}`);
    return cardAssets;
  } catch (error) {
    console.error(`Error loading card assets for ${productId}:`, error);
    // Fallback to just the icon
    const folderName = product.folderName || product.name;
    const libraryConfig = await libraryConfigPromise;
    const config = libraryConfig[product.productType] || libraryConfig.tools;
    const iconPngUrl = config.useLocalAssets
      ? getProductIconUrl(folderName)
      : product.icon;
    
    return [{
      type: 'image',
      url: iconPngUrl,
      format: 'png',
      name: `icon_${folderName}.png`,
      isIcon: true
    }];
  }
}

// Update the product display with new data
async function updateProductDisplay(productId) {
  console.log(`🔄 updateProductDisplay called for: ${productId}`);
  const product = products[productId];
  
  // Set productId on product card for markdown docs loading
  const productCard = document.querySelector('.product-left-section')?.closest('.product-card') || 
                      document.querySelector('.product-left-section')?.parentElement;
  if (productCard) {
    productCard.dataset.productId = productId || '';
  }
  
  if (!product) {
    console.warn(`⚠️ Product not found: ${productId}`);
    // If no product, show type description if a type is active
    if (activeProductType) {
      updateProductCardForType(activeProductType);
    }
    return;
  }

  console.log(`✅ Product found: ${product.name}, folderName: ${product.folderName || 'NOT SET'}`);

  // Update product information
  productTitle.textContent = product.name;
  productPrice.textContent = `PRICE: ${product.price}`;
  
  // Convert description to HTML (supports both markdown and plain text)
  let descriptionHTML = '';
  if (product.description) {
    let processedDescription = product.description;
    
    // Replace image references with Cloudinary URLs from hosted_media
    if (product.jsonData && product.jsonData.hosted_media) {
      const hostedMedia = product.jsonData.hosted_media;
      
      // Pattern to match markdown image syntax: ![alt](path) or ![alt](<path>)
      processedDescription = processedDescription.replace(
        /!\[([^\]]*)\]\(<?([^>)]+)>?\)/g,
        (match, altText, imagePath) => {
          // Extract filename from path (handle relative paths, paths with spaces, etc.)
          // Remove leading ./ or ../, remove folder paths, decode URL encoding
          let cleanPath = imagePath.trim();
          cleanPath = cleanPath.replace(/^\.\//, ''); // Remove ./
          cleanPath = cleanPath.replace(/^\.\.\//, ''); // Remove ../
          cleanPath = decodeURIComponent(cleanPath); // Decode URL encoding like %20
          
          // Extract just the filename (last part after /)
          const filename = cleanPath.split('/').pop();
          
          // Try to find matching Cloudinary URL in hosted_media
          // Check exact filename match first
          if (hostedMedia[filename]) {
            console.log(`✅ Replaced image: ${imagePath} → ${hostedMedia[filename]}`);
            return `![${altText}](${hostedMedia[filename]})`;
          }
          
          // Try case-insensitive match
          const lowerFilename = filename.toLowerCase();
          for (const [key, url] of Object.entries(hostedMedia)) {
            if (key.toLowerCase() === lowerFilename) {
              console.log(`✅ Replaced image (case-insensitive): ${imagePath} → ${url}`);
              return `![${altText}](${url})`;
            }
          }
          
          // No match found, return original
          console.debug(`⚠️ No Cloudinary URL found for image: ${imagePath} (extracted filename: ${filename})`);
          console.debug(`   Available keys: ${Object.keys(hostedMedia).join(', ')}`);
          return match;
        }
      );
    }
    
    // Check if description looks like markdown (contains markdown syntax)
    const hasMarkdownSyntax = /[#*_`\[\]()]/.test(processedDescription) || 
                              processedDescription.includes('\n\n') ||
                              processedDescription.trim().startsWith('#');
    
    if (hasMarkdownSyntax && typeof marked !== 'undefined') {
      // Convert markdown to HTML
      descriptionHTML = marked.parse(processedDescription);
    } else {
      // Plain text: split by newlines and wrap in paragraphs
      descriptionHTML = processedDescription.split('\n').map(paragraph => 
        paragraph.trim() ? `<p>${paragraph}</p>` : '<p>&nbsp;</p>'
      ).join('');
    }
  }
  
  productDescription.innerHTML = descriptionHTML;
  // Store original description for tab switching
  originalDescriptionContent = descriptionHTML;

  // Update product tags
  const tagsList = document.getElementById('tags-list');
  if (tagsList && product.tags && product.tags.length > 0) {
    // Display all tags, separated by commas
    tagsList.textContent = product.tags.join(', ');
  } else if (tagsList) {
    tagsList.textContent = '';
  }

  // Load and display carousel assets
  console.log(`🔄 About to initialize carousel for: ${productId}`);
  await initializeCarousel(productId);

  // Update changelog
  updateChangelog(product.changelog);

  // Update download button
  downloadButton.textContent = 'DOWNLOAD';
}

// Update Product Card to show Product Type description
function updateProductCardForType(typeKey) {
  if (!typeKey) {
    // Clear the card if no type selected
    productTitle.textContent = '';
    productPrice.textContent = '';
    productDescription.innerHTML = '';
    return;
  }
  
  const typeDef = productTypeDefinitions[typeKey];
  if (!typeDef) return;
  
  // Show type description in h2 size
  productTitle.innerHTML = `<h2>${typeDef.label}</h2>`;
  productPrice.textContent = '';
  productDescription.innerHTML = `<p>${typeDef.description}</p>`;
  
  // Hide download button and buy now when showing type description
  if (downloadButton) downloadButton.style.display = 'none';
  const buyNowBtn = document.getElementById('buy-now-button');
  if (buyNowBtn) buyNowBtn.style.display = 'none';
}

// Update changelog content
function updateChangelog(changelogItems) {
  const changelogContent = document.querySelector('.changelog-content ul');
  const changelogTitle = document.querySelector('#changelog-title');
  if (!changelogContent) return;

  // Clear any existing content
  changelogContent.innerHTML = '';

  // If no changelog items, show empty state
  if (!changelogItems || changelogItems.length === 0) {
    changelogContent.innerHTML = '<li style="color: #666; font-style: italic;">No changelog entries yet.</li>';
    if (changelogTitle) changelogTitle.textContent = 'CHANGELOG';
    return;
  }

  // Helper function to escape HTML
  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Helper function to format date
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  }

  // Display changelog items with version and date
  changelogContent.innerHTML = changelogItems.map(entry => {
    // Handle both old format (array of strings) and new format (array of objects)
    if (typeof entry === 'string') {
      // Legacy format: just a string
      return `<li><span class="leading-[1.05]">${escapeHtml(entry)}</span></li>`;
    } else if (entry && entry.changes) {
      // New format: object with version, date, and changes
      const version = entry.version ? escapeHtml(entry.version) : '';
      const date = formatDate(entry.date);
      const changes = Array.isArray(entry.changes) ? entry.changes : [entry.changes];
      
      // Build version and date header
      let header = '';
      if (version || date) {
        const parts = [];
        if (version) parts.push(`v${version}`);
        if (date) parts.push(date);
        header = `<span class="changelog-entry-header" style="font-weight: 600; margin-right: 0.5rem;">${parts.join(' • ')}</span>`;
      }
      
      // Build changes list
      const changesHtml = changes.map(change => {
        const escaped = escapeHtml(change);
        return `<span class="leading-[1.05]">${escaped}</span>`;
      }).join('<br>');
      
      return `<li>${header}${changesHtml}</li>`;
    } else {
      // Fallback for unexpected format
      return `<li><span class="leading-[1.05]">${escapeHtml(String(entry))}</span></li>`;
    }
  }).join('');

  // Update title
  if (changelogTitle) changelogTitle.textContent = 'CHANGELOG';
}

// Update active states for sidebar and icon grid
function updateActiveStates(productId) {
  // Update sidebar active state
  const productItems = document.querySelectorAll('.product-item');
  productItems.forEach(item => {
    if (item.dataset.product === productId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update icon grid active state
  const iconItems = document.querySelectorAll('.icon-item');
  iconItems.forEach(item => {
    if (item.dataset.product === productId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Toggle tab icon expansion/collapse
function toggleTabIcon(tabIcon, tabName) {
  const tabArrow = tabIcon.querySelector('.tab-arrow');
  
  if (tabIcon.classList.contains('expanded')) {
    tabIcon.classList.remove('expanded');
    tabIcon.classList.add('collapsed');
    if (tabArrow) tabArrow.textContent = '▶';
  } else {
    tabIcon.classList.remove('collapsed');
    tabIcon.classList.add('expanded');
    if (tabArrow) tabArrow.textContent = '▼';
  }
  
  // Also switch to this tab
  switchTab(tabName);
}

// Toggle changelog icon expansion/collapse
function toggleChangelogIcon(changelogIcon) {
  const changelogContent = changelogIcon.closest('.changelog-section').querySelector('.changelog-content');
  
  if (changelogIcon.classList.contains('expanded')) {
    changelogIcon.classList.remove('expanded');
    changelogIcon.classList.add('collapsed');
    changelogContent.style.display = 'none';
  } else {
    changelogIcon.classList.remove('collapsed');
    changelogIcon.classList.add('expanded');
    changelogContent.style.display = 'block';
  }
}

// Load markdown documentation for current product
async function loadProductDocs(productId) {
  const productDescription = document.getElementById('product-description');

  if (!productId) {
    productDescription.innerHTML = '<p>Select a product to view documentation.</p>';
    return;
  }

  try {
    const product = products[productId];
    if (!product) {
      productDescription.innerHTML = '<p>Product not found.</p>';
      return;
    }

    // Helper function to process image paths in markdown
    const processImagePaths = (markdownText, hostedMedia, docsBasePath = '') => {
      if (!markdownText) return markdownText;
      
      let processed = markdownText;
      
      // Process markdown image syntax: ![alt](path)
      if (hostedMedia) {
        processed = processed.replace(
          /!\[([^\]]*)\]\(<?([^>)]+)>?\)/g,
          (match, altText, imagePath) => {
            // Skip if already a full URL (Cloudinary or other)
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
              return match;
            }
            
            // Extract filename from path
            let cleanPath = imagePath.trim();
            cleanPath = cleanPath.replace(/^\.\//, '');
            cleanPath = cleanPath.replace(/^\.\.\//, '');
            cleanPath = decodeURIComponent(cleanPath);
            const filename = cleanPath.split('/').pop();
            
            // Try to find matching Cloudinary URL in hosted_media
            if (hostedMedia[filename]) {
              console.log(`✅ Replaced image in docs: ${imagePath} → ${hostedMedia[filename]}`);
              return `![${altText}](${hostedMedia[filename]})`;
            }
            
            // Try case-insensitive match
            const lowerFilename = filename.toLowerCase();
            for (const [key, url] of Object.entries(hostedMedia)) {
              if (key.toLowerCase() === lowerFilename) {
                console.log(`✅ Replaced image in docs (case-insensitive): ${imagePath} → ${url}`);
                return `![${altText}](${url})`;
              }
            }
            
            // If no Cloudinary URL found and we have a docsBasePath, try relative path
            if (docsBasePath && !imagePath.startsWith('http')) {
              const encodedPath = cleanPath.split('/').map(part => encodeURIComponent(part)).join('/');
              return `![${altText}](${docsBasePath}/${encodedPath})`;
            }
            
            return match;
          }
        );
      }
      
      return processed;
    };

    // 1. Check Supabase metadata for documentation first (Source of Truth)
    if (product.jsonData && product.jsonData.metadata && product.jsonData.metadata.documentation) {
      console.log(`✅ Loaded documentation from Supabase metadata for ${productId}`);
      let markdown = product.jsonData.metadata.documentation;
      
      // Process image paths to replace with Cloudinary URLs
      const hostedMedia = product.jsonData.hosted_media || {};
      markdown = processImagePaths(markdown, hostedMedia);
      
      // Parse markdown to HTML
      const htmlContent = typeof marked !== 'undefined' ? marked.parse(markdown) : `<pre>${markdown}</pre>`;
      productDescription.innerHTML = htmlContent;
      
      // Process image tags in rendered HTML (in case some weren't caught in markdown)
      if (hostedMedia && Object.keys(hostedMedia).length > 0) {
        const imgTags = productDescription.querySelectorAll('img');
        imgTags.forEach(img => {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
            const filename = src.split('/').pop();
            if (hostedMedia[filename]) {
              img.setAttribute('src', hostedMedia[filename]);
              console.log(`✅ Replaced img tag src: ${src} → ${hostedMedia[filename]}`);
            } else {
              // Try case-insensitive match
              const lowerFilename = filename.toLowerCase();
              for (const [key, url] of Object.entries(hostedMedia)) {
                if (key.toLowerCase() === lowerFilename) {
                  img.setAttribute('src', url);
                  console.log(`✅ Replaced img tag src (case-insensitive): ${src} → ${url}`);
                  break;
                }
              }
            }
          }
        });
      }
      
      // Process links to open in new tab
      const links = productDescription.querySelectorAll('a');
      links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });
      return;
    }

    // 2. Fallback to local assets (Legacy/Backup)
    // Get folder name from product (used for docs folder)
    // folderName is the original folder name like "Dojo Bolt Gen v05"
    const folderName = product.folderName || product.name;
    const docsBasePath = `/assets/product-docs/${folderName}`;
    
    // Try to find any docs_*.md file in the folder
    // First, try to get a list of files from the server (if API available)
    let docsUrl = null;
    let response = null;
    
    try {
      // Try API endpoint to list files (if available)
      const listResponse = await fetch(`${docsBasePath}/?list=1`);
      if (listResponse.ok) {
        const files = await listResponse.json();
        // Find first file starting with docs_ and ending with .md
        const docsFile = files.find(file => 
          file.toLowerCase().startsWith('docs_') && 
          file.toLowerCase().endsWith('.md')
        );
        if (docsFile) {
          docsUrl = `${docsBasePath}/${docsFile}`;
        }
      }
    } catch (e) {
      // API not available, fall back to trying common patterns
    }
    
    // If no file found via API, try common filename patterns
    if (!docsUrl) {
      const patterns = [
        `docs_${folderName}.md`,           // Exact match: docs_Dojo Bolt Gen v05.md
        `docs_${folderName.toLowerCase().replace(/\s+/g, ' ')}.md`, // Lowercase: docs_dojo bolt gen v05.md
        `docs_${folderName.toLowerCase().replace(/\s+/g, '-')}.md`, // Kebab: docs_dojo-bolt-gen-v05.md
        `docs_${folderName.toLowerCase().replace(/\s+/g, '_')}.md`, // Snake: docs_dojo_bolt_gen_v05.md
        `docs_${folderName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}.md`, // Title case
      ];
      
      // Try each pattern until one works
      // Use Promise.allSettled to try all patterns in parallel for better performance
      const patternPromises = patterns.map(async (pattern) => {
        const testUrl = `${docsBasePath}/${pattern}`;
        try {
          const testResponse = await fetch(testUrl, { method: 'HEAD' });
          if (testResponse.ok) {
            return testUrl;
          }
        } catch (e) {
          // If HEAD fails, try GET (some servers don't support HEAD)
          try {
            const testResponse = await fetch(testUrl);
            if (testResponse.ok) {
              return testUrl;
            }
          } catch (e2) {
            // Ignore errors
          }
        }
        return null;
      });
      
      const results = await Promise.allSettled(patternPromises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          docsUrl = result.value;
          break;
        }
      }
    }
    
    // If still no file found, try legacy DOCS.md
    if (!docsUrl) {
      docsUrl = `${docsBasePath}/DOCS.md`;
    }
    
    // Fetch the documentation file
    response = await fetch(docsUrl);

    if (!response.ok) {
      // Fallback to original description
      if (product && product.description) {
        productDescription.innerHTML = `<p>${product.description}</p>`;
      } else {
        productDescription.innerHTML = '<p>No documentation available for this product.</p>';
      }
      return;
    }

    let markdownContent = await response.text();
    // Markdown files may contain relative image paths that need to be replaced with Cloudinary URLs
    
    // Process image paths to replace with Cloudinary URLs from hosted_media
    const hostedMedia = product.jsonData?.hosted_media || {};
    markdownContent = processImagePaths(markdownContent, hostedMedia, docsBasePath);
    
    // Convert video markdown references to HTML5 video tags (if they're still relative paths)
    // Pattern: ![alt](video.mp4) - only if not already a Cloudinary URL
    let transformedMarkdown = markdownContent.replace(
      /!\[([^\]]*)\]\(([^)]+\.(mp4|webm|ogg|mov))\)/gi,
      (match, alt, videoPath) => {
        // Skip if already a Cloudinary URL
        if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
          const videoType = videoPath.split('.').pop().toLowerCase();
          const mimeType = videoType === 'mov' ? 'video/quicktime' : `video/${videoType}`;
          return `<div class="video-wrapper"><video controls preload="metadata"><source src="${videoPath}" type="${mimeType}">Your browser does not support the video tag.</video></div>`;
        }
        // If still relative, try to resolve (fallback for legacy content)
        const cleanPath = videoPath.replace(/^\.\//, '');
        const pathParts = cleanPath.split('/');
        const encodedParts = pathParts.map(part => encodeURIComponent(part));
        const encodedPath = encodedParts.join('/');
        const fullVideoPath = `${docsBasePath}/${encodedPath}`;
        const videoType = videoPath.split('.').pop().toLowerCase();
        const mimeType = videoType === 'mov' ? 'video/quicktime' : `video/${videoType}`;
        return `<div class="video-wrapper"><video controls preload="metadata"><source src="${fullVideoPath}" type="${mimeType}">Your browser does not support the video tag.</video></div>`;
      }
    );

    // Handle existing HTML video tags (Cloudinary URLs or relative paths)
    transformedMarkdown = transformedMarkdown.replace(
      /<video\s+([^>]*?)src=["']([^"']+\.(mp4|webm|ogg|mov))["']([^>]*?)>/gi,
      (match, beforeSrc, videoPath, ext, afterSrc) => {
        // If already Cloudinary URL, wrap in video-wrapper div
        if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
          const attrs = (beforeSrc + ' ' + afterSrc).trim().replace(/\s+/g, ' ');
          const hasPreload = attrs.includes('preload');
          const finalAttrs = hasPreload ? attrs : attrs + ' preload="metadata"';
          return `<div class="video-wrapper"><video ${finalAttrs} src="${videoPath}"></video></div>`;
        }
        // Fallback for relative paths (legacy content)
        const cleanPath = videoPath.replace(/^\.\//, '');
        const pathParts = cleanPath.split('/');
        const encodedParts = pathParts.map(part => encodeURIComponent(part));
        const encodedPath = encodedParts.join('/');
        const fullVideoPath = `${docsBasePath}/${encodedPath}`;
        const attrs = (beforeSrc + ' ' + afterSrc).trim().replace(/\s+/g, ' ');
        const hasPreload = attrs.includes('preload');
        const finalAttrs = hasPreload ? attrs : attrs + ' preload="metadata"';
        return `<div class="video-wrapper"><video ${finalAttrs} src="${fullVideoPath}"></video></div>`;
      }
    );

    // Convert 3D object references to Three.js viewer
    // Pattern: ![3D](model.obj) or [3D: model.obj]
    transformedMarkdown = transformedMarkdown.replace(
      /(?:!\[([^\]]*)\]\(|\[3D:\s*)([^)]+\.(obj|stl))\)?/gi,
      (match, alt, modelPath) => {
        // If Cloudinary URL, use directly
        if (modelPath.startsWith('http://') || modelPath.startsWith('https://')) {
          const modelId = `model-${Math.random().toString(36).substr(2, 9)}`;
          const fileExt = modelPath.split('.').pop().toLowerCase();
          return `<div class="model-viewer-container" id="${modelId}" data-model-path="${modelPath}" data-model-type="${fileExt}">
            <div style="color: #666; text-align: center;">Loading 3D model...</div>
          </div>`;
        }
        // Fallback for relative paths
        const cleanPath = modelPath.replace(/^\.\//, '');
        const fullModelPath = `${docsBasePath}/${cleanPath}`;
        const modelId = `model-${Math.random().toString(36).substr(2, 9)}`;
        const fileExt = modelPath.split('.').pop().toLowerCase();
        return `<div class="model-viewer-container" id="${modelId}" data-model-path="${fullModelPath}" data-model-type="${fileExt}">
          <div style="color: #666; text-align: center;">Loading 3D model...</div>
        </div>`;
      }
    );

    // Auto-embed YouTube and Vimeo videos
    const withEmbeddedVideos = transformedMarkdown.replace(
      /\[VIDEO:\s*(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)([^\]]+))\]/gi,
      (match, url, videoId) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          // Extract YouTube ID
          const ytId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
          return `<div class="video-embed"><iframe width="100%" height="400" src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen></iframe></div>`;
        } else if (url.includes('vimeo.com')) {
          // Extract Vimeo ID
          const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
          return `<div class="video-embed"><iframe width="100%" height="400" src="https://player.vimeo.com/video/${vimeoId}" frameborder="0" allowfullscreen></iframe></div>`;
        }
        return match;
      }
    );

    // Convert markdown to HTML
    let htmlContent;
    if (typeof marked !== 'undefined') {
      htmlContent = marked.parse(withEmbeddedVideos);
    } else {
      // Fallback if marked is not loaded
      console.warn('Marked.js not loaded, using plain text');
      htmlContent = `<pre>${withEmbeddedVideos}</pre>`;
    }

    // Update the description with rendered HTML
    productDescription.innerHTML = htmlContent;
    
    // Process image tags in rendered HTML (in case some weren't caught in markdown)
    if (hostedMedia && Object.keys(hostedMedia).length > 0) {
      const imgTags = productDescription.querySelectorAll('img');
      imgTags.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
          const filename = src.split('/').pop();
          if (hostedMedia[filename]) {
            img.setAttribute('src', hostedMedia[filename]);
            console.log(`✅ Replaced img tag src in docs: ${src} → ${hostedMedia[filename]}`);
          } else {
            // Try case-insensitive match
            const lowerFilename = filename.toLowerCase();
            for (const [key, url] of Object.entries(hostedMedia)) {
              if (key.toLowerCase() === lowerFilename) {
                img.setAttribute('src', url);
                console.log(`✅ Replaced img tag src in docs (case-insensitive): ${src} → ${url}`);
                break;
              }
            }
          }
        }
      });
    }
    
    // Process links to open in new tab
    const links = productDescription.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    // Load 3D models if Three.js is available
    if (typeof THREE !== 'undefined') {
      const modelContainers = productDescription.querySelectorAll('.model-viewer-container');
      modelContainers.forEach(container => {
        const modelPath = container.dataset.modelPath;
        const modelType = container.dataset.modelType;
        if (modelPath && modelType) {
          load3DModel(container, modelPath, modelType);
        }
      });
    }

  } catch (error) {
    console.error('Error loading documentation:', error);
    // Fallback to original description
    const product = products[productId];
    if (product && product.description) {
      productDescription.innerHTML = `<p>${product.description}</p>`;
    } else {
      productDescription.innerHTML = '<p>Error loading documentation.</p>';
    }
  }
}

// Load 3D model using Three.js (low priority feature)
async function load3DModel(container, modelPath, modelType) {
  if (typeof THREE === 'undefined') {
    container.innerHTML = '<div style="color: #999; text-align: center;">3D viewer not available</div>';
    return;
  }

  try {
    // Dynamically import loaders if not available
    let OBJLoader, STLLoader;
    if (typeof THREE.OBJLoader !== 'undefined') {
      OBJLoader = THREE.OBJLoader;
      STLLoader = THREE.STLLoader;
    } else {
      // Try to load from CDN dynamically
      try {
        const objModule = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js');
        const stlModule = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/STLLoader.js');
        OBJLoader = objModule.OBJLoader;
        STLLoader = stlModule.STLLoader;
      } catch (e) {
        console.warn('Could not load Three.js loaders:', e);
        container.innerHTML = '<div style="color: #999; text-align: center;">3D loader not available</div>';
        return;
      }
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / 400, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(container.clientWidth, 400);
    renderer.setClearColor(0xf5f5f5, 1);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Load model
    const loader = modelType === 'obj' 
      ? new OBJLoader()
      : new STLLoader();

    loader.load(
      modelPath,
      (object) => {
        // Handle STL geometry differently from OBJ
        let model;
        if (modelType === 'stl' && object.isBufferGeometry) {
          const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
          model = new THREE.Mesh(object, material);
        } else {
          model = object;
        }

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 2 / maxDim : 1;
        
        model.scale.multiplyScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        
        scene.add(model);
        
        // Position camera
        camera.position.set(3, 3, 3);
        camera.lookAt(0, 0, 0);
        
        // Add controls (simple rotation)
        let mouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        
        renderer.domElement.addEventListener('mousedown', (e) => {
          mouseDown = true;
          mouseX = e.clientX;
          mouseY = e.clientY;
        });
        
        renderer.domElement.addEventListener('mousemove', (e) => {
          if (!mouseDown) return;
          const deltaX = e.clientX - mouseX;
          const deltaY = e.clientY - mouseY;
          model.rotation.y += deltaX * 0.01;
          model.rotation.x += deltaY * 0.01;
          mouseX = e.clientX;
          mouseY = e.clientY;
        });
        
        renderer.domElement.addEventListener('mouseup', () => {
          mouseDown = false;
        });
        
        // Animation loop
        function animate() {
          requestAnimationFrame(animate);
          renderer.render(scene, camera);
        }
        animate();
      },
      undefined,
      (error) => {
        console.error('Error loading 3D model:', error);
        container.innerHTML = '<div style="color: #999; text-align: center;">Failed to load 3D model</div>';
      }
    );
  } catch (error) {
    console.error('Error initializing 3D viewer:', error);
    container.innerHTML = '<div style="color: #999; text-align: center;">3D viewer initialization failed</div>';
  }
}

// Switch between tabs
async function switchTab(tabName) {
  // Update tab active states
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update tab icon states
  const tabIcons = document.querySelectorAll('.tab-icon');
  tabIcons.forEach(icon => {
    const tabArrow = icon.querySelector('.tab-arrow');
    if (icon.dataset.tab === tabName) {
      icon.classList.remove('collapsed');
      icon.classList.add('expanded');
      if (tabArrow) tabArrow.textContent = '▼';
    } else {
      icon.classList.remove('expanded');
      icon.classList.add('collapsed');
      if (tabArrow) tabArrow.textContent = '▶';
    }
  });

  // Update content based on tab
  const productDescription = document.getElementById('product-description');
  const changelogSection = document.querySelector('.changelog-section');

  switch(tabName) {
    case 'description':
      // Show product description and changelog from JSON
      productDescription.style.display = 'block';
      changelogSection.style.display = 'flex';
      // Restore original description content if it was replaced by docs
      if (originalDescriptionContent) {
        productDescription.innerHTML = originalDescriptionContent;
      } else {
        // Fallback: get description from current product
        const productCard = document.querySelector('.product-left-section')?.closest('.product-card') ||
                            document.querySelector('.product-left-section')?.parentElement;
        const currentProductId = productCard?.dataset?.productId || currentProduct;
        const product = products[currentProductId];
        if (product && product.description) {
          // Convert description to HTML (supports both markdown and plain text)
          let descriptionHTML = '';
          const hasMarkdownSyntax = /[#*_`\[\]()]/.test(product.description) || 
                                    product.description.includes('\n\n') ||
                                    product.description.trim().startsWith('#');
          
          if (hasMarkdownSyntax && typeof marked !== 'undefined') {
            descriptionHTML = marked.parse(product.description);
          } else {
            descriptionHTML = product.description.split('\n').map(paragraph => 
              paragraph.trim() ? `<p>${paragraph}</p>` : '<p>&nbsp;</p>'
            ).join('');
          }
          
          productDescription.innerHTML = descriptionHTML;
          originalDescriptionContent = descriptionHTML;
        }
      }
      break;
    case 'docs':
      // Hide description and changelog, load markdown documentation
      productDescription.style.display = 'block';
      changelogSection.style.display = 'none';
      // Load markdown documentation
      const productCard = document.querySelector('.product-left-section')?.closest('.product-card') ||
                          document.querySelector('.product-left-section')?.parentElement;
      const currentProductId = productCard?.dataset?.productId || currentProduct;
      await loadProductDocs(currentProductId);
      break;
  }
}

// Download product - uses proxy endpoint with ownership verification
async function downloadProduct(productId) {
  console.log('=== Download Product Called ===');
  console.log('Product ID:', productId);

  const product = products[productId];
  if (!product) {
    console.warn(`Product not found in products object: ${productId}`);
    console.log('Available products:', Object.keys(products));
    return;
  }

  // Get Polar product mapping
  const productSlug = productId.toLowerCase().replace(/\s+/g, '-');
  const polarProduct = getPolarProductData(productSlug);
  
  if (!polarProduct || !polarProduct.productId) {
    console.warn(`No Polar product mapping found for: ${productId}`);
    alert('Download not available for this product. Please contact support.');
    return;
  }

  // Check sessionStorage for purchase info
  const purchaseInfoStr = sessionStorage.getItem('purchase_info');
  if (!purchaseInfoStr) {
    alert('Purchase information not found. Please complete a purchase first or contact support.');
    return;
  }

  let purchaseInfo;
  try {
    purchaseInfo = JSON.parse(purchaseInfoStr);
  } catch (error) {
    console.error('Error parsing purchase info:', error);
    alert('Error accessing purchase information. Please contact support.');
    return;
  }

  // Verify this product is owned
  if (!purchaseInfo.ownedProducts || !purchaseInfo.ownedProducts.includes(polarProduct.productId)) {
    alert('You do not own this product. Please purchase it first.');
    return;
  }

  // Find download info
  const downloadInfo = purchaseInfo.downloads?.find(d => d.productId === polarProduct.productId);
  
  if (!downloadInfo) {
    alert('Download file not available yet. Please check your email for download links or contact support.');
    return;
  }

  // Show loading state
  const originalText = downloadButton.textContent;
  downloadButton.textContent = 'DOWNLOADING...';
  downloadButton.disabled = true;

  try {
    // Download via proxy endpoint
    await downloadProductFile(polarProduct.productId, purchaseInfo.email, downloadInfo.filename);
    
    // Reset button after short delay
    setTimeout(() => {
      downloadButton.textContent = originalText;
      downloadButton.disabled = false;
    }, 1000);
  } catch (error) {
    console.error('Download failed:', error);
    alert(`Download failed: ${error.message}\n\nPlease try again or contact support.`);
    downloadButton.textContent = originalText;
    downloadButton.disabled = false;
  }
}

// Keyboard navigation support
document.addEventListener('keydown', async function(e) {
  if (e.key === 'Escape') {
    // Close any open modals or reset selections
    console.log('Escape pressed - resetting to default product');
    await selectProduct('dojo-bool-v5');
  }
});

// Handle window resize for responsive behavior
window.addEventListener('resize', function() {
  // Update layout if needed
  console.log('Window resized - layout updated');
});

// Error handling for missing images
document.addEventListener('error', function(e) {
  if (e.target.tagName === 'IMG') {
    // Skip header assets - they have their own error handling
    const id = e.target.id;
    const className = e.target.className || '';
    if (id === 'header-logo' || 
        id === 'cart-icon' || 
        className.includes('account-icon-image') ||
        className.includes('member-cta-icon') ||
        className.includes('footer-logo')) {
      console.warn(`Failed to load header asset: ${e.target.src}`);
      // Don't set fallback for header assets - let them handle it themselves
      return;
    }
    
    console.warn(`Failed to load image: ${e.target.src}`);
    
    // Fallback for icon images (carousel handles its own fallbacks)
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SWNvbjwvdGV4dD4KPC9zdmc+';
  }
}, true);

// Initialize with default product
console.log('NO3D Tools website initialized');

// ==================== CMD+K SEARCH FUNCTIONALITY ====================

console.log('🔍 Initializing CMD+K search functionality...');

const searchModal = document.getElementById('search-modal');
const searchModalBackdrop = document.getElementById('search-modal-backdrop');
const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results-container');
const searchResultsEmpty = document.getElementById('search-results-empty');

console.log('🔍 Search elements:', {
  searchModal,
  searchModalBackdrop,
  searchInput,
  searchResultsContainer,
  searchResultsEmpty
});

// Verify all search elements exist
if (!searchModal || !searchModalBackdrop || !searchInput || !searchResultsContainer || !searchResultsEmpty) {
  console.error('❌ Search elements not found! Some search functionality may not work.');
}

let searchResults = [];
let selectedResultIndex = -1;
let previousSearchResults = []; // Track previous results for animation
let searchResultElements = new Map(); // Cache of rendered elements by productId

// Open search modal with CMD+K or Ctrl+K
document.addEventListener('keydown', function(e) {
  // CMD+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (searchModal) {
      openSearchModal();
    }
  }

  // ESC to close modal
  if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
    closeSearchModal();
  }
});

function openSearchModal() {
  if (!searchModal || !searchModalBackdrop || !searchInput) {
    console.error('Cannot open search modal: required elements missing');
    return;
  }
  searchModal.classList.add('active');
  searchModalBackdrop.classList.add('active');
  searchInput.value = '';
  searchInput.focus();
  performSearch('');
}

function closeSearchModal() {
  if (!searchModal || !searchModalBackdrop) {
    return;
  }
  searchModal.classList.remove('active');
  searchModalBackdrop.classList.remove('active');
  selectedResultIndex = -1;
}

// Close modal when clicking backdrop
if (searchModalBackdrop) {
  searchModalBackdrop.addEventListener('click', closeSearchModal);
}

// Search input handler
if (searchInput) {
  console.log('🔧 Attaching search input listener, searchInput element:', searchInput);
  searchInput.addEventListener('input', function(e) {
    console.log('⌨️ Search input event fired, value:', e.target.value);
    performSearch(e.target.value);
  });

  // Keyboard navigation in search results
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
      if (productId) {
        (async () => { await selectProduct(productId); })();
        closeSearchModal();
      }
    }
  });
}

// Fuzzy search scoring function
function fuzzyMatchScore(pattern, text) {
  if (!pattern || !text) return 0;
  
  pattern = pattern.toLowerCase();
  text = text.toLowerCase();
  
  // Exact match gets highest score
  if (text === pattern) return 1000;
  
  // Starts with pattern gets very high score
  if (text.startsWith(pattern)) return 800;
  
  // Contains pattern as substring gets high score
  if (text.includes(pattern)) return 600;
  
  // Fuzzy match: check if all pattern characters appear in order
  let patternIndex = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;
  let firstMatchIndex = -1;
  let totalMatches = 0;
  
  for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
    if (text[i] === pattern[patternIndex]) {
      if (firstMatchIndex === -1) firstMatchIndex = i;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      totalMatches++;
      patternIndex++;
    } else {
      consecutiveMatches = 0;
    }
  }
  
  // If not all characters matched, return 0
  if (patternIndex < pattern.length) return 0;
  
  // Calculate score based on:
  // - How many characters matched (totalMatches)
  // - Longest consecutive match (maxConsecutive)
  // - Position of first match (earlier is better)
  // - How close together matches are (text.length - lastMatchIndex)
  const score = 100 + 
    (totalMatches * 10) + 
    (maxConsecutive * 20) + 
    (firstMatchIndex === 0 ? 50 : Math.max(0, 50 - firstMatchIndex * 2));
  
  return score;
}

// Get all searchable text for a product
function getProductSearchText(product) {
  const texts = [];
  
  if (product.name) texts.push(product.name);
  if (product.description) texts.push(product.description);
  if (product.productType) texts.push(product.productType);
  
  if (product.changelog && Array.isArray(product.changelog)) {
    product.changelog.forEach(item => {
      if (item) texts.push(item);
    });
  }
  
  if (product.groups && Array.isArray(product.groups)) {
    product.groups.forEach(group => {
      if (group) texts.push(group);
    });
  }
  
  return texts.join(' ');
}

function performSearch(query) {
  // Handle undefined/null queries gracefully
  const searchTerm = (query || '').trim();

  // Get all product IDs
  const allProducts = Object.keys(products);
  console.log('🔍 Search - Query:', query, 'Products available:', allProducts.length, 'Product IDs:', allProducts);

  if (searchTerm === '') {
    // Show all products when search is empty
    searchResults = allProducts;
  } else {
    // Score and filter products using fuzzy search
    const scoredResults = allProducts
      .map(productId => {
        const product = products[productId];
        
        // Skip if product data is missing
        if (!product) {
          return { productId, score: 0 };
        }
        
        // Get all searchable text
        const searchText = getProductSearchText(product);
        
        // Calculate fuzzy match score
        let maxScore = 0;
        
        // Score name separately (highest weight)
        if (product.name) {
          const nameScore = fuzzyMatchScore(searchTerm, product.name);
          maxScore = Math.max(maxScore, nameScore * 1.5); // Name gets 1.5x weight
        }
        
        // Score full search text
        const textScore = fuzzyMatchScore(searchTerm, searchText);
        maxScore = Math.max(maxScore, textScore);
        
        // Also check individual fields for better matching
        if (product.description) {
          const descScore = fuzzyMatchScore(searchTerm, product.description);
          maxScore = Math.max(maxScore, descScore * 0.8); // Description gets 0.8x weight
        }
        
        return { productId, score: maxScore };
      })
      .filter(result => result.score > 0) // Only include products with matches
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .map(result => result.productId); // Extract just the product IDs
    
    searchResults = scoredResults;
  }

  selectedResultIndex = searchResults.length > 0 ? 0 : -1;
  renderSearchResults();
}

function renderSearchResults() {
  console.log('🎨 renderSearchResults called, results count:', searchResults.length);
  console.log('   searchResultsContainer:', searchResultsContainer);
  console.log('   searchResultsEmpty:', searchResultsEmpty);

  if (!searchResultsContainer || !searchResultsEmpty) {
    console.error('Cannot render search results: container elements missing');
    return;
  }

  if (searchResults.length === 0) {
    console.log('   ❌ No results, showing empty state');
    searchResultsContainer.innerHTML = '';
    searchResultsEmpty.style.display = 'flex';
    searchResultElements.clear();
    previousSearchResults = [];
    return;
  }

  console.log('   ✅ Rendering', searchResults.length, 'results');
  searchResultsEmpty.style.display = 'none';

  // Create a document fragment for efficient DOM manipulation
  const fragment = document.createDocumentFragment();
  const newElements = new Map();
  const existingElements = new Set();

  // First pass: reuse existing elements or create new ones
  searchResults.forEach((productId, newIndex) => {
    const product = products[productId];
    
    // Skip if product data is missing
    if (!product) {
      console.warn('   ⚠️ Product data missing for ID:', productId);
      return;
    }

    let resultItem = searchResultElements.get(productId);
    const wasExisting = !!resultItem;
    const oldIndex = previousSearchResults.indexOf(productId);

    // Create new element if it doesn't exist
    if (!resultItem) {
      resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      resultItem.innerHTML = `
        <div class="search-result-content">
          <div class="search-result-title">${product.name || 'Unknown Product'}</div>
          <div class="search-result-price">${product.price || 'N/A'}</div>
        </div>
      `;

      resultItem.addEventListener('click', async () => {
        await selectProduct(productId);
        closeSearchModal();
      });
      
      // Stagger animation for new items
      resultItem.style.animationDelay = `${Math.min(newIndex * 0.03, 0.3)}s`;
    } else {
      // Element exists, remove it from current position
      if (resultItem.parentNode) {
        resultItem.parentNode.removeChild(resultItem);
      }
      // Reset animation state
      resultItem.style.opacity = '';
      resultItem.style.transform = '';
      resultItem.style.animationDelay = '';
      resultItem.classList.remove('animating');
    }

    // Update selection state
    if (newIndex === selectedResultIndex) {
      resultItem.classList.add('selected');
    } else {
      resultItem.classList.remove('selected');
    }

    // If item moved position, add animation class
    if (wasExisting && oldIndex !== -1 && oldIndex !== newIndex) {
      resultItem.classList.add('animating');
    }

    newElements.set(productId, resultItem);
    existingElements.add(productId);
    fragment.appendChild(resultItem);
  });

  // Remove elements that are no longer in results
  searchResultElements.forEach((element, productId) => {
    if (!existingElements.has(productId)) {
      // Fade out removed items
      element.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
      element.style.opacity = '0';
      element.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 200);
    }
  });

  // Append fragment to container
  searchResultsContainer.appendChild(fragment);

  // Update caches
  searchResultElements = newElements;
  previousSearchResults = [...searchResults];

  // Trigger reflow to ensure animations work
  searchResultsContainer.offsetHeight;
}

function updateSearchSelection() {
  if (!searchResultsContainer) {
    return;
  }
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

console.log('CMD+K search functionality initialized');

// ==================== MOBILE MENU FUNCTIONALITY ====================

/**
 * Mobile Hamburger Menu
 * Handles sidebar toggle on mobile devices
 */

const hamburgerButton = document.getElementById('hamburger-menu-button');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');

// Open sidebar menu
function openMobileMenu() {
  if (sidebar) {
    sidebar.classList.add('open');
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.classList.add('active');
  }
  if (hamburgerButton) {
    hamburgerButton.classList.add('active');
  }
  // Prevent body scroll when menu is open
  document.body.style.overflow = 'hidden';
}

// Close sidebar menu
function closeMobileMenu() {
  if (sidebar) {
    sidebar.classList.remove('open');
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.classList.remove('active');
  }
  if (hamburgerButton) {
    hamburgerButton.classList.remove('active');
  }
  // Restore body scroll
  document.body.style.overflow = '';
}

// Toggle sidebar menu
function toggleMobileMenu() {
  if (sidebar && sidebar.classList.contains('open')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

// Initialize mobile menu functionality
function initializeMobileMenu() {
  // Hamburger button click
  if (hamburgerButton) {
    hamburgerButton.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleMobileMenu();
    });
  }

  // Sidebar backdrop click (close menu)
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeMobileMenu);
  }

  // Close menu when clicking on a product item (mobile only)
  if (sidebar) {
    sidebar.addEventListener('click', function(e) {
      // Only close if clicking on a product item (not category headers)
      if (e.target.closest('.product-item')) {
        // Use a small delay to allow the product selection to happen first
        setTimeout(() => {
          if (window.innerWidth <= 768) {
            closeMobileMenu();
          }
        }, 100);
      }
    });
  }

  // ESC key to close menu
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      // Close mobile menu if open
      if (sidebar && sidebar.classList.contains('open')) {
        closeMobileMenu();
      }
    }
  });

  // Close menu on window resize if switching back to desktop
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });

  console.log('Mobile menu functionality initialized');
}

// ==================== SHOPPING CART FUNCTIONALITY ====================

/**
 * Shopping Cart Manager
 * Handles cart state, localStorage persistence, and Polar checkout integration
 */

// Cart storage key
const CART_STORAGE_KEY = 'no3d_tools_cart';

// Cart state
let cart = {
  items: [],
  
  // Load cart from localStorage
  load() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        this.items = JSON.parse(stored);

        // Migrate old cart items to include priceId
        let needsMigration = false;
        this.items = this.items.map(item => {
          if (!item.polarPriceId && item.productId) {
            // Try to get price ID from POLAR_PRODUCTS
            const polarProduct = typeof POLAR_PRODUCTS !== 'undefined'
              ? POLAR_PRODUCTS[item.productId]
              : null;

            if (polarProduct && polarProduct.priceId) {
              console.log('Migrating cart item:', item.productName, 'adding priceId:', polarProduct.priceId);
              needsMigration = true;
              return {
                ...item,
                polarProductId: polarProduct.productId,
                polarPriceId: polarProduct.priceId
              };
            }
          }
          return item;
        });

        // Save migrated cart
        if (needsMigration) {
          console.log('Cart migrated with price IDs');
          this.save();
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this.items = [];
    }
    this.updateUI();
  },
  
  // Save cart to localStorage
  save() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  },
  
  // Normalize price string for storage
  normalizePrice(priceString) {
    if (!priceString) {
      return 'FREE';
    }
    
    // If already formatted nicely, use as-is
    if (priceString.includes('$')) {
      return priceString;
    }
    
    // If it's just a number, format it
    const numericPrice = this.parsePrice(priceString);
    if (numericPrice > 0) {
      return this.formatCurrency(numericPrice);
    }
    
    return 'FREE';
  },
  
  // Add product to cart
  add(productId, productName, polarProductId, polarPriceId, checkoutUrl, price = null) {
    // Check if product already in cart
    const existingIndex = this.items.findIndex(item => item.productId === productId);

    if (existingIndex >= 0) {
      // Product already in cart - show message
      console.log('Product already in cart:', productName);
      // Could show a toast notification here
      return false;
    }

    // Normalize price for storage
    const normalizedPrice = this.normalizePrice(price);

    // Add new item
    const item = {
      productId,
      productName,
      polarProductId,
      polarPriceId, // Store price ID for checkout
      checkoutUrl,
      price: normalizedPrice,
      addedAt: new Date().toISOString()
    };

    this.items.push(item);
    this.save();
    this.updateUI();

    console.log('Added to cart:', productName, 'at', normalizedPrice, 'priceId:', polarPriceId);
    return true;
  },
  
  // Remove product from cart
  remove(productId) {
    const index = this.items.findIndex(item => item.productId === productId);
    if (index >= 0) {
      const removed = this.items.splice(index, 1)[0];
      this.save();
      this.updateUI();
      console.log('Removed from cart:', removed.productName);
      return true;
    }
    return false;
  },
  
  // Clear cart
  clear() {
    this.items = [];
    this.save();
    this.updateUI();
  },
  
  // Parse price string to number
  parsePrice(priceString) {
    if (!priceString || typeof priceString !== 'string') {
      return 0;
    }
    
    // Handle "FREE" or empty strings
    const normalized = priceString.trim().toUpperCase();
    if (normalized === 'FREE' || normalized === '' || normalized === 'N/A') {
      return 0;
    }
    
    // Extract numeric value from price string
    // Handles formats like: "$4.44", "PRICE: $4.44", "4.44", "$4,444.44"
    const priceMatch = priceString.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      // Remove commas and parse as float
      const numericValue = parseFloat(priceMatch[0].replace(/,/g, ''));
      return isNaN(numericValue) ? 0 : numericValue;
    }
    
    return 0;
  },
  
  // Get cart total (calculated from actual product prices)
  getTotal() {
    if (this.items.length === 0) {
      return '$0.00';
    }
    
    // Sum all item prices
    const total = this.items.reduce((sum, item) => {
      const itemPrice = this.parsePrice(item.price);
      return sum + itemPrice;
    }, 0);
    
    // Format as currency
    return this.formatCurrency(total);
  },
  
  // Format number as currency string
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },
  
  // Get price IDs for Polar checkout (deprecated - use getCheckoutProducts instead)
  getPriceIds() {
    return this.items.map(item => item.polarPriceId).filter(id => id);
  },

  // Get product IDs for Polar checkout (deprecated - use getCheckoutProducts instead)
  getProductIds() {
    return this.items.map(item => item.polarProductId).filter(id => id);
  },

  // Get product IDs for Polar checkout (SDK expects array of product ID strings)
  getCheckoutProducts() {
    return this.items
      .filter(item => item.polarProductId)
      .map(item => item.polarProductId);
  },
  
  // Update cart UI
  updateUI() {
    updateCartBadge();
    updateCartItems();
    updateCartTotal();
    updateCheckoutButton();
  }
};

// Cart UI Elements
const cartModal = document.getElementById('cart-modal');
const cartModalBackdrop = document.getElementById('cart-modal-backdrop');
const cartCloseButton = document.getElementById('cart-close-button');
const cartIconWrapper = document.getElementById('cart-icon-wrapper');
const cartBadge = document.getElementById('cart-badge');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartEmpty = document.getElementById('cart-empty');
const cartTotalAmount = document.getElementById('cart-total-amount');
const cartCheckoutButton = document.getElementById('cart-checkout-button');
const cartContinueShoppingButton = document.getElementById('cart-continue-shopping-button');
const buyNowButton = document.getElementById('buy-now-button');

// Open cart modal
function openCartModal() {
  cartModal.classList.add('active');
  cartModalBackdrop.classList.add('active');
  cart.load(); // Refresh cart data
}

// Close cart modal
function closeCartModal() {
  cartModal.classList.remove('active');
  cartModalBackdrop.classList.remove('active');
}

// Update cart badge
function updateCartBadge() {
  const count = cart.items.length;
  cartBadge.textContent = count > 0 ? count.toString() : '';
}

// Update cart items display
function updateCartItems() {
  if (cart.items.length === 0) {
    cartEmpty.style.display = 'flex';
    cartItemsContainer.innerHTML = '';
    return;
  }
  
  cartEmpty.style.display = 'none';
  
  cartItemsContainer.innerHTML = cart.items.map(item => {
    return `
      <div class="cart-item" data-product-id="${item.productId}">
        <div class="cart-item-info">
          <span class="cart-item-name">${item.productName}</span>
          <span class="cart-item-price">${item.price}</span>
        </div>
        <button class="cart-item-remove" data-product-id="${item.productId}" aria-label="Remove ${item.productName}">
          REMOVE
        </button>
      </div>
    `;
  }).join('');
  
  // Add event listeners to remove buttons
  cartItemsContainer.querySelectorAll('.cart-item-remove').forEach(button => {
    button.addEventListener('click', function() {
      const productId = this.dataset.productId;
      cart.remove(productId);
    });
  });
}

// Update cart total
function updateCartTotal() {
  cartTotalAmount.textContent = cart.getTotal();
}

// Update checkout button state
function updateCheckoutButton() {
  const hasItems = cart.items.length > 0;
  cartCheckoutButton.disabled = !hasItems;
}

// Get Polar product data for current product
function getPolarProductData(productSlug) {
  if (typeof POLAR_PRODUCTS === 'undefined') {
    console.error('POLAR_PRODUCTS is not defined. Make sure polar-products.js is loaded.');
    return null;
  }
  
  console.log('Looking for product with slug:', productSlug);
  console.log('Available POLAR_PRODUCTS keys:', Object.keys(POLAR_PRODUCTS));
  
  // Try to find product in POLAR_PRODUCTS
  let polarProduct = POLAR_PRODUCTS[productSlug];
  
  // If not found by exact slug, try fuzzy matching
  if (!polarProduct) {
    console.log('Exact match not found, trying fuzzy match...');
    polarProduct = Object.values(POLAR_PRODUCTS).find(p => {
      const nameMatch = p.name.toLowerCase().includes(productSlug.toLowerCase());
      const slugMatch = Object.keys(POLAR_PRODUCTS).some(key => 
        key.toLowerCase().includes(productSlug.toLowerCase()) || 
        productSlug.toLowerCase().includes(key.toLowerCase())
      );
      return nameMatch || slugMatch;
    });
  }
  
  if (polarProduct) {
    console.log('Found Polar product:', polarProduct);
    if (!polarProduct.productId) {
      console.error('Polar product found but missing productId:', polarProduct);
    }
  } else {
    console.error('No Polar product found for slug:', productSlug);
    console.log('Available products:', Object.keys(POLAR_PRODUCTS).map(key => ({
      key,
      name: POLAR_PRODUCTS[key].name
    })));
  }
  
  return polarProduct || null;
}

// Select a product and immediately trigger buy flow (used by banner buttons)
async function selectProductAndBuy(productName) {
  console.log('selectProductAndBuy called with:', productName);
  currentProduct = productName;
  await handleBuyNow();
}

// Open embedded checkout modal for current product
async function handleBuyNow() {
  if (!currentProduct) {
    console.error('No current product selected');
    return;
  }

  // Get product slug from currentProduct
  const productSlug = currentProduct.toLowerCase().replace(/\s+/g, '-');

  // Get Polar product data
  const polarProduct = getPolarProductData(productSlug);

  if (!polarProduct || (!polarProduct.productId && !polarProduct.checkoutUrl)) {
    console.error('Polar product data not found for:', currentProduct);
    console.error('Product slug used:', productSlug);
    console.error('POLAR_PRODUCTS available:', typeof POLAR_PRODUCTS !== 'undefined');

    // Provide more helpful error message
    const errorMsg = polarProduct
      ? 'Product checkout configuration error. Please contact support.'
      : `Product "${currentProduct}" is not available for checkout. Please try again later.`;

    alert(errorMsg);
    return;
  }

  // If product has direct checkout URL (e.g., gift cards), redirect to it
  if (polarProduct.checkoutUrl) {
    console.log('Redirecting to checkout URL:', polarProduct.checkoutUrl);
    window.open(polarProduct.checkoutUrl, '_blank');
    return;
  }

  // Disable button immediately for instant feedback
  if (buyNowButton) {
    buyNowButton.disabled = true;
    buyNowButton.textContent = 'OPENING CHECKOUT...';
  }

  // Defer checkout creation to avoid blocking UI
  // This improves INP (Interaction to Next Paint) performance
  setTimeout(async () => {
    try {
      // Pass the product ID for checkout (Polar SDK requires product IDs, not price IDs)
      await openCheckoutModal([polarProduct.productId]);
    } catch (error) {
      console.error('Failed to open checkout:', error);
      alert(`Checkout failed: ${error.message}\n\nPlease try again or contact support.`);
      // Re-enable button on error
      if (buyNowButton) {
        buyNowButton.disabled = false;
        buyNowButton.textContent = 'BUY NOW';
      }
    }
  }, 0);
}

// Checkout Modal UI Elements
const checkoutModal = document.getElementById('checkout-modal');
const checkoutModalBackdrop = document.getElementById('checkout-modal-backdrop');
const checkoutCloseButton = document.getElementById('checkout-close-button');
const checkoutContentContainer = document.getElementById('checkout-content-container');
const checkoutLoading = document.getElementById('checkout-loading');
const checkoutError = document.getElementById('checkout-error');

// Open checkout modal UI
function openCheckoutModalUI() {
  checkoutModal.classList.add('active');
  checkoutModalBackdrop.classList.add('active');
  checkoutLoading.style.display = 'flex';
  checkoutError.style.display = 'none';
  // Clear any previous iframe content
  const existingIframe = checkoutContentContainer.querySelector('iframe');
  if (existingIframe) {
    existingIframe.remove();
  }
  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden';
}

// Close checkout modal UI
function closeCheckoutModalUI() {
  checkoutModal.classList.remove('active');
  checkoutModalBackdrop.classList.remove('active');
  checkoutLoading.style.display = 'none';
  checkoutError.style.display = 'none';
  // Clear iframe content
  const existingIframe = checkoutContentContainer.querySelector('iframe');
  if (existingIframe) {
    existingIframe.remove();
  }
  // Restore body scroll
  document.body.style.overflow = '';
}

// According to Polar docs, PolarEmbedCheckout.create() accepts the full checkout URL
// No need to extract ID - just use the URL directly

// Check if we're in local development (no API available)
function isLocalDevelopment() {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.protocol === 'file:';
}

// Get checkout URL directly from product (for local dev fallback)
function getDirectCheckoutUrl(productIds) {
  // Try to get checkout URL from POLAR_PRODUCTS
  if (typeof POLAR_PRODUCTS !== 'undefined' && productIds.length > 0) {
    const productId = productIds[0];
    const product = Object.values(POLAR_PRODUCTS).find(p => p.productId === productId);
    if (product && product.url) {
      return product.url;
    }
  }
  return null;
}

// Open Polar embedded checkout modal
async function openCheckoutModal(productIds) {
  console.log('Creating checkout for product IDs:', productIds);

  // Open modal UI immediately
  openCheckoutModalUI();

  try {
    let data;
    
    // In local development, API endpoint won't work - redirect directly to full page checkout
    if (isLocalDevelopment()) {
      console.log('Local development detected - API endpoint not available');
      console.log('Redirecting directly to full page checkout...');
      
      // Show message briefly, then redirect
      checkoutLoading.style.display = 'none';
      checkoutError.style.display = 'flex';
      checkoutError.innerHTML = `
        <span class="checkout-error-text">
          Local preview mode detected.<br><br>
          Checkout API requires serverless functions.<br><br>
          Redirecting to full page checkout...
        </span>
      `;
      
      // Try to create checkout via direct API call to Polar (if we have the token)
      // Otherwise, just redirect to organization page
      setTimeout(() => {
        // For local dev, we can't create checkout sessions, so redirect to organization page
        // In production, this will work properly with the API endpoint
        const orgUrl = 'https://polar.sh/no3d-tools';
        console.log('Redirecting to Polar organization page:', orgUrl);
        window.location.href = orgUrl;
      }, 2000);
      return;
    } else {
      // Check if customer has credit to apply
      const customerEmail = localStorage.getItem('customer_email');
      let creditBalance = 0;

      if (customerEmail) {
        try {
          const creditResponse = await fetch(`/api/credit/balance?email=${encodeURIComponent(customerEmail)}`);
          if (creditResponse.ok) {
            const creditData = await creditResponse.json();
            creditBalance = creditData.balance || 0;
            console.log(`Customer credit balance: $${(creditBalance / 100).toFixed(2)}`);
          }
        } catch (creditError) {
          console.log('Could not fetch credit balance:', creditError);
        }
      }

      let response;

      // If customer has credit, use apply-to-checkout endpoint
      if (creditBalance > 0 && customerEmail && productIds.length === 1) {
        console.log('Using credit checkout endpoint');
        response = await fetch('/api/credit/apply-to-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: customerEmail,
            productId: productIds[0],
            successUrl: window.location.origin + '/success'
          })
        });
      } else {
        // Call regular serverless function to create checkout session
        response = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productIds: productIds
          })
        });
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();

        // Log if credit was applied
        if (data.creditApplied && data.creditApplied > 0) {
          console.log(`Credit applied: $${(data.creditApplied / 100).toFixed(2)}`);
        }
      } else {
        const textResponse = await response.text();
        console.error('Non-JSON response from API:', textResponse);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (!data.url) {
        throw new Error('No checkout URL returned');
      }
    }

    console.log('Checkout session created:', data.id);
    console.log('Checkout URL:', data.url);

    // Try to use embedded checkout modal
    try {
      // Wait for Polar SDK to be available
      // The SDK exposes window.Polar.EmbedCheckout
      let PolarEmbedCheckout = window.Polar?.EmbedCheckout;

      // If not available, try waiting a bit for the script to load
      if (!PolarEmbedCheckout) {
        console.log('Waiting for Polar SDK to load...');
        await new Promise((resolve) => {
          let attempts = 0;
          const checkInterval = setInterval(() => {
            PolarEmbedCheckout = window.Polar?.EmbedCheckout;
            attempts++;
            if (PolarEmbedCheckout || attempts > 30) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }

      // Debug: Log what's available
      console.log('Polar SDK check:', {
        hasPolar: !!window.Polar,
        hasPolarEmbedCheckout: !!window.Polar?.EmbedCheckout,
        windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('polar')),
        scriptSrc: document.querySelector('script[src*="polar-sh/checkout"]')?.src
      });

      // If Polar SDK is still not available after all checks
      if (!PolarEmbedCheckout) {
        console.error('Polar SDK not found. Available window properties:', {
          polarKeys: Object.keys(window).filter(k => k.toLowerCase().includes('polar')),
          hasPolar: !!window.Polar,
          hasScript: document.querySelector('script[src*="polar-sh/checkout"]') !== null,
          scriptSrc: document.querySelector('script[src*="polar-sh/checkout"]')?.src
        });
        throw new Error('Polar SDK not loaded. Please check that the script is loading correctly.');
      }

      // If Polar SDK is available, use embedded modal
      if (PolarEmbedCheckout) {
        console.log('Using Polar embedded checkout modal');
        console.log('Checkout URL:', data.url);

        if (!data.url) {
          throw new Error('No checkout URL available');
        }

        // Hide loading state
        checkoutLoading.style.display = 'none';

        // Create checkout using Polar.EmbedCheckout.create()
        // Pass the full URL directly
        console.log('Creating embedded checkout with URL:', data.url);
        const checkout = await PolarEmbedCheckout.create(data.url, "light");

        // Handle successful checkout
        checkout.addEventListener("success", async (eventData) => {
          console.log('Checkout completed successfully!', eventData);

          // Close modal and redirect to success page
          closeCheckoutModalUI();

          // Redirect to success page with checkout session ID if available
          const checkoutSessionId = eventData?.id || eventData?.checkout?.id || 'success';
          window.location.href = `/success?checkout_session_id=${checkoutSessionId}`;
        });

        // Handle checkout close/cancel
        checkout.addEventListener("close", () => {
          console.log('Checkout modal closed');
          closeCheckoutModalUI();
          // Re-enable button
          if (buyNowButton) {
            buyNowButton.disabled = false;
            buyNowButton.textContent = 'BUY NOW';
          }
        });

        // Handle checkout loaded
        checkout.addEventListener("loaded", () => {
          console.log('Checkout modal loaded');
        });

        return;
      }
    } catch (embeddedError) {
      console.warn('Embedded checkout failed, falling back to redirect:', embeddedError);
      console.error('Embedded checkout error details:', {
        message: embeddedError.message,
        stack: embeddedError.stack,
        name: embeddedError.name
      });
    }

    // Fallback: If embedded checkout fails, redirect to full page
    console.log('Falling back to full page checkout');
    checkoutLoading.style.display = 'none';
    checkoutError.style.display = 'flex';
    
    // Wait a moment to show error message, then redirect
    setTimeout(() => {
      window.location.href = data.url;
    }, 1500);

  } catch (error) {
    console.error('Checkout failed:', error);
    
    // Show error and fallback to redirect if we have a URL
    checkoutLoading.style.display = 'none';
    checkoutError.style.display = 'flex';
    
    // Try to get checkout URL from error or redirect to a generic checkout page
    setTimeout(() => {
      // If we have a URL from a previous attempt, use it
      // Otherwise, show error and close modal
      alert(`Checkout failed: ${error.message}\n\nPlease try again or contact support.`);
      closeCheckoutModalUI();
      
      // Re-enable button
      if (buyNowButton) {
        buyNowButton.disabled = false;
        buyNowButton.textContent = 'BUY NOW';
      }
    }, 2000);
  }
}

// Handle purchase success - verify ownership and enable downloads
async function handlePurchaseSuccess(productIds, customerEmail) {
  console.log('Handling purchase success for:', productIds, customerEmail);

  try {
    // Step 1: Verify purchase ownership
    const verifyResponse = await fetch('/api/verify-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customerEmail,
        productIds: productIds
      })
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      throw new Error(errorData.error || 'Failed to verify purchase');
    }

    const verifyData = await verifyResponse.json();
    const ownedProducts = verifyData.ownedProducts || [];

    if (ownedProducts.length === 0) {
      console.warn('No products verified as owned');
      // Still show success message, but downloads may not be available yet
      alert('Purchase successful! Your purchase is being processed. You will receive download links via email shortly.');
      window.location.reload();
      return;
    }

    console.log('Verified owned products:', ownedProducts);

    // Step 2: Get download URLs
    const downloadResponse = await fetch('/api/get-download-urls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customerEmail,
        productIds: ownedProducts
      })
    });

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.json();
      throw new Error(errorData.error || 'Failed to get download URLs');
    }

    const downloadData = await downloadResponse.json();
    const downloads = downloadData.downloads || [];

    console.log('Download URLs retrieved:', downloads);

    // Step 3: Store purchase info in sessionStorage
    const purchaseInfo = {
      email: customerEmail,
      ownedProducts: ownedProducts,
      downloads: downloads,
      timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('purchase_info', JSON.stringify(purchaseInfo));

    // Store individual product ownership for quick checks
    ownedProducts.forEach(productId => {
      sessionStorage.setItem(`owned_${productId}`, 'true');
    });

    // Step 4: Show download modal
    showDownloadModal(ownedProducts, downloads, customerEmail);

    // Step 5: Update button visibility for current product if it was purchased
    if (currentProduct) {
      const productSlug = currentProduct.toLowerCase().replace(/\s+/g, '-');
      const polarProduct = getPolarProductData(productSlug);
      if (polarProduct && ownedProducts.includes(polarProduct.productId)) {
        updateButtonVisibility(currentProduct);
      }
    }

    // Step 6: Clear cart
    cart.clear();
    updateCheckoutButton();

  } catch (error) {
    console.error('Error in handlePurchaseSuccess:', error);
    throw error;
  }
}

// Show download modal with purchased products
function showDownloadModal(purchasedProductIds, downloads, customerEmail) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'download-modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: var(--space-medium);
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: var(--space-large);
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  // Modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-large);
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: var(--space-medium);
  `;

  const modalTitle = document.createElement('h2');
  modalTitle.textContent = 'Purchase Successful!';
  modalTitle.style.cssText = `
    font-family: var(--font-visitor, 'Space Mono', monospace);
    font-size: 24px;
    margin: 0;
    text-transform: uppercase;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 32px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 32px;
    height: 32px;
    line-height: 1;
  `;
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
    window.location.reload();
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);

  // Modal body
  const modalBody = document.createElement('div');
  const successMessage = document.createElement('p');
  successMessage.textContent = 'Thank you for your purchase! Download your products below:';
  successMessage.style.cssText = `
    margin-bottom: var(--space-large);
    color: #333;
  `;
  modalBody.appendChild(successMessage);

  // Download list
  const downloadList = document.createElement('div');
  downloadList.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-medium);
  `;

  // Create download items for each purchased product
  purchasedProductIds.forEach(productId => {
    const downloadItem = document.createElement('div');
    downloadItem.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-medium);
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    `;

    // Find product name
    const productSlug = Object.keys(POLAR_PRODUCTS || {}).find(slug => {
      const polar = POLAR_PRODUCTS[slug];
      return polar && polar.productId === productId;
    });
    const productName = productSlug && POLAR_PRODUCTS[productSlug] 
      ? POLAR_PRODUCTS[productSlug].name 
      : `Product ${productId.substring(0, 8)}...`;

    const productNameEl = document.createElement('span');
    productNameEl.textContent = productName;
    productNameEl.style.cssText = `
      font-weight: 600;
      color: #333;
    `;

    // Find download info
    const downloadInfo = downloads.find(d => d.productId === productId);
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = downloadInfo ? 'DOWNLOAD' : 'PROCESSING...';
    downloadBtn.disabled = !downloadInfo;
    downloadBtn.style.cssText = `
      background-color: var(--color-lello, #FFD700);
      color: var(--color-void-black, #000);
      border: 1px solid var(--color-void-black, #000);
      padding: var(--space-small) var(--space-medium);
      font-family: var(--font-visitor, 'Space Mono', monospace);
      font-size: 14px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s;
    `;

    if (downloadInfo) {
      downloadBtn.addEventListener('click', () => {
        downloadProductFile(productId, customerEmail, downloadInfo.filename);
      });
    }

    downloadItem.appendChild(productNameEl);
    downloadItem.appendChild(downloadBtn);
    downloadList.appendChild(downloadItem);
  });

  modalBody.appendChild(downloadList);

  // Modal footer
  const modalFooter = document.createElement('div');
  modalFooter.style.cssText = `
    margin-top: var(--space-large);
    padding-top: var(--space-medium);
    border-top: 1px solid #e0e0e0;
    text-align: center;
  `;

  const continueButton = document.createElement('button');
  continueButton.textContent = 'Continue Shopping';
  continueButton.style.cssText = `
    background-color: var(--color-void-black, #000);
    color: white;
    border: none;
    padding: var(--space-small) var(--space-large);
    font-family: var(--font-visitor, 'Space Mono', monospace);
    font-size: 14px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  `;
  continueButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
    window.location.reload();
  });
  modalFooter.appendChild(continueButton);

  // Assemble modal
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  modalOverlay.appendChild(modalContent);

  // Add to page
  document.body.appendChild(modalOverlay);

  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
      window.location.reload();
    }
  });
}

// Download product file via proxy endpoint
async function downloadProductFile(productId, customerEmail, filename) {
  try {
    const downloadUrl = `/api/download-file?email=${encodeURIComponent(customerEmail)}&productId=${encodeURIComponent(productId)}`;
    
    // Create temporary link to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'product.blend';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Download initiated for product:', productId);
  } catch (error) {
    console.error('Error downloading file:', error);
    alert(`Failed to download file: ${error.message}`);
  }
}

// Handle Polar checkout
function handleCheckout() {
  const productIds = cart.getCheckoutProducts();

  if (productIds.length === 0) {
    console.error('No products in cart for checkout');
    alert('Your cart is empty');
    return;
  }

  // Close cart modal first
  closeCartModal();

  // Disable checkout button immediately for instant feedback
  if (cartCheckoutButton) {
    cartCheckoutButton.disabled = true;
    cartCheckoutButton.textContent = 'Creating checkout...';
  }

  // Use the new checkout modal
  openCheckoutModal(productIds).then(() => {
    // Re-enable checkout button if modal fails to open
    if (cartCheckoutButton) {
      cartCheckoutButton.disabled = false;
      cartCheckoutButton.textContent = 'CHECK OUT';
    }
  }).catch((error) => {
    console.error('Checkout failed:', error);
    // Re-enable checkout button
    if (cartCheckoutButton) {
      cartCheckoutButton.disabled = false;
      cartCheckoutButton.textContent = 'CHECK OUT';
    }
  });
}

// Initialize cart functionality
function initializeCart() {
  // Load cart from localStorage
  cart.load();
  
  // Cart icon click handler
  if (cartIconWrapper) {
    cartIconWrapper.addEventListener('click', openCartModal);
  }
  
  // Cart close button
  if (cartCloseButton) {
    cartCloseButton.addEventListener('click', closeCartModal);
  }
  
  // Cart backdrop click to close
  if (cartModalBackdrop) {
    cartModalBackdrop.addEventListener('click', closeCartModal);
  }
  
  // ESC key to close cart
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && cartModal.classList.contains('active')) {
      closeCartModal();
    }
  });
  
  // Buy Now button
  if (buyNowButton) {
    buyNowButton.addEventListener('click', handleBuyNow);
  }
  
  // Checkout button
  if (cartCheckoutButton) {
    cartCheckoutButton.addEventListener('click', handleCheckout);
  }
  
  // Continue shopping button
  if (cartContinueShoppingButton) {
    cartContinueShoppingButton.addEventListener('click', closeCartModal);
  }
  
  console.log('Shopping cart initialized');
}

// Initialize checkout modal functionality
function initializeCheckoutModal() {
  // Checkout close button
  if (checkoutCloseButton) {
    checkoutCloseButton.addEventListener('click', closeCheckoutModalUI);
  }
  
  // Checkout backdrop click to close
  if (checkoutModalBackdrop) {
    checkoutModalBackdrop.addEventListener('click', closeCheckoutModalUI);
  }
  
  // ESC key to close checkout modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && checkoutModal && checkoutModal.classList.contains('active')) {
      closeCheckoutModalUI();
      // Re-enable button
      if (buyNowButton) {
        buyNowButton.disabled = false;
        buyNowButton.textContent = 'BUY NOW';
      }
      if (cartCheckoutButton) {
        cartCheckoutButton.disabled = false;
        cartCheckoutButton.textContent = 'CHECK OUT';
      }
    }
  });
  
  console.log('Checkout modal initialized');
}

// Initialize cart when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeCart();
    initializeCheckoutModal();
  });
} else {
  initializeCart();
  initializeCheckoutModal();
}

// Make cart accessible globally for debugging
window.cart = cart;

console.log('Shopping cart functionality loaded');

// Initialize Member CTA Button
// Dev toggle for member/non-member viewing (stored in localStorage)
// DISABLED: Always return false to ensure non-member view
function getDevMemberToggle() {
  // Ensure dev mode is disabled
  if (localStorage.getItem('dev_member_toggle') === 'true') {
    setDevMemberToggle(false);
  }
  return false; // Always return false - dev mode is hidden and disabled
}

function setDevMemberToggle(enabled) {
  localStorage.setItem('dev_member_toggle', enabled ? 'true' : 'false');
  
  // When enabling dev mode, set a dev customer ID if one doesn't exist
  if (enabled) {
    const devCustomerId = localStorage.getItem('dev_customer_id');
    if (!devCustomerId) {
      // Generate a dev customer ID (prefixed with 'dev_' to make it clear)
      const newDevCustomerId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dev_customer_id', newDevCustomerId);
      // Also set it in sessionStorage so it's available immediately
      sessionStorage.setItem('polar_customer_id', newDevCustomerId);
    } else {
      // Use existing dev customer ID
      sessionStorage.setItem('polar_customer_id', devCustomerId);
    }
  } else {
    // When disabling dev mode, remove dev customer ID from sessionStorage
    // but keep it in localStorage in case they toggle back on
    const devCustomerId = localStorage.getItem('dev_customer_id');
    if (devCustomerId && sessionStorage.getItem('polar_customer_id') === devCustomerId) {
      sessionStorage.removeItem('polar_customer_id');
      // If there's a real customer ID in URL params, it will be picked up by the account menu
      // No need to set it here - let the account menu handle it naturally
    }
  }
}

// Get dev customer ID if dev mode is enabled
function getDevCustomerId() {
  if (getDevMemberToggle()) {
    let devCustomerId = localStorage.getItem('dev_customer_id');
    if (!devCustomerId) {
      // Generate a dev customer ID if one doesn't exist
      devCustomerId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dev_customer_id', devCustomerId);
    }
    return devCustomerId;
  }
  return null;
}

// Initialize dev mode - ensure it's disabled for production (non-member view)
// Disable dev mode on page load to ensure non-member view
if (typeof window !== 'undefined') {
  // Ensure dev mode is disabled when page loads
  if (localStorage.getItem('dev_member_toggle') === 'true') {
    setDevMemberToggle(false);
    // Clear dev customer ID from sessionStorage
    const devCustomerId = localStorage.getItem('dev_customer_id');
    if (devCustomerId && sessionStorage.getItem('polar_customer_id') === devCustomerId) {
      sessionStorage.removeItem('polar_customer_id');
    }
  }
}

// Initialize dev customer ID on page load if dev mode is enabled (legacy - now always disabled)
function initializeDevCustomerId() {
  if (getDevMemberToggle()) {
    const devCustomerId = getDevCustomerId();
    if (devCustomerId) {
      // Only set in sessionStorage if there's no existing customer ID
      const existingCustomerId = sessionStorage.getItem('polar_customer_id') || 
                                 new URLSearchParams(window.location.search).get('customer_id');
      if (!existingCustomerId || existingCustomerId.startsWith('dev_')) {
        sessionStorage.setItem('polar_customer_id', devCustomerId);
      }
    }
  }
}

// Check subscription status for a customer
async function checkSubscriptionStatus(customerId) {
  // DEV MODE: Check dev toggle first (works even without customerId)
  const devToggleEnabled = getDevMemberToggle();
  if (devToggleEnabled) {
    console.log('[DEV MODE] Member toggle enabled - simulating active subscription');
    return true; // Simulate active subscription
  }
  
  // If no customer ID and dev toggle is off, return false
  if (!customerId) {
    return false;
  }
  
  try {
    const response = await fetch(`/api/v1/user/entitlements?customer_id=${customerId}`);
    if (response.ok) {
      const data = await response.json();
      // Check if subscription is active (not expired)
      if (data.entitlements && data.entitlements.expires_at) {
        const expiresAt = new Date(data.entitlements.expires_at);
        return expiresAt > new Date();
      }
      // If no expiration date, assume active subscription
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    // On error, assume subscriber if customer_id exists
    return true;
  }
}

// Update member CTA visibility based on subscription status
async function updateMemberCTAVisibility() {
  const memberCTAButton = document.getElementById('member-cta-button');
  const mobileMemberCTAButton = document.getElementById('mobile-member-cta-button');
  
  let customerId = sessionStorage.getItem('polar_customer_id') || 
                   new URLSearchParams(window.location.search).get('customer_id');
  
  // If dev mode is enabled but no customer ID, use dev customer ID
  if (!customerId && getDevMemberToggle()) {
    customerId = getDevCustomerId();
    if (customerId) {
      sessionStorage.setItem('polar_customer_id', customerId);
    }
  }
  
  try {
    // Check subscription status (works with or without customer ID if dev toggle is enabled)
    const hasActiveSubscription = await checkSubscriptionStatus(customerId);
    if (hasActiveSubscription) {
      // Hide member CTA buttons for active subscribers
      if (memberCTAButton) {
        memberCTAButton.style.display = 'none';
      }
      if (mobileMemberCTAButton) {
        mobileMemberCTAButton.style.display = 'none';
      }
      // Add class to adjust grid spacing
      document.body.classList.add('cta-hidden');
    } else {
      // Show CTA buttons for non-subscribers
      if (memberCTAButton) memberCTAButton.style.display = '';
      if (mobileMemberCTAButton) mobileMemberCTAButton.style.display = '';
      // Remove class to show normal spacing
      document.body.classList.remove('cta-hidden');
    }
  } catch (error) {
    console.error('Error checking subscription status for member CTA:', error);
    // On error, show CTA buttons
    if (memberCTAButton) memberCTAButton.style.display = '';
    if (mobileMemberCTAButton) mobileMemberCTAButton.style.display = '';
    // Remove class to show normal spacing
    document.body.classList.remove('cta-hidden');
  }
}

async function initializeMemberCTA() {
  const memberCTAButton = document.getElementById('member-cta-button');
  const mobileMemberCTAButton = document.getElementById('mobile-member-cta-button');

  // Check for active subscription and hide CTA if subscriber
  let customerId = sessionStorage.getItem('polar_customer_id') || 
                   new URLSearchParams(window.location.search).get('customer_id');
  
  // If dev mode is enabled but no customer ID, use dev customer ID
  if (!customerId && getDevMemberToggle()) {
    customerId = getDevCustomerId();
    if (customerId) {
      sessionStorage.setItem('polar_customer_id', customerId);
    }
  }
  
  if (customerId) {
    try {
      const hasActiveSubscription = await checkSubscriptionStatus(customerId);
      if (hasActiveSubscription) {
        // Hide member CTA buttons for active subscribers
        if (memberCTAButton) {
          memberCTAButton.style.display = 'none';
        }
        if (mobileMemberCTAButton) {
          mobileMemberCTAButton.style.display = 'none';
        }
        console.log('Member CTA hidden for active subscriber');
        return; // Exit early, don't set up checkout URL
      }
    } catch (error) {
      console.error('Error checking subscription status for member CTA:', error);
      // Continue to show CTA if check fails
    }
  }

  let checkoutUrl = null;

  try {
    // Try to load subscription config from the config directory
    const response = await fetch('/config/subscription-config.json');
    if (response.ok) {
      const config = await response.json();
      if (config.checkoutUrl) {
        checkoutUrl = config.checkoutUrl;
        console.log('Member CTA button initialized with subscription checkout URL');
      }
    }
  } catch (error) {
    console.warn('Could not load subscription config, using fallback URL:', error);
  }

  // Fallback to hardcoded URL from config file
  if (!checkoutUrl) {
    checkoutUrl = 'https://buy.polar.sh/polar_cl_QUdol23jKpCxZ4XPamECHD3sCeIRFRyaBce9n3rx5nW';
    console.log('Member CTA button initialized with fallback URL');
  }

  // Set URL for desktop button
  if (memberCTAButton) {
    memberCTAButton.href = checkoutUrl;
  }

  // Set URL for mobile button
  if (mobileMemberCTAButton) {
    mobileMemberCTAButton.href = checkoutUrl;
  }
}

// Initialize member CTA when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMemberCTA);
} else {
  initializeMemberCTA();
}

// Account menu initialization
let accountMenuInitialized = false;

function initializeAccountMenu() {
  const accountMenuButton = document.getElementById('account-menu-button');
  const accountMenuDropdown = document.getElementById('account-menu-dropdown');
  const accountMenuLink = document.getElementById('account-menu-link');
  
  if (!accountMenuButton || !accountMenuDropdown) {
    return; // Elements not found, skip initialization
  }

  // Toggle dropdown on button click
  accountMenuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = accountMenuDropdown.classList.contains('active');
    
    if (isActive) {
      closeAccountMenu();
    } else {
      openAccountMenu();
    }
  });

  // Update account link with customer_id if available
  if (accountMenuLink) {
    const customerId = sessionStorage.getItem('polar_customer_id') || 
                       new URLSearchParams(window.location.search).get('customer_id');
    if (customerId) {
      const url = new URL(accountMenuLink.href, window.location.origin);
      url.searchParams.set('customer_id', customerId);
      accountMenuLink.href = url.toString();
    }
    
    // Close dropdown when clicking account link
    accountMenuLink.addEventListener('click', () => {
      closeAccountMenu();
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!accountMenuDropdown.contains(e.target) && 
        !accountMenuButton.contains(e.target)) {
      closeAccountMenu();
    }
  });

  // Close dropdown on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && accountMenuDropdown.classList.contains('active')) {
      closeAccountMenu();
    }
  });

  accountMenuInitialized = true;
}

// Open account menu and load account info
async function openAccountMenu() {
  const accountMenuDropdown = document.getElementById('account-menu-dropdown');
  const accountMenuContent = document.getElementById('account-menu-content');
  
  if (!accountMenuDropdown || !accountMenuContent) return;

  accountMenuDropdown.classList.add('active');
  
  // Check for customer_id (including dev customer ID if dev mode is enabled)
  const devToggleEnabled = getDevMemberToggle();
  let customerId = sessionStorage.getItem('polar_customer_id') || 
                   new URLSearchParams(window.location.search).get('customer_id');
  
  // If dev mode is enabled but no customer ID, use dev customer ID
  if (!customerId && devToggleEnabled) {
    customerId = getDevCustomerId();
    if (customerId) {
      sessionStorage.setItem('polar_customer_id', customerId);
    }
  }
  
  if (!customerId) {
    // No customer ID - show login prompt
    accountMenuContent.innerHTML = `
      <div class="account-menu-info-item">
        <div class="account-menu-info-label">Status</div>
        <div class="account-menu-info-value">Not signed in</div>
      </div>
    `;
    return;
  }

  // Show loading state
  accountMenuContent.innerHTML = '<div class="account-menu-loading">Loading account info...</div>';

  // Check if this is a dev customer ID
  const isDevCustomerId = customerId && customerId.startsWith('dev_');
  
  try {
    let data;
    let user, entitlements;
    
    if (isDevCustomerId && devToggleEnabled) {
      // Use mock data for dev mode
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1); // 1 month from now
      
      data = {
        user: {
          id: customerId,
          email: 'dev@example.com',
          subscription_tier: 'pro_monthly'
        },
        entitlements: {
          libraries: ['all'],
          features: [],
          expires_at: futureDate.toISOString()
        }
      };
      user = data.user;
      entitlements = data.entitlements;
    } else {
      // Fetch subscription data from API
      const response = await fetch(`/api/v1/user/entitlements?customer_id=${customerId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription data');
      }
      
      data = await response.json();
      user = data.user;
      entitlements = data.entitlements;
    }
    
    // Check if subscription is active
    const isActive = entitlements.expires_at && 
                     new Date(entitlements.expires_at) > new Date();
    
    const statusClass = isActive ? 'active' : 'expired';
    const statusText = isActive ? 'Active' : 'Expired';
    
    // Check dev toggle state
    const effectiveIsActive = devToggleEnabled || isActive;
    const effectiveStatusClass = effectiveIsActive ? 'active' : 'expired';
    const effectiveStatusText = devToggleEnabled ? 'Active (DEV)' : (isActive ? 'Active' : 'Expired');
      
      // Build account info HTML
      accountMenuContent.innerHTML = `
        <div class="account-menu-info-item">
          <div class="account-menu-info-label">Status</div>
          <span class="account-menu-status-badge ${effectiveStatusClass}">${effectiveStatusText}</span>
        </div>
        <div class="account-menu-info-item">
          <div class="account-menu-info-label">Email</div>
          <div class="account-menu-info-value">${user.email || 'N/A'}</div>
        </div>
        <div class="account-menu-info-item">
          <div class="account-menu-info-label">Plan</div>
          <div class="account-menu-info-value">${user.subscription_tier ? user.subscription_tier.replace('_', ' ').toUpperCase() : 'N/A'}</div>
        </div>
        ${entitlements.expires_at ? `
        <div class="account-menu-info-item">
          <div class="account-menu-info-label">Renews</div>
          <div class="account-menu-info-value">${new Date(entitlements.expires_at).toLocaleDateString()}</div>
        </div>
        ` : ''}
      `;
      
      // Update member CTA visibility based on subscription status
      if (effectiveIsActive) {
        updateMemberCTAVisibility();
      }
  } catch (error) {
    console.error('Error loading account info:', error);
    const devToggleEnabled = getDevMemberToggle();
    accountMenuContent.innerHTML = `
      <div class="account-menu-info-item">
        <div class="account-menu-info-label">Error</div>
        <div class="account-menu-info-value" style="color: var(--color-dark-gray);">Failed to load account info</div>
      </div>
    `;
  }
}

// Helper function to get current product ID
function getCurrentProductId() {
  // Try to get from product card dataset first
  const productCard = document.querySelector('.product-card-container');
  if (productCard && productCard.dataset && productCard.dataset.productId) {
    return productCard.dataset.productId;
  }
  // Fall back to global currentProduct variable
  return typeof currentProduct !== 'undefined' ? currentProduct : null;
}

// Toggle dev member mode
function toggleDevMemberMode(enabled) {
  setDevMemberToggle(enabled);
  console.log(`[DEV MODE] Member toggle ${enabled ? 'enabled' : 'disabled'}`);
  
  // Update UI immediately
  updateMemberCTAVisibility();
  
  // Update button visibility if on a product page
  const currentProductId = getCurrentProductId();
  if (currentProductId) {
    updateButtonVisibility(currentProductId);
  }
  
  // Reload account menu to show updated status
  const accountMenuDropdown = document.getElementById('account-menu-dropdown');
  if (accountMenuDropdown && accountMenuDropdown.classList.contains('active')) {
    openAccountMenu();
  }
}

// Make toggle function globally accessible
window.toggleDevMemberMode = toggleDevMemberMode;

// Close account menu
function closeAccountMenu() {
  const accountMenuDropdown = document.getElementById('account-menu-dropdown');
  if (accountMenuDropdown) {
    accountMenuDropdown.classList.remove('active');
  }
}

// Initialize account menu when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccountMenu);
} else {
  initializeAccountMenu();
}

// OS Detection for Footer Keyboard Shortcut
function updateFooterShortcut() {
  const footerText = document.getElementById('footer-text');
  if (!footerText) return;
  
  // Detect operating system
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check if macOS (Mac, iPhone, iPad)
  const isMac = platform.includes('mac') || 
                platform.includes('iphone') || 
                platform.includes('ipad') ||
                userAgent.includes('mac os x');
  
  // Update footer text based on OS
  if (isMac) {
    footerText.textContent = '⌘ + K to Search';
  } else {
    footerText.textContent = 'Ctrl + K to Search';
  }
}

// Update footer commit hash from meta tag
function updateFooterCommit() {
  const commitHashEl = document.getElementById('commit-hash');
  const footerCommitEl = document.getElementById('footer-commit');
  
  console.log('🔍 updateFooterCommit called');
  console.log('  commitHashEl:', commitHashEl);
  console.log('  footerCommitEl:', footerCommitEl);
  
  if (!commitHashEl) {
    console.warn('⚠️ commit-hash element not found');
    return;
  }
  
  // Get commit hash from meta tag
  const metaTag = document.querySelector('meta[name="deployment-version"]');
  console.log('  metaTag:', metaTag);
  console.log('  metaTag.content:', metaTag ? metaTag.content : 'null');
  
  if (metaTag && metaTag.content) {
    commitHashEl.textContent = metaTag.content;
    console.log('✅ Commit hash set to:', metaTag.content);
  } else {
    // Fallback: try to get from git if available (for local dev)
    commitHashEl.textContent = 'dev';
    console.log('⚠️ No meta tag found, using fallback: dev');
  }
}

// Update footer branch name from meta tag
function updateFooterBranch() {
  const branchNameEl = document.getElementById('branch-name');
  const footerBranchEl = document.getElementById('footer-branch');
  
  console.log('🔍 updateFooterBranch called');
  console.log('  branchNameEl:', branchNameEl);
  console.log('  footerBranchEl:', footerBranchEl);
  
  if (!branchNameEl) {
    console.warn('⚠️ branch-name element not found');
    return;
  }
  
  // Get branch name from meta tag
  const branchMetaTag = document.querySelector('meta[name="deployment-branch"]');
  console.log('  branchMetaTag:', branchMetaTag);
  console.log('  branchMetaTag.content:', branchMetaTag ? branchMetaTag.content : 'null');
  
  if (branchMetaTag && branchMetaTag.content) {
    branchNameEl.textContent = branchMetaTag.content;
    console.log('✅ Branch name set to:', branchMetaTag.content);
  } else {
    // Fallback: use 'dev' for local development
    branchNameEl.textContent = 'dev';
    console.log('⚠️ No branch meta tag found, using fallback: dev');
  }
}

// Initialize footer shortcut, commit hash, and branch on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updateFooterShortcut();
    updateFooterCommit();
    updateFooterBranch();
  });
} else {
  updateFooterShortcut();
  updateFooterCommit();
  updateFooterBranch();
}

// Initialize mobile search bar
function initializeMobileSearch() {
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileSearchButton = document.getElementById('mobile-search-button');

  if (mobileSearchInput && mobileSearchButton) {
    // Handle typing in mobile search - live predictive search
    mobileSearchInput.addEventListener('input', () => {
      // Open modal if not already open
      if (searchModal && !searchModal.classList.contains('active')) {
        openSearchModal();
      }

      // Sync with main search input and trigger search
      if (searchInput) {
        searchInput.value = mobileSearchInput.value;
      }
      performSearch(mobileSearchInput.value);
    });

    // Handle button click
    mobileSearchButton.addEventListener('click', () => {
      openSearchModal();
      // Pre-fill with mobile input value if exists
      if (mobileSearchInput.value) {
        if (searchInput) {
          searchInput.value = mobileSearchInput.value;
        }
        performSearch(mobileSearchInput.value);
      } else {
        // Focus the mobile input if empty
        mobileSearchInput.focus();
      }
    });

    // Handle Enter key in mobile search
    mobileSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // If there are results, select the first one
        const firstResult = document.querySelector('.search-result-item');
        if (firstResult) {
          firstResult.click();
        }
      }

      // Allow arrow key navigation in search results
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // Focus on search results if they exist
        const firstResult = document.querySelector('.search-result-item');
        if (firstResult) {
          firstResult.focus();
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
          // This threshold accounts for browser UI changes and actual keyboard
          if (heightDifference > 150) {
            newKeyboardHeight = heightDifference;
            shouldBeAboveKeyboard = true;
          }
        } else {
          // Fallback: Use window resize for older browsers
          // This is less accurate but works as fallback
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
            // This prevents content from being hidden behind keyboard
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
  }
}

// Initialize mobile search on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMobileSearch);
} else {
  initializeMobileSearch();
}

// ============================================================================
// HORIZONTAL SCROLLING ICON GRID (Tools Section Only)
// ============================================================================

/**
 * Populate and show/hide the horizontal icon grid based on active section
 */
function updateHorizontalIconGrid() {
  console.log('🔍 updateHorizontalIconGrid called');
  const container = document.getElementById('horizontal-icon-grid-container');
  const grid = document.getElementById('horizontal-icon-grid');

  if (!container || !grid) {
    console.warn('❌ Horizontal icon grid elements not found');
    return;
  }

  // Hide grid when no product is selected (showing home grid instead)
  if (!currentProduct) {
    console.log('❌ No product selected, hiding horizontal grid');
    container.classList.remove('visible');
    return;
  }

  console.log('📊 activeProductType:', activeProductType);
  console.log('📊 productDataByType:', Object.keys(productDataByType));

  // Show grid when Tools section is active (or default/null)
  // Hide only when a different section is explicitly selected
  const isToolsActive = !activeProductType || activeProductType.toLowerCase() === 'tools';
  console.log('📊 isToolsActive:', isToolsActive);

  if (!isToolsActive) {
    console.log('❌ Tools not active, hiding grid');
    container.classList.remove('visible');
    return;
  }

  console.log('✅ Tools active, showing grid');

  // Show container
  container.classList.add('visible');

  // Get all products from the currently active product type (library)
  const currentProducts = productDataByType[activeProductType] || {};
  const toolsProducts = Object.keys(currentProducts)
    .map(productId => ({
      id: productId,
      ...currentProducts[productId]
    }))
    .filter(product => product && (product.title || product.name)) // Filter out products without title or name
    .sort((a, b) => {
      const aName = a.title || a.name || '';
      const bName = b.title || b.name || '';
      return aName.localeCompare(bName);
    }); // Sort alphabetically with fallback

  // Clear existing grid
  grid.innerHTML = '';

  // Populate grid with product icons
  toolsProducts.forEach(product => {
    const iconItem = document.createElement('div');
    iconItem.className = 'horizontal-icon-item';
    iconItem.dataset.productId = product.id;

    // Mark current product as active
    if (currentProduct && product.id === currentProduct) {
      iconItem.classList.add('active');
    }

    // Create image element
    const img = document.createElement('img');

    // Use product.icon directly, same as regular icon grid
    if (product.icon) {
      img.src = product.icon;
      console.log(`🖼️ Loading icon for ${product.title || product.name}:`, img.src);
    } else {
      // Fallback to placeholder
      console.log(`⚠️ No icon property for product:`, product.title || product.name || product.id);
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNFOEU4RTgiLz4KICA8dGV4dCB4PSIzMiIgeT0iMzQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    }

    img.alt = product.title || product.name || product.id;
    img.onerror = function() {
      // Fallback to placeholder if image fails to load
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNFOEU4RTgiLz4KICA8dGV4dCB4PSIzMiIgeT0iMzQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    };
    img.loading = 'lazy';

    // Add click handler to load product
    iconItem.addEventListener('click', async () => {
      await selectProduct(product.id);

      // Update active state
      grid.querySelectorAll('.horizontal-icon-item').forEach(item => {
        item.classList.remove('active');
      });
      iconItem.classList.add('active');

      // Scroll item into view
      iconItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });

    iconItem.appendChild(img);
    grid.appendChild(iconItem);
  });

  console.log(`✅ Horizontal grid populated with ${toolsProducts.length} products`);

  // Auto-scroll to active item on mobile for better UX
  const activeItem = grid.querySelector('.horizontal-icon-item.active');
  if (activeItem && window.innerWidth <= 768) {
    setTimeout(() => {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 100);
  }
}

// Hook into existing product type toggle to update horizontal grid
const originalHandleProductTypeToggle = handleProductTypeToggle;
if (typeof handleProductTypeToggle === 'function') {
  handleProductTypeToggle = async function(typeKey) {
    await originalHandleProductTypeToggle(typeKey);

    // Update horizontal grid after section changes
    setTimeout(() => {
      updateHorizontalIconGrid();
    }, 100);
  };
}

// Hook into selectProduct to update active state in horizontal grid
const originalSelectProduct = selectProduct;
if (typeof selectProduct === 'function') {
  selectProduct = function(productId) {
    originalSelectProduct(productId);

    // Update active state in horizontal grid
    const grid = document.getElementById('horizontal-icon-grid');
    if (grid) {
      grid.querySelectorAll('.horizontal-icon-item').forEach(item => {
        item.classList.toggle('active', item.dataset.productId === productId);
      });
    }
  };
}

// Initialize horizontal grid on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateHorizontalIconGrid, 500);
  });
} else {
  setTimeout(updateHorizontalIconGrid, 500);
}

// ============================================================================
// PRODUCT CARD CAROUSEL
// ============================================================================

let carouselCurrentIndex = 0;
let carouselItems = [];

// Initialize carousel with product assets
async function initializeCarousel(productId) {
  console.log(`🎠 initializeCarousel called for: ${productId}`);
  const track = document.getElementById('carousel-track');
  const leftArrow = document.getElementById('carousel-arrow-left');
  const rightArrow = document.getElementById('carousel-arrow-right');
  
  console.log(`🎠 Carousel track element:`, track ? 'FOUND' : 'NOT FOUND');
  console.log(`🎠 Left arrow:`, leftArrow ? 'FOUND' : 'NOT FOUND');
  console.log(`🎠 Right arrow:`, rightArrow ? 'FOUND' : 'NOT FOUND');
  
  if (!track) {
    console.warn('⚠️ Carousel track not found - carousel cannot initialize');
    return;
  }

  // Load card assets
  console.log(`🔄 Loading carousel assets for product: ${productId}`);
  carouselItems = await loadProductCardAssets(productId);
  console.log(`✅ Loaded ${carouselItems.length} carousel items:`, carouselItems.map(item => item.name));
  
  if (carouselItems.length === 0) {
    console.warn(`⚠️ No carousel items loaded for product: ${productId}`);
  } else if (carouselItems.length === 1) {
    console.info(`ℹ️ Only 1 carousel item loaded (no navigation needed): ${carouselItems[0].name}`);
  } else {
    console.info(`ℹ️ ${carouselItems.length} carousel items loaded - arrows should be visible`);
  }
  carouselCurrentIndex = 0;

  // Clear existing items
  track.innerHTML = '';
  console.log(`🎠 Cleared carousel track, preparing to add ${carouselItems.length} items`);

  if (carouselItems.length === 0) {
    // Fallback: show placeholder
    console.warn('⚠️ No carousel items found, showing placeholder');
    const placeholder = document.createElement('div');
    placeholder.className = 'carousel-item';
    placeholder.innerHTML = '<div class="model-viewer-placeholder">No images available</div>';
    track.appendChild(placeholder);
    updateCarouselArrows();
    return;
  }

  // Create carousel items
  console.log(`🎠 Creating ${carouselItems.length} carousel items...`);
  carouselItems.forEach((asset, index) => {
    // Skip assets without valid URLs to prevent empty containers
    if (!asset.url || asset.url.trim() === '') {
      console.warn(`⚠️ Skipping carousel item ${index} (${asset.name}): missing or empty URL`);
      return;
    }

    console.log(`🎠 Creating carousel item ${index}: ${asset.name} (type: ${asset.type})`);
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.dataset.index = index;
    item.style.position = 'relative'; // Needed for absolute positioning of loading indicator

    if (asset.type === 'image') {
      const img = document.createElement('img');
      img.src = asset.url;
      img.alt = asset.name;
      img.loading = index === 0 ? 'eager' : 'lazy';
      // Add fetchpriority hint for first image to improve LCP
      if (index === 0) {
        img.fetchPriority = 'high';
      }
      img.onerror = function() {
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDMyMCAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMjU2IiBmaWxsPSIjRThFOEU4Ii8+CjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMzYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';
      };
      item.appendChild(img);
    } else if (asset.type === 'video') {
      const video = document.createElement('video');
      video.src = asset.url;
      video.controls = true;
      video.preload = index === 0 ? 'auto' : 'metadata';
      item.appendChild(video);
    } else if (asset.type === 'model3d') {
      // Placeholder for 3D models
      const placeholder = document.createElement('div');
      placeholder.className = 'model-viewer-placeholder';
      placeholder.textContent = `3D Model: ${asset.name}`;
      item.appendChild(placeholder);
    } else if (asset.type === 'html') {
      // Load HTML embed in iframe
      const iframe = document.createElement('iframe');
      
      // Add loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'model-viewer-placeholder';
      loadingDiv.textContent = 'Loading 3D viewer...';
      loadingDiv.style.position = 'absolute';
      loadingDiv.style.top = '50%';
      loadingDiv.style.left = '50%';
      loadingDiv.style.transform = 'translate(-50%, -50%)';
      loadingDiv.style.zIndex = '1';
      item.appendChild(loadingDiv);
      
      // Handle data URLs (generated embeds) vs regular URLs
      let iframeSrc = null;
      if (asset.url.startsWith('data:text/html')) {
        // Extract HTML content from data URL
        const htmlContent = decodeURIComponent(asset.url.split(',')[1]);
        
        // Use Blob URL for large HTML content (data URLs have size limits ~2MB)
        // This is more reliable for large Three.js embed HTML
        try {
          const blob = new Blob([htmlContent], { type: 'text/html' });
          iframeSrc = URL.createObjectURL(blob);
          iframe.src = iframeSrc;
          console.log(`📦 Created Blob URL for HTML embed: ${asset.name}`);
          console.log(`   HTML content size: ${(htmlContent.length / 1024).toFixed(2)} KB`);
          console.log(`   Blob size: ${(blob.size / 1024).toFixed(2)} KB`);
        } catch (error) {
          console.error(`❌ Failed to create Blob URL, falling back to srcdoc:`, error);
          console.error(`   Error details:`, error);
          // Fallback to srcdoc if Blob creation fails
          iframe.srcdoc = htmlContent;
        }
      } else {
        iframe.src = asset.url;
      }
      
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      // More permissive sandbox to allow 3D model loading and external resources
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-modals');
      iframe.setAttribute('loading', index === 0 ? 'eager' : 'lazy');
      
      // Track if iframe loaded successfully
      let loaded = false;
      const loadTimeout = setTimeout(() => {
        if (!loaded) {
          console.error(`⚠️ Iframe load timeout for: ${asset.name}`);
          loadingDiv.textContent = 'Failed to load 3D viewer';
          loadingDiv.style.color = '#ff0000';
          // Clean up Blob URL on timeout
          if (iframeSrc) {
            URL.revokeObjectURL(iframeSrc);
          }
        }
      }, 15000); // 15 second timeout for 3D model loading
      
      iframe.onload = function() {
        loaded = true;
        clearTimeout(loadTimeout);
        loadingDiv.remove();
        console.log(`✅ Iframe loaded successfully: ${asset.name}`);
      };
      
      iframe.onerror = function() {
        loaded = true;
        clearTimeout(loadTimeout);
        loadingDiv.textContent = `Failed to load HTML embed: ${asset.name}`;
        loadingDiv.style.color = '#ff0000';
        console.error(`❌ Iframe error for: ${asset.name}`);
        // Clean up Blob URL on error
        if (iframeSrc) {
          URL.revokeObjectURL(iframeSrc);
        }
      };
      
      item.appendChild(iframe);
    }

    track.appendChild(item);
    console.log(`🎠 Added carousel item ${index} to track`);
  });

  console.log(`🎠 All carousel items created. Track now has ${track.children.length} children`);
  
  // Log detailed carousel state
  console.log(`📊 Carousel State Summary:`, {
    totalItems: carouselItems.length,
    domChildren: track.children.length,
    currentIndex: carouselCurrentIndex,
    items: carouselItems.map((item, idx) => ({
      index: idx,
      name: item.name,
      type: item.type,
      format: item.format,
      isIcon: item.isIcon
    }))
  });
  
  // Set initial position
  updateCarouselPosition();
  updateCarouselArrows();
  console.log(`🎠 Carousel initialized and positioned`);

  // Add event listeners for arrows
  if (leftArrow) {
    leftArrow.onclick = () => navigateCarousel('prev');
  }
  if (rightArrow) {
    rightArrow.onclick = () => navigateCarousel('next');
  }

  // Swipe interaction removed - navigation is now only via arrow buttons
  // This provides better control and prevents accidental swipes on mobile
}

// Navigate carousel
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

// Update carousel position
function updateCarouselPosition() {
  const track = document.getElementById('carousel-track');
  if (!track) {
    console.warn('Carousel track not found in updateCarouselPosition');
    return;
  }

  const offset = -carouselCurrentIndex * 100;
  track.style.transform = `translateX(${offset}%)`;
  console.log(`📍 Carousel position updated: index ${carouselCurrentIndex}, offset ${offset}%`);
}

// Update arrow visibility
function updateCarouselArrows() {
  const leftArrow = document.getElementById('carousel-arrow-left');
  const rightArrow = document.getElementById('carousel-arrow-right');

  const hasMultipleItems = carouselItems.length > 1;
  const canGoLeft = carouselCurrentIndex > 0;
  const canGoRight = carouselCurrentIndex < carouselItems.length - 1;

  console.log(`🎯 Arrow visibility check:`, {
    itemsCount: carouselItems.length,
    currentIndex: carouselCurrentIndex,
    hasMultipleItems,
    canGoLeft,
    canGoRight
  });

  if (leftArrow) {
    if (canGoLeft && hasMultipleItems) {
      leftArrow.classList.add('visible');
      console.log(`✅ Left arrow: VISIBLE`);
    } else {
      leftArrow.classList.remove('visible');
      console.log(`❌ Left arrow: HIDDEN (canGoLeft: ${canGoLeft}, hasMultipleItems: ${hasMultipleItems})`);
    }
  } else {
    console.warn('⚠️ Left arrow element not found');
  }

  if (rightArrow) {
    if (canGoRight && hasMultipleItems) {
      rightArrow.classList.add('visible');
      console.log(`✅ Right arrow: VISIBLE`);
    } else {
      rightArrow.classList.remove('visible');
      console.log(`❌ Right arrow: HIDDEN (canGoRight: ${canGoRight}, hasMultipleItems: ${hasMultipleItems})`);
    }
  } else {
    console.warn('⚠️ Right arrow element not found');
  }
}

// Debug function to check carousel state (can be called from console)
window.debugCarousel = function() {
  const track = document.getElementById('carousel-track');
  const leftArrow = document.getElementById('carousel-arrow-left');
  const rightArrow = document.getElementById('carousel-arrow-right');
  
  console.log('🔍 Carousel Debug Info:');
  console.log('  Track element:', track ? 'FOUND' : 'NOT FOUND');
  console.log('  Track children count:', track ? track.children.length : 0);
  console.log('  Left arrow:', leftArrow ? 'FOUND' : 'NOT FOUND');
  console.log('  Right arrow:', rightArrow ? 'FOUND' : 'NOT FOUND');
  console.log('  Left arrow visible:', leftArrow ? leftArrow.classList.contains('visible') : false);
  console.log('  Right arrow visible:', rightArrow ? rightArrow.classList.contains('visible') : false);
  console.log('  carouselItems.length:', carouselItems.length);
  console.log('  carouselCurrentIndex:', carouselCurrentIndex);
  console.log('  carouselItems:', carouselItems);
  
  if (track) {
    console.log('  DOM Items in track:');
    Array.from(track.children).forEach((child, idx) => {
      const img = child.querySelector('img');
      const video = child.querySelector('video');
      const iframe = child.querySelector('iframe');
      console.log(`    [${idx}]`, {
        className: child.className,
        hasImg: !!img,
        imgSrc: img ? img.src : null,
        hasVideo: !!video,
        hasIframe: !!iframe
      });
    });
  }
  
  return {
    track,
    leftArrow,
    rightArrow,
    carouselItems,
    carouselCurrentIndex,
    trackChildrenCount: track ? track.children.length : 0
  };
};

// ============================================================================
// ============================================================================
// WELCOME POP-UP MODAL (Onboarding Pop-up)
// Name: "Welcome Pop-up" or "Onboarding Pop-up"
// Purpose: Welcomes new users and explains the two shopping options
// (individual purchases vs. subscription membership)
// ============================================================================

const LANDING_POPUP_STORAGE_KEY = 'no3d-tools-landing-popup-dismissed';

// Landing pop-up UI elements
const landingPopupModal = document.getElementById('landing-popup-modal');
const landingPopupBackdrop = document.getElementById('landing-popup-backdrop');
const landingPopupSubscribeButton = document.getElementById('landing-popup-subscribe-button');
const landingPopupBrowseButton = document.getElementById('landing-popup-browse-button');

// Check if pop-up should be shown
function shouldShowLandingPopup() {
  // Allow forcing pop-up to show via query parameter (useful for testing)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('showPopup') === 'true') {
    // Clear the dismissal flag if forcing show
    localStorage.removeItem(LANDING_POPUP_STORAGE_KEY);
    return true;
  }
  
  // Date-based logic: Disable welcome pop-up until after December 28
  const now = new Date();
  const currentYear = now.getFullYear();
  const dec28 = new Date(currentYear, 11, 28); // Month is 0-indexed, so 11 = December
  
  // If before or on December 28, don't show welcome pop-up (gift card pop-up will show instead)
  if (now <= dec28) {
    return false;
  }
  
  // Check localStorage to see if user has dismissed the pop-up
  const dismissed = localStorage.getItem(LANDING_POPUP_STORAGE_KEY);
  if (dismissed) {
    // Check if it was dismissed more than 30 days ago (optional: show again after 30 days)
    const dismissedDate = new Date(dismissed);
    const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
    // For now, if dismissed, don't show again (can change to show after 30 days if needed)
    return false;
  }
  return true;
}

// Function to clear pop-up cache (useful for testing)
function clearLandingPopupCache() {
  localStorage.removeItem(LANDING_POPUP_STORAGE_KEY);
  console.log('✅ Landing pop-up cache cleared. Refresh the page to see the pop-up.');
}

// Function to manually show pop-up (useful for testing)
function showLandingPopupNow() {
  clearLandingPopupCache();
  showLandingPopup();
  console.log('✅ Landing pop-up shown.');
}

// Expose functions to window for easy console access
window.clearLandingPopupCache = clearLandingPopupCache;
window.showLandingPopupNow = showLandingPopupNow;

// Show landing pop-up
function showLandingPopup() {
  if (!landingPopupModal || !landingPopupBackdrop) {
    console.warn('Landing pop-up elements not found');
    return;
  }
  
  landingPopupModal.classList.add('active');
  landingPopupBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Hide landing pop-up
function hideLandingPopup() {
  if (!landingPopupModal || !landingPopupBackdrop) {
    return;
  }
  
  landingPopupModal.classList.remove('active');
  landingPopupBackdrop.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

// Handle subscribe button click - redirects to node library subscription checkout
async function handleLandingPopupSubscribe() {
  try {
    // Load subscription config to get checkout URL (node library subscription page)
    const response = await fetch('/config/subscription-config.json');
    if (response.ok) {
      const config = await response.json();
      if (config.checkoutUrl) {
        // Store dismissal preference
        localStorage.setItem(LANDING_POPUP_STORAGE_KEY, new Date().toISOString());
        hideLandingPopup();
        // Redirect to subscription checkout (Polar checkout for node library subscription)
        window.location.href = config.checkoutUrl;
        return;
      }
    }
    
    // If config not available, log error and show message
    console.error('Subscription checkout URL not found in config');
    alert('Subscription page is not configured. Please contact support.');
  } catch (error) {
    console.error('Error loading subscription config:', error);
    alert('Unable to load subscription page. Please try again later.');
  }
}

// Handle browse button click
function handleLandingPopupBrowse() {
  // Store dismissal preference
  localStorage.setItem(LANDING_POPUP_STORAGE_KEY, new Date().toISOString());
  hideLandingPopup();
  // User continues browsing - pop-up is dismissed
}

// Initialize landing pop-up
function initializeLandingPopup() {
  if (!landingPopupModal || !landingPopupBackdrop) {
    console.warn('Landing pop-up elements not found in DOM');
    return;
  }

  // Check if pop-up should be shown
  if (!shouldShowLandingPopup()) {
    console.log('Landing pop-up already dismissed, not showing');
    return;
  }

  // Set up event listeners
  if (landingPopupSubscribeButton) {
    landingPopupSubscribeButton.addEventListener('click', handleLandingPopupSubscribe);
  }

  if (landingPopupBrowseButton) {
    landingPopupBrowseButton.addEventListener('click', handleLandingPopupBrowse);
  }

  // Close on backdrop click
  if (landingPopupBackdrop) {
    landingPopupBackdrop.addEventListener('click', (e) => {
      if (e.target === landingPopupBackdrop) {
        handleLandingPopupBrowse(); // Treat backdrop click as "continue browsing"
      }
    });
  }

  // Show pop-up after a short delay for better UX
  setTimeout(() => {
    showLandingPopup();
  }, 500);
}

// Initialize landing pop-up when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLandingPopup);
} else {
  initializeLandingPopup();
}

/* ============================================================================
   GIFT CARD POP-UP MODAL (Holiday Promo Pop-up)
   Name: "Gift Card Pop-up" or "Holiday Promo Pop-up"
   Purpose: Promotes gift card options during holiday season (December)
   ============================================================================ */

// Get Christmas popup elements
const christmasPopupModal = document.getElementById('christmas-popup-modal');
const christmasPopupBackdrop = document.getElementById('christmas-popup-backdrop');
const christmasPopupClose = document.getElementById('christmas-popup-close');
const christmasPopupDismiss = document.getElementById('christmas-popup-dismiss');
const christmasCardButtons = document.querySelectorAll('.christmas-card-button');

// Check if Christmas popup should be shown
function shouldShowChristmasPopup() {
  // Check if user has already dismissed it
  const dismissed = sessionStorage.getItem('christmas_popup_dismissed');
  if (dismissed) {
    return false;
  }
  
  // Date-based logic: Only show until December 28
  const now = new Date();
  const currentYear = now.getFullYear();
  const dec28 = new Date(currentYear, 11, 28); // Month is 0-indexed, so 11 = December
  
  // Only show if it's December AND before or on December 28
  const month = now.getMonth(); // 0-11, where 11 = December
  if (month !== 11) {
    return false; // Not December
  }
  
  // Show only until December 28 (inclusive)
  return now <= dec28;
}

// Show Christmas popup
function showChristmasPopup() {
  if (!christmasPopupModal || !christmasPopupBackdrop) {
    console.warn('Christmas popup elements not found');
    return;
  }
  
  christmasPopupModal.classList.add('active');
  christmasPopupBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Hide Christmas popup
function hideChristmasPopup() {
  if (!christmasPopupModal || !christmasPopupBackdrop) {
    return;
  }
  
  christmasPopupModal.classList.remove('active');
  christmasPopupBackdrop.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

// Handle Christmas popup purchase
async function handleChristmasPurchase(productHandle) {
  console.log('Christmas gift card purchase:', productHandle);

  // Get Polar product data
  const polarProduct = getPolarProductData(productHandle);

  if (!polarProduct) {
    console.error('Polar product data not found for:', productHandle);
    alert(`Gift card "${productHandle}" is not available for checkout. Please try again later.`);
    return;
  }

  // Hide popup
  hideChristmasPopup();

  // If we have a direct checkout URL, use it (works in local dev and production)
  if (polarProduct.checkoutUrl) {
    console.log('Redirecting to checkout URL:', polarProduct.checkoutUrl);
    window.open(polarProduct.checkoutUrl, '_blank');
    return;
  }

  // Fallback to modal checkout if no direct URL but have productId
  if (polarProduct.productId) {
    try {
      await openCheckoutModal([polarProduct.productId]);
    } catch (error) {
      console.error('Failed to open checkout:', error);
      alert(`Checkout failed: ${error.message}\n\nPlease try again or contact support.`);
    }
  } else {
    alert(`Gift card "${productHandle}" is not available for checkout. Please try again later.`);
  }
}

// Handle dismiss
function handleChristmasDismiss() {
  // Mark as dismissed in sessionStorage
  sessionStorage.setItem('christmas_popup_dismissed', 'true');
  hideChristmasPopup();
}

// Initialize Christmas popup
function initializeChristmasPopup() {
  if (!christmasPopupModal || !christmasPopupBackdrop) {
    console.warn('Christmas popup elements not found in DOM');
    return;
  }
  
  // Check if popup should be shown
  if (!shouldShowChristmasPopup()) {
    console.log('Christmas popup not shown (already dismissed or not December)');
    return;
  }
  
  // Set up event listeners
  if (christmasPopupClose) {
    christmasPopupClose.addEventListener('click', handleChristmasDismiss);
  }
  
  if (christmasPopupDismiss) {
    christmasPopupDismiss.addEventListener('click', handleChristmasDismiss);
  }
  
  // Close on backdrop click
  if (christmasPopupBackdrop) {
    christmasPopupBackdrop.addEventListener('click', (e) => {
      if (e.target === christmasPopupBackdrop) {
        handleChristmasDismiss();
      }
    });
  }
  
  // Set up purchase buttons
  christmasCardButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const productHandle = button.getAttribute('data-product-handle');
      if (productHandle) {
        handleChristmasPurchase(productHandle);
      }
    });
  });
  
  // Show popup after a delay (after landing popup if it shows)
  setTimeout(() => {
    // Only show if landing popup is not active
    if (!landingPopupModal || !landingPopupModal.classList.contains('active')) {
      showChristmasPopup();
    } else {
      // Wait for landing popup to close, then show Christmas popup
      const checkLandingPopup = setInterval(() => {
        if (!landingPopupModal || !landingPopupModal.classList.contains('active')) {
          clearInterval(checkLandingPopup);
          showChristmasPopup();
        }
      }, 500);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkLandingPopup);
      }, 30000);
    }
  }, 1000);
}

// Expose function to manually show Christmas popup (for testing)
window.showChristmasPopupNow = function() {
  sessionStorage.removeItem('christmas_popup_dismissed');
  showChristmasPopup();
};

// Initialize Christmas popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChristmasPopup);
} else {
  initializeChristmasPopup();
}

/* ============================================================================
   THEME TOGGLE FUNCTIONALITY
   Dark Mode Theme Switching
   ============================================================================ */

// Theme management functions
function getTheme() {
  // Check localStorage first
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }
  
  // Default to light mode
  return 'light';
}

function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }
  updateThemeIcon(theme);
}

function toggleTheme() {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// Helper function to convert icon path to theme-appropriate version
// Light mode: uses black/transparent PNGs (regular files without -dark suffix)
// Dark mode: uses white/transparent PNGs (files with -dark suffix)
function getThemedIconPath(iconPath, theme) {
  if (!iconPath) return iconPath;

  // Extract the base filename (without -dark suffix, extension, and path)
  const filename = iconPath.split('/').pop();
  // Remove -dark suffix and .png extension to get base name
  const baseName = filename.replace('-dark.png', '.png').replace('.png', '');

  if (theme === 'dark') {
    // Dark mode: use assets/dark/{baseName}-dark.png
    return `assets/dark/${baseName}-dark.png`;
  } else {
    // Light mode: use assets/light/{baseName}.png
    return `assets/light/${baseName}.png`;
  }
}

// Helper function to convert logo path to theme-appropriate version
// Light mode: uses black/transparent PNGs (regular files without -dark suffix)
// Dark mode: uses white/transparent PNGs (files with -dark suffix)
function getThemedLogoPath(logoPath, theme) {
  if (!logoPath) return logoPath;

  // Extract the base filename (without -dark suffix, extension, and path)
  const filename = logoPath.split('/').pop();
  // Remove -dark suffix and .png extension to get base name
  const baseName = filename.replace('-dark.png', '.png').replace('.png', '');

  if (theme === 'dark') {
    // Dark mode: use assets/dark/{baseName}-dark.png
    return `assets/dark/${baseName}-dark.png`;
  } else {
    // Light mode: use assets/light/{baseName}.png
    return `assets/light/${baseName}.png`;
  }
}

// Updates all theme-related UI elements (icons, logos) based on current theme
// Light mode: uses black/transparent PNGs (regular files without -dark suffix)
// Dark mode: uses white/transparent PNGs (files with -dark suffix)
function updateThemeIcon(theme) {
  const themeIcon = document.getElementById('theme-toggle-icon');
  if (themeIcon) {
    if (theme === 'dark') {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    } else {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
  }
  
  // Update header logo based on current theme and existing logo
  const headerLogo = document.getElementById('header-logo');
  if (headerLogo) {
    // Prefer getAttribute('src') to get the original relative path
    let logoPath = headerLogo.getAttribute('src');
    
    // If no attribute, try to extract from resolved src (full URL)
    if (!logoPath && headerLogo.src) {
      const currentSrc = headerLogo.src;
      logoPath = currentSrc.includes('assets/') 
        ? currentSrc.substring(currentSrc.indexOf('assets/'))
        : 'assets/no3d-tools.png';
    }
    
    // Fallback to default if still no path
    if (!logoPath) {
      logoPath = 'assets/no3d-tools.png';
    }
    
    // Convert to theme-appropriate version
    const themedLogoPath = getThemedLogoPath(logoPath, theme);
    // Use relative path (no leading /) to work in all deployment scenarios
    headerLogo.src = themedLogoPath;
    headerLogo.setAttribute('src', themedLogoPath);
    
    // Add error handler to debug loading issues
    headerLogo.onerror = function() {
      console.error(`Failed to load header logo: ${themedLogoPath}`);
      // Try fallback to default tools logo
      const fallbackPath = theme === 'dark'
        ? 'assets/dark/no3d-tools-dark.png'
        : 'assets/light/no3d-tools.png';
      this.src = fallbackPath;
      this.setAttribute('src', fallbackPath);
    };
  }
  
  // Update account icon
  const accountIcon = document.querySelector('.account-icon-image');
  if (accountIcon) {
    let iconPath = accountIcon.getAttribute('src');
    
    if (!iconPath && accountIcon.src) {
      const currentSrc = accountIcon.src;
      iconPath = currentSrc.includes('assets/') 
        ? currentSrc.substring(currentSrc.indexOf('assets/'))
        : 'assets/account-icon.png';
    }
    
    if (!iconPath) {
      iconPath = 'assets/account-icon.png';
    }
    
    const themedIconPath = getThemedIconPath(iconPath, theme);
    // Use relative path (no leading /) to work in all deployment scenarios
    accountIcon.src = themedIconPath;
    accountIcon.setAttribute('src', themedIconPath);
    
    // Add error handler
    accountIcon.onerror = function() {
      console.error(`Failed to load account icon: ${themedIconPath}`);
    };
  }
  
  // Update cart icon
  const cartIcon = document.getElementById('cart-icon');
  if (cartIcon) {
    let iconPath = cartIcon.getAttribute('src');
    
    if (!iconPath && cartIcon.src) {
      const currentSrc = cartIcon.src;
      iconPath = currentSrc.includes('assets/') 
        ? currentSrc.substring(currentSrc.indexOf('assets/'))
        : 'assets/cart-icon.png';
    }
    
    if (!iconPath) {
      iconPath = 'assets/cart-icon.png';
    }
    
    const themedIconPath = getThemedIconPath(iconPath, theme);
    // Use relative path (no leading /) to work in all deployment scenarios
    cartIcon.src = themedIconPath;
    cartIcon.setAttribute('src', themedIconPath);
    
    // Add error handler
    cartIcon.onerror = function() {
      console.error(`Failed to load cart icon: ${themedIconPath}`);
    };
  }
  
  // Update footer logo (stone logo)
  const footerLogo = document.querySelector('.footer-logo');
  if (footerLogo) {
    let iconPath = footerLogo.getAttribute('src');
    
    if (!iconPath && footerLogo.src) {
      const currentSrc = footerLogo.src;
      iconPath = currentSrc.includes('assets/') 
        ? currentSrc.substring(currentSrc.indexOf('assets/'))
        : 'assets/stone-logo.png';
    }
    
    if (!iconPath) {
      iconPath = 'assets/stone-logo.png';
    }
    
    const themedIconPath = getThemedIconPath(iconPath, theme);
    // Use relative path (no leading /) to work in all deployment scenarios
    footerLogo.src = themedIconPath;
    footerLogo.setAttribute('src', themedIconPath);
    
    // Add error handler
    footerLogo.onerror = function() {
      console.error(`Failed to load footer logo: ${themedIconPath}`);
    };
  }
  
  // Update blender icon (member CTA button)
  const blenderIcons = document.querySelectorAll('.member-cta-icon, .mobile-member-cta-icon');
  blenderIcons.forEach(blenderIcon => {
    if (blenderIcon) {
      let iconPath = blenderIcon.getAttribute('src');
      
      if (!iconPath && blenderIcon.src) {
        const currentSrc = blenderIcon.src;
        iconPath = currentSrc.includes('assets/') 
          ? currentSrc.substring(currentSrc.indexOf('assets/'))
          : 'assets/blender_bit_icon.png';
      }
      
      if (!iconPath) {
        iconPath = 'assets/blender_bit_icon.png';
      }
      
      // Blender icon doesn't have dark mode variant, so use same icon
      // Use relative path (no leading /) to work in all deployment scenarios
      blenderIcon.src = iconPath;
      blenderIcon.setAttribute('src', iconPath);
      
      // Add error handler
      blenderIcon.onerror = function() {
        console.error(`Failed to load blender icon: ${iconPath}`);
      };
    }
  });
}

function initializeThemeToggle() {
  // Set initial theme
  const theme = getTheme();
  setTheme(theme);
  
  // Add click handler to toggle button
  const themeToggleButton = document.getElementById('theme-toggle-button');
  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', toggleTheme);
  }
  
  // System theme changes are ignored - default is always light mode
}

// Initialize theme toggle when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeThemeToggle);
} else {
  initializeThemeToggle();
}

/* ============================================================================
   HOME CTA BANNER
   ============================================================================ */

function initializeHomeCTABanner() {
  const dismissButton = document.getElementById('christmas-cta-dismiss');
  const ctaBanner = document.getElementById('christmas-cta-banner');

  if (!dismissButton || !ctaBanner) return;

  // Allow reset via query parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('resetBanner') === 'true') {
    sessionStorage.removeItem('christmas-cta-dismissed');
  }

  // Check if banner was previously dismissed (session storage)
  const isDismissed = sessionStorage.getItem('christmas-cta-dismissed');
  if (isDismissed === 'true') {
    ctaBanner.classList.add('hidden');
    return;
  }

  dismissButton.addEventListener('click', function() {
    ctaBanner.classList.add('hidden');
    sessionStorage.setItem('christmas-cta-dismissed', 'true');
  });
}

// Initialize CTA banner when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHomeCTABanner);
} else {
  initializeHomeCTABanner();
}
