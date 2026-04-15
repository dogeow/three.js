import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Vector Helpers ──────────────────────────────────────────────────────────
const v3 = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rnd = () => Math.random() * 2 - 1;

// ─── Config ───────────────────────────────────────────────────────────────────
const WORLD = 60;
const HALF  = WORLD / 2;

const params = {
  initialCreatures : 40,
  initialPredators : 4,
  initialFood      : 60,
  reproductionRate : 0.008,
  predatorCount    : 4,
  foodRegrowthSpeed: 0.03,
  creatureSpeed    : 6,
  predatorSpeed    : 7,
  wanderRate       : 0.4,
  separationDist   : 3.5,
  separationForce  : 2.0,
  alignmentForce   : 0.8,
  cohesionForce    : 0.6,
  starvationRate   : 0.003,
  reproductionEnergy: 60,
  maxCreatures     : 120,
  maxPredators     : 20,
  maxFood          : 100,
  foodValue        : 30,
};

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene    = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f0a);
scene.fog     = new THREE.FogExp2(0x0a0f0a, 0.012);

const camera   = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 500);
camera.position.set(0, 45, 55);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance   = 10;
controls.maxDistance   = 120;

// ─── Lights ───────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334422, 1.2));
const sun = new THREE.DirectionalLight(0xfff5cc, 1.4);
sun.position.set(20, 40, 20);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x223322, 0x111111, 0.8));

