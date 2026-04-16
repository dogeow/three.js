// {title: "Particle Filter Robot Localization — Monte Carlo Localization Visualization"}

// Three.js Particle Filter Robot Localization Visualization
// Uses Monte Carlo Localization (MCL) with particle filtering

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
// CONFIGURATION
// ============================================================

const PARTICLE_COUNT = 300;
const ARENA_SIZE = 20;
const WALL_HEIGHT = 1.5;
const ROBOT_RADIUS = 0.4;
const SENSOR_RANGE = 6;
const SENSOR_FOV = Math.PI * 0.7;
const SENSOR_RAYS = 9;

// Colors
const COLORS = {
  floor: 0x1a1a2e,
  wall: 0x16213e,
  wallEdge: 0x0f3460,
  robot: 0x00d4ff,
  robotGlow: 0x00d4ff,
  sensorBeam: 0xff6b35,
  highWeight: 0x00ff88,
  lowWeight: 0xff3366,
  particle: 0x44ffaa,
};

// Floor plan: array of wall rectangles [x, z, width, height]
const WALLS = [
  // Outer boundary
  [-ARENA_SIZE / 2, 0, 0.3, ARENA_SIZE],
  [ARENA_SIZE / 2, 0, 0.3, ARENA_SIZE],
  [0, -ARENA_SIZE / 2, ARENA_SIZE, 0.3],
  [0, ARENA_SIZE / 2, ARENA_SIZE, 0.3],
  // Inner obstacles
  [-4, -4, 3, 0.3],
  [-4, -4, 0.3, 3],
  [4, 4, 3, 0.3],
  [4, 4, 0.3, 3],
  [-6, 3, 0.3, 4],
  [6, -3, 0.3, 4],
  [0, 0, 4, 0.3],
  [0, 0, 0.3, 4],
  [-3, -7, 4, 0.3],
  [3, 7, 4, 0.3],
];

// ============================================================
// GLOBALS
// ============================================================

let scene, camera, renderer, controls;
let particles = [];
let particleWeights = [];
let particleGeometry, particleMesh;
let robot, robotGroup;
let sensorLines = [];
let autoMode = true;
let autoTimer = 0;
let robotPose = { x: 0, y: 0, theta: 0 };

const statsEl = document.getElementById('stats');
const controlsEl = document.getElementById('controls');

// ============================================================
// PARTICLE CLASS
// ============================================================

class Particle {
  constructor(x, y, theta, weight) {
    this.x = x;
    this.y = y;
    this.theta = theta;
    this.weight = weight;
  }

  clone() {
    return new Particle(this.x, this.y, this.theta, this.weight);
  }
}

// ============================================================
// SCENE SETUP
// ============================================================

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a14);
  scene.fog = new THREE.FogExp2(0x0a0a14, 0.02);

  // Camera (isometric-ish top-down)
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 22, 14);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.minDistance = 8;
  controls.maxDistance = 40;
  controls.target.set(0, 0, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 60;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.top = 25;
  dirLight.shadow.camera.bottom = -25;
  scene.add(dirLight);

  const fillLight = new THREE.PointLight(0x4060ff, 0.5, 30);
  fillLight.position.set(-10, 10, -10);
  scene.add(fillLight);

  createFloor();
  createWalls();
  createRobot();
  initParticles();
  createSensorRays();

  // UI Controls
  createUI();

  window.addEventListener('resize', onResize);
  animate();
}

// ============================================================
// FLOOR & WALLS
// ============================================================

