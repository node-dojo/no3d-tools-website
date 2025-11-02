# Product Requirements Document (PRD)
## NO3D Tools Library - End-to-End Digital Asset Publishing Platform

**Version:** 1.0  
**Date:** January 2025  
**Owner:** The Well Tarot  
**Status:** Active Development

---

## 1. Executive Summary

The SOLVET System (named derived from Solve Et Coagula) v1 is an end-to-end workflow system designed to streamline the publishing of Blender digital assets (add-ons, geometry nodes, materials, collections, etc.) to customers and subscribers. The platform enables seamless export from Blender, structured repository management, automated e-commerce integration, and a modern web-based catalog for browsing and purchasing digital assets.

### Key Objectives
- Reduce time-to-market for new digital assets, and updates and bug-fixes or existing products, by 90%
- Automate the complete publishing workflow from Blender to e-commerce
- Provide an intuitive, information-rich catalog for 50-200 digital assets
- Integrate seamlessly with Polar payment processor for checkout and file hosting
- Enable automated product bundle generation based on metadata tags

---

## 2. Problem Statement

### Current Challenges
1. **Manual Publishing Process**: Publishing digital assets currently requires multiple manual steps across different platforms
2. **Inconsistent Metadata**: Lack of standardized metadata structure across assets
3. **Poor Discoverability**: Existing catalog lacks intuitive navigation for 50-200 products
4. **Fragmented Workflow**: Export, metadata creation, e-commerce listing, and file hosting are disconnected processes
5. **Bundle Management**: Creating product bundles requires manual curation and syncing

### Target Users
- **Primary**: Digital asset creator (Blender artist/developer)
- **Secondary**: Customers and subscribers purchasing digital assets
- **Tertiary**: Content administrators managing the catalog

---

## 3. Product Vision

Create a unified, automated platform that transforms the digital asset publishing workflow from a multi-step manual process into a streamlined, one-click export-to-publish pipeline. The platform serves as both an information library and a shopping catalog, making it easy for users to discover, understand, and purchase Blender assets.

---

## 4. System Architecture

### 4.1 Five-Component Workflow

#### Component 1: Blender Add-on Export Utility
**Status:** 90% Complete  
**Location:** `send-no3ds-export utility/`

**Functionality:**
- Export assets directly from Blender with metadata
- Generate JSON metadata files compliant with product schema
- Export individual .blend files per asset
- Generate PNG thumbnails (`icon_{AssetName}.png`)
- Export asset descriptions as text files
- Maintain proper scene units (metric, 0.001 scale, millimeters)

**Key Features:**
- Export all visible assets with filter options
- Export thumbnails only (quick mode)
- Shopify/Polar-compatible JSON output
- Automatic SKU generation (NO3D-TOOLS prefix)
- Organized folder structure per asset

**Technical Requirements:**
- Blender 4.5+ compatible
- Asset Browser integration
- Context menu and N-panel UI
- Proper error handling and validation

#### Component 2: GitHub Repository Database
**Status:** Active  
**Location:** `/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/Product Listing Management/The Well Product Catalog/no3d-tools-library`  
**Remote:** https://github.com/node-dojo/no3d-tools-library

**Structure:**
Each product folder contains:
- `{ProductName}.blend` - Downloadable Blender file
- `{ProductName}.json` - Product metadata (validated against schema)
- `icon_{ProductName}.png` - Product thumbnail
- `{ProductName}_desc.md` - Product description (optional)
- `{ProductName}.mp4/.gif` - Video preview (optional)
- `preview_{ProductName}.png` - Additional preview images (optional)

**Metadata Schema:**
- Required fields: title, handle, description, vendor, product_type, tags, status, variants, metafields
- Validated against `schemas/product-metadata.schema.json`
- Supports Shopify and Polar formats
- Includes technical metadata (Blender version, geometry stats, export date, etc.)

**Validation:**
- Automated validation script: `scripts/validate-products.py`
- Pre-commit hooks for continuous validation
- Business rule enforcement (naming conventions, file structure, etc.)

#### Component 3: E-commerce Website
**Status:** In Development  
**Framework:** Next.js/React  
**Deployment:** Vercel  
**Location:** `no3d-tools-site/`

**Design Philosophy:**
- Extremely minimal aesthetic
- Black and white theme with #f0ff00 (Lello) accent color
- Information-rich catalog (informative as much as shoppable)
- Intuitive navigation for 50-200 digital assets

