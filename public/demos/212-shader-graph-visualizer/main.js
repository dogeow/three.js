import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI }       from 'three/addons/libs/lil-gui.module.min.js';

// ═══════════════════════════════════════════════════
//  PRESETS
// ═══════════════════════════════════════════════════
const PRESETS = {

  sincos: {
    label: 'Sin/Cos Waves',
    formula: 'sin(u*2) * cos(v*2)',
    code: `float f(vec2 uv) {
  float x = uv.x, y = uv.y;
  return sin(x * 2.0) * cos(y * 2.0);
}`
  },

  gyroid: {
    label: 'Gyroid',
    formula: 'sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)',
    code: `float f(vec2 uv) {
  float x = uv.x, y = uv.y;
  return sin(x * 3.0) * cos(y * 3.0)
       + sin(y * 3.0) * cos(x * 2.0)
       + sin(x * 2.0) * cos(y * 1.5);
}`
  },

  noise: {
    label: 'FBM Noise Terrain',
    formula: 'fbm(uv) — 5-octave fractional Brownian motion',
    code: `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i+vec2(1,0)), f.x),
    mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(1.6,1.2,-1.2,1.6);
  for (int i=0;i<5;i++) {
    v += a * noise(p);
    p  = rot * p + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
float f(vec2 uv) {
  return fbm(uv * 3.0) * 2.0 - 1.0;
}`
  },

  torusKnot: {
    label: 'Torus Knot Surface',
    formula: 'parametric torus-knot-inspired surface',
    code: `float f(vec2 uv) {
  float x = uv.x, y = uv.y;
  float r = length(uv) * 0.5;
  float t = atan(y, x);
  return sin(x * 4.0 + t * 2.0) * cos(y * 3.0 - t) + 0.5 * sin(r * 8.0 - t * 3.0);
}`
  },

  ripple: {
    label: 'Radial Ripples',
    formula: 'sin(r*6) / (1 + r*2)',
    code: `float f(vec2 uv) {
  float r = length(uv);
  return sin(r * 6.0) / (1.0 + r * 2.0) * 1.5;
}`
  },

  spiral: {
    label: '3D Spiral',
    formula: 'sin(r*4 + atan(y,x)*3) * cos(r*3)',
    code: `float f(vec2 uv) {
  float x = uv.x, y = uv.y;
  float r = length(uv);
  float a = atan(y, x);
  return sin(r * 4.0 + a * 3.0) * cos(r * 3.0 - a * 2.0);
}`
  },

  hyperbolic: {
    label: 'Hyperbolic Paraboloid',
    formula: 'x² − y²  (saddle surface)',
    code: `float f(vec2 uv) {
  float x = uv.x, y = uv.y;
  return (x * x - y * y) * 0.5;
}`
  },

  custom: {
    label: 'Custom',
    formula: 'edit the code below',
    code: `float f(vec2 uv) {
  float x = uv.x, y = uv.y;
  float r = length(uv);
  float a = atan(y, x);
  return sin(x * 3.0) * cos(y * 3.0);
}`
  }
};

// ═══════════════════════════════════════════════════
//  RENDERER + SCENE
// ═══════════════════════════════════════════════════
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0a0f, 1);

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x0a0a0f, 0.06);

const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 200);
camera.position.set(0, 2.5, 5);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping   = true;
controls.dampingFactor  = 0.06;
controls.minDistance    = 0.5;
controls.maxDistance    = 20;

