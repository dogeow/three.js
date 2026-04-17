import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── State ────────────────────────────────────────────────────────────────────
let terrainSize = 128;
let terrain = [];           // original heights
let terrainEroded = [];    // after erosion
let erosionMap = [];        // difference (original - eroded)
let waterMap = [];          // water accumulation per vertex
let originalTotal = 0;
let erodedTotal = 0;

// params from UI
let params = {
  gridSize: 128,
  iterations: 50000,
  capacity: 8,
  erosionRate: 0.3,
};

// display mode: 'terrain' | 'erosion' | 'diff'
let displayMode = 'terrain';
let isEroding = false;

// ─── Three.js Setup ──────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.fog = new THREE.FogExp2(0x0a0a18, 0.012);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(80, 60, 90);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 20;
controls.maxDistance = 300;

// ─── Lighting ─────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x334466, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.8);
sunLight.position.set(60, 100, 40);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 400;
sunLight.shadow.camera.left = -120;
sunLight.shadow.camera.right = 120;
sunLight.shadow.camera.top = 120;
sunLight.shadow.camera.bottom = -120;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x4466aa, 0.5);
fillLight.position.set(-40, 30, -50);
scene.add(fillLight);

const hemi = new THREE.HemisphereLight(0x5588cc, 0x2a3a1a, 0.4);
scene.add(hemi);

// ─── Terrain Mesh ─────────────────────────────────────────────────────────────
let terrainMesh = null;
let wireframeMesh = null;
let gridHelper = null;
let waterMesh = null;

function createTerrain() {
  if (terrainMesh) scene.remove(terrainMesh);
  if (wireframeMesh) scene.remove(wireframeMesh);
  if (waterMesh) scene.remove(waterMesh);

  const n = params.gridSize;
  const geometry = new THREE.PlaneGeometry(80, 80, n - 1, n - 1);
  geometry.rotateX(-Math.PI / 2);

  terrainMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: false,
  }));
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = false;
  scene.add(terrainMesh);
}

// ─── FBM Noise ────────────────────────────────────────────────────────────────
function hash(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);
  return n00 * (1 - ux) * (1 - uy) + n10 * ux * (1 - uy) + n01 * (1 - ux) * uy + n11 * ux * uy;
}

function fbm(x, y, octaves = 7) {
  let val = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return val / max;
}

function generateTerrain() {
  const n = params.gridSize;
  terrain = [];
  for (let j = 0; j < n; j++) {
    terrain[j] = [];
    for (let i = 0; i < n; i++) {
      const nx = i / (n - 1) * 4.0;
      const nz = j / (n - 1) * 4.0;
      let h = fbm(nx, nz, 7);
      // Ridge-like: amplify mid-high values
      h = Math.pow(h, 1.3);
      // Edge falloff
      const dx = i / (n - 1) * 2 - 1;
      const dz = j / (n - 1) * 2 - 1;
      const edge = 1 - Math.max(0, Math.sqrt(dx * dx + dz * dz) - 0.7) / 0.3;
      h *= edge;
      terrain[j][i] = h * 14 + 1.5;
    }
  }
  originalTotal = terrain.flat().reduce((a, b) => a + b, 0);
}

// ─── Hydraulic Erosion ─────────────────────────────────────────────────────────
function computeGrad(heightMap, x, z) {
  const n = params.gridSize;
  const ix = Math.max(0, Math.min(n - 1, Math.floor(x)));
  const iz = Math.max(0, Math.min(n - 1, Math.floor(z)));
  const fx = x - ix, fz = z - iz;
  const h00 = heightMap[iz][ix];
  const h10 = heightMap[iz][Math.min(n - 1, ix + 1)];
  const h01 = heightMap[Math.min(n - 1, iz + 1)][ix];
  const gx = (h10 - h00) * (1 - fz) + (heightMap[Math.min(n - 1, iz + 1)][Math.min(n - 1, ix + 1)] - h01) * fz;
  const gz = (h01 - h00) * (1 - fx) + (heightMap[Math.min(n - 1, iz + 1)][Math.min(n - 1, ix + 1)] - h10) * fz;
  return { gx, gz };
}

