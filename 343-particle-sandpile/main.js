import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ── Sandpile Model ──────────────────────────────────────────────────────────
class Sandpile {
  constructor(size) {
    this.size = size;
    this.grid = Array.from({ length: size }, () => new Int32Array(size));
    this._toppleQueue = [];
  }

  reset(size) {
    this.size = size;
    this.grid = Array.from({ length: size }, () => new Int32Array(size));
  }

  addSand(x, y, amount = 1) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return;
    this.grid[y][x] += amount;
    if (this.grid[y][x] >= 4) {
      this._pushQueue(x, y);
    }
  }

  _pushQueue(x, y) {
    const key = y * this.size + x;
    if (!this._queueSet) this._queueSet = new Set();
    if (!this._queueSet.has(key)) {
      this._queueSet.add(key);
      this._toppleQueue.push({ x, y });
    }
  }

  // Returns { toppled: [{x,y}], maxGrains: number }
  step() {
    const toTopple = this._toppleQueue.splice(0);
    this._queueSet = new Set();
    const toppled = [];

    for (const { x, y } of toTopple) {
      const g = this.grid[y][x];
      if (g < 4) continue;

      toppled.push({ x, y, from: g });

      const n = g >> 2; // floor(g / 4)
      const rem = g & 3;  // g % 4

      this.grid[y][x] = rem;

      const neighbors = [
        [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size) continue;
        this.grid[ny][nx] += n;
        if (this.grid[ny][nx] >= 4) this._pushQueue(nx, ny);
      }
    }

    let maxG = 0;
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++)
        if (this.grid[y][x] > maxG) maxG = this.grid[y][x];

    return { toppled, maxGrains: maxG };
  }

  get totalGrains() {
    let t = 0;
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++)
        t += this.grid[y][x];
    return t;
  }
}

// ── Three.js Setup ──────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 55, 55);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 15;
controls.maxDistance = 200;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.4;

// ── Lighting ────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x334466, 1.2);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(30, 60, 30);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x4466aa, 0.6);
fillLight.position.set(-30, 20, -30);
scene.add(fillLight);

// ── Grid Floor ─────────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(200, 40, 0x223355, 0x112233);
gridHelper.position.y = -0.5;
scene.add(gridHelper);

// ── Sandpile State ──────────────────────────────────────────────────────────
let gridSize = 50;
let sandpile = new Sandpile(gridSize);

// ── Instanced Mesh ───────────────────────────────────────────────────────────
const CELL = 1;
const GAP = 0.06;
const STEP = CELL + GAP;
const HALF = 0.5;

let instancedMesh = null;
const dummy = new THREE.Object3D();
const colorBuf = new THREE.Color();

// Base geometry offset so columns grow upward from y=0
const boxGeo = new THREE.BoxGeometry(CELL * 0.92, 1, CELL * 0.92);