function createFloor() {
  const floorGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
  const floorMat = new THREE.MeshStandardMaterial({
    color: COLORS.floor,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Grid helper
  const grid = new THREE.GridHelper(ARENA_SIZE, 40, 0x222244, 0x111122);
  grid.position.y = 0.01;
  scene.add(grid);
}

function createWalls() {
  const wallMat = new THREE.MeshStandardMaterial({
    color: COLORS.wall,
    roughness: 0.7,
    metalness: 0.2,
  });

  WALLS.forEach(([x, z, w, h]) => {
    const width = Math.abs(w) || 0.3;
    const depth = Math.abs(h) || 0.3;
    const geo = new THREE.BoxGeometry(width, WALL_HEIGHT, depth);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, WALL_HEIGHT / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Edge glow
    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: COLORS.wallEdge, linewidth: 1 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.copy(mesh.position);
    scene.add(edges);
  });
}

// ============================================================
// ROBOT
// ============================================================

function createRobot() {
  robotGroup = new THREE.Group();

  // Body cylinder
  const bodyGeo = new THREE.CylinderGeometry(ROBOT_RADIUS, ROBOT_RADIUS * 1.1, 0.5, 24);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: COLORS.robot,
    roughness: 0.3,
    metalness: 0.7,
    emissive: COLORS.robot,
    emissiveIntensity: 0.2,
  });
  robot = new THREE.Mesh(bodyGeo, bodyMat);
  robot.castShadow = true;
  robotGroup.add(robot);

  // Direction indicator (arrow)
  const arrowGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.position.set(0, 0.25, -ROBOT_RADIUS * 0.7);
  arrow.rotation.x = Math.PI / 2;
  robotGroup.add(arrow);

  // Sensor ring
  const ringGeo = new THREE.TorusGeometry(ROBOT_RADIUS * 1.2, 0.05, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({ color: COLORS.sensorBeam, emissive: COLORS.sensorBeam, emissiveIntensity: 0.8 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  robotGroup.add(ring);

  robotGroup.position.y = 0.25;
  scene.add(robotGroup);
}

// ============================================================
// PARTICLES
// ============================================================

function initParticles() {
  // Initialize particles uniformly random across the arena
  particles = [];
  particleWeights = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = (Math.random() - 0.5) * (ARENA_SIZE - 2);
    const y = (Math.random() - 0.5) * (ARENA_SIZE - 2);
    const theta = Math.random() * Math.PI * 2;
    const weight = 1 / PARTICLE_COUNT;
    particles.push(new Particle(x, y, theta, weight));
    particleWeights[i] = weight;
  }

  // Create particle geometry
  particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleMat = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
  });

  particleMesh = new THREE.Points(particleGeometry, particleMat);
  particleMesh.position.y = 0.1;
  scene.add(particleMesh);

  updateParticleVisuals();
}

function updateParticleVisuals() {
  const positions = particleGeometry.attributes.position.array;
  const colors = particleGeometry.attributes.color.array;

  const lowColor = new THREE.Color(COLORS.lowWeight);
  const highColor = new THREE.Color(COLORS.highWeight);
  const maxWeight = Math.max(...particleWeights) || 1;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = p.y;

    const t = p.weight / maxWeight;
    const c = lowColor.clone().lerp(highColor, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
}

// ============================================================
// SENSOR RAYS
// ============================================================

function createSensorRays() {
  sensorLines = [];
  const lineMat = new THREE.LineBasicMaterial({
    color: COLORS.sensorBeam,
    transparent: true,
    opacity: 0.6,
  });

  for (let i = 0; i < SENSOR_RAYS; i++) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(geo, lineMat);
    line.position.y = 0.3;
    scene.add(line);
    sensorLines.push(line);
  }
}

function castRay(ox, oy, angle) {
  let minDist = SENSOR_RANGE;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  for (const [wx, wz, ww, wh] of WALLS) {
    const hw = (Math.abs(ww) || 0.3) / 2;
    const hd = (Math.abs(wh) || 0.3) / 2;
    const wallX = wx - hw;
    const wallZ = wz - hd;
    const wallW = Math.abs(ww) || 0.3;
    const wallH = Math.abs(wh) || 0.3;

    // Ray-box intersection
    let tmin = -Infinity, tmax = Infinity;
    let pmin, pmax;

    if (dx !== 0) {
      const tx1 = (wallX - ox) / dx;
      const tx2 = (wallX + wallW - ox) / dx;
      pmin = Math.min(tx1, tx2); pmax = Math.max(tx1, tx2);
      tmin = Math.max(tmin, pmin); tmax = Math.min(tmax, pmax);
    } else if (ox < wallX || ox > wallX + wallW) {
      continue;
    }

    if (dy !== 0) {
      const ty1 = (wallZ - oy) / dy;
      const ty2 = (wallZ + wallH - oy) / dy;
      pmin = Math.min(ty1, ty2); pmax = Math.max(ty1, ty2);
      tmin = Math.max(tmin, pmin); tmax = Math.min(tmax, pmax);
    } else if (oy < wallZ || oy > wallZ + wallH) {
      continue;
    }

    if (tmin <= tmax && tmin > 0 && tmin < minDist) {
      minDist = tmin;
    }
  }

  return minDist;
}

