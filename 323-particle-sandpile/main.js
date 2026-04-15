import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  gridSize: 31,
  dropRate: 0.5,
  autoDrop: true,
  topplingSpeed: 60,   // cells processed per frame
  barScale: 0.45,
};

// ─── State ───────────────────────────────────────────────────────────────────
let grid, flashTimers;   // Uint8Array + Float32Array
let width, height;
let scene, camera, renderer, controls;
let instancedMesh;
let dummy = new THREE.Object3D();
let totalGrains = 0;
let isToppling = false;
let autoDropTimer = 0;
let avalancheCount = 0;
let statsEl;

// ─── Color helpers ───────────────────────────────────────────────────────────
const COL_LOW   = new THREE.Color(0x1a4fd8);  // blue  - 0 grains
const COL_MID   = new THREE.Color(0x22c55e);  // green - 1 grain
const COL_HIGH  = new THREE.Color(0xef4444);  // red   - 2 grains
const COL_CRIT  = new THREE.Color(0xff8800);  // orange- 3 grains
const COL_FLASH = new THREE.Color(0xffee00);  // yellow- toppling

function grainColor(count, flashing) {
  if (flashing > 0) return COL_FLASH.clone().lerp(baseColorForGrains(count), flashing);
  return baseColorForGrains(count);
}

function baseColorForGrains(count) {
  if (count === 0) return COL_LOW;
  if (count === 1) return COL_MID;
  if (count === 2) return COL_HIGH;
  return COL_CRIT;
}

// ─── Grid init ────────────────────────────────────────────────────────────────
function initGrid(size) {
  width = size;
  height = size;
  grid = new Uint8Array(size * size);
  flashTimers = new Float32Array(size * size);
  totalGrains = 0;
  // Seed center with some sand
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  addGrain(cx, cy, false);
  addGrain(cx, cy, false);
  addGrain(cx, cy, false);
  rebuildMesh();
}

function idx(x, y) { return y * width + x; }

function addGrain(x, y, trigger = true) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const i = idx(x, y);
  totalGrains++;
  grid[i]++;
  if (grid[i] >= 4 && trigger) {
    triggerToppling();
  }
}

function inBounds(x, y) {
  return x >= 0 && x < width && y >= 0 && y < height;
}

function triggerToppling() {
  if (!isToppling) {
    isToppling = true;
    avalancheCount++;
  }
}

// ─── Toppling logic (BFS-style queue) ────────────────────────────────────────
const queue = [];
let queueHead = 0;

function processTopplingBatch(maxPerFrame) {
  if (!isToppling) return;
  let processed = 0;
  while (queueHead < queue.length && processed < maxPerFrame) {
    const i = queue[queueHead++];
    const x = i % width;
    const y = Math.floor(i / width);
    const grains = grid[i];
    if (grains < 4) continue;

    // This cell topples
    grid[i] -= 4;
    flashTimers[i] = 1.0;
    totalGrains -= 4;

    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const ni = idx(nx, ny);
      grid[ni] += 1;
      totalGrains += 1;
      if (grid[ni] >= 4 && !queued.has(ni)) {
        queued.add(ni);
        queue.push(ni);
      }
    }
    processed++;
  }

  // Check if done
  if (queueHead >= queue.length) {
    const stillCritical = Array.from(queued).some(i => grid[i] >= 4);
    if (!stillCritical) {
      isToppling = false;
      queue.length = 0;
      queueHead = 0;
      queued.clear();
    }
  }
}

const queued = new Set();

function enqueueAvalanche() {
  // Find all critical cells and seed the queue
  queued.clear();
  queue.length = 0;
  queueHead = 0;
  for (let i = 0; i < width * height; i++) {
    if (grid[i] >= 4) {
      queued.add(i);
      queue.push(i);
    }
  }
  if (queue.length > 0) {
    isToppling = true;
    avalancheCount++;
  }
}

// ─── Mesh ─────────────────────────────────────────────────────────────────────
function rebuildMesh() {
  if (instancedMesh) {
    scene.remove(instancedMesh);
    instancedMesh.geometry.dispose();
    instancedMesh.material.dispose();
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  instancedMesh = new THREE.InstancedMesh(geometry, material, width * height);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(width * height * 3), 3);
  instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  scene.add(instancedMesh);

  updateInstanceColors();
}