function buildMesh(gs) {
  if (instancedMesh) {
    scene.remove(instancedMesh);
    instancedMesh.geometry.dispose();
    instancedMesh.material.dispose();
  }
  const count = gs * gs;
  instancedMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({
    metalness: 0.15,
    roughness: 0.65,
  }), count);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // init all to zero-height
  for (let y = 0; y < gs; y++) {
    for (let x = 0; x < gs; x++) {
      const i = y * gs + x;
      dummy.position.set((x - gs / 2 + 0.5) * STEP, 0, (y - gs / 2 + 0.5) * STEP);
      dummy.scale.set(1, 0.001, 1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedMesh);
}

buildMesh(gridSize);

// ── Color Mapping ───────────────────────────────────────────────────────────
function sandColor(grains, toppling) {
  if (toppling) return new THREE.Color(1.0, 1.0, 1.0);
  if (grains === 0) return new THREE.Color(0.08, 0.18, 0.55);
  if (grains === 1) return new THREE.Color(0.95, 0.85, 0.10);
  if (grains === 2) return new THREE.Color(1.0, 0.42, 0.08);
  return new THREE.Color(0.9, 0.08, 0.04); // 3+
}

// ── Update Instances ─────────────────────────────────────────────────────────
// pulseScale tracks { index -> { scale, dir } }
const pulseScale = new Map();
let pulseTimer = 0;

function updateInstances(gs, dt) {
  if (!instancedMesh) return;

  // advance pulses
  const toRemove = [];
  const pulseSpeed = 8 * (guiParams.animSpeed || 1);
  for (const [key, p] of pulseScale) {
    p.t += dt * pulseSpeed;
    if (p.t >= 1.0) {
      toRemove.push(key);
    } else {
      const s = 1 + 0.35 * Math.sin(p.t * Math.PI);
      p.scale = s;
    }
  }
  toRemove.forEach(k => pulseScale.delete(k));

  for (let y = 0; y < gs; y++) {
    for (let x = 0; x < gs; x++) {
      const i = y * gs + x;
      const grains = sandpile.grid[y][x];
      const key = y * gs + x;
      const pulse = pulseScale.get(key);
      const scaleY = Math.max(0.001, grains * 0.5 + (pulse ? pulse.scale * 0.5 - 0.5 : 0));

      dummy.position.set((x - gs / 2 + 0.5) * STEP, scaleY * 0.5, (y - gs / 2 + 0.5) * STEP);
      dummy.scale.set(1, scaleY, 1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);

      const isToppling = pulse && pulse.t < 0.6;
      colorBuf.set(sandColor(grains, isToppling));
      instancedMesh.setColorAt(i, colorBuf);
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
}

// ── GUI ─────────────────────────────────────────────────────────────────────
const guiParams = {
  gridSize: 50,
  animSpeed: 1.0,
  sandMode: 'Center',
  addSand: addSandCenter,
  reset: resetPile,
};

const gui = new GUI({ title: 'Sandpile Controls' });
gui.add(guiParams, 'gridSize', [25, 40, 50, 64, 80]).name('Grid Size').onChange(v => {
  gridSize = parseInt(v);
  resetPile();
});
gui.add(guiParams, 'animSpeed', 0.1, 4.0).name('Anim Speed');
gui.add(guiParams, 'sandMode', ['Center', 'Random']).name('Add Mode');
gui.add(guiParams, 'addSand').name('Add Sand (×500)');
gui.add(guiParams, 'reset').name('Reset');

function addSandCenter() {
  const cx = Math.floor(gridSize / 2);
  const cy = Math.floor(gridSize / 2);
  for (let i = 0; i < 500; i++) {
    sandpile.addSand(cx, cy);
  }
}

function addSandRandom() {
  for (let i = 0; i < 500; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    sandpile.addSand(x, y);
  }
}

function resetPile() {
  sandpile.reset(gridSize);
  pulseScale.clear();
  buildMesh(gridSize);
  // recenter camera
  camera.position.set(0, gridSize * 1.1, gridSize * 1.1);
  controls.target.set(0, 0, 0);
  controls.update();
}

// ── Click to Add Sand ───────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let mouseDown = false;
let lastAddTime = 0;

renderer.domElement.addEventListener('mousedown', () => { mouseDown = true; });
renderer.domElement.addEventListener('mouseup', () => { mouseDown = false; });
renderer.domElement.addEventListener('mouseleave', () => { mouseDown = false; });

renderer.domElement.addEventListener('click', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObject(instancedMesh);
  if (hits.length > 0) {
    const instanceId = hits[0].instanceId;
    const x = instanceId % gridSize;
    const y = Math.floor(instanceId / gridSize);
    for (let i = 0; i < 200; i++) sandpile.addSand(x, y);
  } else {
    // add at center
    const cx = Math.floor(gridSize / 2);
    const cy = Math.floor(gridSize / 2);
    for (let i = 0; i < 200; i++) sandpile.addSand(cx, cy);
  }
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  const now = performance.now();
  if (now - lastAddTime < 80) return;
  lastAddTime = now;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObject(instancedMesh);
  if (hits.length > 0) {
    const instanceId = hits[0].instanceId;
    const x = instanceId % gridSize;
    const y = Math.floor(instanceId / gridSize);
    for (let i = 0; i < 5; i++) sandpile.addSand(x, y);
  }
});

// ── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Auto-add mode toggle ────────────────────────────────────────────────────
// Patch addSand to respect mode
const origAddSandCenter = addSandCenter;
window._origAddSandCenter = addSandCenter;
window._origAddSandRandom = addSandRandom;

// ── Animation Loop ──────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  // Step simulation
  const { toppled, maxGrains } = sandpile.step();

  // Register toppling pulses
  for (const { x, y, from } of toppled) {
    pulseScale.set(y * gridSize + x, { t: 0.0, scale: 1.0 });
  }

  // Auto-add sand periodically when pile is mostly flat
  if (maxGrains < 3 && Math.random() < 0.015 * (guiParams.animSpeed || 1)) {
    if (guiParams.sandMode === 'Center') {
      addSandCenter();
    } else {
      addSandRandom();
    }
  }

  updateInstances(gridSize, dt);
  controls.update();
  renderer.render(scene, camera);
}

// ── Expose grid for debugging ───────────────────────────────────────────────
window.grid = sandpile.grid;
window.sandpile = sandpile;

// Patch addSand to keep window.grid in sync
const origAdd = sandpile.addSand.bind(sandpile);
sandpile.addSand = function(x, y, amount) {
  const result = origAdd(x, y, amount);
  window.grid = sandpile.grid;
  return result;
};

animate();