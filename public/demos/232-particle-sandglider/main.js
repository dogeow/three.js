import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_PARTICLES  = 24000;
const PARTICLE_RADIUS = 0.06;
const WORLD_W       = 40;
const WORLD_D       = 40;
const GROUND_Y      = -12;
const GRAVITY        = -18;
const DAMPING        = 0.985;
const RESTITUTION    = 0.45;     // bounce factor on ground
const WIND_DAMPING   = 0.92;     // horizontal velocity damping
const CELL_SIZE      = PARTICLE_RADIUS * 2.5;
const CELL_W         = Math.ceil(WORLD_W / CELL_SIZE);
const CELL_D         = Math.ceil(WORLD_D / CELL_SIZE);
const CELL_H         = Math.ceil(24   / CELL_SIZE); // height clearance
const POUR_RATE      = 120;       // particles per click pour burst

// ─── Arrays ──────────────────────────────────────────────────────────────────
// Positions & velocities stored in plain typed arrays for speed
const posX = new Float32Array(MAX_PARTICLES);
const posY = new Float32Array(MAX_PARTICLES);
const posZ = new Float32Array(MAX_PARTICLES);
const velX = new Float32Array(MAX_PARTICLES);
const velY = new Float32Array(MAX_PARTICLES);
const velZ = new Float32Array(MAX_PARTICLES);
const alive = new Uint8Array(MAX_PARTICLES);   // 0 = dead, 1 = alive

// ─── Particle slots ──────────────────────────────────────────────────────────
let nextSlot = 0;  // linear-scan hint for finding dead slots

function findDeadSlot() {
  const start = nextSlot;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const idx = (start + i) % MAX_PARTICLES;
    if (!alive[idx]) { nextSlot = idx; return idx; }
  }
  return -1; // full
}

// ─── Spatial Hash Grid ───────────────────────────────────────────────────────
// Each cell holds up to MAX_CELL particles; overflow is ignored (rare with CELL_SIZE tuning)
const MAX_CELL = 64;
const cellHead = new Int32Array(CELL_W * CELL_D * CELL_H).fill(-1);
const cellNext = new Int32Array(MAX_PARTICLES);

function cellIdx(cx, cy, cz) {
  return cx * CELL_D * CELL_H + cy * CELL_H + cz;
}

function hashPx(x, y, z) {
  const cx = Math.floor((x + WORLD_W / 2) / CELL_SIZE) | 0;
  const cy = Math.floor((y - GROUND_Y)    / CELL_SIZE) | 0;
  const cz = Math.floor((z + WORLD_D / 2) / CELL_SIZE) | 0;
  if (cx < 0 || cx >= CELL_W || cy < 0 || cy >= CELL_H || cz < 0 || cz >= CELL_D) return -1;
  return cellIdx(cx, cy, cz);
}

function gridClear() {
  cellHead.fill(-1);
}

function gridInsert(i, px, py, pz) {
  const c = hashPx(px, py, pz);
  if (c < 0) return;
  cellNext[i] = cellHead[c];
  cellHead[c] = i;
}

// ─── Pour particles ───────────────────────────────────────────────────────────
function pourSand(wx, wy, wz, count) {
  for (let k = 0; k < count; k++) {
    const i = findDeadSlot();
    if (i < 0) break;
    alive[i] = 1;
    // Slight random scatter at pour point
    const ang  = Math.random() * Math.PI * 2;
    const rad  = Math.random() * 0.4;
    posX[i] = wx + Math.cos(ang) * rad;
    posY[i] = wy + Math.random() * 0.3;
    posZ[i] = wz + Math.sin(ang) * rad;
    velX[i] = (Math.random() - 0.5) * 1.5;
    velY[i] = Math.random() * 1.0;
    velZ[i] = (Math.random() - 0.5) * 1.5;
  }
}

// ─── Seed initial pile ───────────────────────────────────────────────────────
function seedPile() {
  // A small mound in the center to get things started
  for (let z = -6; z <= 6; z++) {
    for (let x = -6; x <= 6; x++) {
      const r = Math.sqrt(x * x + z * z);
      if (r > 6) continue;
      const h = Math.ceil((6 - r) * 1.4);
      for (let y = 0; y < h; y++) {
        const i = findDeadSlot();
        if (i < 0) return;
        alive[i] = 1;
        posX[i] = x * PARTICLE_RADIUS * 2.05 + (Math.random() - 0.5) * 0.02;
        posY[i] = GROUND_Y + PARTICLE_RADIUS + y * PARTICLE_RADIUS * 2.05;
        posZ[i] = z * PARTICLE_RADIUS * 2.05 + (Math.random() - 0.5) * 0.02;
        velX[i] = (Math.random() - 0.5) * 0.1;
        velY[i] = 0;
        velZ[i] = (Math.random() - 0.5) * 0.1;
      }
    }
  }
}

