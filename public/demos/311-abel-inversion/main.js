import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ─── Scene Setup ───────────────────────────────────────────────────────────
const W = window.innerWidth, H = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(W, H);
renderer.setClearColor(0x0a0a14);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a14, 0.04);

const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
camera.position.set(0, 5, 22);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 2, 0);
controls.minDistance = 5;
controls.maxDistance = 60;

// ─── Lights ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x112233, 2));
const dirLight = new THREE.DirectionalLight(0x4466aa, 1.5);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);
const rimLight = new THREE.PointLight(0xff4400, 2, 30);
rimLight.position.set(-3, 5, -3);
scene.add(rimLight);

// ─── Floor Grid ─────────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(30, 30, 0x112233, 0x0d1a2a);
gridHelper.position.y = -0.01;
scene.add(gridHelper);

// ─── Parameters ─────────────────────────────────────────────────────────────
const params = {
  height: 8.0,
  radius: 3.0,
  intensity: 1.0,
  sliceY: 0.0,
  viewAngle: 0,
  flameTurbulence: 0.3,
  showProjection: true,
  showReconstruction: true,
  animationSpeed: 0.5,
};

// ─── Data Resolution ─────────────────────────────────────────────────────────
const N = 120; // radial points
const M = 200; // axial slices
const SLICES = 24; // angular views for projection

// ─── Compute Emission Profile f(r) ──────────────────────────────────────────
// Gaussian-like radial profile (emission intensity vs radius)
function emissionProfile(r, maxR, intensity, turb) {
  const nr = r / maxR;
  // Core + pedestal + noise
  const base = Math.exp(-nr * nr * 5.0) * 1.2
              + Math.exp(-nr * nr * 1.5) * 0.6
              + (1.0 - nr) * 0.15;
  const noise = (Math.sin(r * 12.0 + turb) * 0.05 + Math.sin(r * 7.3) * 0.03);
  return Math.max(0, (base + noise) * intensity);
}

// ─── Forward Abel Transform ──────────────────────────────────────────────────
// p(y) = line-integrated intensity at chord position y
function forwardAbel(f, r, maxR, y) {
  if (Math.abs(y) >= maxR) return 0;
  let sum = 0;
  const dr = maxR / N;
  for (let i = 0; i <= N; i++) {
    const ri = i * dr;
    if (ri < Math.abs(y)) continue;
    const sqrtTerm = Math.sqrt(ri * ri - y * y);
    if (sqrtTerm < 1e-9) continue;
    const fi = f(ri, maxR, 1.0, 0);
    sum += fi * ri / sqrtTerm * dr;
  }
  return sum * 2;
}

// ─── Abel Inversion (numerical) ──────────────────────────────────────────────
// f(r) ≈ -1/π · d/dy p(y) integrated
function inverseAbel(p, r, maxR) {
  if (r >= maxR) return 0;
  let sum = 0;
  const dy = maxR / M;
  const eps = 1e-6;

  for (let j = 0; j < M; j++) {
    const yj = -maxR + (j + 0.5) * dy;
    const yjp1 = yj + dy * 0.01;
    const pj = p(yj);
    const pj1 = p(yjp1);
    const dp = (pj1 - pj) / (dy * 0.01);

    if (Math.abs(yj) < r + eps) continue;
    const denom = Math.sqrt(Math.max(eps, yj * yj - r * r));
    sum += dp / denom * dy;
  }
  return Math.max(0, -sum / Math.PI);
}

// Precompute p(y) array
const pArray = new Float32Array(SLICES);
const yArray = new Float32Array(SLICES);
for (let i = 0; i < SLICES; i++) {
  yArray[i] = -params.radius + (i / (SLICES - 1)) * 2 * params.radius;
  pArray[i] = forwardAbel(emissionProfile, null, params.radius, yArray[i]);
}

// Reconstruct f(r) from all angles averaged
function reconstructedAt(r) {
  return inverseAbel(
    (y) => forwardAbel(emissionProfile, null, params.radius, y),
    r, params.radius
  );
}

