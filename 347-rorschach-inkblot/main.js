import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ─── Noise utilities ─────────────────────────────────────────────────────────
function fract(x) { return x - Math.floor(x); }
function mix(a, b, t) { return a * (1 - t) + b * t; }
function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function hash(n) { return fract(Math.sin(n) * 43758.5453); }

function noise2D(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fract(x), fy = fract(y);
  const ux = smoothstep(0, 1, fx), uy = smoothstep(0, 1, fy);
  const a = hash(ix + iy * 57.0);
  const b = hash(ix + 1.0 + iy * 57.0);
  const c = hash(ix + (iy + 1.0) * 57.0);
  const d = hash(ix + 1.0 + (iy + 1.0) * 57.0);
  return mix(mix(a, b, ux), mix(c, d, ux), uy);
}

function fbm(x, y, octaves = 6) {
  let v = 0, amp = 0.5, freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.1;
  }
  return v;
}

function voronoi(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let md = 8.0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, cy = iy + dy;
      const h = hash(cx + cy * 57.0);
      const kx = cx + h * 0.7 + 0.3;
      const ky = cy + hash(cx + cy * 113.0) * 0.7 + 0.3;
      const d = Math.sqrt((x - kx) ** 2 + (y - ky) ** 2);
      md = Math.min(md, d);
    }
  }
  return md;
}

// ─── Canvas texture generator ────────────────────────────────────────────────
function createInkblotTexture(width, height, params) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Dark wash background
  ctx.fillStyle = '#04040a';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;

  // Draw left half (will be mirrored)
  const halfW = width / 2;

  for (let pass = 0; pass < 3; pass++) {
    const seed = params.seed + pass * 137.0;
    const numBlobs = Math.floor(params.blobCount * (0.8 + hash(seed) * 0.4));

    for (let i = 0; i < numBlobs; i++) {
      const bx = hash(seed + i * 23.1) * halfW;
      const by = (hash(seed + i * 47.3) - 0.5) * height * 0.85;
      const br = params.blobSize * (0.3 + hash(seed + i * 71.9) * 1.4);

      drawBlob(ctx, bx, cy + by, br, params, seed + i);
    }
  }

  // Mirror left to right
  const leftData = ctx.getImageData(0, 0, halfW, height);
  const rightData = ctx.getImageData(halfW, 0, halfW, height);

  // Apply symmetry: blend left into right
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < halfW; x++) {
      const li = (y * halfW + x) * 4;
      const ri = (y * halfW + (halfW - 1 - x)) * 4;

      const blend = params.symmetry;

      rightData.data[ri]     = Math.min(255, rightData.data[ri]     * (1 - blend) + leftData.data[li]     * blend);
      rightData.data[ri + 1] = Math.min(255, rightData.data[ri + 1] * (1 - blend) + leftData.data[li + 1] * blend);
      rightData.data[ri + 2] = Math.min(255, rightData.data[ri + 2] * (1 - blend) + leftData.data[li + 2] * blend);
      rightData.data[ri + 3] = Math.min(255, rightData.data[ri + 3] * (1 - blend) + leftData.data[li + 3] * blend);
    }
  }

  ctx.putImageData(rightData, halfW, 0);

  // Edge darkening for depth
  const edgeGrad = ctx.createRadialGradient(cx, cy, height * 0.1, cx, cy, height * 0.7);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, width, height);

  return new THREE.CanvasTexture(canvas);
}

function drawBlob(ctx, x, y, radius, params, seed) {
  const steps = 64;
  ctx.beginPath();

  const inkR = params.inkColor[0];
  const inkG = params.inkColor[1];
  const inkB = params.inkColor[2];

  for (let s = 0; s <= steps; s++) {
    const angle = (s / steps) * Math.PI * 2;
    const noiseVal = fbm(x * 0.008 + Math.cos(angle) * 2.5, y * 0.008 + Math.sin(angle) * 2.5 + seed * 0.1, 5);
    const r = radius * (0.6 + noiseVal * 0.9);
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;

    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();

  // Ink gradient fill
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.3);
  grad.addColorStop(0, `rgba(${inkR},${inkG},${inkB},0.92)`);
  grad.addColorStop(0.5, `rgba(${inkR},${inkG},${inkB},0.6)`);
  grad.addColorStop(1, `rgba(${inkR},${inkG},${inkB},0)`);

  ctx.fillStyle = grad;
  ctx.fill();

  // Feathered edge
  ctx.strokeStyle = `rgba(${inkR},${inkG},${inkB},0.15)`;
  ctx.lineWidth = radius * 0.3;
  ctx.stroke();
}

// ─── Scene setup ─────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020204);
scene.fog = new THREE.FogExp2(0x020204, 0.08);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 10;

