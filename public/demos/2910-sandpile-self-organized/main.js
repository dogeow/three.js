// 2910. Sandpile - Self-Organized Criticality
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CONFIG = {
  gridSize: 31,
  autoDrop: true,
  dropInterval: 0.4,
  topplingSpeed: 120,
  barScale: 0.4,
};

let grid, flashTimers;
let width, height;
let scene, camera, renderer, controls;
let instancedMesh;
let dummy = new THREE.Object3D();
let totalGrains = 0;
let isToppling = false;
let avalancheCount = 0;
let queue = [];
let queueHead = 0;
let queued = new Set();

const COL = [
  new THREE.Color(0x1a4fd8),  // 0 grains - blue
  new THREE.Color(0x22c55e),  // 1 grain  - green
  new THREE.Color(0xef4444),  // 2 grains - red
  new THREE.Color(0xff8800),  // 3 grains - orange
];
const COL_FLASH = new THREE.Color(0xffdd00);

function idx(x, y) { return y * width + x; }
function inBounds(x, y) { return x >= 0 && x < width && y >= 0 && y < height; }

function grainColor(count, flashing) {
  if (flashing > 0) return COL_FLASH.clone().lerp(COL[Math.min(count, 3)], flashing);
  return COL[Math.min(count, 3)];
}

function initGrid(size) {
  width = size;
  height = size;
  grid = new Uint8Array(size * size);
  flashTimers = new Float32Array(size * size);
  totalGrains = 0;
  // Seed center
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  addGrain(cx, cy, false);
  addGrain(cx, cy, false);
  addGrain(cx, cy, false);
  rebuildMesh();
}

function addGrain(x, y, trigger = true) {
  if (!inBounds(x, y)) return;
  const i = idx(x, y);
  totalGrains++;
  grid[i]++;
  if (grid[i] >= 4 && trigger) triggerToppling();
}

function triggerToppling() {
  if (!isToppling) { isToppling = true; avalancheCount++; }
}

function enqueueAvalanche() {
  queued.clear();
  queue.length = 0;
  queueHead = 0;
  for (let i = 0; i < width * height; i++) {
    if (grid[i] >= 4) { queued.add(i); queue.push(i); }
  }
  if (queue.length > 0) { isToppling = true; avalancheCount++; }
}

function processTopplingBatch(maxPerFrame) {
  if (!isToppling) return;
  let processed = 0;
  while (queueHead < queue.length && processed < maxPerFrame) {
    const i = queue[queueHead++];
    const x = i % width;
    const y = Math.floor(i / width);
    if (grid[i] < 4) continue;

    grid[i] -= 4;
    flashTimers[i] = 1.0;
    totalGrains -= 4;

    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const ni = idx(nx, ny);
      grid[ni]++;
      totalGrains++;
      if (grid[ni] >= 4 && !queued.has(ni)) { queued.add(ni); queue.push(ni); }
    }
    processed++;
  }

  if (queueHead >= queue.length) {
    const still = Array.from(queued).some(i => grid[i] >= 4);
    if (!still) {
      isToppling = false;
      queue.length = 0;
      queueHead = 0;
      queued.clear();
    }
  }
}

function rebuildMesh() {
  if (instancedMesh) { scene.remove(instancedMesh); instancedMesh.geometry.dispose(); }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  instancedMesh = new THREE.InstancedMesh(geo, mat, width * height);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(width * height * 3), 3);
  instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  scene.add(instancedMesh);
  refreshMesh();
}

function refreshMesh() {
  const halfW = width / 2;
  const halfH = height / 2;
  const colArr = instancedMesh.instanceColor.array;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const grains = grid[i];
      const flash = flashTimers[i];
      const h = Math.max(0.05, (grains / 3) * CONFIG.barScale + 0.05);
      dummy.position.set(x - halfW + 0.5, h / 2, y - halfH + 0.5);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);

      const c = grainColor(grains, flash);
      colArr[i*3] = c.r; colArr[i*3+1] = c.g; colArr[i*3+2] = c.b;
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.instanceColor.needsUpdate = true;
}

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const target = new THREE.Vector3();
let canvas;

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

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);
  canvas = renderer.domElement;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060810);
  scene.fog = new THREE.FogExp2(0x060810, 0.015);

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 35, 42);
  camera.lookAt(0, 0, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = Math.PI / 2.1;

  scene.add(new THREE.AmbientLight(0x334466, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(20, 40, 20);
  scene.add(dir);
  const rim = new THREE.DirectionalLight(0x4455ff, 0.4);
  rim.position.set(-20, 10, -20);
  scene.add(rim);

  // Invisible ground for raycasting
  const gMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ visible: false }));
  gMesh.rotation.x = -Math.PI / 2;
  scene.add(gMesh);

  // Floor & border
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshLambertMaterial({ color: 0x0a0a18, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);

  const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.02, height));
  const border = new THREE.LineSegments(borderGeo, new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.5 }));
  border.position.y = 0.01;
  scene.add(border);

  initGrid(CONFIG.gridSize);

  canvas.addEventListener('click', onCanvasClick);
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const statsEl = document.getElementById('stats');
  let lastTime = 0;
  let dropAccum = 0;

  function animate(time = 0) {
    requestAnimationFrame(animate);
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    if (CONFIG.autoDrop && !isToppling) {
      dropAccum += dt;
      if (dropAccum >= CONFIG.dropInterval) {
        dropAccum = 0;
        const cx = Math.floor(width / 2) + (Math.random() < 0.5 ? -1 : 0);
        const cy = Math.floor(height / 2) + (Math.random() < 0.5 ? -1 : 0);
        addGrain(cx, cy, true);
        enqueueAvalanche();
        refreshMesh();
      }
    }

    if (isToppling) {
      processTopplingBatch(CONFIG.topplingSpeed);
      refreshMesh();
    }

    let flashActive = false;
    for (let i = 0; i < flashTimers.length; i++) {
      if (flashTimers[i] > 0) {
        flashTimers[i] = Math.max(0, flashTimers[i] - dt * 7);
        if (flashTimers[i] > 0) flashActive = true;
      }
    }
    if (flashActive || isToppling) refreshMesh();

    statsEl.textContent = `Grains: ${totalGrains} | Avalanche: ${avalancheCount}${isToppling ? ' ⚡' : ''}`;

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

init();