// ─── Colormap (thermal) ──────────────────────────────────────────────────────
function thermalColor(t) {
  // t: 0 (cold) → 1 (hot)
  t = Math.max(0, Math.min(1, t));
  const stops = [
    [0.0, [10, 10, 40]],
    [0.2, [0, 20, 120]],
    [0.4, [0, 80, 180]],
    [0.55, [0, 180, 100]],
    [0.7, [200, 220, 0]],
    [0.85, [255, 120, 0]],
    [1.0, [255, 255, 220]],
  ];
  let i = 0;
  while (i < stops.length - 2 && stops[i + 1][0] <= t) i++;
  const [t0, c0] = stops[i];
  const [t1, c1] = stops[i + 1];
  const f = (t - t0) / (t1 - t0);
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
  return new THREE.Color(r / 255, g / 255, b / 255);
}

// ─── Plasma Volume (3D Cylinder) ────────────────────────────────────────────
const VOL_N = 64; // angular divisions
const VOL_M = 80; // height divisions
const VOL_R = 40; // radial divisions

function buildPlasmaMesh() {
  const geom = new THREE.CylinderGeometry(
    params.radius, params.radius, params.height,
    VOL_N, VOL_M, false
  );

  // Remap to native-like radial gradient
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const norms = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const r2d = Math.sqrt(x * x + z * z);
    const t = emissionProfile(r2d, params.radius, params.intensity, params.flameTurbulence * (y + params.height / 2) * 3);
    const col = thermalColor(t);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    shininess: 80,
    specular: new THREE.Color(0.3, 0.3, 0.4),
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = params.height / 2;
  return mesh;
}

let plasmaMesh = buildPlasmaMesh();
scene.add(plasmaMesh);

// Wireframe outline
const wireMat = new THREE.MeshBasicMaterial({ color: 0x224466, wireframe: true, transparent: true, opacity: 0.08 });
const wireMesh = new THREE.Mesh(plasmaMesh.geometry.clone(), wireMat);
wireMesh.position.copy(plasmaMesh.position);
scene.add(wireMesh);

// ─── Axis Cylinder (for reference) ──────────────────────────────────────────
const axisGeom = new THREE.CylinderGeometry(0.03, 0.03, params.height + 0.2, 8);
const axisMat = new THREE.MeshBasicMaterial({ color: 0x334455 });
const axisMesh = new THREE.Mesh(axisGeom, axisMat);
axisMesh.position.y = params.height / 2;
scene.add(axisMesh);

// ─── 2D Canvas Overlays ──────────────────────────────────────────────────────
function make2DCanvas(w, h) {
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  return cvs;
}

const CS = 220; // canvas size
const c2d1 = make2DCanvas(CS, CS); // projection slice
const c2d2 = make2DCanvas(CS, CS); // reconstructed profile
const c2d3 = make2DCanvas(CS, CS); // polar heatmap

const t1 = new THREE.CanvasTexture(c2d1);
const t2 = new THREE.CanvasTexture(c2d2);
const t3 = new THREE.CanvasTexture(c2d3);