// ─── Three.js Setup ──────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 8, 30);
camera.lookAt(0, -4, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, -4, 0);

// ─── Lighting ────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffeedd, 0.6));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.5);
sun.position.set(15, 30, 10);
scene.add(sun);
const fill = new THREE.PointLight(0x4080ff, 1.2, 60);
fill.position.set(-20, 10, -15);
scene.add(fill);

// ─── Ground plane ────────────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(WORLD_W * 1.4, WORLD_D * 1.4);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x1a1520,
  roughness: 0.85,
  metalness: 0.1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y - PARTICLE_RADIUS;
scene.add(ground);

// subtle grid lines on ground
const gridHelper = new THREE.GridHelper(WORLD_W * 1.2, 40, 0x2a2030, 0x1e1828);
gridHelper.position.y = GROUND_Y - PARTICLE_RADIUS + 0.01;
scene.add(gridHelper);

// ─── Particle Mesh ───────────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(PARTICLE_RADIUS, 7, 5);
const particleMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.55,
  metalness: 0.05,
});
const mesh = new THREE.InstancedMesh(sphereGeo, particleMat, MAX_PARTICLES);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mesh.count = 0;
scene.add(mesh);

// Color table for velocity mapping
const _col = new THREE.Color();

// ─── GUI ─────────────────────────────────────────────────────────────────────
const params = {
  windX: 0,
  windZ: 0,
  windStrength: 3.0,
  pourCount: 80,
};
const gui = new GUI({ title: 'Wind Controls', width: 220 });
gui.add(params, 'windStrength', 0, 12, 0.1).name('Wind Strength');
gui.add(params, 'windX', -1, 1, 0.01).name('Wind X');
gui.add(params, 'windZ', -1, 1, 0.01).name('Wind Z');
gui.add(params, 'pourCount', 20, 400, 1).name('Pour Count');

// ─── Input ────────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouseNDC  = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);
const _hit = new THREE.Vector3();

function onPointerDown(e) {
  if (e.button !== 0) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  if (raycaster.ray.intersectPlane(groundPlane, _hit)) {
    const hx = _hit.x, hy = _hit.y + 10, hz = _hit.z;
    pourSand(hx, hy, hz, params.pourCount);
  }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);

// ─── Simulation Update ────────────────────────────────────────────────────────
const _dummy = new THREE.Object3D();
const _colSlow = new THREE.Color(0xfff5cc); // slow: warm white / pale yellow
const _colMid  = new THREE.Color(0xffaa33); // mid: orange
const _colFast = new THREE.Color(0xff2200); // fast: red-orange

