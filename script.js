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
const LIBRARY_CONFIG = {
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
// Default to a product that exists in POLAR_PRODUCTS
// Available mapped products: 'dojo-mesh-repair', 'dojo-print-vizv45', 'dojo-squircle-v45obj', 'dojosquircle-v45', 'print-bed-previewobj'
let currentProduct = 'dojo-mesh-repair';

// 3-Tier Sidebar State
let productDataByType = {};
let activeProductType = 'tools';
let expandedProductGroups = new Set();

// DOM elements
const productTitle = document.getElementById('product-title');
const productPrice = document.getElementById('product-price');
const productDescription = document.getElementById('product-description');
const product3dImage = document.getElementById('product-3d-image');
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

document.addEventListener('DOMContentLoaded', async function() {
  try {
    await loadProductsFromJSON();
    organizeProductsByType();
    renderSidebar();
    initializeEventListeners();
    initializeMobileMenu();
    initializeSidebarEventListeners();
    updateHeaderLogo('tools');
    // Set Tools as default expanded type
    expandProductType('tools');
    // Select first product if available
    const firstProductId = Object.keys(products)[0];
    if (firstProductId) {
      currentProduct = firstProductId;
      updateProductDisplay(currentProduct);
      updateIconGrid();
    }
    
    // Start periodic price refresh
    startPriceRefresh();
  } catch (error) {
    console.warn('Failed to load products from JSON, using fallback data:', error);
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
    const firstProductId = Object.keys(products)[0];
    if (firstProductId) {
      currentProduct = firstProductId;
      updateProductDisplay(currentProduct);
      updateIconGrid();
    }
    
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
      updateProductDisplay(currentProduct);
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
      'Dojo_Squircle v4.5.json'
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

        // Get thumbnail from metafields or use local icon
        // Product folder name matches the JSON filename (without .json extension)
        const productFolderName = fileName.replace('.json', '');
        let thumbnail = null;
        if (jsonData.metafields) {
          const thumbnailField = jsonData.metafields.find(f => f.key === 'thumbnail');
          if (thumbnailField) {
            // If thumbnail is specified, use local asset
            thumbnail = getProductImageUrl(thumbnailField.value);
          }
        }

        // Default to local icon if no thumbnail specified
        if (!thumbnail) {
          thumbnail = getProductIconUrl(productFolderName);
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
        const folderName = fileName.includes('/') ? fileName.split('/')[0] : null;
        
        products[productId] = {
          name: jsonData.title.toUpperCase(),
          price: price,
          description: jsonData.description || generateDescription(jsonData.title),
          changelog: changelog, // Array of {version, date, changes[]} objects
          image3d: thumbnail, // Use local assets
          icon: thumbnail, // Use local assets
          productType: jsonData.productType || 'tools',
          groups: productGroups,
          handle: jsonData.handle || productId,
          polarProductId: jsonData.polar?.product_id || null, // Store Polar product ID for price updates
          folderName: folderName // Store folder name for docs filename construction
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
      updateProductDisplay(currentProduct);
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
    logo: 'assets/NO3D TOOLS.png',
    description: 'Advanced 3D modeling enhancements for Blender users designing real world products, built with 3D printing and laser cutting in mind!'
  },
  tutorials: {
    label: 'TUTORIALS',
    logo: 'assets/NO3D DOJO.png',
    description: 'Welcome to Node Dojo! Here you\'ll find tutorials on Blender and Geometry nodes. The Node Dojo Modules are famous for being interactive video game style tutorials built right into Blender.'
  },
  prints: {
    label: 'PRINTS',
    logo: 'assets/NO3D PRINTS.png',
    description: 'Here are downloadable 3D print, CNC and laser cut files that you can use to build your own projects.'
  },
  apps: {
    label: 'APPS',
    logo: 'assets/NO3D CODE.png',
    description: 'Here are some vibe coded apps and Blender Add-ons to enhance your design workflows and make NO3D Tools even more usable.'
  },
  docs: {
    label: 'DOCS/BLOG',
    logo: 'assets/NO3D NOT3S.png',
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
    
    productTypeDiv.appendChild(typeHeader);
    productTypeDiv.appendChild(groupsContainer);
    sidebarContent.appendChild(productTypeDiv);
  });
}

// Load products from GitHub API for a specific library
// Loads ALL directories from the repo (no prefix filtering)
async function loadProductsFromGitHubLibrary(libraryKey) {
  const config = LIBRARY_CONFIG[libraryKey];
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

        // Find thumbnail/icon image - check common patterns
        let thumbnail = null;
        
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
      const config = LIBRARY_CONFIG[typeKey];
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
  if (typeDef && typeDef.logo) {
    headerLogo.src = typeDef.logo;
    headerLogo.alt = typeDef.label;
  } else {
    // Fallback to tools logo if type not found
    headerLogo.src = productTypeDefinitions.tools.logo;
    headerLogo.alt = productTypeDefinitions.tools.label;
  }
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
      selectProduct(productId);
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

// Set up event listeners
function initializeEventListeners() {
  // Use event delegation for dynamically generated content
  document.addEventListener('click', function(e) {
    // Sidebar product selection
    if (e.target.closest('.product-item')) {
      const productItem = e.target.closest('.product-item');
      const productId = productItem.dataset.product;
      selectProduct(productId);
    }
    
    // Icon grid selection
    if (e.target.closest('.icon-item')) {
      const iconItem = e.target.closest('.icon-item');
      const productId = iconItem.dataset.product;
      selectProduct(productId);
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
function selectProduct(productId) {
  if (!products[productId]) {
    console.warn(`Product ${productId} not found`);
    return;
  }

  currentProduct = productId;
  // Update button visibility based on subscriber status
  updateButtonVisibility(productId);
  updateProductDisplay(productId);
  updateActiveStates(productId);
}

// Update button visibility based on subscriber status
function updateButtonVisibility(productId) {
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

  // Check localStorage for persistent purchase records (optional future enhancement)
  // For now, we only use sessionStorage

  if (ownsProduct || hasActiveSubscription) {
    // Customer owns this product or has active subscription - show DOWNLOAD button
    if (downloadButton) downloadButton.style.display = '';
    if (buyNowBtn) buyNowBtn.style.display = 'none';
  } else {
    // Customer doesn't own product - show BUY NOW button
    if (downloadButton) downloadButton.style.display = 'none';
    if (buyNowBtn) buyNowBtn.style.display = '';
  }
}

// Update the product display with new data
function updateProductDisplay(productId) {
  const product = products[productId];
  
  // Set productId on product card for markdown docs loading
  const productCard = document.querySelector('.product-left-section')?.closest('.product-card') || 
                      document.querySelector('.product-left-section')?.parentElement;
  if (productCard) {
    productCard.dataset.productId = productId || '';
  }
  
  if (!product) {
    // If no product, show type description if a type is active
    if (activeProductType) {
      updateProductCardForType(activeProductType);
    }
    return;
  }

  // Update product information
  productTitle.textContent = product.name;
  productPrice.textContent = `PRICE: ${product.price}`;
  productDescription.innerHTML = product.description.split('\n').map(paragraph => 
    paragraph.trim() ? `<p>${paragraph}</p>` : '<p>&nbsp;</p>'
  ).join('');

  // Update 3D image
  product3dImage.src = product.image3d;
  product3dImage.alt = `${product.name} 3D Render`;

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

    // Get folder name from product (used for docs filename)
    // folderName is the original folder name like "Dojo Bolt Gen v05"
    const folderName = product.folderName || product.name;
    
    // Construct docs filename: docs_{folderName}.md
    const docsFilename = `docs_${folderName}.md`;
    const docsUrl = `/assets/product-docs/${folderName}/${docsFilename}`;
    
    // Try new format first
    let response = await fetch(docsUrl);
    
    // Fallback to legacy DOCS.md if new format doesn't exist
    if (!response.ok) {
      const legacyUrl = `/assets/product-docs/${folderName}/DOCS.md`;
      response = await fetch(legacyUrl);
    }

    if (!response.ok) {
      // Fallback to original description
      if (product && product.description) {
        productDescription.innerHTML = `<p>${product.description}</p>`;
      } else {
        productDescription.innerHTML = '<p>No documentation available for this product.</p>';
      }
      return;
    }

    const markdownContent = await response.text();
    const docsBasePath = `/assets/product-docs/${folderName}`;

    // Transform image URLs in markdown to use /assets/
    let transformedMarkdown = markdownContent.replace(
      /!\[(.*?)\]\(((?!http|https|\/assets).*?)\)/g,
      (match, alt, imgPath) => {
        // Handle paths relative to markdown file or docs-assets folder
        const cleanPath = imgPath.replace(/^\.\//, '').replace(/^docs-assets\//, 'docs-assets/');
        const assetPath = cleanPath.startsWith('docs-assets/') 
          ? `${docsBasePath}/${cleanPath}`
          : `${docsBasePath}/${cleanPath}`;
        return `![${alt}](${assetPath})`;
      }
    );

    // Convert local video references to HTML5 video tags
    // Pattern: ![alt](video.mp4) or ![alt](docs-assets/video.mp4)
    transformedMarkdown = transformedMarkdown.replace(
      /!\[([^\]]*)\]\(([^)]+\.(mp4|webm|ogg|mov))\)/gi,
      (match, alt, videoPath) => {
        const cleanPath = videoPath.replace(/^\.\//, '').replace(/^docs-assets\//, 'docs-assets/');
        const fullVideoPath = cleanPath.startsWith('docs-assets/') 
          ? `${docsBasePath}/${cleanPath}`
          : `${docsBasePath}/${cleanPath}`;
        return `<div class="video-wrapper"><video controls><source src="${fullVideoPath}" type="video/${videoPath.split('.').pop()}">Your browser does not support the video tag.</video></div>`;
      }
    );

    // Convert 3D object references to Three.js viewer
    // Pattern: ![3D](model.obj) or [3D: model.obj] or ![3D](docs-assets/model.obj)
    transformedMarkdown = transformedMarkdown.replace(
      /(?:!\[([^\]]*)\]\(|\[3D:\s*)([^)]+\.(obj|stl))\)?/gi,
      (match, alt, modelPath) => {
        const cleanPath = modelPath.replace(/^\.\//, '').replace(/^docs-assets\//, 'docs-assets/');
        const fullModelPath = cleanPath.startsWith('docs-assets/') 
          ? `${docsBasePath}/${cleanPath}`
          : `${docsBasePath}/${cleanPath}`;
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
      // The description and changelog are already populated in the HTML
      // from the product data during product selection
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
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    // Close any open modals or reset selections
    console.log('Escape pressed - resetting to default product');
    selectProduct('dojo-bool-v5');
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
    console.warn(`Failed to load image: ${e.target.src}`);
    
    // Different fallback images based on context
    if (e.target.id === 'product-3d-image') {
      // Fallback for 3D product images
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDMyMCAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMjU2IiBmaWxsPSIjRThFOEU4Ii8+CjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMzYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIDNEIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';
    } else {
      // Fallback for icon images
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SWNvbjwvdGV4dD4KPC9zdmc+';
    }
  }
}, true);

// Initialize with default product
console.log('NO3D Tools website initialized');

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
  // CMD+K (Mac) or Ctrl+K (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openSearchModal();
  }

  // ESC to close modal
  if (e.key === 'Escape' && searchModal.classList.contains('active')) {
    closeSearchModal();
  }
});

function openSearchModal() {
  searchModal.classList.add('active');
  searchModalBackdrop.classList.add('active');
  searchInput.value = '';
  searchInput.focus();
  performSearch('');
}

function closeSearchModal() {
  searchModal.classList.remove('active');
  searchModalBackdrop.classList.remove('active');
  selectedResultIndex = -1;
}

// Close modal when clicking backdrop
searchModalBackdrop.addEventListener('click', closeSearchModal);

// Search input handler
searchInput.addEventListener('input', function(e) {
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
    selectProduct(productId);
    closeSearchModal();
  }
});

function performSearch(query) {
  const searchTerm = query.toLowerCase().trim();

  // Get all product IDs
  const allProducts = Object.keys(products);

  if (searchTerm === '') {
    // Show all products when search is empty
    searchResults = allProducts;
  } else {
    // Filter products by name, description, changelog, and all text content
    searchResults = allProducts.filter(productId => {
      const product = products[productId];
      const name = product.name.toLowerCase();
      const desc = product.description.toLowerCase();

      // Search in name and description
      if (name.includes(searchTerm) || desc.includes(searchTerm)) {
        return true;
      }

      // Search in changelog items
      if (product.changelog && Array.isArray(product.changelog)) {
        const changelogMatch = product.changelog.some(item =>
          item.toLowerCase().includes(searchTerm)
        );
        if (changelogMatch) return true;
      }

      // Search in product type and groups
      if (product.productType && product.productType.toLowerCase().includes(searchTerm)) {
        return true;
      }

      if (product.groups && Array.isArray(product.groups)) {
        const groupMatch = product.groups.some(group =>
          group.toLowerCase().includes(searchTerm)
        );
        if (groupMatch) return true;
      }

      return false;
    });
  }

  selectedResultIndex = searchResults.length > 0 ? 0 : -1;
  renderSearchResults();
}

function renderSearchResults() {
  searchResultsContainer.innerHTML = '';

  if (searchResults.length === 0) {
    searchResultsEmpty.style.display = 'flex';
    return;
  }

  searchResultsEmpty.style.display = 'none';

  searchResults.forEach((productId, index) => {
    const product = products[productId];
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    if (index === selectedResultIndex) {
      resultItem.classList.add('selected');
    }

    resultItem.innerHTML = `
      <div class="search-result-content">
        <div class="search-result-title">${product.name}</div>
        <div class="search-result-price">${product.price}</div>
      </div>
    `;

    resultItem.addEventListener('click', () => {
      selectProduct(productId);
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

  if (!polarProduct || !polarProduct.productId) {
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
      // Call serverless function to create checkout session
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: productIds
        })
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
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
          
          // Extract customer email from checkout data if available
          let customerEmail = null;
          if (eventData && eventData.customer && eventData.customer.email) {
            customerEmail = eventData.customer.email;
          } else if (eventData && eventData.email) {
            customerEmail = eventData.email;
          }

          // If email not available, prompt user
          if (!customerEmail) {
            customerEmail = prompt('Please enter your email address to access your downloads:');
            if (!customerEmail) {
              alert('Email is required to verify your purchase. Please contact support if you need assistance.');
              closeCheckoutModalUI();
              return;
            }
          }

          // Verify purchase and get download URLs
          try {
            await handlePurchaseSuccess(productIds, customerEmail);
            closeCheckoutModalUI();
          } catch (error) {
            console.error('Error handling purchase success:', error);
            alert(`Purchase successful! However, we couldn't verify your purchase immediately. Please check your email for download links.\n\nError: ${error.message}`);
            closeCheckoutModalUI();
            window.location.reload();
          }
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

// Initialize footer shortcut on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateFooterShortcut);
} else {
  updateFooterShortcut();
}

// Initialize mobile search bar
function initializeMobileSearch() {
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileSearchButton = document.getElementById('mobile-search-button');

  if (mobileSearchInput && mobileSearchButton) {
    // Handle typing in mobile search - live predictive search
    mobileSearchInput.addEventListener('input', () => {
      // Open modal if not already open
      if (!searchModal.classList.contains('active')) {
        openSearchModal();
      }

      // Sync with main search input and trigger search
      searchInput.value = mobileSearchInput.value;
      performSearch();
    });

    // Handle button click
    mobileSearchButton.addEventListener('click', () => {
      openSearchModal();
      // Pre-fill with mobile input value if exists
      if (mobileSearchInput.value) {
        searchInput.value = mobileSearchInput.value;
        performSearch();
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
    searchInput.addEventListener('input', () => {
      if (searchModal.classList.contains('active')) {
        mobileSearchInput.value = searchInput.value;
      }
    });

    // Clear mobile search when modal closes
    searchModalBackdrop.addEventListener('click', () => {
      mobileSearchInput.value = '';
    });

    // Also clear when ESC is pressed
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchModal.classList.contains('active')) {
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

  console.log('📊 activeProductType:', activeProductType);
  console.log('📊 productDataByType:', Object.keys(productDataByType));

  // Only show grid when Tools section is active
  const isToolsActive = activeProductType && activeProductType.toLowerCase() === 'tools';
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
    .filter(product => product && product.title) // Filter out products without titles
    .sort((a, b) => (a.title || '').localeCompare(b.title || '')); // Sort alphabetically with fallback

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

    // Use thumbnail from product data if available
    const thumbnailField = product.metafields?.find(f => f.key === 'thumbnail');
    if (thumbnailField && thumbnailField.value) {
      // Use GitHub raw URL for the thumbnail
      const libraryPath = product.library || 'no3d-tools-library';
      const productFolder = product.folder || product.id;
      img.src = `https://raw.githubusercontent.com/node-dojo/${libraryPath}/main/${productFolder}/${thumbnailField.value}`;
    } else {
      // Fallback to placeholder
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNFOEU4RTgiLz4KICA8dGV4dCB4PSIzMiIgeT0iMzQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    }

    img.alt = product.title;
    img.loading = 'lazy';

    // Add click handler to load product
    iconItem.addEventListener('click', () => {
      selectProduct(product.id);

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
