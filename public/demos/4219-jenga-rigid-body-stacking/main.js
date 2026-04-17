import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// --- Constants ---
const BLOCK_W = 1.5;
const BLOCK_H = 0.5;
const BLOCK_D = 0.5;
const LAYER_GAP = 0.02;
const GRID_W = 3;
const GRID_D = 3;
const NUM_LAYERS = 9;
const TABLE_Y = 0;
const TABLE_THICKNESS = 0.3;
const TABLE_W = 12;
const TABLE_D = 10;

// Physics params
let GRAVITY = -15;
const LINEAR_DAMPING = 0.995;
const ANGULAR_DAMPING = 0.98;
let FRICTION = 0.6;
let RESTITUTION = 0.05;
const SUBSTEPS = 8;
const COLLISION_ITERATIONS = 3;

// --- Scene ---
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.03);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 10, 12);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 3, 0);
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.update();

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0x404060, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff0e0, 2.5);
dirLight.position.set(8, 15, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 15;
dirLight.shadow.camera.bottom = -5;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x4080ff, 0.6);
fillLight.position.set(-5, 5, -5);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xff8040, 1.2, 20);
rimLight.position.set(-3, 8, 6);
scene.add(rimLight);

// --- Materials ---
const woodMaterial = new THREE.MeshStandardMaterial({
  color: 0xc87832,
  roughness: 0.65,
  metalness: 0.02,
});

const darkWoodMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b4513,
  roughness: 0.7,
  metalness: 0.0,
});

const tableMaterial = new THREE.MeshStandardMaterial({
  color: 0x3d2b1f,
  roughness: 0.5,
  metalness: 0.05,
});

// --- Table ---
const tableTop = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_W, TABLE_THICKNESS, TABLE_D),
  tableMaterial
);
tableTop.position.y = TABLE_Y + TABLE_THICKNESS / 2;
tableTop.receiveShadow = true;
tableTop.castShadow = true;
scene.add(tableTop);

const tableLegGeo = new THREE.BoxGeometry(0.3, TABLE_Y + TABLE_THICKNESS / 2, 0.3);
const legPositions = [
  [-TABLE_W / 2 + 0.2, 0, -TABLE_D / 2 + 0.2],
  [TABLE_W / 2 - 0.2, 0, -TABLE_D / 2 + 0.2],
  [-TABLE_W / 2 + 0.2, 0, TABLE_D / 2 - 0.2],
  [TABLE_W / 2 - 0.2, 0, TABLE_D / 2 - 0.2],
];
legPositions.forEach(pos => {
  const leg = new THREE.Mesh(tableLegGeo, tableMaterial);
  leg.position.set(pos[0], pos[1], pos[2]);
  leg.castShadow = true;
  leg.receiveShadow = true;
  scene.add(leg);
});

