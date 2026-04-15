import * as THREE from 'three';

// ─────────────────────────────────────────
//  SCENE SETUP
// ─────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050810);
scene.fog = new THREE.FogExp2(0x050810, 0.028);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 8, 14);
camera.lookAt(0, 0, 0);

// ─────────────────────────────────────────
//  LIGHTING
// ─────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x223344, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 12, 8);
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x00d2d3, 1.5, 30);
pointLight.position.set(-3, 6, -3);
scene.add(pointLight);

// ─────────────────────────────────────────
//  GRID HELPERS
// ─────────────────────────────────────────
const gridHelper = new THREE.GridHelper(24, 24, 0x1a2535, 0x0d1520);
gridHelper.position.y = -3.5;
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(4);
scene.add(axesHelper);

// ─────────────────────────────────────────
//  SURFACE GEOMETRY
// ─────────────────────────────────────────
const SEGS = 100;
const SIZE = 20;

const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
geometry.rotateX(-Math.PI / 2);

// Store original positions
const posAttr = geometry.attributes.position;
const origY = new Float32Array(posAttr.count);
for (let i = 0; i < posAttr.count; i++) {
  origY[i] = posAttr.getY(i);
}

// ─────────────────────────────────────────
//  COLOR MAPPING
// ─────────────────────────────────────────
function zToColor(z, minZ, maxZ) {
  const t = (z - minZ) / (maxZ - minZ + 1e-6);
  // cool #1a5cff → neutral #88d8b0 → warm #ff6b6b
  const c = new THREE.Color();
  if (t < 0.5) {
    c.setHSL(0.58 - t * 0.38, 0.9, 0.55 + t * 0.1);
  } else {
    c.setHSL(0.05 - (t - 0.5) * 0.1, 0.85, 0.55);
  }
  return c;
}

// ─────────────────────────────────────────
//  MATERIALS
// ─────────────────────────────────────────
const solidMaterial = new THREE.MeshPhongMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  shininess: 80,
  specular: new THREE.Color(0x00d2d3),
});

const wireMaterial = new THREE.MeshBasicMaterial({
  vertexColors: true,
  wireframe: true,
  transparent: true,
  opacity: 0.6,
});

let mesh = new THREE.Mesh(geometry, solidMaterial);
scene.add(mesh);

// ─────────────────────────────────────────
//  RIPPLE SYSTEM
// ─────────────────────────────────────────
const ripples = []; // { x, z, t, strength }

function addRipple(wx, wz) {
  ripples.push({ x: wx, z: wz, t: 0, strength: 1.0 });
  if (ripples.length > 8) ripples.shift();
}

// ─────────────────────────────────────────
//  MATH FUNCTIONS
// ─────────────────────────────────────────
const fns = {
  sinc: (x, z, t) => {
    const r = Math.sqrt(x * x + z * z);
    return Math.sin(r * 3) / (r + 0.01) * 1.5;
  },
  ripple: (x, z, t) => {
    return Math.sin(Math.sqrt(x * x + z * z) * 4 - t * 3) * 0.8;
  },
  radial: (x, z, t) => {
    const r = Math.sqrt(x * x + z * z);
    return Math.sin(r * 3 - t * 2) * Math.cos(r * 1.5) * 0.9;
  },
  saddle: (x, z, t) => {
    return (x * x - z * z) * 0.25;
  },
  gaussian: (x, z, t) => {
    return Math.exp(-(x * x + z * z) * 0.3) * 2;
  },
};

let currentFnKey = 'ripple';
let customExprFn = null;

function evalFn(x, z, t, amp, freq) {
  let base;
  if (currentFnKey === 'custom' && customExprFn) {
    base = customExprFn(x, z, t);
  } else {
    base = fns[currentFnKey](x, z, t);
  }

  // apply ripples
  let rippleContrib = 0;
  for (const rp of ripples) {
    const dx = x - rp.x;
    const dz = z - rp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const wave = Math.sin(dist * 6 - rp.t * 8) * rp.strength * Math.exp(-dist * 0.5);
    rippleContrib += wave * 0.6;
  }

  return amp * base * freq + rippleContrib;
}

// ─────────────────────────────────────────
//  UPDATE SURFACE
// ─────────────────────────────────────────
let time = 0;
let targetTime = 0;