function addOverlayPlane(texture, x, y, z, w, h) {
  const geom = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

// Projection view (side slice)
const slicePlane1 = addOverlayPlane(t1, 10, 5, 0, 10, 10);
slicePlane1.rotation.y = 0;

// Reconstruction view
const slicePlane2 = addOverlayPlane(t2, 10, 5, 0, 10, 10);
slicePlane2.rotation.y = Math.PI * 0.5;
slicePlane2.position.x = -10;

// Polar heatmap (top-down)
const polarPlane = addOverlayPlane(t3, 0, params.height + 0.2, 0, 12, 12);
polarPlane.rotation.x = -Math.PI / 2;

function drawCrossSection() {
  const ctx = c2d1.getContext('2d');
  const W = c2d1.width, H = c2d1.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const maxR = params.radius * 20;
  const scale = Math.min(W, H) / 2 / maxR * 0.9;

  // Background
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  // Draw radial profile
  for (let px = 0; px < W; px++) {
    const y2d = ((px / W) - 0.5) * 2 * maxR;
    const p = forwardAbel(emissionProfile, null, params.radius, y2d);
    const barH = Math.min(H * 0.45, p * params.intensity * 60);
    const col = thermalColor(Math.min(1, p * params.intensity));

    ctx.fillStyle = `rgb(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)})`;
    ctx.fillRect(px, cy - barH / 2, 1, barH);
  }

  // Axis line
  ctx.strokeStyle = '#223344';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#445566';
  ctx.font = '9px monospace';
  ctx.fillText('y = -R', 4, cy - 4);
  ctx.fillText('y = +R', W - 28, cy - 4);
  ctx.fillText('p(y) — 投影', 4, 12);

  t1.needsUpdate = true;
}

function drawReconstruction() {
  const ctx = c2d2.getContext('2d');
  const W = c2d2.width, H = c2d2.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const maxR = params.radius * 20;
  const scale = Math.min(W, H) / 2 / maxR * 0.9;

  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  // Draw reconstructed f(r)
  for (let px = 0; px < W; px++) {
    const r = Math.abs((px / W - 0.5) * 2 * maxR);
    const f = reconstructedAt(r) * params.intensity;
    const barH = Math.min(H * 0.45, f * 80);
    const col = thermalColor(Math.min(1, f));

    ctx.fillStyle = `rgb(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)})`;
    ctx.fillRect(px, cy - barH / 2, 1, barH);
  }

  ctx.strokeStyle = '#223344';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.stroke();

  ctx.fillStyle = '#445566';
  ctx.font = '9px monospace';
  ctx.fillText('r = 0', 4, cy - 4);
  ctx.fillText('r = R', W - 22, cy - 4);
  ctx.fillText('f(r) — 重建', 4, 12);

  t2.needsUpdate = true;
}

function drawPolarHeatmap() {
  const ctx = c2d3.getContext('2d');
  const W = c2d3.width, H = c2d3.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const maxR = params.radius;

  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  const imgData = ctx.createImageData(W, H);
  const maxPixelR = Math.min(W, H) / 2 - 4;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const dx = px - cx, dy = py - cy;
      const r2d = Math.sqrt(dx * dx + dy * dy);
      if (r2d > maxPixelR) continue;

      const theta = Math.atan2(dy, dx);
      const nr = r2d / maxPixelR * maxR;
      const f = emissionProfile(nr, maxR, params.intensity, params.flameTurbulence * 5);
      const col = thermalColor(Math.min(1, f));

      const idx = (py * W + px) * 4;
      imgData.data[idx] = Math.round(col.r * 255);
      imgData.data[idx + 1] = Math.round(col.g * 255);
      imgData.data[idx + 2] = Math.round(col.b * 255);
      imgData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Ring labels
  ctx.strokeStyle = '#223355';
  ctx.lineWidth = 0.5;
  for (let k = 1; k <= 3; k++) {
    ctx.beginPath();
    ctx.arc(cx, cy, maxPixelR * k / 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Axis cross
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.stroke();

  ctx.fillStyle = '#445566';
  ctx.font = '9px monospace';
  ctx.fillText('R', cx + maxPixelR - 8, cy - 4);
  ctx.fillText('0', cx + 2, cy - 4);
  ctx.fillText('极坐标热力图', 4, 12);

  t3.needsUpdate = true;
}

// ─── Slice Plane Visualization ───────────────────────────────────────────────
const SLICE_COUNT = 8;
const sliceGroup = new THREE.Group();
scene.add(sliceGroup);

function updateSlicePlanes() {
  while (sliceGroup.children.length) sliceGroup.remove(sliceGroup.children[0]);

  const h = params.height;
  const r = params.radius;

  for (let i = 0; i < SLICE_COUNT; i++) {
    const y = -h / 2 + (i / (SLICE_COUNT - 1)) * h;
    const geom = new THREE.RingGeometry(0.01, r, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.1 + i * 0.05, 0.8, 0.5),
      transparent: true, opacity: 0.12, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    sliceGroup.add(mesh);
  }
}
updateSlicePlanes();

// ─── Scan Line Effect ────────────────────────────────────────────────────────
// A vertical scan plane showing current viewing angle
let scanAngle = 0;
const scanGroup = new THREE.Group();
scene.add(scanGroup);

function updateScanPlane() {
  while (scanGroup.children.length) scanGroup.remove(scanGroup.children[0]);

  const geom = new THREE.PlaneGeometry(params.radius * 2, params.height + 1);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa22, transparent: true, opacity: 0.06,
    side: THREE.DoubleSide, depthWrite: false
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = params.height / 2;
  scanGroup.add(mesh);
}
updateScanPlane();

// ─── Particle System (plasma sparks) ────────────────────────────────────────
const PARTICLE_COUNT = 600;
const pPositions = new Float32Array(PARTICLE_COUNT * 3);
const pSpeeds = new Float32Array(PARTICLE_COUNT);
const pLife = new Float32Array(PARTICLE_COUNT);

function resetParticle(i) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * params.radius * 0.9;
  pPositions[i * 3] = Math.cos(angle) * r;
  pPositions[i * 3 + 1] = Math.random() * params.height;
  pPositions[i * 3 + 2] = Math.sin(angle) * r;
  pSpeeds[i] = 0.5 + Math.random() * 1.5;
  pLife[i] = Math.random();
}
for (let i = 0; i < PARTICLE_COUNT; i++) resetParticle(i);

const pGeom = new THREE.BufferGeometry();
pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const pMat = new THREE.PointsMaterial({
  color: 0xff8800, size: 0.06, transparent: true, opacity: 0.8,
  blending: THREE.AdditiveBlending, depthWrite: false
});
const particles = new THREE.Points(pGeom, pMat);
scene.add(particles);

// ─── GUI ─────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: '控制面板' });
gui.add(params, 'height', 1, 15, 0.1).name('高度 Height').onChange(rebuildPlasma);
gui.add(params, 'radius', 0.5, 6, 0.1).name('半径 Radius').onChange(rebuildPlasma);
gui.add(params, 'intensity', 0.1, 2, 0.01).name('强度 Intensity').onChange(() => {
  updatePlasmaColors();
  drawCrossSection();
  drawReconstruction();
  drawPolarHeatmap();
});
gui.add(params, 'flameTurbulence', 0, 1, 0.01).name('湍流 Turbulence').onChange(() => {
  updatePlasmaColors();
});
gui.add(params, 'animationSpeed', 0, 2, 0.05).name('动画速度 Anim Speed');
gui.add(params, 'showProjection').name('显示投影 Show Proj').onChange(v => {
  slicePlane1.visible = v;
});
gui.add(params, 'showReconstruction').name('显示重建 Show Recon').onChange(v => {
  slicePlane2.visible = v;
});

function rebuildPlasma() {
  scene.remove(plasmaMesh);
  scene.remove(wireMesh);
  plasmaMesh = buildPlasmaMesh();
  scene.remove(axisMesh);
  axisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, params.height + 0.2, 8),
    axisMat
  );
  axisMesh.position.y = params.height / 2;
  scene.add(plasmaMesh);
  scene.add(wireMesh);
  scene.add(axisMesh);
  wireMesh.geometry.dispose();
  wireMesh.geometry = plasmaMesh.geometry.clone();
  wireMesh.position.copy(plasmaMesh.position);

  updateSlicePlanes();
  updateScanPlane();
  polarPlane.position.y = params.height + 0.2;
  updatePlasmaColors();
  drawCrossSection();
  drawReconstruction();
  drawPolarHeatmap();
}