// --- Block Physics Object ---
class Block {
  constructor(x, y, z, rotY = 0, isLong = true) {
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.rot = new THREE.Euler(0, rotY, 0, 'XYZ');
    this.angVel = new THREE.Vector3();
    this.isLong = isLong;

    // Compute half-extents based on rotation
    this._updateHalfExtents();

    // Mesh
    const geo = new THREE.BoxGeometry(
      this.hx * 2,
      this.hy * 2,
      this.hz * 2
    );
    // Slightly vary wood color per block for visual interest
    const hue = 0.08 + Math.random() * 0.04;
    const saturation = 0.6 + Math.random() * 0.1;
    const lightness = 0.45 + Math.random() * 0.1;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, saturation, lightness),
      roughness: 0.6 + Math.random() * 0.2,
      metalness: 0.01,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.block = this;
    this._syncMesh();
    scene.add(this.mesh);
  }

  _updateHalfExtents() {
    if (this.isLong) {
      this.hx = BLOCK_W / 2;
      this.hy = BLOCK_H / 2;
      this.hz = BLOCK_D / 2;
    } else {
      // Sideways block
      this.hx = BLOCK_D / 2;
      this.hy = BLOCK_H / 2;
      this.hz = BLOCK_W / 2;
    }
  }

  _syncMesh() {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.copy(this.rot);
  }

  getAABB() {
    // Use OBB (oriented bounding box) corners transformed to world
    const corners = [
      new THREE.Vector3(-this.hx, -this.hy, -this.hz),
      new THREE.Vector3(this.hx, -this.hy, -this.hz),
      new THREE.Vector3(-this.hx, this.hy, -this.hz),
      new THREE.Vector3(this.hx, this.hy, -this.hz),
      new THREE.Vector3(-this.hx, -this.hy, this.hz),
      new THREE.Vector3(this.hx, -this.hy, this.hz),
      new THREE.Vector3(-this.hx, this.hy, this.hz),
      new THREE.Vector3(this.hx, this.hy, this.hz),
    ];
    const mat4 = new THREE.Matrix4().makeRotationFromEuler(this.rot);
    return corners.map(c => c.applyMatrix4(mat4).add(this.pos));
  }

  getOBB() {
    return {
      pos: this.pos.clone(),
      rot: this.rot.clone(),
      hx: this.hx,
      hy: this.hy,
      hz: this.hz,
    };
  }

  // Get axis-aligned bounding box (world-space min/max)
  getAABBLabels() {
    const corners = this.getAABB();
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const c of corners) {
      if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y; if (c.y > maxY) maxY = c.y;
      if (c.z < minZ) minZ = c.z; if (c.z > maxZ) maxZ = c.z;
    }
    return { min: new THREE.Vector3(minX, minY, minZ), max: new THREE.Vector3(maxX, maxY, maxZ) };
  }

  applyGravity(dt) {
    this.vel.y += GRAVITY * dt;
  }

  integrate(dt) {
    this.vel.multiplyScalar(LINEAR_DAMPING);
    this.angVel.multiplyScalar(ANGULAR_DAMPING);

    this.pos.addScaledVector(this.vel, dt);
    this.rot.x += this.angVel.x * dt;
    this.rot.y += this.angVel.y * dt;
    this.rot.z += this.angVel.z * dt;
    this._syncMesh();
  }

  groundCollision() {
    const groundY = TABLE_Y + TABLE_THICKNESS + this.hy;
    if (this.pos.y < groundY) {
      this.pos.y = groundY;
      if (this.vel.y < 0) {
        this.vel.y *= -RESTITUTION;
        if (Math.abs(this.vel.y) < 0.1) this.vel.y = 0;
      }
      // Friction on ground
      this.vel.x *= (1 - FRICTION * 0.3);
      this.vel.z *= (1 - FRICTION * 0.3);
      this.angVel.x *= 0.9;
      this.angVel.z *= 0.9;
    }
  }

  remove() {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

// --- Collision Detection ---
function projectOBB(obb, axis) {
  const corners = [
    new THREE.Vector3(-obb.hx, -obb.hy, -obb.hz),
    new THREE.Vector3(obb.hx, -obb.hy, -obb.hz),
    new THREE.Vector3(-obb.hx, obb.hy, -obb.hz),
    new THREE.Vector3(obb.hx, obb.hy, -obb.hz),
    new THREE.Vector3(-obb.hx, -obb.hy, obb.hz),
    new THREE.Vector3(obb.hx, -obb.hy, obb.hz),
    new THREE.Vector3(-obb.hx, obb.hy, obb.hz),
    new THREE.Vector3(obb.hx, obb.hy, obb.hz),
  ];
  const mat = new THREE.Matrix4().makeRotationFromEuler(obb.rot);
  const world = corners.map(c => c.applyMatrix4(mat).add(obb.pos));
  let min = Infinity, max = -Infinity;
  for (const w of world) {
    const d = w.dot(axis);
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

function getOBBAxes(obb) {
  const axes = [];
  const mat = new THREE.Matrix4().makeRotationFromEuler(obb.rot);
  const xAxis = new THREE.Vector3(1, 0, 0).applyMatrix4(mat);
  const yAxis = new THREE.Vector3(0, 1, 0).applyMatrix4(mat);
  const zAxis = new THREE.Vector3(0, 0, 1).applyMatrix4(mat);
  axes.push(xAxis, yAxis, zAxis);
  return axes;
}

function obbOverlap(obb1, obb2) {
  const axes = [...getOBBAxes(obb1), ...getOBBAxes(obb2)];
  for (const axis of axes) {
    const p1 = projectOBB(obb1, axis);
    const p2 = projectOBB(obb2, axis);
    const overlap = Math.min(p1.max, p2.max) - Math.max(p1.min, p2.min);
    if (overlap <= 0) return false;
  }
  return true;
}

function obbPenetration(obb1, obb2) {
  const axes = [...getOBBAxes(obb1), ...getOBBAxes(obb2)];
  let minOverlap = Infinity;
  let minAxis = null;

  for (const axis of axes) {
    const p1 = projectOBB(obb1, axis);
    const p2 = projectOBB(obb2, axis);
    const overlap = Math.min(p1.max, p2.max) - Math.max(p1.min, p2.min);
    if (overlap <= 0) return { overlap: 0, axis: null };
    if (overlap < minOverlap) {
      minOverlap = overlap;
      minAxis = axis.clone();
    }
  }

  // Ensure axis points from obb2 to obb1
  const d = obb1.pos.clone().sub(obb2.pos);
  if (d.dot(minAxis) < 0) minAxis.negate();

  return { overlap: minOverlap, axis: minAxis };
}

function resolveCollision(blockA, blockB) {
  const obbA = blockA.getOBB();
  const obbB = blockB.getOBB();

  if (!obbOverlap(obbA, obbB)) return;

  const { overlap, axis } = obbPenetration(obbA, obbB);
  if (!axis) return;

  // Separate blocks
  const totalMass = 2;
  const ratioA = 1 / totalMass;
  const ratioB = 1 / totalMass;

  const separation = axis.clone().multiplyScalar(overlap * 0.5);
  blockA.pos.add(separation);
  blockB.pos.sub(separation);

  // Relative velocity along collision normal
  const relVel = blockA.vel.clone().sub(blockB.vel);
  const velAlongNormal = relVel.dot(axis);

  if (velAlongNormal < 0) {
    const impulseMag = -(1 + RESTITUTION) * velAlongNormal / (1 / totalMass + 1 / totalMass);
    const impulse = axis.clone().multiplyScalar(impulseMag * 0.5);
    blockA.vel.add(impulse);
    blockB.vel.sub(impulse);
  }

  // Friction
  const tangent = relVel.clone().sub(axis.clone().multiplyScalar(velAlongNormal));
  if (tangent.length() > 0.001) {
    tangent.normalize();
    const frictionImpulse = tangent.multiplyScalar(-velAlongNormal * FRICTION * 0.3);
    blockA.vel.add(frictionImpulse.clone().multiplyScalar(0.5));
    blockB.vel.sub(frictionImpulse.clone().multiplyScalar(0.5));
  }

  // Angular response
  blockA.angVel.y += (Math.random() - 0.5) * 0.2;
  blockB.angVel.y += (Math.random() - 0.5) * 0.2;
}

// --- Block Storage ---
let blocks = [];

function buildTower() {
  const startX = -(GRID_W - 1) * (BLOCK_W + LAYER_GAP) / 2;
  const startZ = -(GRID_D - 1) * (BLOCK_D + LAYER_GAP) / 2;

  for (let layer = 0; layer < NUM_LAYERS; layer++) {
    const y = TABLE_Y + TABLE_THICKNESS + BLOCK_H / 2 + layer * (BLOCK_H + LAYER_GAP);
    // Alternating orientation per layer
    const isLongAlongX = layer % 2 === 0;

    if (isLongAlongX) {
      // Long along X, 3 deep along Z
      for (let dz = 0; dz < GRID_D; dz++) {
        const z = startZ + dz * (BLOCK_D + LAYER_GAP);
        const block = new Block(0, y, z, 0, true);
        blocks.push(block);
      }
    } else {
      // Long along Z, 3 wide along X
      for (let dx = 0; dx < GRID_W; dx++) {
        const x = startX + dx * (BLOCK_W + LAYER_GAP);
        const block = new Block(x, y, 0, Math.PI / 2, true);
        blocks.push(block);
      }
    }
  }
}

function clearBlocks() {
  for (const b of blocks) {
    b.remove();
  }
  blocks = [];
}

function reset() {
  clearBlocks();
  buildTower();
}

// --- Raycasting for click ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const meshes = blocks.map(b => b.mesh);
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    const hit = intersects[0];
    const block = hit.object.userData.block;
    if (block) {
      // Apply a small outward impulse first
      const dir = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      block.vel.addScaledVector(dir, 0.5);
      block.angVel.addScaledVector(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ), 1.0);
      // Mark for removal after a tiny delay
      setTimeout(() => {
        const idx = blocks.indexOf(block);
        if (idx !== -1) {
          blocks.splice(idx, 1);
          block.remove();
        }
      }, 50);
    }
  }
});