function updateSurface(amp, freq, speed) {
  const count = posAttr.count;
  const colorArr = new Float32Array(count * 3);
  let minZ = Infinity, maxZ = -Infinity;

  // first pass: compute heights
  for (let i = 0; i < count; i++) {
    const wx = posAttr.getX(i);
    const wz = posAttr.getZ(i);
    const y = evalFn(wx, wz, time, amp, freq);
    posAttr.setY(i, y);
    if (y < minZ) minZ = y;
    if (y > maxZ) maxZ = y;
  }

  // second pass: colors
  for (let i = 0; i < count; i++) {
    const y = posAttr.getY(i);
    const c = zToColor(y, minZ, maxZ);
    colorArr[i * 3]     = c.r;
    colorArr[i * 3 + 1] = c.g;
    colorArr[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
  posAttr.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.computeVertexNormals();

  // update point light Y based on surface center
  const centerZ = evalFn(0, 0, time, amp, freq);
  pointLight.position.y = 6 + centerZ * 0.5;
}

// ─────────────────────────────────────────
//  CONTROLS STATE
// ─────────────────────────────────────────
let amp  = 1.0;
let freq = 1.0;
let speed = 1.0;
let wireMode = false;

function setWireMode(on) {
  wireMode = on;
  mesh.material = on ? wireMaterial : solidMaterial;
  document.getElementById('btn-solid').classList.toggle('active', !on);
  document.getElementById('btn-wire').classList.toggle('active', on);
}

// ─────────────────────────────────────────
//  CUSTOM EXPRESSION PARSER (safe eval)
// ─────────────────────────────────────────
function parseExpr(expr) {
  // Allow only safe math functions and operators
  const safe = expr
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/gi, 'Math.E')
    .replace(/\bsin\b/gi, 'Math.sin')
    .replace(/\bcos\b/gi, 'Math.cos')
    .replace(/\btan\b/gi, 'Math.tan')
    .replace(/\basin\b/gi, 'Math.asin')
    .replace(/\bacos\b/gi, 'Math.acos')
    .replace(/\batan\b/gi, 'Math.atan')
    .replace(/\bsqrt\b/gi, 'Math.sqrt')
    .replace(/\bpow\b/gi, 'Math.pow')
    .replace(/\bexp\b/gi, 'Math.exp')
    .replace(/\blog\b/gi, 'Math.log')
    .replace(/\babs\b/gi, 'Math.abs')
    .replace(/\bfloor\b/gi, 'Math.floor')
    .replace(/\bceil\b/gi, 'Math.ceil')
    .replace(/\bround\b/gi, 'Math.round')
    .replace(/\bmin\b/gi, 'Math.min')
    .replace(/\bmax\b/gi, 'Math.max');

  try {
    // eslint-disable-next-line no-new-func
    return new Function('x', 'z', 't', `return ${safe}`);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
//  UI BINDINGS
// ─────────────────────────────────────────
const fnLabels = {
  sinc:    'z = sinc(√(x²+z²))',
  ripple:  'z = sin(√(x²+z²)·ω - t)',
  radial:  'z = sin(r·3 - t·2)·cos(r·1.5)',
  saddle:  'z = x² - z²',
  gaussian:'z = exp(-(x²+z²)·0.3)',
  custom:  'z = custom',
};

document.getElementById('fn-select').addEventListener('change', e => {
  currentFnKey = e.target.value;
  document.getElementById('custom-group').style.display =
    currentFnKey === 'custom' ? 'flex' : 'none';
  document.getElementById('formula-display').textContent = fnLabels[currentFnKey] || currentFnKey;
  document.getElementById('cfn').textContent = currentFnKey;
});

document.getElementById('amp').addEventListener('input', e => {
  amp = parseFloat(e.target.value);
  document.getElementById('amp-val').textContent = amp.toFixed(1);
});

document.getElementById('freq').addEventListener('input', e => {
  freq = parseFloat(e.target.value);
  document.getElementById('freq-val').textContent = freq.toFixed(1);
});

document.getElementById('speed').addEventListener('input', e => {
  speed = parseFloat(e.target.value);
  document.getElementById('speed-val').textContent = speed.toFixed(1);
});

document.getElementById('btn-solid').addEventListener('click', () => setWireMode(false));
document.getElementById('btn-wire').addEventListener('click', () => setWireMode(true));

document.getElementById('custom-expr').addEventListener('input', e => {
  customExprFn = parseExpr(e.target.value);
  document.getElementById('formula-display').textContent =
    customExprFn ? `z = ${e.target.value}` : '⚠ invalid expression';
});

// ─────────────────────────────────────────
//  MOUSE / TOUCH SURFACE INTERACTION
// ─────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let hasInteracted = false;
const hint = document.getElementById('hint');

function getMouseNDC(clientX, clientY) {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
}

function raycastSurface(clientX, clientY) {
  getMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(mesh);
  return hits.length > 0 ? hits[0] : null;
}

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const hit = raycastSurface(e.clientX, e.clientY);
  if (hit) {
    isDragging = true;
    const wx = hit.point.x;
    const wz = hit.point.z;
    addRipple(wx, wz);
    if (!hasInteracted) {
      hasInteracted = true;
      hint.classList.add('hidden');
    }
  }
});

renderer.domElement.addEventListener('mousemove', e => {
  const hit = raycastSurface(e.clientX, e.clientY);
  if (hit) {
    document.getElementById('cx').textContent = hit.point.x.toFixed(3);
    document.getElementById('cy').textContent = hit.point.y.toFixed(3);
    document.getElementById('cz').textContent = hit.point.z.toFixed(3);
  }
  if (isDragging && hit) {
    addRipple(hit.point.x, hit.point.z);
  }
});

renderer.domElement.addEventListener('mouseup', () => { isDragging = false; });
renderer.domElement.addEventListener('mouseleave', () => { isDragging = false; });

// Touch support
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    const hit = raycastSurface(t.clientX, t.clientY);
    if (hit) {
      isDragging = true;
      addRipple(hit.point.x, hit.point.z);
      if (!hasInteracted) {
        hasInteracted = true;
        hint.classList.add('hidden');
      }
    }
  }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && isDragging) {
    const t = e.touches[0];
    const hit = raycastSurface(t.clientX, t.clientY);
    if (hit) addRipple(hit.point.x, hit.point.z);
  }
}, { passive: true });

