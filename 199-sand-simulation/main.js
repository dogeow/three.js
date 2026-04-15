import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Config ───────────────────────────────────────────────
const GRID_W = 100;
const GRID_H = 100;

// Grid: 0 = empty, 1 = sand
const grid = new Uint8Array(GRID_W * GRID_H);
const heightMap = new Int32Array(GRID_W * GRID_H); // pile height at each column

// ─── Renderer ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ─── Scene ────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);

// ─── Camera ───────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 80, 120);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 10, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 30;
controls.maxDistance = 250;

// ─── Lights ───────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffeedd, 0.4);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
sunLight.position.set(40, 80, 60);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 300;
sunLight.shadow.camera.left = -80;
sunLight.shadow.camera.right = 80;
sunLight.shadow.camera.top = 80;
sunLight.shadow.camera.bottom = -80;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x8ab4f8, 0.3);
fillLight.position.set(-30, 40, -50);
scene.add(fillLight);

// ─── Sand Box Floor ──────────────────────────────────────
const floorGeo = new THREE.PlaneGeometry(GRID_W + 4, GRID_H + 4);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.95 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.6;
floor.receiveShadow = true;
scene.add(floor);

// Sand box walls (thin)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, side: THREE.DoubleSide });
function addWall(w, h, d, x, y, z, ry = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, wallMat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
const wallT = 1;
const wallH = 12;
// top (Z -)
addWall(GRID_W + 4, wallH, wallT, 0, wallH / 2 - 0.6, -(GRID_H / 2 + wallT / 2));
// bottom (Z +)
addWall(GRID_W + 4, wallH, wallT, 0, wallH / 2 - 0.6, (GRID_H / 2 + wallT / 2));
// left (X -)
addWall(wallT, wallH, GRID_H + wallT * 2, -(GRID_W / 2 + wallT / 2), wallH / 2 - 0.6, 0);
// right (X +)
addWall(wallT, wallH, GRID_H + wallT * 2, (GRID_W / 2 + wallT / 2), wallH / 2 - 0.6, 0);

// ─── InstancedMesh Setup ───────────────────────────────────
let MAX_GRAINS = 250000;
const grainGeo = new THREE.SphereGeometry(0.45, 6, 6);
const grainMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });

const instancedMesh = new THREE.InstancedMesh(grainGeo, grainMat, MAX_GRAINS);
instancedMesh.castShadow = true;
instancedMesh.receiveShadow = true;
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(instancedMesh);

// Color attribute per instance
const colorArray = new Float32Array(MAX_GRAINS * 3);
const colorAttr = new THREE.InstancedBufferAttribute(colorArray, 3);
instancedMesh.instanceColor = colorAttr;

// ─── Sand Color Gradient ───────────────────────────────────
// Light tan (beach) → dark ochre (deep pile)
const colorLow = new THREE.Color(0xe8c87a);  // light beach sand
const colorHigh = new THREE.Color(0x8b5e2a); // dark ochre

function grainColor(height, idx) {
  const t = Math.min(height / 18.0, 1.0);
  const c = colorLow.clone().lerp(colorHigh, t);
  colorArray[idx * 3 + 0] = c.r;
  colorArray[idx * 3 + 1] = c.g;
  colorArray[idx * 3 + 2] = c.b;
}

// ─── Simulation State ─────────────────────────────────────
let activeGrains = 0;
let pouring = false;
let pourAccum = 0;

const dummy = new THREE.Object3D();

// Build initial matrix for all possible positions (cache)
const cachedPositions = [];
for (let i = 0; i < MAX_GRAINS; i++) {
  cachedPositions.push(new THREE.Vector3());
}

// ─── Helpers ───────────────────────────────────────────────
function gridIdx(x, z) { return z * GRID_W + x; }
function inBounds(x, z) { return x >= 0 && x < GRID_W && z >= 0 && z < GRID_H; }

