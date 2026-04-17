import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ── Perlin Noise ────────────────────────────────────────────────────────────
class Perlin {
  constructor(seed = 0) {
    this.p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(a, b, t) { return a + t * (b - a); }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  noise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = this.fade(x), v = this.fade(y), w = this.fade(z);
    const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;
    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z), u), v),
      this.lerp(
        this.lerp(this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }
}

// ── Scene Setup ─────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const fogColor = new THREE.Color(0xc2956a);
scene.background = fogColor;
scene.fog = new THREE.Fog(fogColor, 20, 150);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 25, 60);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 10;
controls.maxDistance = 200;

// ── Lights ───────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xd4a574, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffb347, 2.0);
sunLight.position.set(80, 120, 40);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 400;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xffe0b0, 0.4);
fillLight.position.set(-60, 40, -30);
scene.add(fillLight);

// ── Desert Ground ────────────────────────────────────────────────────────────
function generateDesertTexture(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base sand color
  ctx.fillStyle = '#c8a86e';
  ctx.fillRect(0, 0, size, size);

  // Add noise/ripples
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % size;
    const y = Math.floor((i / 4) / size);
    const ripple = Math.sin(x * 0.15) * Math.cos(y * 0.15) * 15;
    const noise = (Math.random() - 0.5) * 20;
    const v = 130 + ripple + noise;
    data[i]     = Math.min(255, Math.max(0, v + 20));
    data[i + 1] = Math.min(255, Math.max(0, v));
    data[i + 2] = Math.min(255, Math.max(0, v - 20));
  }
  ctx.putImageData(imageData, 0, 0);

  // Add darker dune patches
  for (let d = 0; d < 30; d++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const gr = Math.random() * 80 + 20;
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    grad.addColorStop(0, 'rgba(100, 70, 30, 0.15)');
    grad.addColorStop(1, 'rgba(100, 70, 30, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  }

  return new THREE.CanvasTexture(canvas);
}

const groundTex = generateDesertTexture(1024);
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(8, 8);

const groundGeo = new THREE.PlaneGeometry(300, 300);
const groundMat = new THREE.MeshStandardMaterial({
  map: groundTex,
  roughness: 0.95,
  metalness: 0.0,
  color: 0xb8956a
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Parameters ───────────────────────────────────────────────────────────────
const params = {
  particleCount: 50000,
  windStrength: 1.2,
  turbulence: 0.6,
  particleSize: 0.18,
  resetBounds: 80
};

// ── Particle System ────────────────────────────────────────────────────────────
const perlin = new Perlin(42);
const BOUNDS = params.resetBounds;
const HALF = BOUNDS / 2;

const particleGeo = new THREE.SphereGeometry(params.particleSize, 3, 3);
const particleMat = new THREE.MeshStandardMaterial({
  roughness: 0.7,
  metalness: 0.1
});

const mesh = new THREE.InstancedMesh(particleGeo, particleMat, params.particleCount);
mesh.castShadow = false;
mesh.receiveShadow = false;
scene.add(mesh);

const dummy = new THREE.Object3D();
const positions = new Float32Array(params.particleCount * 3);
const velocities = new Float32Array(params.particleCount * 3);
const basePositions = new Float32Array(params.particleCount * 3);

for (let i = 0; i < params.particleCount; i++) {
  const px = (Math.random() - 0.5) * BOUNDS;
  const py = Math.random() * 25 + 0.2;
  const pz = (Math.random() - 0.5) * BOUNDS;
  positions[i * 3]     = px;
  positions[i * 3 + 1] = py;
  positions[i * 3 + 2] = pz;
  basePositions[i * 3]     = px;
  basePositions[i * 3 + 1] = py;
  basePositions[i * 3 + 2] = pz;
  velocities[i * 3]     = 0;
  velocities[i * 3 + 1] = 0;
  velocities[i * 3 + 2] = 0;
}

// Color by velocity: tan (#d4b483) → gold (#ffd700)
const colorTan   = new THREE.Color(0xd4b483);
const colorGold  = new THREE.Color(0xffd700);
const colorArray = new Float32Array(params.particleCount * 3);
const tempColor  = new THREE.Color();

for (let i = 0; i < params.particleCount; i++) {
  tempColor.copy(colorTan);
  tempColor.toArray(colorArray, i * 3);
}

mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);

function updateParticles(time, dt) {
  const windX = Math.sin(time * 0.3) * params.windStrength;
  const windZ = Math.cos(time * 0.2) * params.windStrength;
  const turb  = params.turbulence;

  for (let i = 0; i < params.particleCount; i++) {
    const idx = i * 3;
    let px = positions[idx];
    let py = positions[idx + 1];
    let pz = positions[idx + 2];

    // Perlin flow field
    const scale = 0.04;
    const n1 = perlin.noise(px * scale, py * scale, time * 0.4) * turb;
    const n2 = perlin.noise(pz * scale + 100, py * scale, time * 0.3) * turb;
    const n3 = perlin.noise(px * scale, pz * scale + 200, time * 0.5) * turb;

    // Velocity integration
    velocities[idx]     += (windX + n1 * 4) * dt;
    velocities[idx + 1] += (n2 * 1.5 - 0.3) * dt;
    velocities[idx + 2] += (windZ + n3 * 4) * dt;

    // Damping
    velocities[idx]     *= 0.95;
    velocities[idx + 1] *= 0.90;
    velocities[idx + 2] *= 0.95;

    px += velocities[idx];
    py += velocities[idx + 1];
    pz += velocities[idx + 2];

    // Toroidal wrapping
    if (px >  HALF) px -= BOUNDS;
    if (px < -HALF) px += BOUNDS;
    if (pz >  HALF) pz -= BOUNDS;
    if (pz < -HALF) pz += BOUNDS;
    if (py < 0.1)   py = 0.1;
    if (py > 50)    py = Math.random() * 5 + 0.5;

    positions[idx]     = px;
    positions[idx + 1] = py;
    positions[idx + 2] = pz;

    // Set instance matrix
    dummy.position.set(px, py, pz);
    dummy.scale.setScalar(params.particleSize * (0.8 + Math.random() * 0.4));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Color by speed
    const speed = Math.sqrt(
      velocities[idx] ** 2 +
      velocities[idx + 1] ** 2 +
      velocities[idx + 2] ** 2
    );
    const t = Math.min(speed / 3.0, 1.0);
    tempColor.lerpColors(colorTan, colorGold, t);
    colorArray[idx]     = tempColor.r;
    colorArray[idx + 1] = tempColor.g;
    colorArray[idx + 2] = tempColor.b;
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
}

// ── Rebuild Particles ────────────────────────────────────────────────────────
function rebuildParticles() {
  const count = params.particleCount;
  mesh.count = count;

  positions.fill(0);
  velocities.fill(0);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * BOUNDS;
    positions[i * 3 + 1] = Math.random() * 25 + 0.2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS;
  }
}

mesh.count = params.particleCount;

// ── GUI ───────────────────────────────────────────────────────────────────────
const gui = new GUI();
gui.add(params, 'windStrength', 0.0, 4.0, 0.1).name('Wind Strength');
gui.add(params, 'turbulence', 0.0, 3.0, 0.1).name('Turbulence');
gui.add(params, 'particleSize', 0.05, 0.5, 0.05).name('Particle Size');
gui.close();

// ── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animation Loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  updateParticles(elapsed, dt);
  controls.update();
  renderer.render(scene, camera);
}

animate();