function erodeTerrain() {
  const n = params.gridSize;
  const iters = params.iterations;
  const capacity = params.capacity;
  const rate = params.erosionRate;
  const inertia = 0.05;
  const deposition = 0.05;
  const evaporation = 0.01;
  const minSlope = 0.01;
  const gravity = 8.0;

  terrainEroded = terrain.map(row => [...row]);
  erosionMap = terrain.map(row => new Array(row.length).fill(0));
  waterMap = terrain.map(row => new Array(row.length).fill(0));

  let removedTotal = 0;

  for (let iter = 0; iter < iters; iter++) {
    // random droplet start
    let px = Math.random() * (n - 1);
    let pz = Math.random() * (n - 1);
    let vx = 0, vz = 0;
    let speed = 1.0;
    let water = 1.0;
    let sediment = 0.0;

    for (let step = 0; step < 200; step++) {
      const ix = Math.floor(px);
      const iz = Math.floor(pz);

      if (ix < 1 || ix >= n - 1 || iz < 1 || iz >= n - 1) break;

      const { gx, gz } = computeGrad(terrainEroded, px, pz);

      // update velocity with inertia
      vx = vx * inertia - gx * (1 - inertia);
      vz = vz * inertia - gz * (1 - inertia);

      const len = Math.sqrt(vx * vx + vz * vz);
      if (len < 0.0001) break;
      vx /= len; vz /= len;

      px += vx;
      pz += vz;

      // stop if out of bounds
      if (px < 0 || px >= n - 1 || pz < 0 || pz >= n - 1) break;

      const new_ix = Math.max(0, Math.min(n - 1, Math.floor(px)));
      const new_iz = Math.max(0, Math.min(n - 1, Math.floor(pz)));
      const h = terrainEroded[iz][ix];
      const h_new = terrainEroded[new_iz][new_ix];

      const slope = Math.max(minSlope, h - h_new);
      const capacity = Math.max(0.0, (water * slope * speed * gravity));

      if (sediment > capacity || h < h_new) {
        // deposit
        const d = Math.min(sediment, (sediment - capacity) * deposition + h - h_new);
        terrainEroded[iz][ix] += d;
        sediment -= d;
      } else {
        // erode
        const e = Math.min(rate * slope, h - h_new);
        terrainEroded[iz][ix] -= e;
        sediment += e;
        removedTotal += e;
      }

      // evaporate
      water *= (1 - evaporation);
      speed = Math.sqrt(vx * vx + vz * vz);
    }

    // accumulate water & sediment at final position
    if (px >= 0 && px < n - 1 && pz >= 0 && pz < n - 1) {
      const iz = Math.floor(pz);
      const ix = Math.floor(px);
      waterMap[iz][ix] += water;
      waterMap[iz][Math.min(n - 1, ix + 1)] += water * 0.2;
      waterMap[Math.min(n - 1, iz + 1)][ix] += water * 0.2;
    }

    if (iter % 10000 === 0) {
      document.getElementById('statRemoved').textContent = (removedTotal / 1000).toFixed(1) + 'k';
    }
  }

  // compute erosion map
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      erosionMap[j][i] = terrain[j][i] - terrainEroded[j][i];
    }
  }
  erodedTotal = terrainEroded.flat().reduce((a, b) => a + b, 0);

  const maxDelta = Math.max(...erosionMap.flat());
  const removed = originalTotal - erodedTotal;
  document.getElementById('statDelta').textContent = maxDelta.toFixed(2);
  document.getElementById('statRemoved').textContent = removed.toFixed(1);
}

// ─── Color Functions ───────────────────────────────────────────────────────────
function heightToColor(h, maxH) {
  const t = h / maxH;
  if (t < 0.0) return new THREE.Color(0.05, 0.15, 0.35);  // deep
  if (t < 0.08) return new THREE.Color(0.12, 0.35, 0.55); // shallow
  if (t < 0.25) return new THREE.Color(0.18, 0.42, 0.23); // valley
  if (t < 0.45) return new THREE.Color(0.28, 0.52, 0.22); // grass
  if (t < 0.60) return new THREE.Color(0.35, 0.54, 0.29);
  if (t < 0.72) return new THREE.Color(0.52, 0.46, 0.30); // slope
  if (t < 0.84) return new THREE.Color(0.65, 0.55, 0.40); // rock
  if (t < 0.94) return new THREE.Color(0.82, 0.76, 0.66); // high rock
  return new THREE.Color(0.94, 0.92, 0.88);              // snow
}

function erosionToColor(e, maxE) {
  if (e <= 0) return new THREE.Color(0.05, 0.3, 0.2);
  const t = e / maxE;
  return new THREE.Color(0.2 + t * 0.8, 0.1, 0.05);
}

function diffToColor(d, maxD) {
  const t = d / maxD;
  if (t > 0) return new THREE.Color(0.2, 0.6, 0.9);   // eroded = blue
  if (t < 0) return new THREE.Color(0.9, 0.5, 0.2);   // deposited = orange
  return new THREE.Color(0.3, 0.3, 0.35);
}