**Layout Structure:**
- **Three-Column Layout:**
  1. Sidebar Navigation (140px): Category-based product listing
  2. Product Card (870px): Product details, description, tabs
  3. Icon Grid (191px): 3×8 grid of product icons

**Key Features:**
- Dynamic product loading from GitHub repository
- Interactive product selection (sidebar and icon grid synchronized)
- Tab navigation (DOCS, VIDS, ISSUES)
- Category expansion/collapse
- Real-time data from repository
- Responsive design

**Design System:**
- **Typography:**
  - Headers: Visitor font (all headers)
  - Body: Silka Mono (all body text and paragraphs)
- **Colors:**
  - Primary: Black (#000000) and White
  - Accent: Lello (#f0ff00)
  - Secondary: Dark Gray (#222222), Medium Gray (#303030)
- **Spacing:** 10px base unit system
- **Layout:** CSS Grid with precise measurements

**Content Areas:**
- Product Info Section: 3D icon, product header, price, download button
- Description Area: Product description and changelog
- Tab Content: DOCS (documentation), VIDS (videos), ISSUES (issue tracking)

#### Component 4: Polar Integration
**Status:** Planned

**Functions:**
- Payment processing
- Checkout workflow
- Customer account management
- Secure file hosting and downloads
- Product listing synchronization

**Integration Points:**
- Product metadata sync from GitHub
- Automated product creation/updates
- File hosting for .blend downloads
- Customer access management
- Purchase history tracking

#### Component 5: GitHub Actions Automation
**Status:** Planned

**Functions:**
- Push content from repo to website
- Push content to Polar as products
- Generate product bundles based on metadata tags
- Sync bundles across website and Polar
- Scheduled and manual triggers

**Workflows:**
1. **Content Sync Workflow:**
   - Monitor repository changes
   - Validate new/updated products
   - Deploy to website
   - Sync to Polar

2. **Bundle Generation Workflow:**
   - Analyze product metadata tags
   - Create bundles based on tag mapping
   - Generate bundle metadata
   - Sync bundles to website and Polar

3. **Validation Workflow:**
   - Run validation scripts on commits
   - Check schema compliance
   - Verify file structure
   - Report errors

---

## 5. Detailed Requirements

### 5.1 Functional Requirements

#### FR1: Blender Export Functionality
- **FR1.1:** Export all assets from current Blender file
- **FR1.2:** Filter exports by asset type (add-on, geometry node, material, etc.)
- **FR1.3:** Generate JSON metadata compliant with product schema
- **FR1.4:** Export individual .blend files per asset
- **FR1.5:** Generate PNG thumbnails (512x512px or 1024x1024px)
- **FR1.6:** Export asset descriptions as text files
- **FR1.7:** Maintain proper scene units (metric, 0.001 scale, millimeters)
- **FR1.8:** Create organized folder structure per asset

#### FR2: Repository Management
- **FR2.1:** Standardized folder structure per product
- **FR2.2:** JSON schema validation for metadata
- **FR2.3:** Automated validation on commit
- **FR2.4:** Support for required and optional files
- **FR2.5:** Consistent naming conventions

#### FR3: Website Features
- **FR3.1:** Three-column layout (sidebar, product card, icon grid)
- **FR3.2:** Dynamic product loading from GitHub
- **FR3.3:** Interactive product selection
- **FR3.4:** Tab navigation (DOCS, VIDS, ISSUES)
- **FR3.5:** Category expansion/collapse
- **FR3.6:** Search and filtering capabilities
- **FR3.7:** Responsive design for all screen sizes

#### FR4: E-commerce Integration
- **FR4.1:** Polar payment processing integration
- **FR4.2:** Secure checkout workflow
- **FR4.3:** Customer account management
- **FR4.4:** File hosting and download management
- **FR4.5:** Purchase history tracking

#### FR5: Automation
- **FR5.1:** Automated content sync from repo to website
- **FR5.2:** Automated product sync to Polar
- **FR5.3:** Automated bundle generation from metadata tags
- **FR5.4:** Scheduled sync triggers
- **FR5.5:** Manual trigger capabilities

### 5.2 Non-Functional Requirements

#### NFR1: Performance
- **NFR1.1:** Website load time < 2 seconds
- **NFR1.2:** Optimized images and media
- **NFR1.3:** Efficient asset delivery
- **NFR1.4:** Fast export process (< 30 seconds per asset)

#### NFR2: Design
- **NFR2.1:** Minimal black/white aesthetic with #f0ff00 accents
- **NFR2.2:** Visitor font for all headers
- **NFR2.3:** Silka Mono for all body text
- **NFR2.4:** Responsive design for mobile, tablet, desktop
- **NFR2.5:** Accessibility compliance (WCAG 2.1 AA)

#### NFR3: Reliability
- **NFR3.1:** 99.9% uptime for website
- **NFR3.2:** Automated error recovery
- **NFR3.3:** Data backup and recovery
- **NFR3.4:** Validation prevents invalid data entry

#### NFR4: Security
- **NFR4.1:** Secure file hosting (Polar)
- **NFR4.2:** Secure payment processing (Polar)
- **NFR4.3:** Customer data protection
- **NFR4.4:** Repository access controls

#### NFR5: Maintainability
- **NFR5.1:** Well-documented codebase
- **NFR5.2:** Standardized schema and templates
- **NFR5.3:** Automated testing where possible
- **NFR5.4:** Clear contribution guidelines

---

## 6. Design Specifications

### 6.1 Typography

#### Fonts
- **Headers/Navigation:** Visitor TT1 BRK Regular
  - Sizes: 37.533px (large headers), 19px (medium headers), 15px (tabs), 9px (navigation)
- **Body Text:** Silka Mono Light
  - Sizes: 11px (body), 8px (micro text)
  - Line Height: 1.05 for body, 100% for headers

#### Font Loading
- Load from appropriate CDN or local files
- Define appropriate fallback fonts
- Ensure fonts load before content display

### 6.2 Color Palette

#### Primary Colors
- **Lello:** #f0ff00 (accent, buttons, active states)
- **Black:** #000000 (primary text, icons)
- **White:** #FFFFFF (backgrounds)
- **Dark Gray:** #222222 (secondary text, active item text)
- **Medium Gray:** #303030 (button text)
- **Stone Gray:** #E8E8E8 (background elements)
- **Deep Charcoal:** #1A1A1A (primary text)

#### Usage Rules
- Lello (#f0ff00) used ONLY for accents
- Black/white theme primary
- Strategic use of accent color for CTAs and active states

### 6.3 Layout Specifications

#### Main Container
- **Width:** 1440px
- **Height:** 820px
- **Grid System:** CSS Grid with precise column definitions

#### Three-Column Layout
1. **Sidebar Navigation:** 140px width
   - Padding: 10px horizontal, 10px vertical
   - Gap: 2px between menu items
   - Category headers: 9px Visitor font
   - Product items: Active state with Lello background

2. **Product Card:** 870px width
   - 2-column grid layout
   - Gap: 23px between grid items
   - Product info: 300px width
   - Description area: 401px width

3. **Icon Grid:** 191px width
   - 3 columns × 8 rows
   - Icon size: 50px × 50px
   - Gap: 10px between icons

#### Product Card Grid
```
Row 1: [Empty] [Tabs Container]
Row 2: [Product Info] [Description]
Row 3: [Product Header] [Changelog]
```

### 6.4 Spacing System

#### Base Unit: 10px
- **Micro:** 2px
- **Small:** 5px
- **Medium:** 10px
- **Large:** 13px
- **XLarge:** 23px

#### Grid Gaps
- Main Layout: 23px
- Sidebar Items: 2px
- Product List: 5px
- Tab Container: 8px
- Changelog: 10px

### 6.5 Component Specifications

#### Download Button
- Background: Lello (#f0ff00)
- Text Color: #303030
- Font: Visitor TT1 BRK Regular, 19px
- Padding: 7px vertical, 56px horizontal
- Dimensions: 145.429px × 20px
- Text: "DOWNLOAD"

#### Tab Navigation
- Width: 545px
- Height: 12.146px
- Layout: Flex with 8px gap
- Font: Visitor TT1 BRK Regular, 15px
- Tabs: DOCS, VIDS, ISSUES

#### Product Header
- Width: 306px
- Alignment: Right-aligned
- Gap: 10px between elements
- Product Name: 37.533px Visitor font, uppercase
- Price Display: 19px Visitor font, format "PRICE: $X.XX"

---

## 7. User Stories

### 7.1 Asset Creator (Primary User)

**US1: Export Asset from Blender**
- **As a** Blender artist
- **I want to** export my asset with metadata from Blender directly
- **So that** I can publish it without manual steps

**US2: View Product in Catalog**
- **As a** content creator
- **I want to** see how my product appears in the website catalog
- **So that** I can ensure proper presentation

**US3: Update Product Information**
- **As a** product owner
- **I want to** update product metadata and descriptions
- **So that** I can keep product information current

### 7.2 Customer (Secondary User)

**US4: Browse Catalog**
- **As a** potential customer
- **I want to** browse through all available digital assets
- **So that** I can discover products I need

**US5: View Product Details**
- **As a** customer
- **I want to** see detailed information about a product
- **So that** I can make an informed purchase decision

**US6: Purchase and Download**
- **As a** customer
- **I want to** purchase a product and download the .blend file
- **So that** I can use the asset in my Blender projects

**US7: Filter and Search**
- **As a** customer
- **I want to** filter products by tags and search by name
- **So that** I can quickly find relevant assets

---

## 8. Integration Points

### 8.1 Blender Add-on → GitHub Repository
- **Trigger:** User action in Blender (export command)
- **Output:** Product folder with .blend, .json, icons, descriptions
- **Validation:** Schema compliance checked during export

### 8.2 GitHub Repository → Website
- **Trigger:** GitHub Actions on repository push
- **Process:** 
  1. Validate products
  2. Generate/update website pages
  3. Deploy to Vercel
- **Frequency:** On every push to main branch

### 8.3 GitHub Repository → Polar
- **Trigger:** GitHub Actions on repository push
- **Process:**
  1. Validate products
  2. Create/update products in Polar
  3. Upload files to Polar hosting
  4. Sync metadata
- **Frequency:** On every push to main branch

### 8.4 Metadata → Bundle Generation
- **Trigger:** Scheduled or manual GitHub Action
- **Process:**
  1. Analyze product metadata tags
  2. Map tags to bundle rules
  3. Generate bundle products
  4. Create bundle metadata
  5. Sync to website and Polar
- **Frequency:** Scheduled daily or on-demand

---

## 9. Success Metrics

### 9.1 Efficiency Metrics
- **Time to Publish:** Reduce from hours to < 5 minutes per asset
- **Export Time:** < 30 seconds per asset export
- **Validation Pass Rate:** > 95% on first export attempt
- **Automation Coverage:** 90% of workflow automated

### 9.2 User Experience Metrics
- **Website Load Time:** < 2 seconds
- **Product Discovery:** < 3 clicks to find any product
- **Checkout Completion Rate:** > 70%
- **Customer Satisfaction:** > 4.5/5 rating

### 9.3 Business Metrics
- **Product Catalog Size:** Support 50-200 products
- **Uptime:** 99.9% website availability
- **Error Rate:** < 1% validation errors
- **Bundle Generation:** Automated generation of bundles based on tags

### 9.4 Quality Metrics
- **Schema Compliance:** 100% of products validated
- **Design Consistency:** 100% adherence to design system
- **Code Quality:** All code reviewed and tested
- **Documentation Coverage:** All components documented

---

## 10. Technical Stack

### 10.1 Blender Add-on
- **Language:** Python
- **Framework:** Blender Python API (bpy)
- **Version:** Blender 4.5+
- **Dependencies:** Standard library only

### 10.2 Website
- **Framework:** Next.js/React
- **Language:** TypeScript/JavaScript
- **Styling:** CSS with CSS Grid
- **Deployment:** Vercel
- **Fonts:** Visitor, Silka Mono
- **Data Source:** GitHub repository API

### 10.3 Repository
- **Version Control:** Git/GitHub
- **Storage:** Local Dropbox sync + GitHub remote
- **Validation:** Python scripts
- **Schema:** JSON Schema Draft 7

### 10.4 Automation
- **CI/CD:** GitHub Actions
- **Triggers:** Push events, scheduled, manual
- **Scripts:** Python validation, Node.js deployment

### 10.5 E-commerce
- **Platform:** Polar
- **Integration:** API-based
- **Features:** Payments, checkout, accounts, file hosting

---

## 11. Development Phases

### Phase 1: Foundation (Current)
- ✅ Blender add-on export functionality (90% complete)
- ✅ GitHub repository structure
- ✅ Metadata schema definition
- ✅ Validation scripts
- 🚧 Website design and implementation
- ⏳ Basic website functionality

### Phase 2: Website Development
- [ ] Complete website layout implementation
- [ ] Dynamic product loading from GitHub
- [ ] Interactive product selection
- [ ] Tab navigation system
- [ ] Responsive design implementation
- [ ] Search and filtering

### Phase 3: Polar Integration
- [ ] Polar API integration
- [ ] Product sync from repository
- [ ] Payment processing setup
- [ ] Checkout workflow
- [ ] File hosting configuration
- [ ] Customer account management

### Phase 4: Automation
- [ ] GitHub Actions for website deployment
- [ ] GitHub Actions for Polar sync
- [ ] Bundle generation logic
- [ ] Automated validation workflows
- [ ] Scheduled sync jobs
- [ ] Manual trigger capabilities

### Phase 5: Optimization & Enhancement
- [ ] Performance optimization
- [ ] SEO improvements
- [ ] Analytics integration
- [ ] Enhanced search capabilities
- [ ] User feedback system
- [ ] Advanced filtering options

---

## 12. Risk Assessment

### 12.1 Technical Risks
- **Risk:** Blender API changes breaking add-on
  - **Mitigation:** Version pinning, regular testing, API abstraction layer
  
- **Risk:** GitHub API rate limiting
  - **Mitigation:** Caching, request optimization, fallback data sources
  
- **Risk:** Polar API integration complexity
  - **Mitigation:** Thorough API documentation review, incremental integration, testing environment

### 12.2 Design Risks
- **Risk:** Design system inconsistency
  - **Mitigation:** Strict adherence to Figma design system, code review checklist
  
- **Risk:** Font loading issues
  - **Mitigation:** Multiple font sources, fallback fonts, proper loading strategies

### 12.3 Business Risks
- **Risk:** Workflow automation failures
  - **Mitigation:** Comprehensive error handling, monitoring, alerting systems
  
- **Risk:** Data loss or corruption
  - **Mitigation:** Regular backups, version control, validation checks

---

## 13. Dependencies

### 13.1 External Dependencies
- **Blender:** Version 4.5+ (required for add-on)
- **GitHub:** Repository hosting and API
- **Vercel:** Website hosting and deployment
- **Polar:** Payment processing and file hosting
- **Visitor Font:** Typography requirement
- **Silka Mono Font:** Typography requirement

### 13.2 Internal Dependencies
- **Metadata Schema:** Must be finalized before add-on completion
- **Design System:** Must be finalized before website implementation
- **Repository Structure:** Must be standardized before automation

---

## 14. Open Questions & Decisions Needed

### 14.1 Technical Decisions
- [ ] Finalize Polar API integration approach
- [ ] Determine bundle generation algorithm
- [ ] Define scheduled sync frequency
- [ ] Decide on error handling strategy for failed syncs

### 14.2 Design Decisions
- [ ] Confirm responsive breakpoints
- [ ] Finalize mobile navigation approach
- [ ] Define loading states and error states
- [ ] Determine video preview integration method

### 14.3 Business Decisions
- [ ] Define bundle pricing strategy
- [ ] Determine product categorization structure
- [ ] Finalize customer account features
- [ ] Define subscription vs one-time purchase model

---

## 15. Appendix

### 15.1 Glossary
- **Asset:** A Blender resource (add-on, geometry node, material, etc.)
- **Handle:** URL-friendly product identifier (lowercase with hyphens)
- **SKU:** Stock Keeping Unit with NO3D-TOOLS prefix
- **Metafields:** Extended metadata stored in e-commerce platforms
- **Bundle:** Group of related products sold together
- **Lello:** Accent color (#f0ff00) used in design system

### 15.2 References
- **Master Plan:** `master.plan.md`
- **Project Rules:** `PROJECT_RULES.md`
- **Repository Structure:** `REPOSITORY_STRUCTURE.md`
- **Design System:** `no3d-tools-site/figma-design-system-rules.md`
- **Contribution Guide:** `CONTRIBUTING.md`
- **Schema:** `schemas/product-metadata.schema.json`

### 15.3 Version History
- **v1.0** (January 2025): Initial PRD creation

---

**Document Status:** Active  
**Last Updated:** January 2025  
**Next Review:** TBD

---
