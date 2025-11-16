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

// DOM elements
const productTitle = document.getElementById('product-title');
const productPrice = document.getElementById('product-price');
const productDescription = document.getElementById('product-description');
const product3dImage = document.getElementById('product-3d-image');
const downloadButton = document.getElementById('download-button');

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
  try {
    await loadProductsFromGitHub();
    initializeEventListeners();
    initializeMobileMenu();
    updateProductDisplay(currentProduct);
    updateProductList();
    updateIconGrid();
  } catch (error) {
    console.warn('Failed to load products from GitHub, using fallback data:', error);
    products = defaultProducts;
    initializeEventListeners();
    initializeMobileMenu();
    updateProductDisplay(currentProduct);
    updateProductList();
    updateIconGrid();
  }
});

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

function updateIconGrid() {
  const iconGrid = document.querySelector('.icon-grid');
  if (!iconGrid) return;
  
  // Clear existing items
  iconGrid.innerHTML = '';
  
  // Add icons from loaded data
  Object.keys(products).forEach((productId, index) => {
    const product = products[productId];
    const iconItem = document.createElement('div');
    iconItem.className = `icon-item ${index === 0 ? 'active' : ''}`;
    iconItem.dataset.product = productId;
    
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

  // Also update mobile carousel
  updateMobileCarousel();
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
      
      // If on mobile, scroll carousel to selected item
      if (window.innerWidth <= 768) {
        scrollToActiveItem();
      }
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

// Update mobile carousel with icons
function updateMobileCarousel() {
  const mobileCarousel = document.getElementById('icon-carousel-mobile');
  if (!mobileCarousel) return;
  
  // Clear existing items
  mobileCarousel.innerHTML = '';
  
  // Add spacer at the beginning for centering
  const startSpacer = document.createElement('div');
  startSpacer.style.flex = '0 0 auto';
  startSpacer.style.minWidth = 'calc(50vw - 40px)';
  mobileCarousel.appendChild(startSpacer);
  
  // Add icons from loaded data
  Object.keys(products).forEach((productId, index) => {
    const product = products[productId];
    const iconItem = document.createElement('div');
    iconItem.className = `icon-item ${index === 0 ? 'active centered' : ''}`;
    iconItem.dataset.product = productId;
    
    const iconImg = document.createElement('img');
    iconImg.src = product.icon;
    iconImg.alt = `${product.name} Icon`;
    iconImg.onerror = function() {
      // Fallback to a placeholder if image fails to load
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SWNvbjwvdGV4dD4KPC9zdmc+';
    };
    
    iconItem.appendChild(iconImg);
    mobileCarousel.appendChild(iconItem);
  });

  // Add spacer at the end for centering
  const endSpacer = document.createElement('div');
  endSpacer.style.flex = '0 0 auto';
  endSpacer.style.minWidth = 'calc(50vw - 40px)';
  mobileCarousel.appendChild(endSpacer);

  // Initialize carousel scroll detection
  initializeCarouselScrollDetection();
  
  // Scroll to active item on initial load
  setTimeout(() => {
    scrollToActiveItem();
  }, 100);
}

// Initialize carousel scroll detection to find centered icon
function initializeCarouselScrollDetection() {
  const mobileCarousel = document.getElementById('icon-carousel-mobile');
  if (!mobileCarousel) return;

  let scrollTimeout;
  
  const detectCenteredIcon = () => {
    const carouselRect = mobileCarousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    
    const iconItems = mobileCarousel.querySelectorAll('.icon-item');
    let closestIcon = null;
    let closestDistance = Infinity;
    
    iconItems.forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const distance = Math.abs(itemCenter - carouselCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIcon = item;
      }
      
      // Remove centered class from all items
      item.classList.remove('centered');
    });
    
    // Add centered class to closest icon
    if (closestIcon) {
      closestIcon.classList.add('centered');
      
      // Update product display if different from current
      const productId = closestIcon.dataset.product;
      if (productId && productId !== currentProduct) {
        selectProduct(productId);
      }
    }
  };

  // Detect on scroll
  mobileCarousel.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(detectCenteredIcon, 50);
  });

  // Detect on initial load and resize
  detectCenteredIcon();
  window.addEventListener('resize', detectCenteredIcon);
}

// Scroll carousel to show active product
function scrollToActiveItem() {
  const mobileCarousel = document.getElementById('icon-carousel-mobile');
  if (!mobileCarousel) return;

  const activeItem = mobileCarousel.querySelector(`.icon-item[data-product="${currentProduct}"]`);
  if (activeItem) {
    const carouselRect = mobileCarousel.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const scrollLeft = activeItem.offsetLeft - (carouselRect.width / 2) + (itemRect.width / 2);
    
    mobileCarousel.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });
  }
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

  // Update mobile carousel active state and scroll to it
  const mobileCarousel = document.getElementById('icon-carousel-mobile');
  if (mobileCarousel) {
    const carouselItems = mobileCarousel.querySelectorAll('.icon-item');
    carouselItems.forEach(item => {
      if (item.dataset.product === productId) {
        item.classList.add('active');
        // Scroll to this item
        setTimeout(() => {
          scrollToActiveItem();
        }, 100);
      } else {
        item.classList.remove('active');
      }
    });
  }
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