function updateInstanceColors() {
  const arr = instancedMesh.instanceColor.array;
  for (let i = 0; i < width * height; i++) {
    const flash = flashTimers[i];
    const c = grainColor(grid[i], flash > 0 ? flash : 0);
    arr[i * 3]     = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  instancedMesh.instanceColor.needsUpdate = true;
}

function updateMatrices() {
  const halfW = width / 2;
  const halfH = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const grains = grid[i];
      const h = Math.max(0.05, (grains / 3) * CONFIG.barScale + 0.05);
      dummy.position.set(x - halfW + 0.5, h / 2, y - halfH + 0.5);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
}

function refreshMesh() {
  updateMatrices();
  updateInstanceColors();
}

// ─── Raycasting / Click ───────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const target = new THREE.Vector3();

function onCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  if (raycaster.ray.intersectPlane(groundPlane, target)) {
    const gx = Math.floor(target.x + width / 2);
    const gy = Math.floor(target.z + height / 2);
    if (inBounds(gx, gy)) {
      addGrain(gx, gy, true);
      enqueueAvalanche();
      refreshMesh();
    }
  }
}

// ─── Auto-drop ────────────────────────────────────────────────────────────────
function autoDrop() {
  if (!CONFIG.autoDrop) return;
  // Drop at center with small random jitter
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const jx = (Math.random() < 0.5 ? -1 : 0);
  const jy = (Math.random() < 0.5 ? -1 : 0);
  addGrain(cx + jx, cy + jy, true);
  enqueueAvalanche();
  refreshMesh();
}

// ─── Scene setup ───────────────────────────────────────────────────────────────
let canvas;

function init() {
  statsEl = document.getElementById('stats');

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  canvas = renderer.domElement;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.FogExp2(0x0a0a0f, 0.018);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 35, 40);
  camera.lookAt(0, 0, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 10;
  controls.maxDistance = 80;

  // Lighting
  const ambient = new THREE.AmbientLight(0x334466, 1.2);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);
  const rimLight = new THREE.DirectionalLight(0x4455ff, 0.5);
  rimLight.position.set(-20, 10, -20);
  scene.add(rimLight);

  // Ground reference plane (invisible, for raycasting)
  const groundGeo = new THREE.PlaneGeometry(width, height);
  const groundMat = new THREE.MeshBasicMaterial({ visible: false });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  scene.add(groundMesh);

  // Grid border
  const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.02, height));
  const borderMat = new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.4 });
  const border = new THREE.LineSegments(borderGeo, borderMat);
  border.position.y = 0.01;
  scene.add(border);

  // Grid floor
  const floorGeo = new THREE.PlaneGeometry(width, height);
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x0d0d1a, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);

  // Init sandpile
  initGrid(CONFIG.gridSize);

  // Events
  canvas.addEventListener('click', onCanvasClick);
  window.addEventListener('resize', onResize);

  // GUI
  setupGUI();

  // Start loop
  animate();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ─── GUI ──────────────────────────────────────────────────────────────────────
function setupGUI() {
  const gui = new GUI({ title: 'Sandpile Controls' });
  gui.domElement.style.marginTop = '10px';
  gui.add(CONFIG, 'gridSize', 15, 51, 2).name('Grid Size').onChange(v => {
    if (!isToppling) {
      initGrid(v);
      refreshMesh();
    }
  });
  gui.add(CONFIG, 'dropRate', 0.1, 5, 0.1).name('Drop Rate (s)');
  gui.add(CONFIG, 'autoDrop').name('Auto Drop');
  gui.add({ topplingSpeed: CONFIG.topplingSpeed }, 'topplingSpeed', 10, 500, 10)
    .name('Topple Speed').onChange(v => { CONFIG.topplingSpeed = v; });
  gui.add({ reset: () => {
    if (!isToppling) {
      initGrid(CONFIG.gridSize);
      refreshMesh();
    }
  }}, 'reset').name('Reset Grid');
}

// ─── Animation loop ───────────────────────────────────────────────────────────
let lastTime = 0;
let dropAccum = 0;

function animate(time = 0) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  // Auto-drop
  if (CONFIG.autoDrop && !isToppling) {
    dropAccum += dt;
    if (dropAccum >= CONFIG.dropRate) {
      dropAccum = 0;
      autoDrop();
      refreshMesh();
    }
  }

  // Toppling batch
  if (isToppling) {
    processTopplingBatch(CONFIG.topplingSpeed);
    refreshMesh();
  }

  // Decay flash timers
  let flashActive = false;
  for (let i = 0; i < flashTimers.length; i++) {
    if (flashTimers[i] > 0) {
      flashTimers[i] = Math.max(0, flashTimers[i] - dt * 6);
      if (flashTimers[i] > 0) flashActive = true;
    }
  }
  if (flashActive || isToppling) {
    updateInstanceColors();
  }

  // Stats
  statsEl.textContent = `Grains: ${totalGrains} | Avalanche: ${avalancheCount} ${isToppling ? '⚡ active' : 'idle'}`;

  controls.update();
  renderer.render(scene, camera);
}

init();