function updateSensorReadings() {
  const rayStep = SENSOR_FOV / (SENSOR_RAYS - 1);
  const startAngle = robotPose.theta - SENSOR_FOV / 2;

  for (let i = 0; i < SENSOR_RAYS; i++) {
    const angle = startAngle + i * rayStep;
    const dist = castRay(robotPose.x, robotPose.y, angle);

    const positions = sensorLines[i].geometry.attributes.position.array;
    positions[0] = robotPose.x;
    positions[1] = 0;
    positions[2] = robotPose.y;
    positions[3] = robotPose.x + Math.cos(angle) * dist;
    positions[4] = 0;
    positions[5] = robotPose.y + Math.sin(angle) * dist;
    sensorLines[i].geometry.attributes.position.needsUpdate = true;
  }
}

// ============================================================
// PARTICLE FILTER / MCL
// ============================================================

function motionUpdate(dx, dturn) {
  // Apply odometry to particles (with noise)
  const noise = 0.1;
  for (const p of particles) {
    p.x += dx * Math.cos(p.theta) + (Math.random() - 0.5) * noise;
    p.y += dx * Math.sin(p.theta) + (Math.random() - 0.5) * noise;
    p.theta += dturn + (Math.random() - 0.5) * noise * 0.5;
    p.theta = ((p.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Clamp to arena
    p.x = Math.max(-ARENA_SIZE / 2 + 0.5, Math.min(ARENA_SIZE / 2 - 0.5, p.x));
    p.y = Math.max(-ARENA_SIZE / 2 + 0.5, Math.min(ARENA_SIZE / 2 - 0.5, p.y));
  }
}

function measurementUpdate() {
  // Simulate expected sensor readings for each particle and compare to actual
  const actualReadings = [];
  const rayStep = SENSOR_FOV / (SENSOR_RAYS - 1);
  const startAngle = robotPose.theta - SENSOR_FOV / 2;
  for (let i = 0; i < SENSOR_RAYS; i++) {
    actualReadings.push(castRay(robotPose.x, robotPose.y, startAngle + i * rayStep));
  }

  const totalWeight = { sum: 0 };
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];
    const pReadings = [];
    for (let j = 0; j < SENSOR_RAYS; j++) {
      const angle = p.theta - SENSOR_FOV / 2 + j * rayStep;
      pReadings.push(castRay(p.x, p.y, angle));
    }

    // Likelihood based on sum of squared differences
    let error = 0;
    for (let j = 0; j < SENSOR_RAYS; j++) {
      const diff = pReadings[j] - actualReadings[j];
      error += diff * diff;
    }

    // Gaussian likelihood
    const sigma = 0.8;
    p.weight = Math.exp(-error / (2 * sigma * sigma));
    particleWeights[i] = p.weight;
    totalWeight.sum += p.weight;
  }

  // Normalize
  if (totalWeight.sum > 0) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles[i].weight /= totalWeight.sum;
      particleWeights[i] = particles[i].weight;
    }
  }
}

function resample() {
  // Low-variance resampling (systematic resampling)
  const newParticles = [];
  const totalWeight = particleWeights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return;

  let cumsum = 0;
  const thresholds = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    cumsum += particleWeights[i];
    thresholds.push(cumsum / totalWeight);
  }

  let r = Math.random() / PARTICLE_COUNT;
  let idx = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    while (r > thresholds[idx] && idx < PARTICLE_COUNT - 1) idx++;
    const p = particles[idx].clone();
    // Add small noise
    p.x += (Math.random() - 0.5) * 0.3;
    p.y += (Math.random() - 0.5) * 0.3;
    p.theta += (Math.random() - 0.5) * 0.2;
    p.weight = 1 / PARTICLE_COUNT;
    particleWeights[i] = p.weight;
    newParticles.push(p);
    r += 1 / PARTICLE_COUNT;
  }

  particles = newParticles;
}

