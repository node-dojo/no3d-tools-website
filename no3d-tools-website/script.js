// NO3D TOOLS WEBSITE INTERACTIVITY
// Following Figma Design System Rules

// GitHub Repository Configuration
const REPO_CONFIG = {
  owner: 'node-dojo',
  repo: 'no3d-tools-library',
  branch: 'main'
};

// GitHub API base URL
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

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
    changelog: [
      'Added dark mode toggle for better nighttime readability.',
      'Improved sync speed for cloud backups by 40%.',
      'Fixed a bug causing notifications to repeat after device restart.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-slug-tool-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-slug-tool-icon.png'
  },
  'dojo-squircle': {
    name: 'DOJO SQUIRCLE',
    price: '$7.99',
    description: `The Dojo Squircle tool revolutionizes 3D modeling with its unique approach to creating organic, flowing shapes. Perfect for character design, architectural elements, and artistic sculptures, this tool combines the mathematical precision of circles with the dynamic energy of squares.

Advanced algorithms ensure smooth transitions between curved and straight edges, giving you unprecedented control over form and function. Whether you're designing futuristic interfaces or organic architectural elements, Dojo Squircle adapts to your creative vision.`,
    changelog: [
      'Enhanced curve smoothing algorithms for better edge transitions.',
      'Added new preset shape libraries for common use cases.',
      'Improved performance for complex multi-segment shapes.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-squircle-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-squircle-icon.png'
  },
  'dojo-mesh-repair': {
    name: 'DOJO MESH REPAIR',
    price: '$12.50',
    description: `Professional mesh repair and optimization tool designed for 3D artists and engineers. Dojo Mesh Repair automatically detects and fixes common mesh issues including holes, non-manifold edges, overlapping faces, and inverted normals.

With its intelligent algorithms, the tool preserves the original geometry while ensuring watertight meshes suitable for 3D printing, rendering, and simulation. Save hours of manual cleanup with automated repair processes that maintain the artistic integrity of your models.`,
    changelog: [
      'Added support for complex non-manifold geometry repair.',
      'Improved hole detection accuracy by 60%.',
      'New batch processing mode for multiple files.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-mesh-repair-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-mesh-repair-icon.png'
  },
  'dojo-print-viz': {
    name: 'DOJO PRINT VIZ',
    price: '$9.99',
    description: `Visualize your 3D models in real-world print scenarios with Dojo Print Viz. This powerful tool simulates 3D printing processes, showing layer-by-layer construction, support material requirements, and potential printing issues before you commit to a print.

Perfect for makers, designers, and educators, Dojo Print Viz helps optimize models for successful 3D printing while providing educational insights into additive manufacturing processes.`,
    changelog: [
      'Added support for new 3D printer profiles.',
      'Enhanced support material visualization.',
      'Improved print time estimation accuracy.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-print-viz-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-print-viz-icon.png'
  },
  'dojo-print-bed': {
    name: 'DOJO PRINT BED',
    price: '$6.75',
    description: `Optimize your 3D printing setup with Dojo Print Bed. This tool helps you arrange multiple models on your print bed for maximum efficiency, calculates optimal print settings, and provides real-time feedback on print feasibility.`,
    changelog: [
      'Added multi-model arrangement algorithms.',
      'Improved bed utilization calculations.',
      'New print time estimation features.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-print-bed-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-print-bed-icon.png'
  },
  'dojo-gluefinity-grid': {
    name: 'DOJO GLUEFINITY GRID',
    price: '$8.25',
    description: `Create complex grid-based structures with Dojo Gluefinity Grid. Perfect for architectural visualization, game environments, and parametric design, this tool generates infinite grid patterns with customizable parameters.`,
    changelog: [
      'Added parametric grid generation.',
      'Enhanced pattern customization options.',
      'Improved performance for large grids.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-gluefinity-grid-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-gluefinity-grid-icon.png'
  },
  'dojo-knob': {
    name: 'DOJO KNOB',
    price: '$4.50',
    description: `Precision control interface for 3D modeling operations. Dojo Knob provides intuitive parameter adjustment with haptic feedback simulation, making complex modeling tasks more accessible and enjoyable.`,
    changelog: [
      'Added haptic feedback simulation.',
      'Improved parameter precision controls.',
      'New customizable interface themes.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-knob-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-knob-icon.png'
  },
  'dojo-bolt-gen': {
    name: 'DOJO BOLT GEN',
    price: '$11.99',
    description: `Generate realistic threaded fasteners and mechanical components with Dojo Bolt Gen. From simple screws to complex threaded assemblies, this tool creates accurate 3D models ready for engineering and manufacturing.`,
    changelog: [
      'Added support for metric and imperial thread standards.',
      'Enhanced thread detail generation.',
      'New material property calculations.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-bolt-gen-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-bolt-gen-icon.png'
  },
  'dojo-calipers': {
    name: 'DOJO CALIPERS',
    price: '$5.25',
    description: `Precision measurement tool for 3D modeling and reverse engineering. Dojo Calipers provides accurate distance, angle, and dimension measurements with real-time feedback and export capabilities.`,
    changelog: [
      'Added angle measurement capabilities.',
      'Enhanced measurement precision.',
      'New export formats for measurements.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-calipers-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-calipers-icon.png'
  },
  'dojo-crv-wrapper': {
    name: 'DOJO CRV WRAPPER',
    price: '$7.50',
    description: `Advanced curve manipulation and wrapping tool for complex 3D modeling tasks. Perfect for creating organic shapes, architectural elements, and artistic sculptures with precise curve control.`,
    changelog: [
      'Added advanced curve wrapping algorithms.',
      'Enhanced curve editing precision.',
      'New preset curve libraries.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-crv-wrapper-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-crv-wrapper-icon.png'
  },
  'dojo-bool': {
    name: 'DOJO BOOL',
    price: '$9.50',
    description: `Boolean operations made simple and powerful. Dojo Bool provides intuitive union, intersection, and difference operations for complex 3D modeling with real-time preview and error checking.`,
    changelog: [
      'Added real-time boolean preview.',
      'Enhanced error detection and correction.',
      'Improved performance for complex operations.'
    ],
    image3d: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-bool-3d.png',
    icon: 'https://github.com/node-dojo/no3d-tools-library/raw/main/assets/dojo-bool-icon.png'
  }
};

// Current selected product
let currentProduct = 'dojo-bool-v5';

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
  }
});

// Load Products from JSON Files
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
    
    for (const fileName of productFiles) {
      try {
        const response = await fetch(`assets/product-data/${fileName}`);
        if (!response.ok) continue;
        
        const jsonData = await response.json();
        
        // Create product ID from handle
        const productId = jsonData.handle || jsonData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        // Get thumbnail from metafields or use default
        let thumbnail = null;
        if (jsonData.metafields) {
          const thumbnailField = jsonData.metafields.find(f => f.key === 'thumbnail');
          if (thumbnailField) {
            thumbnail = `assets/product-images/${thumbnailField.value}`;
          }
        }
        
        // Get price from variants
        const price = jsonData.variants && jsonData.variants[0] ? `$${parseFloat(jsonData.variants[0].price).toFixed(2)}` : '$0.00';
        
        // Extract product groups from tags (tags that are capitalized or contain spaces)
        const productGroups = (jsonData.tags || []).filter(tag => {
          // Product groups are tags that are capitalized or contain spaces
          return tag && (tag !== tag.toLowerCase() || tag.includes(' '));
        });
        
        products[productId] = {
          name: jsonData.title.toUpperCase(),
          price: price,
          description: jsonData.description || generateDescription(jsonData.title),
          changelog: generateChangelog(jsonData.title),
          image3d: thumbnail || `assets/product-images/icon_${jsonData.title}.png`,
          icon: thumbnail || `assets/product-images/icon_${jsonData.title}.png`,
          productType: jsonData.productType || 'tools',
          groups: productGroups,
          handle: jsonData.handle || productId
        };
      } catch (error) {
        console.warn(`Failed to load ${fileName}:`, error);
      }
    }
    
    if (Object.keys(products).length === 0) {
      throw new Error('No products loaded from JSON files');
    }
    
    console.log('Loaded products from JSON:', Object.keys(products).length, 'products');
  } catch (error) {
    console.error('Error loading products from JSON:', error);
    throw error;
  }
}

// Organize Products by Product Type
function organizeProductsByType() {
  productDataByType = {
    tools: {},
    tutorials: {},
    prints: {},
    apps: {}
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
    { key: 'tools', label: 'TOOLS' },
    { key: 'tutorials', label: 'TUTORIALS' },
    { key: 'prints', label: 'PRINTS' },
    { key: 'apps', label: 'APPS' }
  ];
  
  productTypes.forEach(type => {
    const typeProducts = productDataByType[type.key] || {};
    if (Object.keys(typeProducts).length === 0) return; // Skip empty types
    
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
      <span class="category-name">${type.label}</span>
      <span class="carrot ${type.key === activeProductType ? 'expanded' : 'collapsed'}">${type.key === activeProductType ? '▼' : '▶'}</span>
    `;
    
    // Product groups container
    const groupsContainer = document.createElement('div');
    groupsContainer.className = 'product-groups-container';
    
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
        <span class="category-name">${groupName.toUpperCase()}</span>
        <span class="carrot ${expandedProductGroups.has(groupName) ? 'expanded' : 'collapsed'}">${expandedProductGroups.has(groupName) ? '▼' : '▶'}</span>
      `;
      
      // Product list
      const productList = document.createElement('div');
      productList.className = 'group-product-list';
      // Always show products in groups, even when group is collapsed
      productList.style.display = 'flex';
      
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
      
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.innerHTML = `
        <span class="category-name">OTHER</span>
        <span class="carrot collapsed">▶</span>
      `;
      
      const productList = document.createElement('div');
      productList.className = 'group-product-list';
      // Always show ungrouped products, even when "OTHER" group is collapsed
      productList.style.display = 'flex';
      
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
    
    productTypeDiv.appendChild(typeHeader);
    productTypeDiv.appendChild(groupsContainer);
    sidebarContent.appendChild(productTypeDiv);
  });
}

// Handle Product Type Toggle (Accordion - only one expanded)
function handleProductTypeToggle(typeKey) {
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
    } else {
      clickedType.classList.add('expanded');
      const carrot = clickedType.querySelector('.type-header .carrot');
      if (carrot) {
        carrot.classList.remove('collapsed');
        carrot.classList.add('expanded');
        carrot.textContent = '▼';
      }
      activeProductType = typeKey;
    }
    
    updateHeaderLogo(activeProductType);
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
  
  const logoMap = {
    tools: 'assets/NO3D TOOLS logo.png',
    tutorials: 'assets/NO3D DOJO.png',
    prints: 'assets/NO3D PRINTS.png',
    apps: 'assets/NO3D CODE.png'
  };
  
  const logoPath = logoMap[typeKey] || logoMap.tools;
  headerLogo.src = logoPath;
  headerLogo.alt = typeKey.toUpperCase();
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
      
      // Create product data with local image URLs
      const iconUrl = `assets/product-images/icon_${productName}.png`;
      const image3dUrl = iconUrl; // Use icon as 3D image for now

      console.log(`Using local images for ${productName}:`, iconUrl);
      
      products[productId] = {
        name: productName.toUpperCase(),
        price: generatePrice(),
        description: generateDescription(productName),
        changelog: generateChangelog(productName),
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
    // Only show products from expanded groups
    Object.keys(filteredProducts).forEach(productId => {
      const product = filteredProducts[productId];
      if (product.groups && product.groups.length > 0) {
        // Check if product belongs to any expanded group
        const hasExpandedGroup = product.groups.some(group => expandedProductGroups.has(group));
        if (hasExpandedGroup) {
          productsToShow.push({ id: productId, ...product });
        }
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
  updateProductDisplay(productId);
  updateActiveStates(productId);
}

// Update the product display with new data
function updateProductDisplay(productId) {
  const product = products[productId];
  
  if (!product) return;

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

// Update changelog content
function updateChangelog(changelogItems) {
  const changelogContent = document.querySelector('.changelog-content ul');
  if (!changelogContent) return;

  changelogContent.innerHTML = changelogItems.map(item => 
    `<li><span class="leading-[1.05]">${item}</span></li>`
  ).join('');
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
  if (tabIcon.classList.contains('expanded')) {
    tabIcon.classList.remove('expanded');
    tabIcon.classList.add('collapsed');
  } else {
    tabIcon.classList.remove('collapsed');
    tabIcon.classList.add('expanded');
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

// Switch between tabs
function switchTab(tabName) {
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
    if (icon.dataset.tab === tabName) {
      icon.classList.remove('collapsed');
      icon.classList.add('expanded');
    } else {
      icon.classList.remove('expanded');
      icon.classList.add('collapsed');
    }
  });

  // Update content based on tab
  const productDescription = document.getElementById('product-description');
  const changelogSection = document.querySelector('.changelog-section');
  
  switch(tabName) {
    case 'docs':
      productDescription.style.display = 'block';
      changelogSection.style.display = 'flex';
      break;
    case 'vids':
      productDescription.innerHTML = '<p>Video content coming soon! Check back for tutorials and demonstrations.</p>';
      productDescription.style.display = 'block';
      changelogSection.style.display = 'none';
      break;
    case 'issues':
      productDescription.innerHTML = '<p>Issue tracking and support coming soon! For now, please contact support directly.</p>';
      productDescription.style.display = 'block';
      changelogSection.style.display = 'none';
      break;
  }
}

// Download product (placeholder functionality)
function downloadProduct(productId) {
  console.log('=== Download Product Called ===');
  console.log('Product ID:', productId);
  console.log('POLAR_PRODUCTS available:', typeof POLAR_PRODUCTS !== 'undefined');

  const product = products[productId];
  if (!product) {
    console.warn(`Product not found in products object: ${productId}`);
    console.log('Available products:', Object.keys(products));
    return;
  }

  // Check if we have a Polar product mapping
  const polarProduct = typeof POLAR_PRODUCTS !== 'undefined' ? POLAR_PRODUCTS[productId] : null;
  console.log('Polar product found:', polarProduct);

  if (polarProduct) {
    // Redirect to Polar product page
    console.log(`Opening Polar product page: ${polarProduct.name}`);
    console.log(`URL: ${polarProduct.url}`);
    window.open(polarProduct.url, '_blank');

    // Show feedback
    const originalText = downloadButton.textContent;
    downloadButton.textContent = 'OPENING POLAR...';
    downloadButton.disabled = true;

    setTimeout(() => {
      downloadButton.textContent = originalText;
      downloadButton.disabled = false;
    }, 2000);
  } else {
    // Fallback - show message that download is not yet available
    console.warn(`No Polar product found for: ${productId}`);
    console.log('Available Polar products:', typeof POLAR_PRODUCTS !== 'undefined' ? Object.keys(POLAR_PRODUCTS) : 'POLAR_PRODUCTS not defined');

    const originalText = downloadButton.textContent;
    downloadButton.textContent = 'COMING SOON!';
    downloadButton.disabled = true;

    setTimeout(() => {
      downloadButton.textContent = originalText;
      downloadButton.disabled = false;
    }, 2000);
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
    // Filter products by name or description
    searchResults = allProducts.filter(productId => {
      const product = products[productId];
      const name = product.name.toLowerCase();
      const desc = product.description.toLowerCase();

      return name.includes(searchTerm) || desc.includes(searchTerm);
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
  
  // Get price IDs for Polar checkout
  getPriceIds() {
    return this.items.map(item => item.polarPriceId).filter(id => id);
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
const addToCartButton = document.getElementById('add-to-cart-button');

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
    return null;
  }
  
  // Try to find product in POLAR_PRODUCTS
  const polarProduct = POLAR_PRODUCTS[productSlug] || 
                       Object.values(POLAR_PRODUCTS).find(p => 
                         p.name.toLowerCase().includes(productSlug.toLowerCase())
                       );
  
  return polarProduct || null;
}

// Add current product to cart
function addCurrentProductToCart() {
  if (!currentProduct) {
    console.error('No current product selected');
    return;
  }
  
  // Get product slug from currentProduct
  const productSlug = currentProduct.toLowerCase().replace(/\s+/g, '-');
  
  // Get Polar product data
  const polarProduct = getPolarProductData(productSlug);
  
  if (!polarProduct) {
    console.error('Polar product data not found for:', currentProduct);
    // Still add to cart with available data
    const productName = products[currentProduct]?.name || currentProduct.toUpperCase();
    let productPrice = products[currentProduct]?.price || 'FREE';

    // Extract price from "PRICE: $X.XX" format if needed
    if (productPrice.includes('PRICE:')) {
      productPrice = productPrice.replace(/PRICE:\s*/i, '').trim();
    }

    cart.add(
      productSlug,
      productName,
      null,
      null,
      null,
      productPrice
    );
    openCartModal();
    return;
  }
  
  // Get product display name
  const productName = products[currentProduct]?.name || polarProduct.name;
  let productPrice = products[currentProduct]?.price || 'FREE';
  
  // Extract price from "PRICE: $X.XX" format if needed
  if (productPrice.includes('PRICE:')) {
    productPrice = productPrice.replace(/PRICE:\s*/i, '').trim();
  }
  
  // Add to cart
  const added = cart.add(
    productSlug,
    productName,
    polarProduct.productId,
    polarProduct.priceId,
    polarProduct.url,
    productPrice
  );
  
  if (added) {
    // Open cart to show added item
    openCartModal();
  }
}

// Handle Polar checkout
async function handleCheckout() {
  const priceIds = cart.getPriceIds();

  if (priceIds.length === 0) {
    console.error('No products in cart for checkout');
    alert('Your cart is empty');
    return;
  }

  // Disable checkout button and show loading state
  if (cartCheckoutButton) {
    cartCheckoutButton.disabled = true;
    cartCheckoutButton.textContent = 'Creating checkout...';
  }

  try {
    console.log('Creating multi-product checkout for price IDs:', priceIds);

    // Call serverless function to create checkout session
    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceIds: priceIds
      })
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, get text response for debugging
      const textResponse = await response.text();
      console.error('Non-JSON response from API:', textResponse);
      throw new Error(`Server error: ${response.status} ${response.statusText}. Check console for details.`);
    }

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    if (!data.url) {
      throw new Error('No checkout URL returned');
    }

    console.log('Checkout session created:', data.id);

    // Redirect to Polar checkout
    window.location.href = data.url;

    // Note: We don't clear the cart here because the user might cancel
    // The cart will be cleared after successful payment via webhook or on return

  } catch (error) {
    console.error('Checkout failed:', error);
    alert(`Checkout failed: ${error.message}\n\nPlease try again or contact support.`);

    // Re-enable checkout button
    if (cartCheckoutButton) {
      cartCheckoutButton.disabled = false;
      cartCheckoutButton.textContent = 'Checkout';
    }
  }
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
  
  // Add to cart button
  if (addToCartButton) {
    addToCartButton.addEventListener('click', addCurrentProductToCart);
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

// Initialize cart when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCart);
} else {
  initializeCart();
}

// Make cart accessible globally for debugging
window.cart = cart;

console.log('Shopping cart functionality loaded');