// Lights
scene.add(new THREE.AmbientLight(0x8888cc, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(3, 5, 3);
scene.add(dirLight);
const backLight = new THREE.DirectionalLight(0x3355ff, 0.5);
backLight.position.set(-3, -2, -3);
scene.add(backLight);

// Grid helper
const grid = new THREE.GridHelper(8, 20, 0x222244, 0x111122);
grid.position.y = -0.01;
scene.add(grid);

// ═══════════════════════════════════════════════════
//  PARAMS
// ═══════════════════════════════════════════════════
const params = {
  color:       '#4488ff',
  wireframe:   false,
  resolution:  120,
  autoRotate:  true,
  animate:     true,
  palette:     'ocean',
  heightScale: 1.0,
};

const PALETTES = {
  ocean:   { top: new THREE.Color('#2266ff'), bottom: new THREE.Color('#001133') },
  sunset:  { top: new THREE.Color('#ff5500'), bottom: new THREE.Color('#220011') },
  neon:    { top: new THREE.Color('#00ffcc'), bottom: new THREE.Color('#110033') },
  fire:    { top: new THREE.Color('#ffdd00'), bottom: new THREE.Color('#220000') },
  aurora:  { top: new THREE.Color('#00ffaa'), bottom: new THREE.Color('#002211') },
};

// ═══════════════════════════════════════════════════
//  GEOMETRY BUILDER
// ═══════════════════════════════════════════════════
let currentMesh = null;
let currentGeom = null;
let animTime    = 0;

function buildGeometry(funcBody, resolution) {
  const res   = Math.max(10, Math.min(resolution, 300));
  const geom  = new THREE.BufferGeometry();
  const verts = [], norms = [], uvArr = [], idxs = [];

  const RANGE = Math.PI;
  const STEP  = (2 * RANGE) / res;

  // Build vertices
  for (let j = 0; j <= res; j++) {
    for (let i = 0; i <= res; i++) {
      const u = -RANGE + i * STEP;
      const v = -RANGE + j * STEP;
      let h;
      try {
        h = evaluate(u, v, funcBody);
        if (!isFinite(h)) h = 0;
      } catch (e) {
        h = 0;
      }
      verts.push(u, h * params.heightScale, v);
      uvArr.push(i / res, j / res);
    }
  }

  // Build indices
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const a = j * (res + 1) + i;
      const b = a + 1;
      const c = a + (res + 1);
      const d = c + 1;
      idxs.push(a, c, b);
      idxs.push(b, c, d);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute('uv',       new THREE.Float32BufferAttribute(uvArr, 2));
  geom.setIndex(idxs);
  geom.computeVertexNormals();
  return geom;
}

// ── Safe-ish JS function evaluator ──────────────
function evaluate(u, v, body) {
  // Provide math helpers
  const sin   = Math.sin;
  const cos   = Math.cos;
  const tan   = Math.tan;
  const abs   = Math.abs;
  const sqrt  = Math.sqrt;
  const pow   = Math.pow;
  const exp   = Math.exp;
  const log   = Math.log;
  const floor = Math.floor;
  const fract = (x) => x - floor(x);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mix   = (a, b, t)  => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const length2 = (vec) => Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1]);
  const dot2   = (a, b)    => a[0]*b[0] + a[1]*b[1];

  // Pseudo-noise
  const hash = (px, py) => {
    let n = px * 127.1 + py * 311.7;
    n = Math.sin(n) * 43758.5453;
    return n - Math.floor(n);
  };
  const noise = (nx, ny) => {
    const ix = Math.floor(nx), iy = Math.floor(ny);
    const fx = nx - ix, fy = ny - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix+1, iy);
    const c = hash(ix, iy+1), d = hash(ix+1, iy+1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (px, py) => {
    let val = 0, amp = 0.5, freq = 1.0;
    for (let i = 0; i < 5; i++) {
      val += amp * noise(px * freq, py * freq);
      amp  *= 0.5;
      freq *= 2.1;
    }
    return val;
  };

  // UV shorthand
  const x = u, y = v, r = Math.sqrt(u*u + v*v);
  const pi = Math.PI, PI = Math.PI;
  const TAU = Math.PI * 2;

  // eslint-disable-next-line no-new-func
  const f = new Function('uv', 'x', 'y', 'r', 'sin', 'cos', 'tan', 'abs',
    'sqrt', 'pow', 'exp', 'log', 'floor', 'fract', 'clamp', 'mix',
    'smoothstep', 'length', 'dot', 'noise', 'fbm', 'pi', 'PI', 'TAU',
    body
  );
  return f([u, v], u, v, r, sin, cos, tan, abs, sqrt, pow, exp, log,
    floor, fract, clamp, mix, smoothstep, length2, dot2, noise, fbm,
    Math.PI, Math.PI, Math.PI * 2);
}

function rebuildMesh() {
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    currentMesh.material.dispose();
    currentMesh = null;
  }

  const code = document.getElementById('function-input').value;
  let geom;
  try {
    geom = buildGeometry(code, params.resolution);
    document.getElementById('error-msg').textContent = '';
  } catch (e) {
    document.getElementById('error-msg').textContent = e.message || 'compile error';
    return;
  }
  currentGeom = geom;

  const topCol    = PALETTES[params.palette]?.top    || new THREE.Color(params.color);
  const bottomCol = PALETTES[params.palette]?.bottom || new THREE.Color('#001133');

  const mat = new THREE.MeshPhongMaterial({
    color:     new THREE.Color(params.color),
    emissive:  new THREE.Color(params.color).multiplyScalar(0.1),
    specular:  new THREE.Color('#ffffff'),
    shininess: 60,
    wireframe: params.wireframe,
    side: THREE.DoubleSide,
    vertexColors: false,
    flatShading: false,
  });

  // Color by height
  const pos    = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const h = (pos.getY(i) / params.heightScale + 1) / 2; // 0..1
    const c = new THREE.Color().lerpColors(bottomCol, topCol, Math.max(0, Math.min(1, h)));
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mat.vertexColors = true;

  currentMesh = new THREE.Mesh(geom, mat);
  scene.add(currentMesh);
}

// ═══════════════════════════════════════════════════
//  GUI
// ═══════════════════════════════════════════════════
const gui = new GUI({ container: document.getElementById('lil-gui-wrapper'), title: 'Controls' });
gui.domElement.style.setProperty('--lil-gui-background-color', '#111118');
gui.domElement.style.setProperty('--lil-gui-title-background-color', '#1a1a28');
gui.domElement.style.setProperty('--lil-gui-title-text-color', '#7b7ba0');

