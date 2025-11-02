# Project Rules - no3d tools library-v2

## UI Design Override Rules

### **PRIMARY RULE: Design-First Approach**
**ALL UI development for this project MUST be based on the design images and style guide definitions in `master.plan.md` rather than following cursor-wide UI rules.**

---

## **Design System Requirements**

### **Typography**
- **Headers**: Visitor font (all headers)
- **Body/Paragraphs**: Silka mono (all body text and paragraphs)
- **Font loading**: Ensure both fonts are properly loaded and fallbacks defined

### **Color Palette**
- **Primary**: Black and white theme
- **Accent**: #f0ff00 (bright yellow-green) for accents only
- **Background**: White or black (minimal contrast)
- **Text**: Black on white or white on black

### **Design Philosophy**
- **Extremely minimal** design approach
- **Clean and useful** navigation for 50-200 digital assets
- **Library of information** - each asset should be informative as much as shoppable
- **Intuitive** catalog browsing experience

---

## **Implementation Framework**

### **Technology Stack**
- **Framework**: Next.js/React
- **Deployment**: Vercel (preferred)
- **Design Development**: Figma MCP integration
- **Style Guide**: Generated and enforced in codebase

### **Design Process**
1. **Use Figma MCP** to develop and define design in detail
2. **Generate style guide** in codebase for enforcement
3. **Reference design images** from `master.plan.md` for implementation
4. **Maintain consistency** with established design patterns

---

## **Project-Specific Overrides**

### **Override Cursor-Wide UI Rules**
- **IGNORE** terminal/DOS/ASCII/Terry Davis-inspired component libraries
- **IGNORE** retro UI requirements
- **IGNORE** monospace font requirements
- **IGNORE** terminal styling requirements

### **Explicitly Forbidden UI Elements**
- **Terminal UI components**
- ASCII art header/logo
- DOS-style navigation menu
- Retro product cards with borders
- Terminal-styled buttons and forms
- ASCII loading indicators
- Monospace data tables

### **Use Instead**
- **Modern web design** based on provided design images
- **Visitor and Silka mono fonts** as specified
- **Minimal black/white aesthetic** with #f0ff00 accents
- **Clean, contemporary UI components**

---

## **File Structure Requirements**

### **Product Catalog Structure**
Each product folder must contain:
- **Download files**: .blend files
- **Media files**: images, videos, gifs
- **Product description**: markdown document
- **Metadata**: .json file

### **Integration Requirements**
- **GitHub repo sync** for product listings
- **Polar integration** for payments, checkout, accounts, file hosting
- **GitHub Actions** for automated content pushing

---

## **Quality Standards**

### **Visual Requirements**
- **Minimal design** with clean lines
- **High contrast** black and white theme
- **Strategic use** of #f0ff00 accent color
- **Professional typography** with Visitor and Silka mono
- **Responsive design** for all screen sizes

### **Functional Requirements**
- **Intuitive navigation** for 50-200 digital assets
- **Search and filtering** capabilities
- **Product information** display (descriptions, media, metadata)
- **Shopping cart** and checkout integration
- **User accounts** and download management

### **Performance Requirements**
- **Fast loading** times
- **Optimized images** and media
- **Efficient asset** delivery
- **Mobile responsive** design

---

## **Enforcement Rules**

### **Code Review Checklist**
- [ ] Uses Visitor font for headers
- [ ] Uses Silka mono for body text
- [ ] Follows black/white color scheme
- [ ] Uses #f0ff00 only for accents
- [ ] Implements minimal design approach
- [ ] References design images from master.plan.md
- [ ] Follows established style guide

### **Design Validation**
- [ ] Matches provided design images
- [ ] Implements correct typography
- [ ] Uses specified color palette
- [ ] Maintains minimal aesthetic
- [ ] Provides intuitive navigation

---

## **Resources**

### **Design References**
- **Design Format**: `./Screenshot 2025-10-27 at 4.54.55 PM.png`
- **Master Plan**: `master.plan.md`
- **Figma Integration**: Use Figma MCP for detailed design development

### **Font Resources**
- **Visitor Font**: Load from appropriate CDN or local files
- **Silka Mono**: Load from appropriate CDN or local files
- **Fallbacks**: Define appropriate fallback fonts

---

## **Exception Handling**

### **When to Override These Rules**
- **NEVER** override these project-specific rules
- **ALWAYS** follow the design images and style guide
- **MAINTAIN** consistency with established design system
- **REFERENCE** master.plan.md for all design decisions

### **Design Changes**
- **All design changes** must be approved through Figma MCP
- **Style guide updates** must be reflected in codebase
- **Consistency** must be maintained across all components

---

**This document OVERRIDES all cursor-wide UI rules for this project.**
**Last Updated:** [Current Date]
**Version:** 1.0
**Project:** no3d tools library-v2