// ─── Update Mesh Colors / Geometry ───────────────────────────────────────────
function updateMesh() {
  if (!terrainMesh) return;
  const n = params.gridSize;
  const geo = terrainMesh.geometry;

  const heights = displayMode === 'terrain' ? terrainEroded : terrain;
  const maxH = Math.max(...heights.flat());
  const maxE = Math.max(...erosionMap.flat());

  const pos = geo.attributes.position;
  const colors = [];

  let idx = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      let h = heights[j][i];
      let water = waterMap[j][i] * 0.015;

      if (displayMode === 'erosion') {
        h = erosionMap[j][i];
      } else if (displayMode === 'diff') {
        h = terrain[j][i] - terrainEroded[j][i];
      }

      let col;
      if (displayMode === 'terrain') {
        col = heightToColor(h, maxH);
        // tint water areas
        if (water > 0.02) {
          const waterTint = Math.min(1, water);
          col.lerp(new THREE.Color(0.1, 0.3, 0.7), waterTint * 0.7);
        }
      } else if (displayMode === 'erosion') {
        col = erosionToColor(h, maxE);
      } else {
        col = diffToColor(h, maxE > 0 ? maxE : 0.1);
      }

      colors.push(col.r, col.g, col.b);

      const vidx = j * n + i;
      pos.setY(vidx, h);
    }
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// ─── Full Pipeline ─────────────────────────────────────────────────────────────
async function runPipeline() {
  isEroding = true;
  document.getElementById('resetBtn').textContent = '⏳ Eroding...';
  document.getElementById('resetBtn').disabled = true;

  // yield to allow UI update
  await new Promise(r => setTimeout(r, 50));

  generateTerrain();

  await new Promise(r => setTimeout(r, 50));

  erodeTerrain();

  await new Promise(r => setTimeout(r, 50));

  createTerrain();
  updateMesh();

  isEroding = false;
  document.getElementById('resetBtn').textContent = '🔄 Reset & Regenerate';
  document.getElementById('resetBtn').disabled = false;
}

// ─── UI Binding ────────────────────────────────────────────────────────────────
const gridSlider = document.getElementById('gridSlider');
const gridVal = document.getElementById('gridVal');
const iterSlider = document.getElementById('iterSlider');
const iterVal = document.getElementById('iterVal');
const capSlider = document.getElementById('capSlider');
const capVal = document.getElementById('capVal');
const rateSlider = document.getElementById('rateSlider');
const rateVal = document.getElementById('rateVal');
const resetBtn = document.getElementById('resetBtn');

const btnTerrain = document.getElementById('btnTerrain');
const btnErosion = document.getElementById('btnErosion');
const btnDiff = document.getElementById('btnDiff');

function setMode(mode) {
  displayMode = mode;
  btnTerrain.classList.toggle('active', mode === 'terrain');
  btnErosion.classList.toggle('active', mode === 'erosion');
  btnDiff.classList.toggle('active', mode === 'diff');
  if (terrainMesh) updateMesh();
}

btnTerrain.addEventListener('click', () => setMode('terrain'));
btnErosion.addEventListener('click', () => setMode('erosion'));
btnDiff.addEventListener('click', () => setMode('diff'));

gridSlider.addEventListener('input', () => {
  params.gridSize = parseInt(gridSlider.value);
  gridVal.textContent = params.gridSize;
});

iterSlider.addEventListener('input', () => {
  params.iterations = parseInt(iterSlider.value);
  iterVal.textContent = params.iterations;
});

capSlider.addEventListener('input', () => {
  params.capacity = parseInt(capSlider.value);
  capVal.textContent = params.capacity;
});

rateSlider.addEventListener('input', () => {
  params.erosionRate = parseFloat(rateSlider.value);
  rateVal.textContent = params.erosionRate.toFixed(2);
});

resetBtn.addEventListener('click', () => {
  if (!isEroding) runPipeline();
});

// ─── FPS Counter ───────────────────────────────────────────────────────────────
let lastTime = performance.now();
let frameCount = 0;
let fps = 0;
const fpsEl = document.getElementById('fps');

// ─── Animation Loop ────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);

  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 600) {
    fps = Math.round(frameCount / ((now - lastTime) / 1000));
    fpsEl.textContent = fps + ' FPS';
    frameCount = 0;
    lastTime = now;
  }
}

animate();

// ─── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Kick off ─────────────────────────────────────────────────────────────────
runPipeline();