function computeEffectiveSampleSize() {
  let sumW2 = 0;
  for (const w of particleWeights) sumW2 += w * w;
  return sumW2 > 0 ? 1 / sumW2 : 0;
}

function estimateRobotPose() {
  // Weighted mean of particles
  let mx = 0, my = 0, mcos = 0, msin = 0;
  for (const p of particles) {
    mx += p.x * p.weight;
    my += p.y * p.weight;
    mcos += Math.cos(p.theta) * p.weight;
    msin += Math.sin(p.theta) * p.weight;
  }
  return { x: mx, y: my, theta: Math.atan2(msin, mcos) };
}

function updateVarianceTriggeredResampling() {
  // Compute spatial variance of particles
  const mean = { x: 0, y: 0 };
  for (const p of particles) {
    mean.x += p.x / PARTICLE_COUNT;
    mean.y += p.y / PARTICLE_COUNT;
  }
  let varSum = 0;
  for (const p of particles) {
    const dx = p.x - mean.x;
    const dy = p.y - mean.y;
    varSum += dx * dx + dy * dy;
  }
  const variance = varSum / PARTICLE_COUNT;

  // If variance is high and ESS is low, resample
  const ess = computeEffectiveSampleSize();
  if (variance > 8 || ess < PARTICLE_COUNT * 0.3) {
    resample();
  }
}

// ============================================================
// UI
// ============================================================

