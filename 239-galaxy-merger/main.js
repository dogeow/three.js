import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Renderer / Scene / Camera ──────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 120, 300);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 50;
controls.maxDistance = 800;

// ─── Lighting ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x222244, 1));
const pointLight = new THREE.PointLight(0xffffff, 1, 500);
pointLight.position.set(0, 50, 0);
scene.add(pointLight);

// ─── Simulation State ────────────────────────────────────────────────────────
let running = false;
let currentParticles = 5000;
let gravitationalConstant = 0.5;
let mergerSpeed = 1.0;
let timeStep = 0.016;

// Particle data arrays (CPU side)
let positions = [];
let velocities = [];
let accelerations = [];
let numParticles = 0;

const galaxy1Center = new THREE.Vector3(-80, 0, 0);
const galaxy2Center = new THREE.Vector3(80, 0, 0);

// ─── Galaxy Generation ────────────────────────────────────────────────────────
/**
 * Generate a spiral galaxy with given center.
 * Returns { pos, vel } arrays with count particles.
 * Disk follows a logarithmic spiral; bulge is a dense core.
 */
function generateSpiralGalaxy(center, count) {
  const pos = [];
  const vel = [];
  const sqrtCount = Math.ceil(Math.sqrt(count * 0.4)); // 40% disk, 60% bulge+halo

  // ── Bulge (ellipsoid, ~20% of particles) ──
  const bulgeCount = Math.floor(count * 0.2);
  for (let i = 0; i < bulgeCount; i++) {
    const r = Math.random() * 8 + 1;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos.push(
      center.x + r * Math.sin(phi) * Math.cos(theta),
      center.y + r * Math.sin(phi) * Math.sin(theta) * 0.4, // flatten
      center.z + r * Math.cos(phi)
    );
    // Orbital velocity for a circular orbit around galaxy center
    const orbSpeed = Math.sqrt(gravitationalConstant * 30 / Math.max(r, 1));
    vel.push(
      -orbSpeed * Math.sin(theta + Math.PI / 2) * 0.3,
      (Math.random() - 0.5) * 0.2,
       orbSpeed * Math.cos(theta + Math.PI / 2) * 0.3
    );
  }

  // ── Disk (logarithmic spiral, ~60% of particles) ──
  const diskCount = Math.floor(count * 0.6);
  for (let i = 0; i < diskCount; i++) {
    const t = Math.random();
    const radius = t * t * 60 + 5; // r^2 distribution, max ~60
    const spinAngle = radius * 0.12; // spiral arm winding
    const theta = Math.random() * Math.PI * 2 + spinAngle;
    const arm = Math.floor(Math.random() * 2); // 2 spiral arms
    const armOffset = arm * Math.PI;

    const x = center.x + radius * Math.cos(theta + armOffset);
    const z = center.z + radius * Math.sin(theta + armOffset);
    const y = (Math.random() - 0.5) * (4 - radius * 0.05); // thinner at edge

    pos.push(x, y, z);

    // Tangential orbital velocity + small random motion
    const orbSpeed = Math.sqrt(gravitationalConstant * 50 / Math.max(radius, 1));
    const tangentAngle = theta + armOffset + Math.PI / 2;
    vel.push(
      orbSpeed * Math.cos(tangentAngle) * 0.5 + (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      orbSpeed * Math.sin(tangentAngle) * 0.5 + (Math.random() - 0.5) * 0.3
    );
  }

  // ── Dark matter halo (~20%, large radius, slow rotation) ──
  const haloCount = count - bulgeCount - diskCount;
  for (let i = 0; i < haloCount; i++) {
    const r = Math.random() * 120 + 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = center.x + r * Math.sin(phi) * Math.cos(theta);
    const y = center.y + r * Math.sin(phi) * Math.sin(theta) * 0.3;
    const z = center.z + r * Math.cos(phi);
    pos.push(x, y, z);
    vel.push(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );
  }

  return { pos, vel };
}

// ─── InstancedMesh Setup ──────────────────────────────────────────────────────
const dummy = new THREE.Object3D();
const particleGeometry = new THREE.SphereGeometry(0.4, 4, 4);

// Galaxy 1 — blue/cyan tint
const galaxy1Material = new THREE.MeshBasicMaterial({
  color: 0x4488ff,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
let galaxy1Mesh = new THREE.InstancedMesh(particleGeometry, galaxy1Material, 1);
galaxy1Mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

// Galaxy 2 — golden/orange tint
const galaxy2Material = new THREE.MeshBasicMaterial({
  color: 0xffaa33,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
let galaxy2Mesh = new THREE.InstancedMesh(particleGeometry, galaxy2Material, 1);
galaxy2Mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

scene.add(galaxy1Mesh);
scene.add(galaxy2Mesh);

// ─── Rebuild InstancedMesh when particle count changes ───────────────────────
function rebuildMeshes(count1, count2) {
  scene.remove(galaxy1Mesh);
  scene.remove(galaxy2Mesh);
  galaxy1Mesh.dispose();
  galaxy2Mesh.dispose();

  galaxy1Mesh = new THREE.InstancedMesh(particleGeometry, galaxy1Material, count1);
  galaxy1Mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  galaxy2Mesh = new THREE.InstancedMesh(particleGeometry, galaxy2Material, count2);
  galaxy2Mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  scene.add(galaxy1Mesh);
  scene.add(galaxy2Mesh);
}

// ─── Initialize / Reset ──────────────────────────────────────────────────────
function initSimulation() {
  const g1 = generateSpiralGalaxy(galaxy1Center, currentParticles);
  const g2 = generateSpiralGalaxy(galaxy2Center, currentParticles);

  // Interleave: galaxy1 particles first, galaxy2 particles second
  numParticles = currentParticles * 2;
  positions    = new Float32Array(numParticles * 3);
  velocities   = new Float32Array(numParticles * 3);
  accelerations = new Float32Array(numParticles * 3);

  for (let i = 0; i < currentParticles; i++) {
    positions[i * 3]     = g1.pos[i * 3];
    positions[i * 3 + 1] = g1.pos[i * 3 + 1];
    positions[i * 3 + 2] = g1.pos[i * 3 + 2];
    velocities[i * 3]     = g1.vel[i * 3];
    velocities[i * 3 + 1] = g1.vel[i * 3 + 1];
    velocities[i * 3 + 2] = g1.vel[i * 3 + 2];
  }
  const offset = currentParticles * 3;
  for (let i = 0; i < currentParticles; i++) {
    positions[offset + i * 3]     = g2.pos[i * 3];
    positions[offset + i * 3 + 1] = g2.pos[i * 3 + 1];
    positions[offset + i * 3 + 2] = g2.pos[i * 3 + 2];
    velocities[offset + i * 3]     = g2.vel[i * 3];
    velocities[offset + i * 3 + 1] = g2.vel[i * 3 + 1];
    velocities[offset + i * 3 + 2] = g2.vel[i * 3 + 2];
  }
  accelerations.fill(0);

  rebuildMeshes(currentParticles, currentParticles);
  updateInstanceMatrices();
}

// ─── Update InstancedMesh matrices from CPU positions ────────────────────────
function updateInstanceMatrices() {
  for (let i = 0; i < currentParticles; i++) {
    dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    galaxy1Mesh.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < currentParticles; i++) {
    const j = currentParticles + i;
    dummy.position.set(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    galaxy2Mesh.setMatrixAt(i, dummy.matrix);
  }
  galaxy1Mesh.instanceMatrix.needsUpdate = true;
  galaxy2Mesh.instanceMatrix.needsUpdate = true;
}

// ─── N-body Acceleration (direct O(n²) summation) ─────────────────────────────
/**
 * Compute gravitational acceleration on every particle.
 * Uses softening length to prevent singularities.
 */
function computeAccelerations() {
  const G = gravitationalConstant;
  const SOFTENING = 2.0; // softening length (prevents 1/r² blowup)
  const SOFTENING2 = SOFTENING * SOFTENING;
  accelerations.fill(0);

  for (let i = 0; i < numParticles; i++) {
    const ax = accelerations[i * 3];
    const ay = accelerations[i * 3 + 1];
    const az = accelerations[i * 3 + 2];
    let totalAx = 0, totalAy = 0, totalAz = 0;

    for (let j = 0; j < numParticles; j++) {
      if (i === j) continue;

      const dx = positions[j * 3]     - positions[i * 3];
      const dy = positions[j * 3 + 1] - positions[i * 3 + 1];
      const dz = positions[j * 3 + 2] - positions[i * 3 + 2];

      const dist2 = dx * dx + dy * dy + dz * dz + SOFTENING2;
      const invDist3 = 1.0 / (dist2 * Math.sqrt(dist2));

      const mass = 1.0;
      totalAx += G * mass * dx * invDist3;
      totalAy += G * mass * dy * invDist3;
      totalAz += G * mass * dz * invDist3;
    }

    accelerations[i * 3]     = totalAx;
    accelerations[i * 3 + 1] = totalAy;
    accelerations[i * 3 + 2] = totalAz;
  }
}

// ─── Verlet Integration Step ──────────────────────────────────────────────────
/**
 * Standard Velocity Verlet integration:
 *   x_{n+1} = x_n + v_n * dt + 0.5 * a_n * dt²
 *   v_{n+1} = v_n + 0.5 * (a_n + a_{n+1}) * dt
 */
function integrateVerlet(dt) {
  const halfDt = 0.5 * dt;

  // Store old accelerations
  const oldAcc = accelerations.slice();

  // Update positions
  for (let i = 0; i < numParticles; i++) {
    positions[i * 3]     += velocities[i * 3]     * dt + oldAcc[i * 3]     * halfDt * dt;
    positions[i * 3 + 1] += velocities[i * 3 + 1] * dt + oldAcc[i * 3 + 1] * halfDt * dt;
    positions[i * 3 + 2] += velocities[i * 3 + 2] * dt + oldAcc[i * 3 + 2] * halfDt * dt;
  }

  // Compute new accelerations
  computeAccelerations();

  // Update velocities
  for (let i = 0; i < numParticles; i++) {
    velocities[i * 3]     += halfDt * (oldAcc[i * 3]     + accelerations[i * 3]);
    velocities[i * 3 + 1] += halfDt * (oldAcc[i * 3 + 1] + accelerations[i * 3 + 1]);
    velocities[i * 3 + 2] += halfDt * (oldAcc[i * 3 + 2] + accelerations[i * 3 + 2]);
  }
}

// ─── GUI ─────────────────────────────────────────────────────────────────────
const params = {
  particleCount: 5000,
  gravitationalConstant: 0.5,
  mergerSpeed: 1.0,
  timeStep: 0.016,
};

const gui = new GUI();
gui.add(params, 'particleCount', 500, 8000, 500).name('Particle Count').onChange(val => {
  if (!running) {
    currentParticles = val;
    initSimulation();
  }
});
gui.add(params, 'gravitationalConstant', 0.1, 3.0, 0.05).name('Gravity Strength').onChange(val => {
  gravitationalConstant = val;
});
gui.add(params, 'mergerSpeed', 0.1, 5.0, 0.1).name('Merger Speed').onChange(val => {
  mergerSpeed = val;
});
gui.add(params, 'timeStep', 0.001, 0.05, 0.001).name('Time Step').onChange(val => {
  timeStep = val;
});

// ─── Button Events ────────────────────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  if (!running) {
    running = true;
    // Give galaxy 2 an initial velocity toward galaxy 1
    const speed = mergerSpeed * 1.5;
    for (let i = 0; i < currentParticles; i++) {
      const idx = (currentParticles + i) * 3;
      velocities[idx]     -= speed; // push toward galaxy 1
      velocities[idx + 1] += (Math.random() - 0.5) * 0.05;
      velocities[idx + 2] += (Math.random() - 0.5) * 0.05;
    }
  }
});

document.getElementById('resetBtn').addEventListener('click', () => {
  running = false;
  currentParticles = params.particleCount;
  initSimulation();
});

// ─── Star Field Background ────────────────────────────────────────────────────
function addStarField() {
  const starGeo = new THREE.BufferGeometry();
  const starCount = 3000;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 600 + Math.random() * 400;
    starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x8888aa,
    size: 0.8,
    transparent: true,
    opacity: 0.6,
  });
  scene.add(new THREE.Points(starGeo, starMat));
}
addStarField();

// ─── Init ─────────────────────────────────────────────────────────────────────
initSimulation();

// ─── Animation Loop ───────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  if (running) {
    // Run multiple sub-steps per frame for stability
    const subSteps = 4;
    const subDt = timeStep / subSteps;
    for (let s = 0; s < subSteps; s++) {
      integrateVerlet(subDt * mergerSpeed);
    }
    updateInstanceMatrices();
  } else {
    // Slow idle rotation of galaxy 2 to show both galaxies
    for (let i = 0; i < currentParticles; i++) {
      const idx = (currentParticles + i) * 3;
      const px = positions[idx];
      const pz = positions[idx + 2];
      positions[idx]     = px * Math.cos(0.003) - pz * Math.sin(0.003);
      positions[idx + 2] = px * Math.sin(0.003) + pz * Math.cos(0.003);
    }
    updateInstanceMatrices();
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ─── Resize Handler ───────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});