function lerpColor(a, b, t) {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

function velColor(speed) {
  const t = Math.min(speed / 14, 1);
  if (t < 0.5) {
    const s = t * 2;
    _col.r = lerpColor(_colSlow.r, _colMid.r, s);
    _col.g = lerpColor(_colSlow.g, _colMid.g, s);
    _col.b = lerpColor(_colSlow.b, _colMid.b, s);
  } else {
    const s = (t - 0.5) * 2;
    _col.r = lerpColor(_colMid.r, _colFast.r, s);
    _col.g = lerpColor(_colMid.g, _colFast.g, s);
    _col.b = lerpColor(_colMid.b, _colFast.b, s);
  }
  return _col;
}

let activeCount = 0;

function updatePhysics(dt) {
  const wx = params.windX * params.windStrength;
  const wz = params.windZ * params.windStrength;

  // Build spatial hash from alive particles
  gridClear();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!alive[i]) continue;
    gridInsert(i, posX[i], posY[i], posZ[i]);
  }

  // Integrate & resolve collisions
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!alive[i]) continue;

    // Gravity + wind
    velY[i] += GRAVITY * dt;
    velX[i] += wx * dt * 0.6;
    velZ[i] += wz * dt * 0.6;

    // Damping
    velX[i] *= DAMPING;
    velY[i] *= DAMPING;
    velZ[i] *= WIND_DAMPING;

    // Integrate
    posX[i] += velX[i] * dt;
    posY[i] += velY[i] * dt;
    posZ[i] += velZ[i] * dt;

    // ── Ground collision ──────────────────────────────────────────────────
    const bottom = GROUND_Y + PARTICLE_RADIUS;
    if (posY[i] < bottom) {
      posY[i] = bottom;
      if (velY[i] < 0) {
        velY[i] = -velY[i] * RESTITUTION;
        velX[i] *= 0.88;
        velZ[i] *= 0.88;
      }
      // Settle: kill tiny bounces
      if (Math.abs(velY[i]) < 0.15) velY[i] = 0;
    }

    // ── Particle-particle collision (grid hash) ───────────────────────────
    const cx = Math.floor((posX[i] + WORLD_W / 2) / CELL_SIZE) | 0;
    const cy = Math.floor((posY[i] - GROUND_Y)    / CELL_SIZE) | 0;
    const cz = Math.floor((posZ[i] + WORLD_D / 2) / CELL_SIZE) | 0;

    const minC = Math.max(cx - 1, 0), maxC = Math.min(cx + 1, CELL_W - 1);
    const minY = Math.max(cy - 1, 0), maxY = Math.min(cy + 1, CELL_H - 1);
    const minZ = Math.max(cz - 1, 0), maxZ = Math.min(cz + 1, CELL_D - 1);

    for (let gx = minC; gx <= maxC; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        for (let gz = minZ; gz <= maxZ; gz++) {
          let j = cellHead[cellIdx(gx, gy, gz)];
          while (j !== -1) {
            if (j !== i && alive[j]) {
              const dx = posX[i] - posX[j];
              const dy = posY[i] - posY[j];
              const dz = posZ[i] - posZ[j];
              const dist2 = dx * dx + dy * dy + dz * dz;
              const minDist = PARTICLE_RADIUS * 2;
              if (dist2 < minDist * minDist && dist2 > 1e-6) {
                const dist = Math.sqrt(dist2);
                const overlap = minDist - dist;
                const nx = dx / dist, ny = dy / dist, nz = dz / dist;
                // Push apart
                const push = overlap * 0.5;
                posX[i] += nx * push; posY[i] += ny * push; posZ[i] += nz * push;
                // Exchange velocity along normal (simplified elastic)
                const dvx = velX[i] - velX[j];
                const dvy = velY[i] - velY[j];
                const dvz = velZ[i] - velZ[j];
                const dot = dvx * nx + dvy * ny + dvz * nz;
                if (dot < 0) {
                  const imp = dot * 0.55;
                  velX[i] -= imp * nx; velY[i] -= imp * ny; velZ[i] -= imp * nz;
                }
              }
            }
            j = cellNext[j];
          }
        }
      }
    }

    // ── World bounds ───────────────────────────────────────────────────────
    if (posX[i] < -WORLD_W / 2 + PARTICLE_RADIUS)  { posX[i] = -WORLD_W / 2 + PARTICLE_RADIUS;  velX[i] = Math.abs(velX[i]) * 0.3; }
    if (posX[i] >  WORLD_W / 2 - PARTICLE_RADIUS)  { posX[i] =  WORLD_W / 2 - PARTICLE_RADIUS;  velX[i] = -Math.abs(velX[i]) * 0.3; }
    if (posZ[i] < -WORLD_D / 2 + PARTICLE_RADIUS)  { posZ[i] = -WORLD_D / 2 + PARTICLE_RADIUS;  velZ[i] = Math.abs(velZ[i]) * 0.3; }
    if (posZ[i] >  WORLD_D / 2 - PARTICLE_RADIUS)  { posZ[i] =  WORLD_D / 2 - PARTICLE_RADIUS;  velZ[i] = -Math.abs(velZ[i]) * 0.3; }
    if (posY[i] > 60) { alive[i] = 0; } // cull if shot way up
  }
}

// ─── Render Update ───────────────────────────────────────────────────────────
const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3(1, 1, 1);
let _frameCount = 0;

function updateMesh() {
  _frameCount++;
  // Only rebuild visible list every 2 frames to save sort cost
  let count = 0;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (alive[i]) count++;
  }
  activeCount = count;
  mesh.count = count;

  let instIdx = 0;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!alive[i]) continue;
    _pos.set(posX[i], posY[i], posZ[i]);
    _quat.identity();
    _scl.set(1, 1, 1);
    _mat.compose(_pos, _quat, _scl);
    mesh.setMatrixAt(instIdx, _mat);

    const speed = Math.sqrt(velX[i] * velX[i] + velY[i] * velY[i] + velZ[i] * velZ[i]);
    mesh.setColorAt(instIdx, velColor(speed));
    instIdx++;
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// ─── Main Loop ───────────────────────────────────────────────────────────────
seedPile();
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.033); // cap at 30fps equivalent
  lastTime  = now;

  controls.update();
  updatePhysics(dt);
  updateMesh();
  renderer.render(scene, camera);
}
animate();

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});