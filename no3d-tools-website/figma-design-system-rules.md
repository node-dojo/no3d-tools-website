# FIGMA DESIGN SYSTEM RULES

## Based on NO3D Tools Website Layout Analysis

---

## 🎯 **LAYOUT STRUCTURE RULES**

* **Main Container (Siteblocks)**

- **Width**: 1440px
- **Height**: 820px
- **Position**: Absolute positioning system
- **Grid System**: CSS Grid with precise column/row definitions

### **Three-Column Layout**

1. **Sidebar Navigation** (Left): 134.095px width
2. **Product Card** (Center): 870px width with 2-column grid
3. **Icon Grid** (Right): 191.135px width with 3×8 grid

---

## 🧭 **SIDEBAR NAVIGATION RULES**

### **Container Specifications**

- **Width**: 140px
- **Padding**: 10px horizontal, 10px vertical
- **Position**: Absolute left positioning
- **Gap**: 2px between menu items

### **Category Headers**

- **Font**: Visitor TT1 BRK Regular
- **Size**: 9px
- **Color**: Black (#000000)
- **Line Height**: 100% (1.0)
- **Text Transform**: Uppercase
- **Layout**: Flex with 10px gap between text and carrot icon

### **Product List Items**

- **Active State**: Lello background (#f0ff00)
- **Text Color**: #222222 (dark gray)
- **Font**: Visitor TT1 BRK Regular
- **Size**: 9px
- **Padding**: 2px horizontal, 11px horizontal
- **Indentation**: 13px from left edge
- **Gap**: 5px between items

### **Carrot Icons**

- **Size**: 10px × 10px
- **States**: Collapsed (▶) and Expanded (▼)
- **Position**: Right-aligned within category header

---

## 🎨 **ICON GRID RULES**

### **Grid Configuration**

- **Layout**: CSS Grid 3 columns × 8 rows
- **Container**: responsive
- **Item Sizing**: Mixed sizes (50px, 50px)
- **Alignment**: Center-aligned within grid cells

### **Icon Specifications**

- **Format**: PNG images with transparent backgrounds
- **Object Fit**: Cover with 50% positioning
- **Pointer Events**: Disabled
- **Border**: Optional black border (1px solid) for special containers

### **Icon Types**

- **Primary Icons**: 63.69px × 63.69px (square)
- **Secondary Icons**: 48.504px × 48.504px (smaller square)
- **Special Containers**: Border with internal icon positioning

---

## 📦 **PRODUCT CARD RULES**

### **Main Container**

- **Width**: 900px
- **Height**: 807px
- **Layout**: CSS Grid with 2 columns, 3 rows
- **Gap**: 23px between grid items

### **Grid Layout**

```
Row 1: [Empty] [Tabs Container]
Row 2: [Product Info] [Description]
Row 3: [Product Header] [Changelog]
```

### **Product Info Section**

- **Width**: 300px (should be responsive in implementation)
- **3D Icon**: full width
- **Object Fit**: Contain (preserve aspect ratio)
- **Position**: Center-aligned

### **Product Header**

- **Width**: 306px
- **Alignment**: Right-aligned
- **Gap**: 10px between elements

#### **Product Name**

- **Font**: Visitor TT1 BRK Regular
- **Size**: 37.533px
- **Line Height**: 64.015%
- **Color**: Black
- **Text Transform**: Uppercase

#### **Price Display**

- **Font**: Visitor TT1 BRK Regular
- **Size**: 19px
- **Line Height**: 58.2%
- **Color**: Black
- **Format**: "PRICE: $X.XX"

#### **Download Button**

- **Background**: Lello (#f0ff00)
- **Text Color**: #303030 (dark gray)
- **Font**: Visitor TT1 BRK Regular
- **Size**: 19px
- **Padding**: 7px vertical, 56px horizontal
- **Dimensions**: 145.429px × 20px
- **Text**: "DOWNLOAD"

---

## 📑 **TAB NAVIGATION RULES**

### **Container**

- **Width**: 545px
- **Height**: 12.146px
- **Layout**: Flex with 8px gap
- **Position**: Top-right of product card

### **Tab Items**

- **Font**: Visitor TT1 BRK Regular
- **Size**: 15px
- **Line Height**: 100%
- **Color**: Black
- **Text Transform**: Uppercase
- **Width**: Variable (186.345px, 143.846px, 186.345px)

### **Tab Structure**

- **Left**: Carrot icon (10px × 10px)
- **Right**: Tab text with 13.16% left margin
- **States**: Expanded (▼) and Collapsed (▶)

---

## 📝 **CONTENT AREA RULES**

### **Product Description**

- **Font**: Silka Mono Light
- **Size**: 11px
- **Line Height**: 1.05
- **Color**: Black
- **Letter Spacing**: -0.11px
- **Width**: 401px
- **Height**: 265px

### **Changelog Section**

- **Container**: 401px × 146px
- **Gap**: 10px between header and content

#### **Changelog Header**

- **Font**: Visitor TT1 BRK Regular
- **Size**: 15px
- **Text**: "CHANGELOG v2.3.1"
- **Icon**: 10px × 10px changelog icon

#### **Changelog List**

- **Font**: Silka Mono Light
- **Size**: 8px
- **Line Height**: 1.05
- **Letter Spacing**: -0.08px
- **List Style**: Disc bullets
- **Indentation**: 12px from left
- **Item Spacing**: 14px between items

---

## 🎨 **COLOR SYSTEM RULES**

### **Primary Colors**

- **Lello**: #f0ff00 (accent, buttons, active states)
- **Black**: #000000 (primary text, icons)
- **Dark Gray**: #222222 (secondary text)
- **Medium Gray**: #303030 (button text)

### **Background Colors**

- **Transparent**: Default for most elements
- **Lello**: #f0ff00 for active states and buttons

---

## 📐 **SPACING RULES**

### **Base Unit**: 10px

- **Micro**: 2px
- **Small**: 5px
- **Medium**: 10px
- **Large**: 13px
- **XLarge**: 23px

### **Grid Gaps**

- **Main Layout**: 23px
- **Sidebar Items**: 2px
- **Product List**: 5px
- **Tab Container**: 8px
- **Changelog**: 10px

---

## 🔤 **TYPOGRAPHY RULES**

### **Font Hierarchy**

1. **Headers/Navigation**: Visitor TT1 BRK Regular
2. **Body Text**: Silka Mono Light
3. **Technical Content**: Silka Mono Light

### **Size Scale**

- **Large Headers**: 37.533px
- **Medium Headers**: 19px
- **Tab Text**: 15px
- **Body Text**: 11px
- **Small Text**: 9px
- **Micro Text**: 8px

### **Line Height Rules**

- **Headers**: 100% (1.0) or specific ratios
- **Body Text**: 1.05
- **Tight Text**: 0.582

---

## 🎯 **INTERACTION RULES**

### **Hover States**

- **Navigation Items**: Lello background on hover
- **Buttons**: Maintain Lello background
- **Icons**: No hover effects (pointer-events: none)

### **Active States**

- **Selected Menu Item**: Lello background (#f0ff00)
- **Active Tab**: Expanded carrot icon
- **Inactive Tab**: Collapsed carrot icon

---

## 📱 **RESPONSIVE CONSIDERATIONS**

### **Fixed Layout**

- **Current**: Absolute positioning with fixed dimensions
- **Breakpoint Strategy**: Would need media queries for responsive behavior
- **Grid Adaptation**: Icon grid and product card would need flexible sizing

---

## 🛠️ **IMPLEMENTATION NOTES**

### **CSS Grid Usage**

- **Main Layout**: 2-column grid for product card
- **Icon Grid**: 3×8 grid for icon arrangement
- **Tab Container**: Flex layout with gap

### **Absolute Positioning**

- **Sidebar**: Fixed left position
- **Icon Grid**: Fixed right position
- **Product Card**: Centered with calculated positioning

### **Image Handling**

- **3D Icons**: Object-fit cover for consistent sizing
- **UI Icons**: SVG format for scalability
- **Product Images**: Object-fit contain for aspect ratio preservation

---

## ✅ **VALIDATION CHECKLIST**

### **Layout**

- [ ] Three-column layout maintained
- [ ] Proper grid gaps applied
- [ ] Absolute positioning correct
- [ ] Icon grid properly aligned

### **Typography**

- [ ] Visitor font for all headers/navigation
- [ ] Silka Mono for body text
- [ ] Correct font sizes applied
- [ ] Proper line heights maintained

### **Colors**

- [ ] Lello (#f0ff00) for accents
- [ ] Black for primary text
- [ ] Gray variations for secondary text
- [ ] Consistent color usage

### **Spacing**

- [ ] 10px base unit system
- [ ] Proper gaps between elements
- [ ] Consistent padding/margins
- [ ] Grid alignment maintained

---

**END OF FIGMA DESIGN SYSTEM RULES**

*These rules are extracted from the actual Figma design implementation and should be followed precisely to maintain design consistency across the NO3D Tools website.*
