# NO3D TOOLS - 3D Asset Viewer

A minimal, standalone 3D asset viewer component for previewing and testing 3D models.

## Features

✅ **Format Support**
- GLB (Binary GLTF) - Recommended
- GLTF (JSON GLTF)
- STL (Stereolithography)
- USD/USDZ (Universal Scene Description) - For animated models

✅ **Interactive Controls**
- Auto-rotation turntable mode
- Manual rotation (mouse drag)
- Zoom (mouse wheel)
- Reset camera view
- Adjustable rotation speed

✅ **Minimal UI**
- Almost invisible interface (shows on hover)
- Clean, distraction-free viewing
- Matches NO3D TOOLS design system

## Quick Start

### 1. Open the Viewer

```bash
# From the SOLVET System V1 directory
cd no3d-tools-website/3d-viewer

# Start local server (if not already running)
npx http-server -p 8080

# Open in browser
open http://localhost:8080/no3d-tools-website/3d-viewer/
```

### 2. Load a 3D Model

**Option A: File Upload**
- Click "Choose File" button
- Select a `.glb`, `.gltf`, `.stl`, `.usd`, or `.usdz` file
- Model loads automatically

**Option B: URL Loading**
- Paste a URL to a 3D model in the text field
- Click "Load URL" button

**Example URLs** (public test models):
```
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb
```

### 3. Test with Your Assets

Place your 3D files in the `test-assets/` folder:

```
3d-viewer/
└── test-assets/
    ├── your-model.glb
    ├── your-model.stl
    └── your-animation.usdz
```

Then load via file upload or use a relative URL:
```
test-assets/your-model.glb
```

## Controls

| Action | Control |
|--------|---------|
| Rotate model | Click and drag |
| Zoom in/out | Mouse wheel |
| Toggle auto-rotate | Click "Auto-Rotate" button |
| Reset view | Click "Reset View" button |
| Adjust rotation speed | Use speed slider |

## Exporting 3D Models from Blender

### For GLB (Recommended)

1. Open your `.blend` file in Blender
2. **File → Export → glTF 2.0 (.glb/.gltf)**
3. Settings:
   - Format: `glTF Binary (.glb)`
   - Include: `Selected Objects` or `Visible Objects`
   - Transform: Check `+Y Up`
   - Geometry: Check `Apply Modifiers`
   - Materials: `Export` (for colored models)
4. Click **Export glTF 2.0**

### For STL

1. **File → Export → STL (.stl)**
2. Settings:
   - Format: `Binary` (smaller file size)
   - Selection Only: Check if needed
3. Click **Export STL**

### For USD (Animated Models)

1. **File → Export → Universal Scene Description (.usd)**
2. Settings:
   - USD Format: `USD Binary`
   - Animation: Check `Animation`
   - Frame Range: Set your animation range
3. Click **Export USD**

## Component API

### Basic Usage

```javascript
// Create viewer instance
const container = document.getElementById('viewer-container');

const viewer = new AssetViewer(container, {
    autoRotate: true,
    autoRotateSpeed: 1.0,
    backgroundColor: '#E8E8E8',
    cameraFOV: 45
});

// Load a model
await viewer.loadModel('path/to/model.glb', 'glb');

// Control auto-rotation
viewer.toggleAutoRotate();
viewer.setAutoRotateSpeed(2.0);

// Reset camera
viewer.resetCamera();

// Listen to events
container.addEventListener('modelLoaded', (e) => {
    console.log('Model loaded:', e.detail);
});

// Cleanup
viewer.dispose();
```

### Configuration Options

```javascript
{
    autoRotate: true,           // Enable auto-rotation on load
    autoRotateSpeed: 1.0,       // Rotation speed (0.1 - 3.0)
    enableZoom: true,           // Enable mouse wheel zoom
    enablePan: true,            // Enable panning (future)
    backgroundColor: '#E8E8E8', // Canvas background color
    cameraFOV: 45,              // Camera field of view
    cameraPosition: {           // Initial camera position
        x: 0,
        y: 2,
        z: 5
    },
    showGrid: false,            // Show grid helper
    showAxes: false             // Show axes helper
}
```

## Embedding in Products

To integrate the viewer into the NO3D TOOLS product pages:

1. Copy `viewer-component.js` to your page
2. Include Three.js CDN
3. Create a container element
4. Initialize the viewer
5. Load models from product metadata

Example:

```html
<!-- In product page -->
<div id="product-3d-viewer" style="width: 100%; height: 400px;"></div>

<script src="viewer-component.js"></script>
<script>
    const viewer = new AssetViewer(
        document.getElementById('product-3d-viewer'),
        { autoRotate: true }
    );

    // Load from product data
    const modelUrl = product.metafields.find(f => f.key === 'model_url')?.value;
    if (modelUrl) {
        viewer.loadModel(modelUrl, 'glb');
    }
</script>
```

## File Format Recommendations

| Format | Use Case | Pros | Cons |
|--------|----------|------|------|
| **GLB** | General 3D assets | ✅ Small file size<br>✅ Includes textures/materials<br>✅ Best browser support | ❌ Requires export from Blender |
| **STL** | Simple geometry | ✅ Simple format<br>✅ Small files | ❌ No materials/textures<br>❌ No animations |
| **USD/USDZ** | Animated models | ✅ Industry standard<br>✅ Animation support | ❌ Larger files<br>❌ Less browser support |

## Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari (GLB/GLTF only, limited USD support)
- ✅ Mobile browsers (may have performance limitations)

## Performance Tips

1. **Optimize polygon count** - Keep models under 50k vertices for web
2. **Compress textures** - Use 1024x1024 or smaller
3. **Use GLB format** - Smaller than GLTF + separate assets
4. **Bake lighting** - Include baked lighting in GLB for faster rendering
5. **LOD (Level of Detail)** - Create simplified versions for mobile

## Troubleshooting

### Model doesn't load
- Check file format is supported
- Verify URL is accessible (CORS)
- Check browser console for errors
- Try converting to GLB format

### Model appears black/no color
- STL files don't support materials (appears gray)
- Try GLB format to preserve materials
- Check lighting settings in export

### Animations don't play
- Use GLB or USD format (STL doesn't support animation)
- Verify animations are exported from Blender
- Check console for animation count

### Performance issues
- Reduce polygon count in Blender
- Use simplified LOD models
- Compress textures
- Disable auto-rotation during loading

## Next Steps

- [ ] Add product metadata field for 3D model URLs
- [ ] Integrate viewer into product carousel
- [ ] Add color/material customization UI
- [ ] Implement parameter editing for procedural models
- [ ] Create batch export script for Blender assets

## License

Part of the NO3D TOOLS project.
