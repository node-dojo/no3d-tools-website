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
    updateProductDisplay(currentProduct);
    updateProductList();
    updateIconGrid();
  } catch (error) {
    console.warn('Failed to load products from GitHub, using fallback data:', error);
    products = defaultProducts;
    initializeEventListeners();
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
      const imageName = productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      // Use SVG fallback for 3D images to ensure something always displays
      const image3dUrl = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDMyMCAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMjU2IiBmaWxsPSIjRThFOEU4Ii8+CjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMzYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIDNEIEltYWdlPC90ZXh0Pgo8L3N2Zz4=`;
      // Use SVG fallback for icons
      const iconUrl = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SWNvbjwvdGV4dD4KPC9zdmc+`;
      
      console.log(`Generated fallback images for ${productName}`);
      
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
  const prices = ['$4.50', '$5.25', '$5.55', '$6.75', '$7.50', '$7.99', '$8.25', '$9.50', '$9.99', '$11.99', '$12.50'];
  return prices[Math.floor(Math.random() * prices.length)];
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