renderer.domElement.addEventListener('touchend', () => { isDragging = false; });

// ─────────────────────────────────────────
//  CAMERA ORBIT (manual)
// ─────────────────────────────────────────
let camTheta = 0.4;
let camPhi   = 1.1;
let camRadius = 18;
let isCamDragging = false;
let lastMX = 0, lastMY = 0;

renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button === 2 || e.button === 1) {
    isCamDragging = true;
    lastMX = e.clientX;
    lastMY = e.clientY;
  }
});

renderer.domElement.addEventListener('mousemove', e => {
  if (!isCamDragging) return;
  const dx = e.clientX - lastMX;
  const dy = e.clientY - lastMY;
  camTheta -= dx * 0.008;
  camPhi    = Math.max(0.15, Math.min(Math.PI - 0.15, camPhi + dy * 0.008));
  lastMX = e.clientX;
  lastMY = e.clientY;
});

renderer.domElement.addEventListener('mouseup', () => { isCamDragging = false; });
renderer.domElement.addEventListener('mouseleave', () => { isCamDragging = false; });

renderer.domElement.addEventListener('wheel', e => {
  camRadius = Math.max(6, Math.min(40, camRadius + e.deltaY * 0.02));
}, { passive: true });

function updateCamera() {
  camera.position.x = camRadius * Math.sin(camPhi) * Math.sin(camTheta);
  camera.position.y = camRadius * Math.cos(camPhi);
  camera.position.z = camRadius * Math.sin(camPhi) * Math.cos(camTheta);
  camera.lookAt(0, 0, 0);
}

// ─────────────────────────────────────────
//  FPS COUNTER
// ─────────────────────────────────────────
let frameCount = 0;
let lastFPSTime = performance.now();
const fpsEl = document.getElementById('fps');

// ─────────────────────────────────────────
//  ANIMATION LOOP
// ─────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  // advance simulation time
  targetTime += dt * speed;
  time += (targetTime - time) * 0.08; // smooth

  // decay ripples
  for (const rp of ripples) {
    rp.t += dt;
    rp.strength *= Math.pow(0.92, dt * 60);
  }

  // remove dead ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (ripples[i].strength < 0.01) ripples.splice(i, 1);
  }

  // update surface
  updateSurface(amp, freq, speed);

  // update camera
  updateCamera();

  // FPS
  frameCount++;
  if (now - lastFPSTime >= 1000) {
    fpsEl.textContent = `FPS: ${frameCount}`;
    frameCount = 0;
    lastFPSTime = now;
  }

  renderer.render(scene, camera);
}

// ─────────────────────────────────────────
//  RESIZE
// ─────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
document.getElementById('cfn').textContent = currentFnKey;
animate();