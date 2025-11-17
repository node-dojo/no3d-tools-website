# Product Tagging Guide

This guide explains how to use tags in product JSON files to organize products into Product Groups for the 3-tier sidebar navigation.

## Product Type Field

Every product JSON file must include a `productType` field at the top level:

```json
{
  "title": "Product Name",
  "productType": "tools",
  ...
}
```

### Available Product Types

- `"tools"` - NO3D TOOLS (Blender add-ons and tools)
- `"tutorials"` - NO3D DOJO (Tutorials and educational content)
- `"prints"` - NO3D PRINTS (3D printable assets)
- `"apps"` - NO3D CODE (Applications and code tools)

## Product Groups (Tags)

Product Groups are defined using tags in the `tags` array. Products can belong to multiple groups by including multiple group tags.

### How Tags Work

1. **Product Groups**: Tags that are capitalized or contain spaces (e.g., "Super Primitive", "Mesh Gen") are treated as Product Groups
2. **Metadata Tags**: Tags that are lowercase single words (e.g., "blender", "addon", "3d", "asset") are treated as metadata and ignored for grouping

### Current Product Groups

Based on existing products, here are the current Product Groups:

- **Super Primitive** - Products that fall into this category
  - Examples: Dojo Knob, Dojo_Squircle v4.5
- **Mesh Gen** - Products that generate meshes
  - Examples: Dojo Knob_obj, Dojo Squircle v4.5_obj

### Adding New Product Groups

To create a new Product Group, simply add a descriptive tag to the `tags` array:

```json
{
  "tags": [
    "My New Group",
    "blender",
    "addon"
  ]
}
```

The tag "My New Group" will automatically appear as a Product Group in the sidebar when products with this tag are loaded.

### Products in Multiple Groups

A product can belong to multiple groups by including multiple group tags:

```json
{
  "tags": [
    "Super Primitive",
    "Mesh Gen",
    "blender",
    "addon"
  ]
}
```

This product will appear under both "Super Primitive" and "Mesh Gen" in the sidebar.

## Tag Naming Conventions

- **Product Groups**: Use Title Case or Mixed Case (e.g., "Super Primitive", "Mesh Gen", "Workflow Tools")
- **Metadata Tags**: Use lowercase single words (e.g., "blender", "addon", "3d", "asset")

## Filtering Behavior

- When a Product Group is expanded in the sidebar, only products with that tag are shown in the icon grid
- Multiple Product Groups can be expanded simultaneously
- If no Product Groups are expanded, all products from the active Product Type are shown