// --- GUI ---
const gui = new GUI({ title: '🪵 Jenga Physics' });
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '10px';
gui.domElement.style.right = '10px';

const params = {
  gravity: GRAVITY,
  friction: FRICTION,
  restitution: RESTITUTION,
  reset: reset,
  substeps: SUBSTEPS,
};

gui.add(params, 'gravity', -30, 0, 0.5).name('Gravity').onChange(v => { GRAVITY = v; });
gui.add(params, 'friction', 0, 1, 0.05).name('Friction').onChange(v => { FRICTION = v; });
gui.add(params, 'restitution', 0, 1, 0.05).name('Bounciness').onChange(v => { RESTITUTION = v; });
gui.add(params, 'reset').name('🔄 Reset Tower');

// --- Physics Loop ---
let lastTime = performance.now();

function physicsStep(dt) {
  const clampedDt = Math.min(dt, 0.033); // cap at ~30fps physics
  const subDt = clampedDt / SUBSTEPS;

  for (let s = 0; s < SUBSTEPS; s++) {
    // Apply gravity
    for (const block of blocks) {
      block.applyGravity(subDt);
    }

    // Integrate motion
    for (const block of blocks) {
      block.integrate(subDt);
    }

    // Ground collision
    for (const block of blocks) {
      block.groundCollision();
    }

    // Block-to-block collisions
    for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          resolveCollision(blocks[i], blocks[j]);
        }
      }
    }
  }
}

// --- Render Loop ---
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (dt > 0 && dt < 0.1) {
    physicsStep(dt);
  }

  controls.update();
  renderer.render(scene, camera);
}

// --- Resize ---
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onResize);
onResize();

// --- Boot ---
buildTower();
animate();