function spawnSand(gx, gz, count) {
  for (let k = 0; k < count; k++) {
    // perturbation so it doesn't stack perfectly
    const px = gx + (Math.random() - 0.5) * 3.0;
    const pz = gz + (Math.random() - 0.5) * 3.0;
    const ix = Math.round(px);
    const iz = Math.round(pz);
    if (!inBounds(ix, iz)) continue;
    if (grid[gridIdx(ix, iz)]) continue;

    grid[gridIdx(ix, iz)] = 1;
    const h = heightMap[gridIdx(ix, iz)]++;
    cachedPositions[activeGrains].set(
      ix - GRID_W / 2 + 0.5,
      h + 0.5,
      iz - GRID_H / 2 + 0.5
    );
    grainColor(h, activeGrains);
    activeGrains++;
    if (activeGrains >= MAX_GRAINS) return;
  }
}

// ─── Simulation Step ───────────────────────────────────────
function updateSand() {
  // Process from bottom to top (z = 0 is bottom row in our grid)
  // Actually, let's process bottom row first (z=0) up to z=GRID_H-1
  for (let z = 0; z < GRID_H; z++) {
    // Randomize horizontal sweep direction each row to avoid bias
    const leftFirst = Math.random() < 0.5;
    for (let pass = 0; pass < 2; pass++) {
      const xStart = leftFirst ? 0 : GRID_W - 1;
      const xEnd   = leftFirst ? GRID_W : -1;
      const xStep  = leftFirst ? 1 : -1;

      for (let x = xStart; x !== xEnd; x += xStep) {
        const idx = gridIdx(x, z);
        if (!grid[idx]) continue;

        const h = heightMap[idx];

        // Try to fall straight down
        if (z + 1 < GRID_H) {
          const below = gridIdx(x, z + 1);
          if (!grid[below]) {
            // Move down
            grid[below] = 1;
            grid[idx] = 0;
            heightMap[below] = heightMap[idx] + 1;
            heightMap[idx] = 0;
            continue;
          }
        }

        // Try diagonal down-left or down-right (random)
        const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        for (const dx of dirs) {
          const nx = x + dx;
          if (!inBounds(nx, z)) continue;
          if (z + 1 >= GRID_H) continue;
          const nidx = gridIdx(nx, z + 1);
          if (!grid[nidx]) {
            // Move diagonally down
            grid[nidx] = 1;
            grid[idx] = 0;
            heightMap[nidx] = heightMap[idx] + 1;
            heightMap[idx] = 0;
            break;
          }
        }

        // Sideways spread (low friction / angle of repose)
        if (Math.random() < params.spread) {
          const dx2 = Math.random() < 0.5 ? -1 : 1;
          const nx = x + dx2;
          if (inBounds(nx, z) && !grid[gridIdx(nx, z)]) {
            // Sideways only if same or lower height
            const nidx = gridIdx(nx, z);
            if (heightMap[nidx] <= heightMap[idx]) {
              grid[nidx] = 1;
              grid[idx] = 0;
              heightMap[nidx] = heightMap[idx] + 1;
              heightMap[idx] = Math.max(0, heightMap[idx] - 1);
            }
          }
        }
      }
    }
  }
}

// ─── Rebuild InstancedMesh from Grid ──────────────────────
let rebuildTimer = 0;
let lastUpdateTime = performance.now();
let simAccum = 0;