// Search icon button click handler
const searchIconButton = document.getElementById('search-icon-button');
if (searchIconButton) {
  searchIconButton.addEventListener('click', function(e) {
    e.preventDefault();
    openSearchModal();
  });
}

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
  add(productId, productName, polarId, checkoutUrl, price = null) {
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
      polarId,
      checkoutUrl,
      price: normalizedPrice,
      addedAt: new Date().toISOString()
    };
    
    this.items.push(item);
    this.save();
    this.updateUI();
    
    console.log('Added to cart:', productName, 'at', normalizedPrice);
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
  
  // Get product IDs for Polar checkout
  getProductIds() {
    return this.items.map(item => item.polarId).filter(id => id);
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
    polarProduct.id,
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
  const productIds = cart.getProductIds();

  if (productIds.length === 0) {
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
    console.log('Creating multi-product checkout for:', productIds);

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

    const data = await response.json();

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

// ============================================================================
// HORIZONTAL SCROLLING ICON GRID (Tools Section Only)
// ============================================================================

/**
 * Populate and show/hide the horizontal icon grid based on active section
 */
function updateHorizontalIconGrid() {
  const container = document.getElementById('horizontal-icon-grid-container');
  const grid = document.getElementById('horizontal-icon-grid');

  if (!container || !grid) {
    console.warn('Horizontal icon grid elements not found');
    return;
  }

  // Always show the grid (it's for all products, not just Tools)
  container.classList.add('visible');

  // Get all products from the products object
  const productEntries = Object.entries(products || {});

  if (productEntries.length === 0) {
    console.warn('No products available for horizontal grid');
    container.classList.remove('visible');
    return;
  }

  // Clear existing grid
  grid.innerHTML = '';

  // Populate grid with product icons
  productEntries.forEach(([productId, product]) => {
    const iconItem = document.createElement('div');
    iconItem.className = 'horizontal-icon-item';
    iconItem.dataset.productId = productId;

    // Mark current product as active
    if (currentProduct && productId === currentProduct) {
      iconItem.classList.add('active');
    }

    // Create image element
    const img = document.createElement('img');

    // Use icon from product data
    if (product.icon) {
      img.src = product.icon;
    } else {
      // Fallback to placeholder
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNFOEU4RTgiLz4KICA8dGV4dCB4PSIzMiIgeT0iMzQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    }

    img.alt = product.name || productId;
    img.loading = 'lazy';
    img.onerror = () => {
      // Fallback if image fails to load
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNFOEU4RTgiLz4KICA8dGV4dCB4PSIzMiIgeT0iMzQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    };

    // Add click handler to switch products
    iconItem.addEventListener('click', () => {
      currentProduct = productId;
      updateProductDisplay(productId);

      // Update active state
      grid.querySelectorAll('.horizontal-icon-item').forEach(item => {
        item.classList.remove('active');
      });
      iconItem.classList.add('active');

      // Scroll item into view (center align on mobile)
      scrollToActiveIcon(iconItem);
    });

    iconItem.appendChild(img);
    grid.appendChild(iconItem);
  });

  // Update scroll indicators
  updateScrollIndicators();

  console.log(`✅ Horizontal grid populated with ${productEntries.length} products`);
}

/**
 * Scroll the active icon to center of viewport (mobile-optimized)
 */
function scrollToActiveIcon(iconElement) {
  if (!iconElement) return;

  const grid = iconElement.parentElement;
  if (!grid) return;

  // Calculate scroll position to center the icon
  const gridRect = grid.getBoundingClientRect();
  const iconRect = iconElement.getBoundingClientRect();

  const scrollLeft = grid.scrollLeft + (iconRect.left - gridRect.left) - (gridRect.width / 2) + (iconRect.width / 2);

  grid.scrollTo({
    left: scrollLeft,
    behavior: 'smooth'
  });
}

/**
 * Update scroll indicators based on scroll position
 */
function updateScrollIndicators() {
  const container = document.getElementById('horizontal-icon-grid-container');
  const grid = document.getElementById('horizontal-icon-grid');

  if (!container || !grid) return;

  // Check if grid is scrollable
  const isScrollable = grid.scrollWidth > grid.clientWidth;

  if (!isScrollable) {
    container.classList.add('no-scroll');
  } else {
    container.classList.remove('no-scroll');
  }
}

/**
 * Mobile swipe gesture handler
 */
let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  isSwiping = false;
}

function handleTouchMove(e) {
  if (!touchStartX || !touchStartY) return;

  const touchEndX = e.touches[0].clientX;
  const touchEndY = e.touches[0].clientY;

  const deltaX = Math.abs(touchEndX - touchStartX);
  const deltaY = Math.abs(touchEndY - touchStartY);

  // Detect horizontal swipe
  if (deltaX > deltaY && deltaX > 10) {
    isSwiping = true;
    // Prevent vertical scroll while swiping horizontally
    if (e.cancelable) {
      e.preventDefault();
    }
  }
}

function handleTouchEnd() {
  touchStartX = 0;
  touchStartY = 0;
  isSwiping = false;
}

/**
 * Initialize horizontal grid interactions
 */
function initializeHorizontalGrid() {
  const grid = document.getElementById('horizontal-icon-grid');
  if (!grid) return;

  // Add scroll event listener to update indicators
  grid.addEventListener('scroll', () => {
    updateScrollIndicators();
  });

  // Add touch event listeners for mobile gestures
  grid.addEventListener('touchstart', handleTouchStart, { passive: true });
  grid.addEventListener('touchmove', handleTouchMove, { passive: false });
  grid.addEventListener('touchend', handleTouchEnd, { passive: true });

  console.log('✅ Horizontal grid interactions initialized');
}

// Initialize horizontal grid when products are loaded
// The grid will be populated by calling updateHorizontalIconGrid() after products load

// Update indicators on window resize
window.addEventListener('resize', () => {
  updateScrollIndicators();
});

// Call updateHorizontalIconGrid after initial product load
window.addEventListener('load', () => {
  initializeHorizontalGrid();
  // Wait a bit for products to load, then populate grid
  setTimeout(() => {
    updateHorizontalIconGrid();
  }, 1000);
});