function createUI() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="controls" style="position:fixed;bottom:20px;left:20px;background:rgba(10,10,20,0.85);backdrop-filter:blur(10px);border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:16px 20px;color:#e0e0f0;font-family:'Courier New',monospace;font-size:13px;min-width:200px;z-index:100;">
      <div style="margin-bottom:10px;font-weight:bold;color:#00d4ff;">ROBOT CONTROL</div>
      <div style="margin-bottom:8px;">
        <button id="btnFwd" style="background:#00d4ff22;border:1px solid #00d4ff;color:#00d4ff;padding:6px 14px;border-radius:6px;cursor:pointer;margin-right:6px;">▲ FWD</button>
        <button id="btnBack" style="background:#00d4ff22;border:1px solid #00d4ff;color:#00d4ff;padding:6px 14px;border-radius:6px;cursor:pointer;">▼ BACK</button>
      </div>
      <div style="margin-bottom:10px;">
        <button id="btnLeft" style="background:#00d4ff22;border:1px solid #00d4ff;color:#00d4ff;padding:6px 14px;border-radius:6px;cursor:pointer;margin-right:6px;">◄ LEFT</button>
        <button id="btnRight" style="background:#00d4ff22;border:1px solid #00d4ff;color:#00d4ff;padding:6px 14px;border-radius:6px;cursor:pointer;">► RIGHT</button>
      </div>
      <div style="margin-bottom:8px;">
        <label style="cursor:pointer;">
          <input type="checkbox" id="autoMode" checked style="margin-right:6px;">Auto Mode
        </label>
      </div>
      <div style="font-size:11px;color:#888;">Speed: <input type="range" id="speedSlider" min="1" max="10" value="5" style="width:80px;vertical-align:middle;"></div>
    </div>
  `);

  document.getElementById('btnFwd').addEventListener('mousedown', () => startMove('fwd'));
  document.getElementById('btnBack').addEventListener('mousedown', () => startMove('back'));
  document.getElementById('btnLeft').addEventListener('mousedown', () => startMove('left'));
  document.getElementById('btnRight').addEventListener('mousedown', () => startMove('right'));
  document.getElementById('autoMode').addEventListener('change', e => autoMode = e.target.checked);
  document.addEventListener('mouseup', () => stopMove());
}

let moveState = { fwd: false, back: false, left: false, right: false };

function startMove(dir) {
  moveState[dir] = true;
}

function stopMove() {
  moveState = { fwd: false, back: false, left: false, right: false };
}

function updateUI() {
  const ess = computeEffectiveSampleSize();
  const variance = particles.length > 0 ? (() => {
    const mean = { x: 0, y: 0 };
    for (const p of particles) { mean.x += p.x / PARTICLE_COUNT; mean.y += p.y / PARTICLE_COUNT; }
    let v = 0;
    for (const p of particles) { const dx = p.x - mean.x, dy = p.y - mean.y; v += dx * dx + dy * dy; }
    return v / PARTICLE_COUNT;
  })() : 0;

  const pose = estimateRobotPose();

  const html = `
    <div style="position:fixed;top:20px;left:20px;background:rgba(10,10,20,0.85);backdrop-filter:blur(10px);border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:14px 20px;color:#e0e0f0;font-family:'Courier New',monospace;font-size:12px;min-width:220px;z-index:100;">
      <div style="margin-bottom:8px;font-weight:bold;color:#00d4ff;">MONTE CARLO LOCALIZATION</div>
      <div>Particles: <span style="color:#00ff88">${PARTICLE_COUNT}</span></div>
      <div>ESS: <span style="color:#ffcc00">${ess.toFixed(0)}</span> / ${PARTICLE_COUNT}</div>
      <div>Variance: <span style="color:#ff9944">${variance.toFixed(2)}</span></div>
      <div>Robot: (${robotPose.x.toFixed(2)}, ${robotPose.y.toFixed(2)}) θ=${(robotPose.theta * 180 / Math.PI).toFixed(1)}°</div>
      <div>Est: (${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}) θ=${(pose.theta * 180 / Math.PI).toFixed(1)}°</div>
      <div style="margin-top:8px;border-top:1px solid #333;padding-top:8px;">
        <div style="color:#aaa;font-size:10px;">Particles: green=high weight, red=low</div>
        <div style="color:#aaa;font-size:10px;">Cyan = estimated pose</div>
        <div style="color:#aaa;font-size:10px;">Orange = sensor beams</div>
      </div>
    </div>
  `;

  if (statsEl) {
    statsEl.innerHTML = html;
  } else {
    document.body.insertAdjacentHTML('beforeend', `<div id="stats">${html}</div>`);
  }
}

// ============================================================
// ANIMATION LOOP
// ============================================================

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const speed = parseFloat(document.getElementById('speedSlider')?.value || 5) * 0.05;

  // Handle manual movement
  let moved = false;
  let dx = 0, dturn = 0;
  if (moveState.fwd) { dx = speed; moved = true; }
  if (moveState.back) { dx = -speed; moved = true; }
  if (moveState.left) { dturn = speed * 0.8; moved = true; }
  if (moveState.right) { dturn = -speed * 0.8; moved = true; }

  // Auto mode: random walk
  if (autoMode && !moved) {
    autoTimer++;
    if (autoTimer % 60 === 0) {
      // Random movement decision
      const action = Math.random();
      if (action < 0.4) { dx = speed; }
      else if (action < 0.7) { dturn = (Math.random() - 0.5) * speed; }
      else if (action < 0.85) { dx = -speed * 0.5; }
      else { dturn = (Math.random() > 0.5 ? 1 : -1) * speed * 0.5; }
    }
    if (autoTimer % 10 === 0 && Math.random() < 0.3) {
      dturn = (Math.random() - 0.5) * speed * 0.3;
    }
  }

  if (dx !== 0 || dturn !== 0) {
    // Update robot pose
    robotPose.x += dx * Math.cos(robotPose.theta);
    robotPose.y += dx * Math.sin(robotPose.theta);
    robotPose.theta += dturn;
    robotPose.theta = ((robotPose.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Clamp to arena
    robotPose.x = Math.max(-ARENA_SIZE / 2 + 1, Math.min(ARENA_SIZE / 2 - 1, robotPose.x));
    robotPose.y = Math.max(-ARENA_SIZE / 2 + 1, Math.min(ARENA_SIZE / 2 - 1, robotPose.y));

    // Particle filter update
    motionUpdate(dx, dturn);
    measurementUpdate();
    updateVarianceTriggeredResampling();
  }

  // Update visuals
  updateParticleVisuals();
  updateSensorReadings();
  updateUI();

  // Update robot mesh
  robotGroup.position.x = robotPose.x;
  robotGroup.position.z = robotPose.y;
  robotGroup.rotation.y = -robotPose.theta;

  controls.update();
  renderer.render(scene, camera);
}

init();