function rebuildMesh() {
  activeGrains = 0;

  for (let z = 0; z < GRID_H; z++) {
    for (let x = 0; x < GRID_W; x++) {
      const idx = gridIdx(x, z);
      if (!grid[idx]) continue;

      const h = heightMap[idx];
      // Each grain occupies one unit of height
      // We render each column as a stack of unit spheres
      // To save instances, we sample only every N grains vertically
      // But for a 100x100 pile of height ~20, that's 200k — within budget
      for (let y = 0; y < h; y++) {
        if (activeGrains >= MAX_GRAINS) break;
        cachedPositions[activeGrains].set(
          x - GRID_W / 2 + 0.5,
          y + 0.5,
          z - GRID_H / 2 + 0.5
        );
        grainColor(y, activeGrains);
        activeGrains++;
      }
    }
  }

  // Update instance matrices
  for (let i = 0; i < activeGrains; i++) {
    dummy.position.copy(cachedPositions[i]);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.count = activeGrains;
  instancedMesh.instanceMatrix.needsUpdate = true;
  colorAttr.needsUpdate = true;
}

// ─── GUI ───────────────────────────────────────────────────
const params = {
  pourRate: 8,        // grains per frame
  grainSize: 0.45,
  gravity: 1.0,       // simulation speed multiplier
  spread: 0.15,       // probability of sideways spread
  autoPour: false,
  autoPourRate: 3,
  simSteps: 2,        // sim iterations per frame
  rebuild: () => {
    // Clear and rebuild
    grid.fill(0);
    heightMap.fill(0);
    activeGrains = 0;
    rebuildMesh();
  }
};

const gui = new GUI();
gui.title('Sand Controls');
gui.add(params, 'pourRate', 1, 60, 1).name('Pour Rate');
gui.add(params, 'grainSize', 0.1, 1.5, 0.05).name('Grain Size').onChange(v => {
  grainGeo.scale(v / 0.45, v / 0.45, v / 0.45);
});
gui.add(params, 'gravity', 0.1, 3.0, 0.1).name('Gravity');
gui.add(params, 'spread', 0.0, 0.5, 0.01).name('Spread/Friction');
gui.add(params, 'autoPour').name('Auto Pour');
gui.add(params, 'autoPourRate', 1, 30, 1).name('Auto Rate');
gui.add(params, 'simSteps', 1, 10, 1).name('Sim Steps/Frame');
gui.add(params, 'rebuild').name('Clear Sand');

// ─── Raycasting for Click-to-Pour ─────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let mouseDown = false;

function pourAtClick(clientX, clientY) {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // Intersect with an invisible plane at y = pile top + 30
  const planeNorm = new THREE.Vector3(0, 1, 0);
  const planePoint = new THREE.Vector3(0, 35, 0);
  const plane = new THREE.Plane();
  plane.setFromNormalAndCoplanarPoint(planeNorm, planePoint);

  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);
  if (!target) return;

  // Map to grid coords
  const gx = Math.round(target.x + GRID_W / 2);
  const gz = Math.round(target.z + GRID_H / 2);
  if (!inBounds(gx, gz)) return;

  spawnSand(gx, gz, params.pourRate);
  rebuildMesh();
}

window.addEventListener('pointerdown', e => {
  if (e.button === 0) mouseDown = true;
});
window.addEventListener('pointerup', e => {
  if (e.button === 0) mouseDown = false;
});
window.addEventListener('pointermove', e => {
  if (mouseDown) pourAtClick(e.clientX, e.clientY);
});
window.addEventListener('click', e => {
  pourAtClick(e.clientX, e.clientY);
});

// ─── Resize ────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation Loop ────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  controls.update();

  // Auto pour
  if (params.autoPour) {
    const centerX = GRID_W / 2;
    const centerZ = GRID_H / 2;
    const jitter = 4;
    const ax = centerX + (Math.random() - 0.5) * jitter;
    const az = centerZ + (Math.random() - 0.5) * jitter;
    spawnSand(Math.round(ax), Math.round(az), params.autoPourRate);
    rebuildMesh();
  }

  // Simulate sand physics
  const steps = params.simSteps;
  for (let s = 0; s < steps; s++) {
    updateSand();
  }

  // Rebuild mesh at ~30fps for rendering (not every frame)
  rebuildTimer += dt;
  if (rebuildTimer > 0.033) {
    rebuildTimer = 0;
    rebuildMesh();
  }

  renderer.render(scene, camera);
}

// Initial rebuild
rebuildMesh();
animate();