// ─── Inkblot mesh ─────────────────────────────────────────────────────────────
const params = {
  symmetry: 0.92,
  blobSize: 110,
  blobCount: 10,
  rotationSpeed: 0.18,
  inkColor: [8, 8, 30],
  seed: 42,
  regenerate: () => updateTexture(true),
};

let texWidth = 1024, texHeight = 1024;
let inkblotTexture = createInkblotTexture(texWidth, texHeight, params);

const inkblotGeo = new THREE.PlaneGeometry(3.2, 3.8, 1, 1);
const inkblotMat = new THREE.MeshStandardMaterial({
  map: inkblotTexture,
  transparent: true,
  roughness: 0.15,
  metalness: 0.05,
  side: THREE.DoubleSide,
});

const inkblot = new THREE.Mesh(inkblotGeo, inkblotMat);
scene.add(inkblot);
window.inkblot = inkblot;

function updateTexture(regen = false) {
  if (regen) {
    params.seed = Math.random() * 1000;
    inkblotTexture.dispose();
    inkblotTexture = createInkblotTexture(texWidth, texHeight, params);
    inkblotMat.map = inkblotTexture;
    inkblotMat.needsUpdate = true;
  }
}

// ─── Lighting ────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x111122, 0.4);
scene.add(ambientLight);

const spotlight = new THREE.SpotLight(0x8888cc, 3.5, 20, Math.PI / 5, 0.4, 1.5);
spotlight.position.set(0, 6, 4);
spotlight.target = inkblot;
scene.add(spotlight);
scene.add(spotlight.target);

const rimLight = new THREE.PointLight(0x334466, 1.2, 15);
rimLight.position.set(-4, 2, 3);
scene.add(rimLight);

const backLight = new THREE.PointLight(0x0a0a18, 2, 10);
backLight.position.set(0, -3, -2);
scene.add(backLight);

// ─── Particles ───────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 280;
const particleGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(PARTICLE_COUNT * 3);
const pVelocities = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  pPositions[i * 3]     = (Math.random() - 0.5) * 12;
  pPositions[i * 3 + 1]  = (Math.random() - 0.5) * 12;
  pPositions[i * 3 + 2]  = (Math.random() - 0.5) * 8;
  pVelocities.push({
    x: (Math.random() - 0.5) * 0.004,
    y: (Math.random() - 0.5) * 0.004 + 0.001,
    z: (Math.random() - 0.5) * 0.002,
    life: Math.random(),
  });
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

const particleMat = new THREE.PointsMaterial({
  color: 0x334466,
  size: 0.018,
  transparent: true,
  opacity: 0.55,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// ─── GUI ─────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: '🖤 Rorschach Controls' });
gui.add(params, 'symmetry', 0, 1, 0.01).name('Symmetry').onChange(() => updateTexture(false));
gui.add(params, 'blobSize', 20, 220, 1).name('Blob Size').onChange(() => updateTexture(false));
gui.add(params, 'blobCount', 2, 25, 1).name('Blob Count').onChange(() => updateTexture(false));
gui.add(params, 'rotationSpeed', 0, 1, 0.01).name('Rotation');
gui.addColor(params, 'inkColor').name('Ink Color').onChange(() => updateTexture(false));
gui.add(params, 'regenerate').name('🎲 New Inkblot');
gui.add({ exposure: 1.2 }, 'exposure', 0.2, 3, 0.05).name('Exposure').onChange(v => {
  renderer.toneMappingExposure = v;
});

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let lastTextureUpdate = 0;
const TEXTURE_UPDATE_INTERVAL = 80; // ms between texture regens for animation effect

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  const delta = clock.getDelta();

  // Floating + slow rotation
  inkblot.rotation.y = elapsed * params.rotationSpeed * 0.5;
  inkblot.rotation.x = Math.sin(elapsed * 0.15) * 0.06;
  inkblot.position.y = Math.sin(elapsed * 0.3) * 0.08;
  inkblot.position.z = Math.sin(elapsed * 0.2) * 0.04;

  // Spotlight subtle drift
  spotlight.position.x = Math.sin(elapsed * 0.4) * 1.5;
  spotlight.position.z = 4 + Math.cos(elapsed * 0.3) * 0.8;

  // Animate particles
  const pos = particleGeo.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const v = pVelocities[i];
    pos[i * 3]     += v.x;
    pos[i * 3 + 1] += v.y;
    pos[i * 3 + 2] += v.z;
    v.life += 0.002;

    if (v.life > 1 || Math.abs(pos[i * 3 + 1]) > 6) {
      pos[i * 3]     = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = -6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      v.life = 0;
    }
  }
  particleGeo.attributes.position.needsUpdate = true;

  // Periodic texture refresh for organic feel
  if (elapsed - lastTextureUpdate > TEXTURE_UPDATE_INTERVAL * 0.001) {
    updateTexture(false);
    lastTextureUpdate = elapsed;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();