// ─── Ground Grid ───────────────────────────────────────────────────────────────
const grid = new THREE.GridHelper(WORLD, 30, 0x1a2f1a, 0x0d1f0d);
grid.material.opacity = 0.4;
grid.material.transparent = true;
scene.add(grid);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD, WORLD),
  new THREE.MeshLambertMaterial({ color: 0x060e06, transparent: true, opacity: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
scene.add(ground);

// ─── Creature Mesh Factory ────────────────────────────────────────────────────
function makeConeMesh(color, scale=0.8) {
  const group = new THREE.Group();
  const coneGeo  = new THREE.ConeGeometry(0.35 * scale, 1.0 * scale, 6);
  const coneMat  = new THREE.MeshLambertMaterial({ color });
  const cone     = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = 0.5 * scale;
  group.add(cone);

  // Eye dots for directionality
  const eyeGeo = new THREE.SphereGeometry(0.07 * scale, 4, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftEye  = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.12 * scale,  0.65 * scale, 0.22 * scale);
  rightEye.position.set( 0.12 * scale, 0.65 * scale, 0.22 * scale);
  group.add(leftEye, rightEye);

  return group;
}

function makePredatorMesh() {
  const group = makeConeMesh(0xef5350, 1.1);
  // Add a "spine" for predator look
  const spineGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4);
  const spineMat = new THREE.MeshLambertMaterial({ color: 0xb71c1c });
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.y = 0.5;
  spine.position.z = -0.2;
  spine.rotation.x = Math.PI / 3;
  group.add(spine);
  return group;
}

const creatureGeo = new THREE.SphereGeometry(0.5, 6, 4);
const creatureMat = new THREE.MeshLambertMaterial({ color: 0x4fc3f7 });

function makeCreature() {
  const mesh = new THREE.Mesh(creatureGeo, creatureMat.clone());
  mesh.position.y = 0.5;
  return mesh;
}

const predatorGeo = new THREE.SphereGeometry(0.7, 6, 4);
const predatorMat = new THREE.MeshLambertMaterial({ color: 0xef5350 });

function makePredator() {
  const mesh = new THREE.Mesh(predatorGeo, predatorMat.clone());
  mesh.position.y = 0.7;
  return mesh;
}

const foodGeo = new THREE.SphereGeometry(0.25, 6, 4);
const foodMat = new THREE.MeshLambertMaterial({ color: 0xa0d468 });

function makeFood() {
  const mesh = new THREE.Mesh(foodGeo, foodMat.clone());
  mesh.position.y = 0.25;
  return mesh;
}

// ─── Spatial Grid (for fast neighbor lookup) ──────────────────────────────────
const CELL = 6;
const COLS = Math.ceil(WORLD / CELL);

class SpatialGrid {
  constructor() {
    this.cells = new Map();
  }
  _key(x, z) {
    const cx = Math.floor((x + HALF) / CELL);
    const cz = Math.floor((z + HALF) / CELL);
    return `${cx},${cz}`;
  }
  clear() { this.cells.clear(); }
  insert(obj) {
    const k = this._key(obj.position.x, obj.position.z);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(obj);
  }
  query(x, z, radius) {
    const result = [];
    const cr = Math.ceil(radius / CELL);
    const cx0 = Math.floor((x + HALF) / CELL);
    const cz0 = Math.floor((z + HALF) / CELL);
    for (let dx = -cr; dx <= cr; dx++) {
      for (let dz = -cr; dz <= cr; dz++) {
        const cell = this.cells.get(`${cx0+dx},${cz0+dz}`);
        if (cell) for (const o of cell) result.push(o);
      }
    }
    return result;
  }
}

const gridSpatial = new SpatialGrid();

// ─── Steering Behaviors ───────────────────────────────────────────────────────
function steerSeek(pos, vel, target, maxSpeed) {
  const desired = v3().subVectors(target, pos);
  if (desired.length() < 0.001) return v3();
  desired.normalize().multiplyScalar(maxSpeed);
  const steer = v3().subVectors(desired, vel);
  const limit = 0.15;
  if (steer.length() > limit) steer.normalize().multiplyScalar(limit);
  return steer;
}

function steerFlee(pos, vel, threat, maxSpeed) {
  const desired = v3().subVectors(pos, threat);
  if (desired.length() < 0.001) return v3();
  desired.normalize().multiplyScalar(maxSpeed);
  const steer = v3().subVectors(desired, vel);
  const limit = 0.2;
  if (steer.length() > limit) steer.normalize().multiplyScalar(limit);
  return steer;
}

function steerWander(vel, wanderAngle, rate) {
  wanderAngle += rnd() * rate * 0.3;
  const circleDist = 2.0;
  const circleRadius = 1.2;
  const fwd = v3().copy(vel).normalize().multiplyScalar(circleDist);
  const offset = v3(Math.cos(wanderAngle) * circleRadius, 0, Math.sin(wanderAngle) * circleRadius);
  const target = v3().addVectors(fwd, offset);
  const desired = target.clone().normalize().multiplyScalar(vel.length());
  return v3().subVectors(desired, vel).multiplyScalar(0.08);
}

function steerSeparate(pos, vel, neighbors, dist, force) {
  let sx = 0, sz = 0;
  let count = 0;
  for (const n of neighbors) {
    if (n === this) continue;
    const dx = pos.x - n.position.x;
    const dz = pos.z - n.position.z;
    const d2 = dx*dx + dz*dz;
    if (d2 < dist*dist && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      sx += dx / d;
      sz += dz / d;
      count++;
    }
  }
  if (count === 0) return v3();
  sx /= count; sz /= count;
  const len = Math.sqrt(sx*sx+sz*sz);
  if (len > 0) { sx /= len; sz /= len; }
  return v3(sx, 0, sz).multiplyScalar(force * 0.1);
}

function steerAlign(vel, neighbors) {
  let ax = 0, az = 0, count = 0;
  for (const n of neighbors) {
    if (n === this) continue;
    ax += n.velocity.x;
    az += n.velocity.z;
    count++;
  }
  if (count === 0) return v3();
  const desired = v3(ax/count, 0, az/count).normalize().multiplyScalar(params.creatureSpeed);
  return v3().subVectors(desired, vel).multiplyScalar(0.06);
}

function steerCohere(pos, neighbors) {
  let cx = 0, cz = 0, count = 0;
  for (const n of neighbors) {
    if (n === this) continue;
    cx += n.position.x;
    cz += n.position.z;
    count++;
  }
  if (count === 0) return v3();
  return steerSeek(pos, this.velocity, v3(cx/count, 0.5, cz/count), params.creatureSpeed * 0.8);
}

// ─── Creature ─────────────────────────────────────────────────────────────────
class Creature {
  constructor(x, z) {
    this.position = v3(x, 0.5, z);
    this.velocity = v3(rnd(), 0, rnd()).normalize().multiplyScalar(params.creatureSpeed * 0.5);
    this.acceleration = v3();
    this.energy = 50 + Math.random() * 20;
    this.maxEnergy = 100;
    this.age = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.mesh = makeCreature();
    scene.add(this.mesh);
  }

  update(dt, foods, creatures, predators) {
    const neighbors = creatures.filter(c => c !== this);
    const nearby = gridSpatial.query(this.position.x, this.position.z, 8).filter(o => o !== this);

    // Find nearest food
    let nearestFood = null, nearestFoodDist = Infinity;
    for (const f of foods) {
      if (!f.active) continue;
      const d = this.position.distanceTo(f.position);
      if (d < nearestFoodDist) { nearestFoodDist = d; nearestFood = f; }
    }

    // Find nearest predator
    let nearestPred = null, nearestPredDist = Infinity;
    for (const p of predators) {
      const d = this.position.distanceTo(p.position);
      if (d < nearestPredDist) { nearestPredDist = d; nearestPred = p; }
    }

    this.acceleration.set(0, 0, 0);

    // Flee predator
    if (nearestPred && nearestPredDist < 12) {
      const flee = steerFlee(this.position, this.velocity, nearestPred.position, params.creatureSpeed);
      flee.multiplyScalar(3.0);
      this.acceleration.add(flee);
    }
    // Seek food
    else if (nearestFood && nearestFoodDist < 20) {
      const seek = steerSeek(this.position, this.velocity, nearestFood.position, params.creatureSpeed);
      this.acceleration.add(seek);
    }
    // Wander
    else {
      const wander = steerWander(this.velocity, this.wanderAngle, params.wanderRate);
      this.acceleration.add(wander);
      this.wanderAngle += rnd() * 0.05;
    }

    // Separation
    const sep = steerSeparate.call(this, this.position, this.velocity, nearby, params.separationDist, params.separationForce);
    this.acceleration.add(sep);

    // Alignment
    const align = steerAlign.call(this, this.velocity, neighbors);
    this.acceleration.add(align);

    // Cohesion
    const cohere = steerCohere.call(this, this.position, neighbors);
    this.acceleration.add(cohere);

    // Update velocity & position
    this.velocity.add(this.acceleration.clone().multiplyScalar(dt * 10));
    const speed = this.velocity.length();
    if (speed > params.creatureSpeed) {
      this.velocity.normalize().multiplyScalar(params.creatureSpeed);
    }
    if (speed < 0.5) {
      this.velocity.normalize().multiplyScalar(0.5);
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Wrap world
    if (this.position.x >  HALF) this.position.x -= WORLD;
    if (this.position.x < -HALF) this.position.x += WORLD;
    if (this.position.z >  HALF) this.position.z -= WORLD;
    if (this.position.z < -HALF) this.position.z += WORLD;

    // Eat food
    if (nearestFood && nearestFoodDist < 1.2) {
      nearestFood.active = false;
      nearestFood.mesh.visible = false;
      this.energy = Math.min(this.maxEnergy, this.energy + params.foodValue);
    }

    // Energy drain
    this.energy -= params.starvationRate * 60 * dt;
    this.age += dt;

    // Color shift by energy
    const t = this.energy / this.maxEnergy;
    this.mesh.material.color.setHSL(0.55 + t * 0.1, 0.7, 0.3 + t * 0.3);

    // Orient mesh
    this.mesh.position.copy(this.position);
    if (this.velocity.length() > 0.1) {
      const angle = Math.atan2(this.velocity.x, this.velocity.z);
      this.mesh.rotation.y = angle;
    }
  }

  alive() { return this.energy > 0; }
  canReproduce() { return this.energy > params.reproductionEnergy && creatures.length < params.maxCreatures; }
}

// ─── Predator ─────────────────────────────────────────────────────────────────
class Predator {
  constructor(x, z) {
    this.position = v3(x || rnd() * WORLD - HALF, 0.7, z || rnd() * WORLD - HALF);
    this.velocity = v3(rnd(), 0, rnd()).normalize().multiplyScalar(params.predatorSpeed * 0.5);
    this.acceleration = v3();
    this.energy = 80 + Math.random() * 30;
    this.maxEnergy = 150;
    this.age = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.mesh = makePredator();
    scene.add(this.mesh);
  }

  update(dt, creatures) {
    // Find nearest creature
    let nearest = null, nearestDist = Infinity;
    for (const c of creatures) {
      if (!c.alive()) continue;
      const d = this.position.distanceTo(c.position);
      if (d < nearestDist) { nearestDist = d; nearest = c; }
    }

    this.acceleration.set(0, 0, 0);

    if (nearest && nearestDist < 18) {
      const seek = steerSeek(this.position, this.velocity, nearest.position, params.predatorSpeed);
      seek.multiplyScalar(2.5);
      this.acceleration.add(seek);

      // Catch creature
      if (nearestDist < 1.5) {
        const idx = creatures.indexOf(nearest);
        if (idx !== -1) {
          creatures.splice(idx, 1);
          scene.remove(nearest.mesh);
          this.energy = Math.min(this.maxEnergy, this.energy + 50);
        }
      }
    } else {
      const wander = steerWander(this.velocity, this.wanderAngle, 0.6);
      this.acceleration.add(wander);
      this.wanderAngle += rnd() * 0.08;
    }

    this.velocity.add(this.acceleration.clone().multiplyScalar(dt * 10));
    const speed = this.velocity.length();
    if (speed > params.predatorSpeed) this.velocity.normalize().multiplyScalar(params.predatorSpeed);
    if (speed < 0.4) this.velocity.normalize().multiplyScalar(0.4);

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    if (this.position.x >  HALF) this.position.x -= WORLD;
    if (this.position.x < -HALF) this.position.x += WORLD;
    if (this.position.z >  HALF) this.position.z -= WORLD;
    if (this.position.z < -HALF) this.position.z += WORLD;

    this.energy -= params.starvationRate * 80 * dt;
    this.age += dt;

    const t = this.energy / this.maxEnergy;
    this.mesh.material.color.setHSL(0.0 + t * 0.05, 0.7, 0.3 + t * 0.3);

    this.mesh.position.copy(this.position);
    if (this.velocity.length() > 0.1) {
      const angle = Math.atan2(this.velocity.x, this.velocity.z);
      this.mesh.rotation.y = angle;
    }
  }

  alive() { return this.energy > 0; }
}

// ─── Food ─────────────────────────────────────────────────────────────────────
class Food {
  constructor(x, z) {
    this.position = v3(x, 0.25, z);
    this.active = true;
    this.regenTimer = 0;
    this.mesh = makeFood();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  update(dt) {
    if (!this.active) {
      this.regenTimer += dt * params.foodRegrowthSpeed;
      if (this.regenTimer >= 1.0) {
        this.active = true;
        this.mesh.visible = true;
        this.regenTimer = 0;
      }
    }
  }
}

// ─── Population History Graph ─────────────────────────────────────────────────
const graphCanvas = document.getElementById('graph-canvas');
const gCtx = graphCanvas.getContext('2d');
const historyLen = 120;
const popHistory = [];

function updateGraph() {
  const alive = creatures.length;
  const aliveP = predators.length;
  const aliveF = foods.filter(f => f.active).length;
  popHistory.push({ prey: alive, pred: aliveP, food: aliveF });
  if (popHistory.length > historyLen) popHistory.shift();

  const W = graphCanvas.width, H = graphCanvas.height;
  gCtx.clearRect(0, 0, W, H);
  gCtx.fillStyle = 'rgba(0,0,0,0)';
  gCtx.fillRect(0, 0, W, H);

  const maxVal = Math.max(params.maxCreatures, params.maxPredators * 5, params.maxFood, 20);

  function drawLine(key, color) {
    gCtx.beginPath();
    gCtx.strokeStyle = color;
    gCtx.lineWidth = 1.5;
    for (let i = 0; i < popHistory.length; i++) {
      const x = i * W / (historyLen - 1);
      const y = H - (popHistory[i][key] / maxVal) * H;
      i === 0 ? gCtx.moveTo(x, y) : gCtx.lineTo(x, y);
    }
    gCtx.stroke();
  }

  drawLine('prey', '#4fc3f7');
  drawLine('pred', '#ef5350');
  drawLine('food', '#a0d468');

  // Axis
  gCtx.strokeStyle = '#2a3f2a';
  gCtx.lineWidth = 0.5;
  for (let i = 0; i <= 3; i++) {
    const y = H - i * H / 3;
    gCtx.beginPath(); gCtx.moveTo(0, y); gCtx.lineTo(W, y); gCtx.stroke();
  }
}

// ─── Initialize ────────────────────────────────────────────────────────────────
const creatures = [];
const predators = [];
const foods     = [];

function spawnCreature() {
  const c = new Creature(rnd() * WORLD - HALF, rnd() * WORLD - HALF);
  creatures.push(c);
}

function spawnPredator() {
  const p = new Predator();
  predators.push(p);
}

function spawnFood(x, z) {
  foods.push(new Food(
    x !== undefined ? x : rnd() * WORLD - HALF,
    z !== undefined ? z : rnd() * WORLD - HALF
  ));
}

for (let i = 0; i < params.initialCreatures; i++) spawnCreature();
for (let i = 0; i < params.initialPredators; i++) spawnPredator();
for (let i = 0; i < params.initialFood; i++) spawnFood();

// ─── GUI ───────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: '🌿 Ecosystem Params' });
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '10px';
gui.domElement.style.left = '10px';

const simFolder = gui.addFolder('Simulation');
simFolder.add(params, 'initialCreatures', 10, 100, 1).name('Initial Creatures').onChange(v => {
  while (creatures.length < v) spawnCreature();
});
simFolder.add(params, 'initialPredators', 1, 15, 1).name('Predator Count').onChange(v => {
  while (predators.length < v) spawnPredator();
});
simFolder.add(params, 'reproductionRate', 0.001, 0.05, 0.001).name('Reproduction Rate');
simFolder.add(params, 'foodRegrowthSpeed', 0.01, 0.1, 0.005).name('Food Regrowth');
simFolder.open();

const behFolder = gui.addFolder('Behaviors');
behFolder.add(params, 'creatureSpeed', 2, 15, 0.5).name('Creature Speed');
behFolder.add(params, 'predatorSpeed', 2, 15, 0.5).name('Predator Speed');
behFolder.add(params, 'separationDist', 1, 10, 0.5).name('Separation Dist');
behFolder.add(params, 'separationForce', 0.1, 5, 0.1).name('Separation Force');
behFolder.open();

const ecoFolder = gui.addFolder('Ecology');
ecoFolder.add(params, 'starvationRate', 0.0005, 0.02, 0.0005).name('Starvation Rate');
ecoFolder.add(params, 'reproductionEnergy', 20, 100, 5).name('Reproduction Energy');
ecoFolder.add(params, 'foodValue', 10, 60, 5).name('Food Value');
ecoFolder.add(params, 'maxCreatures', 20, 200, 10).name('Max Creatures');
ecoFolder.add(params, 'maxFood', 20, 200, 10).name('Max Food');
ecoFolder.open();

// ─── Animation ────────────────────────────────────────────────────────────────
let generation = 0;
const clock = new THREE.Clock();
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  frameCount++;

  // Rebuild spatial grid
  gridSpatial.clear();
  creatures.forEach(c => { if (c.alive()) gridSpatial.insert(c); });

  // Update creatures
  for (let i = creatures.length - 1; i >= 0; i--) {
    const c = creatures[i];
    c.update(dt, foods, creatures, predators);
    if (!c.alive()) {
      scene.remove(c.mesh);
      creatures.splice(i, 1);
    }
  }

  // Reproduction
  for (const c of creatures) {
    if (c.canReproduce() && Math.random() < params.reproductionRate * 60 * dt) {
      c.energy *= 0.5;
      const offspring = new Creature(
        c.position.x + rnd() * 2,
        c.position.z + rnd() * 2
      );
      offspring.energy = c.energy * 0.4;
      creatures.push(offspring);
      generation++;
    }
  }

  // Update predators
  for (let i = predators.length - 1; i >= 0; i--) {
    const p = predators[i];
    p.update(dt, creatures);
    if (!p.alive()) {
      scene.remove(p.mesh);
      predators.splice(i, 1);
    }
  }

  // Respawn predators to target count
  while (predators.length < params.predatorCount) {
    spawnPredator();
  }

  // Update food
  for (const f of foods) f.update(dt);

  // Maintain food count
  const activeFood = foods.filter(f => f.active).length;
  while (foods.length < params.maxFood && activeFood < params.initialFood * 0.5) {
    spawnFood();
  }

  // Graph every 10 frames
  if (frameCount % 10 === 0) {
    updateGraph();
    document.getElementById('creature-count').textContent = creatures.length;
    document.getElementById('predator-count').textContent = predators.length;
    document.getElementById('food-count').textContent = foods.filter(f=>f.active).length;
    document.getElementById('generation').textContent = generation;
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

// ─── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});