function updatePlasmaColors() {
  const colors = plasmaMesh.geometry.attributes.color;
  const pos = plasmaMesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r2d = Math.sqrt(x * x + z * z);
    const t = emissionProfile(r2d, params.radius, params.intensity, params.flameTurbulence * (y + params.height / 2) * 3);
    const col = thermalColor(t);
    colors.setXYZ(i, col.r, col.g, col.b);
  }
  colors.needsUpdate = true;
}

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animate ─────────────────────────────────────────────────────────────────
let lastTime = 0;
let frame = 0;

function animate(time) {
  requestAnimationFrame(animate);
  const dt = (time - lastTime) * 0.001;
  lastTime = time;
  frame++;

  // Rotate scan plane
  scanAngle += dt * params.animationSpeed * 0.4;
  scanGroup.rotation.y = scanAngle;

  // Animate particles
  if (frame % 2 === 0) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pPositions[i * 3 + 1] += pSpeeds[i] * dt * params.animationSpeed;
      if (pPositions[i * 3 + 1] > params.height) resetParticle(i);
    }
    pGeom.attributes.position.needsUpdate = true;
  }

  // Subtle plasma color flicker
  if (frame % 4 === 0) {
    updatePlasmaColors();
    drawCrossSection();
    drawReconstruction();
    drawPolarHeatmap();
  }

  // Rotate scan group
  scanGroup.rotation.y = scanAngle;

  controls.update();
  renderer.render(scene, camera);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
drawCrossSection();
drawReconstruction();
drawPolarHeatmap();
animate(0);

// Keyboard reset
window.addEventListener('keydown', e => {
  if (e.key === 'r' || e.key === 'R') {
    camera.position.set(0, 5, 22);
    controls.target.set(0, 2, 0);
    controls.update();
  }
});