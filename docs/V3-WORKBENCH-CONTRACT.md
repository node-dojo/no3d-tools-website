# V3 Shared Source Folder contract

The Shared Source Folder is an additive presentation over the existing product, artifact, entitlement, account, download, and Commerce system. It is not a second catalog.

## Authored metadata

Store the authored intent in the existing product `metadata` JSON object:

```json
{
  "presentation": { "mode": "workbench" },
  "workbench": {
    "filename": "dojo_bounding_grid_v5.001.no3d",
    "folder": "Utilities",
    "modified_at": "2026-08-22T18:00:00Z",
    "maturity": "experimental",
    "kind": "Geometry Nodes asset",
    "summary": "Optional short operational note.",
    "size": "284 KB",
    "compatibility": "Blender 5.2+"
  }
}
```

`presentation.mode` accepts `flagship` or `workbench`. Promotion changes this field without changing the product ID, handle, artifact, entitlement, release history, or download lineage.

## Deterministic fallbacks

The website derives missing workbench presentation without blocking publication:

- filename: title or handle, spaces converted to underscores, `.no3d` appended;
- folder: first tag, product type, then `Unsorted`;
- modified date: product `updated_at`, then `created_at`;
- maturity: release status, then `experimental`;
- kind: asset type, then product type, then `NO3D source asset`;
- summary: product description, then an empty operational note;
- thumbnail: canonical folder/file placeholder.

## Access boundary

- Existing `access_policy`, offers, subscriptions, purchases, and entitlements remain authoritative.
- “My File” is a presentation-level selection tray. It never fabricates an entitlement.
- Members receive the existing complete effective manifest and automatic updates.
- Free and individually owned products continue through the existing account, manifest, checkout, and download endpoints.
- A workbench entry does not require a product-detail page.

## SOLVET publish boundary

SOLVET may publish a workbench asset when it has a stable identity, readable artifact, safe destination filename, checksum, byte size, access policy, visibility, inferable compatibility, maturity/support defaults, and one intentional publish action. It must not require a polished title, category, thumbnail, description, price, or product page.
