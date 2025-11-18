/**
 * NO3D TOOLS - 3D Asset Viewer Component
 * Supports: GLB, GLTF, STL, USD/USDZ formats
 * Features: Auto-rotation turntable, mouse controls, animation playback
 */

class AssetViewer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = {
      autoRotate: true,
      autoRotateSpeed: 1.0,
      enableZoom: true,
      enablePan: true,
      backgroundColor: '#E8E8E8', // NO3D TOOLS stone gray
      cameraFOV: 45,
      cameraPosition: { x: 0, y: 2, z: 5 },
      showGrid: false,
      showAxes: false,
      ...options
    };

    // Three.js scene components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
    this.mixer = null; // For GLTF animations
    this.clock = null;

    // Mouse interaction state
    this.isMouseDown = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.rotation = { x: 0, y: 0 };

    // Animation state
    this.animationId = null;
    this.isAutoRotating = this.options.autoRotate;
    this.initialized = false;

    // Don't call init in constructor - let caller handle it
  }

  async init() {
    try {
      console.log('🔄 Initializing AssetViewer...');

      // Verify THREE.js is loaded
      if (typeof THREE === 'undefined') {
        throw new Error('THREE.js is not loaded. Please include Three.js before this script.');
      }

      console.log('✅ THREE.js found:', THREE.REVISION);

      // Initialize clock after THREE is confirmed
      this.clock = new THREE.Clock();

      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupLighting();
      this.setupEventListeners();
      this.startAnimation();

      this.initialized = true;
      console.log('✅ 3D Viewer initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize 3D viewer:', error);
      this.showError('Failed to initialize 3D viewer: ' + error.message);
      throw error;
    }
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options.backgroundColor);

    // Optional grid helper
    if (this.options.showGrid) {
      const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc);
      this.scene.add(gridHelper);
    }

    // Optional axes helper
    if (this.options.showAxes) {
      const axesHelper = new THREE.AxesHelper(2);
      this.scene.add(axesHelper);
    }
  }

  setupCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      this.options.cameraFOV,
      aspect,
      0.1,
      1000
    );

    this.camera.position.set(
      this.options.cameraPosition.x,
      this.options.cameraPosition.y,
      this.options.cameraPosition.z
    );

    this.camera.lookAt(0, 0, 0);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    // Clear container and add canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 0, -5);
    this.scene.add(fillLight);

    // Hemisphere light for softer lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemiLight);
  }

  setupEventListeners() {
    // Mouse controls for manual rotation
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));

    // Mouse wheel for zoom
    if (this.options.enableZoom) {
      this.renderer.domElement.addEventListener('wheel', this.onMouseWheel.bind(this));
    }

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  onMouseDown(event) {
    this.isMouseDown = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };

    // Pause auto-rotation when user interacts
    if (this.isAutoRotating) {
      this.isAutoRotating = false;
    }
  }

  onMouseMove(event) {
    if (!this.isMouseDown || !this.model) return;

    const deltaMove = {
      x: event.clientX - this.previousMousePosition.x,
      y: event.clientY - this.previousMousePosition.y
    };

    // Rotate model based on mouse movement
    this.model.rotation.y += deltaMove.x * 0.01;
    this.model.rotation.x += deltaMove.y * 0.01;

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  onMouseUp() {
    this.isMouseDown = false;
  }

  onMouseWheel(event) {
    event.preventDefault();
    const delta = event.deltaY * 0.001;
    this.camera.position.z += delta;
    // Clamp zoom distance
    this.camera.position.z = Math.max(1, Math.min(20, this.camera.position.z));
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
  }

  /**
   * Load a 3D model from URL
   * @param {string} url - URL to the 3D model file
   * @param {string} format - File format (glb, gltf, stl, usd, usdz)
   */
  async loadModel(url, format = null) {
    try {
      // Auto-detect format from URL if not specified
      if (!format) {
        const extension = url.split('.').pop().toLowerCase();
        format = extension;
      }

      console.log(`🔄 Loading ${format.toUpperCase()} model from: ${url}`);

      // Remove existing model
      if (this.model) {
        this.scene.remove(this.model);
        this.model = null;
      }

      // Load model based on format
      switch (format.toLowerCase()) {
        case 'glb':
        case 'gltf':
          await this.loadGLTF(url);
          break;
        case 'stl':
          await this.loadSTL(url);
          break;
        case 'usd':
        case 'usdz':
          await this.loadUSD(url);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Center and scale the model
      this.centerAndScaleModel();

      console.log('✅ Model loaded successfully');
      this.dispatchEvent('modelLoaded', { url, format });
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      this.showError('Failed to load model: ' + error.message);
      throw error;
    }
  }

  async loadGLTF(url) {
    // Dynamically import GLTFLoader as ES module
    const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');

    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();

      loader.load(
        url,
        (gltf) => {
          this.model = gltf.scene;
          this.scene.add(this.model);

          // Setup animations if present
          if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.model);
            gltf.animations.forEach(clip => {
              this.mixer.clipAction(clip).play();
            });
            console.log(`🎬 Found ${gltf.animations.length} animation(s)`);
          }

          resolve(gltf);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total * 100).toFixed(2);
          console.log(`Loading: ${percent}%`);
          this.dispatchEvent('loadProgress', { percent });
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  async loadSTL(url) {
    console.log('🔄 Loading STLLoader module...');
    // Dynamically import STLLoader as ES module
    const { STLLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/STLLoader.js');
    console.log('✅ STLLoader module loaded');

    return new Promise((resolve, reject) => {
      console.log('🔄 Creating STLLoader instance...');
      const loader = new STLLoader();
      console.log('✅ STLLoader instance created');

      console.log('🔄 Starting STL file load from:', url);
      loader.load(
        url,
        (geometry) => {
          console.log('✅ STL geometry loaded:', {
            vertices: geometry.attributes.position.count,
            hasNormals: !!geometry.attributes.normal
          });

          // Create material for STL
          const material = new THREE.MeshPhongMaterial({
            color: 0x888888,
            specular: 0x111111,
            shininess: 200
          });

          console.log('🔄 Creating mesh from geometry...');
          const mesh = new THREE.Mesh(geometry, material);
          this.model = mesh;
          this.scene.add(this.model);
          console.log('✅ Mesh added to scene');

          resolve(geometry);
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total * 100).toFixed(2);
            console.log(`📊 Loading: ${percent}% (${progress.loaded} / ${progress.total} bytes)`);
            this.dispatchEvent('loadProgress', { percent });
          } else {
            console.log(`📊 Loading: ${progress.loaded} bytes loaded`);
          }
        },
        (error) => {
          console.error('❌ STL load error:', error);
          reject(error);
        }
      );
    });
  }

  async loadUSD(url) {
    // Dynamically import USDZLoader as ES module
    const { USDZLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/USDZLoader.js');

    return new Promise((resolve, reject) => {
      const loader = new USDZLoader();

      loader.load(
        url,
        (group) => {
          this.model = group;
          this.scene.add(this.model);
          resolve(group);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total * 100).toFixed(2);
          console.log(`Loading: ${percent}%`);
          this.dispatchEvent('loadProgress', { percent });
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  centerAndScaleModel() {
    if (!this.model) return;

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    this.model.position.sub(center);

    // Scale model to fit in view (normalize to size ~2 units)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    this.model.scale.multiplyScalar(scale);

    console.log(`📐 Model dimensions: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
    console.log(`🔍 Scale factor: ${scale.toFixed(3)}`);
  }

  startAnimation() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const delta = this.clock.getDelta();

      // Update animations if present
      if (this.mixer) {
        this.mixer.update(delta);
      }

      // Auto-rotation
      if (this.isAutoRotating && this.model) {
        this.model.rotation.y += this.options.autoRotateSpeed * 0.01;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  setAutoRotateSpeed(speed) {
    this.options.autoRotateSpeed = speed;
  }

  resetCamera() {
    this.camera.position.set(
      this.options.cameraPosition.x,
      this.options.cameraPosition.y,
      this.options.cameraPosition.z
    );
    this.camera.lookAt(0, 0, 0);

    if (this.model) {
      this.model.rotation.set(0, 0, 0);
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'viewer-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid #ff0000;
      color: #ff0000;
      padding: 1rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      max-width: 80%;
      text-align: center;
    `;
    this.container.appendChild(errorDiv);
  }

  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    this.container.dispatchEvent(event);
  }

  dispose() {
    this.stopAnimation();

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.model) {
      this.scene.remove(this.model);
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
    }

    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

// Make AssetViewer globally available
window.AssetViewer = AssetViewer;
