// OrbitControls wrapper to expose to global THREE namespace
// This allows OrbitControls to work with <script> tag imports

import { OrbitControls } from './OrbitControls.js';

// Attach to global THREE object
THREE.OrbitControls = OrbitControls;