gui.addColor(params, 'color').name('Base Color').onChange(() => rebuildMesh());
gui.add(params, 'wireframe').name('Wireframe').onChange(() => rebuildMesh());
gui.add(params, 'resolution', 20, 250, 1).name('Resolution').onChange(() => rebuildMesh());
gui.add(params, 'heightScale', 0.1, 4.0, 0.05).name('Height Scale').onChange(() => rebuildMesh());
gui.add(params, 'autoRotate').name('Auto Rotate');
gui.add(params, 'animate').name('Animate Height');
gui.add(params, 'palette', ['ocean', 'sunset', 'neon', 'fire', 'aurora']).name('Color Palette').onChange(() => rebuildMesh());

gui.open();

// ═══════════════════════════════════════════════════
//  PRESET SELECT
// ═══════════════════════════════════════════════════
const presetSelect = document.getElementById('preset-select');
const functionInput = document.getElementById('function-input');
const hudFormula   = document.getElementById('hud-formula');

presetSelect.addEventListener('change', () => {
  const key = presetSelect.value;
  const p   = PRESETS[key] || PRESETS.custom;
  functionInput.value = p.code;
  hudFormula.textContent = p.formula;
  rebuildMesh();
});

// ═══════════════════════════════════════════════════
//  COMPILE BUTTON
// ═══════════════════════════════════════════════════
document.getElementById('compile-btn').addEventListener('click', () => {
  presetSelect.value = 'custom';
  hudFormula.textContent = PRESETS.custom.formula;
  rebuildMesh();
});

// ═══════════════════════════════════════════════════
//  RESIZE
// ═══════════════════════════════════════════════════
function onResize() {
  const panel = document.getElementById('panel-right');
  const w = panel.clientWidth;
  const h = panel.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', onResize);

// ═══════════════════════════════════════════════════
//  PANEL RESIZER
// ═══════════════════════════════════════════════════
const resizeHandle = document.getElementById('resize-handle');
const panelLeft    = document.getElementById('panel-left');
let dragging = false;

resizeHandle.addEventListener('mousedown', (e) => {
  dragging = true;
  resizeHandle.classList.add('active');
  e.preventDefault();
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const newW = Math.max(220, Math.min(window.innerWidth - 300, e.clientX));
  panelLeft.style.width = newW + 'px';
  onResize();
});
window.addEventListener('mouseup', () => {
  dragging = false;
  resizeHandle.classList.remove('active');
});

// ═══════════════════════════════════════════════════
//  ANIMATION LOOP
// ═══════════════════════════════════════════════════
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function animate(now) {
  requestAnimationFrame(animate);

  const delta = (now - lastTime) / 1000;
  lastTime = now;

  // FPS counter
  frameCount++;
  fpsTimer += delta;
  if (fpsTimer >= 1.0) {
    document.getElementById('hud-fps').textContent =
      `${frameCount} fps`;
    frameCount = 0;
    fpsTimer   = 0;
  }

  if (params.autoRotate && currentMesh) {
    currentMesh.rotation.y += delta * 0.4;
  }

  if (params.animate && currentGeom) {
    animTime += delta;
    // Gentle vertical oscillation of height scale
    const animatedScale = params.heightScale * (1 + Math.sin(animTime * 0.8) * 0.05);
    const posAttr = currentGeom.attributes.position;
    const code    = functionInput.value;
    try {
      const verts = posAttr.array;
      const RANGE = Math.PI;
      const res   = params.resolution;
      const STEP  = (2 * RANGE) / res;
      let vi = 0;
      for (let j = 0; j <= res; j++) {
        for (let i = 0; i <= res; i++) {
          const u = -RANGE + i * STEP;
          const v = -RANGE + j * STEP;
          const h = evaluate(u, v, code) * animatedScale;
          verts[vi + 1] = h;
          vi += 3;
        }
      }
      posAttr.needsUpdate = true;
      currentGeom.computeVertexNormals();

      // Recompute colors
      const colors  = currentGeom.attributes.color.array;
      const topCol    = PALETTES[params.palette]?.top    || new THREE.Color(params.color);
      const bottomCol = PALETTES[params.palette]?.bottom || new THREE.Color('#001133');
      for (let i = 0; i < posAttr.count; i++) {
        const h = (verts[i * 3 + 1] / animatedScale + 1) / 2;
        const c = new THREE.Color().lerpColors(bottomCol, topCol, Math.max(0, Math.min(1, h)));
        colors[i * 3]     = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      currentGeom.attributes.color.needsUpdate = true;
    } catch (e) {
      // silently skip bad frames
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
onResize();

// Apply custom font via Google Fonts
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap';
document.head.appendChild(link);

rebuildMesh();

// Mount for debugging
window.THREE  = THREE;
window.scene  = scene;
window.camera  = camera;
window.renderer = renderer;
window.params  = params;
window.rebuildMesh = rebuildMesh;

animate(performance.now());