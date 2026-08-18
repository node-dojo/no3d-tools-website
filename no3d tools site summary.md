# NO3D TOOLS WEBSITE

A modern, retro-futuristic website for the NO3D Tools library, built following the Figma design system specifications.

## 🎯 **Features**

- **Three-Column Layout**: Sidebar navigation, product details, and icon grid
- **Interactive Product Selection**: Click products in sidebar or icon grid to view details
- **Tab Navigation**: Switch between DOCS, VIDS, and ISSUES tabs
- **Responsive Design**: Adapts to different screen sizes
- **Design System Compliance**: Follows established color, typography, and spacing rules
- **GitHub Integration**: Dynamically loads products from the no3d-tools-library repository
- **Real-time Data**: Fetches product information, images, and metadata from GitHub

## 🎨 **Design System**

### **Colors**
- **Lello**: `#f0ff00` (primary accent)
- **Deep Charcoal**: `#1A1A1A` (primary text)
- **Stone Gray**: `#E8E8E8` (background)
- **Dark Gray**: `#222222` (secondary text)

### **Typography**
- **Headers/Navigation**: Visitor font family
- **Body Text**: Silka Mono font family
- **Size Scale**: 37.5px → 19px → 15px → 11px → 9px → 8px

### **Layout**
- **Sidebar**: 140px width, fixed left positioning
- **Product Card**: 900px max width, 2-column grid layout
- **Icon Grid**: 191px width, 3×8 grid with 50px icons

## 🚀 **Getting Started**

1. **Open the website**:
   ```bash
   open index.html
   ```
   Or serve with a local server:
   ```bash
   python -m http.server 8000
   # Then visit http://localhost:8000
   ```

2. **Navigate the interface**:
   - Click products in the left sidebar to view details
   - Click icons in the right grid to switch products
   - Use tabs (DOCS, VIDS, ISSUES) to view different content
   - Click DOWNLOAD to simulate product download

## 📁 **File Structure**

```
no3d-tools-site/
├── index.html          # Main HTML structure
├── styles.css          # CSS styles following design system
├── script.js           # JavaScript interactivity
└── README.md           # This documentation
```

Canonical design reference: `../docs/design/NO3D_TOOLS_DESIGN_LANGUAGE.md` (v1.0.0). PETRI is retained only as historical compatibility context.

## 🎮 **Interactions**

### **Product Selection**
- **Sidebar**: Click any product in the "ADV 3D DESIGN" section
- **Icon Grid**: Click any 3D icon to select that product
- **Synchronized**: Both sidebar and icon grid stay in sync

### **Tab Navigation**
- **DOCS**: Shows product description and changelog
- **VIDS**: Placeholder for video content
- **ISSUES**: Placeholder for issue tracking

### **Category Expansion**
- Click "WORKFLOW" or "MOGRPAH" to expand/collapse sections
- Carrot icons (▶/▼) indicate state

## 🎨 **Design Implementation**

### **Layout Grid**
```css
.site-container {
  display: grid;
  grid-template-columns: 140px 1fr 191px;
  grid-template-rows: 1fr;
}
```

### **Product Card Grid**
```css
.product-card {
  display: grid;
  grid-template-columns: 306px 1fr;
  grid-template-rows: 12px 265px 146px;
  gap: 23px;
}
```

### **Icon Grid**
```css
.icon-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: 10px;
}
```

## 📱 **Responsive Behavior**

- **Desktop**: Full three-column layout
- **Tablet**: Stacked layout with sidebar on top
- **Mobile**: Single column with adjusted grid sizes

## 🎯 **Product Data**

The website dynamically loads products from the GitHub repository:
- **Source**: https://github.com/node-dojo/no3d-tools-library
- **Auto-Discovery**: Scans repository for "Dojo" product directories
- **Dynamic Loading**: Fetches product information, images, and metadata
- **Fallback System**: Uses default data if GitHub is unavailable
- **Real-time Updates**: Automatically reflects changes in the repository

### **Product Information**
- **Names**: Automatically extracted from directory names
- **Prices**: Generated from predefined price ranges
- **Descriptions**: Smart descriptions based on product names
- **Changelogs**: Randomized changelog templates
- **3D Images**: Automatically discovered from repository assets
- **Icons**: 50px × 50px product icons with fallback placeholders

## 🔧 **Customization**

### **Adding New Products**
1. **Via GitHub Repository**: Add a new directory starting with "Dojo" in the repository
2. **Include Assets**: Add product images (3D renders, icons) to the directory
3. **Auto-Discovery**: The website will automatically detect and load the new product
4. **Fallback Data**: Update `defaultProducts` in `script.js` for offline functionality

### **Modifying Styles**
- Update CSS custom properties in `:root` selector
- Modify component-specific styles in `styles.css`
- Follow the established design system rules

### **Changing Colors**
- Update `--color-lello` for accent color
- Modify other color variables as needed
- Ensure accessibility compliance

## 🎨 **Design System Compliance**

✅ **Colors**: Lello (#f0ff00) for accents, proper contrast ratios
✅ **Typography**: Visitor for headers, Silka Mono for body text
✅ **Spacing**: 10px base unit system throughout
✅ **Layout**: Three-column grid with proper proportions
✅ **Interactions**: Hover states, active states, focus indicators
✅ **Accessibility**: Keyboard navigation, screen reader support

## 🚀 **Future Enhancements**

- [ ] Real product download functionality
- [ ] User authentication and accounts
- [ ] Shopping cart and checkout
- [ ] Product search and filtering
- [ ] Video content integration
- [ ] Issue tracking system
- [ ] Dark mode toggle
- [ ] Mobile app version

## 📄 **License**

This project follows the design system specifications for NO3D Tools and integrates with the GitHub repository at https://github.com/node-dojo/no3d-tools-library.

---

**Built with ❤️ following the NO3D Tools Design System**
