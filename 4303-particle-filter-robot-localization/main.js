// {title: "Particle Filter: Robot Localization"}
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1a);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 15, 10);
scene.add(dirLight);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 22, 14);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.2;

const sceneGroup = new THREE.Group();
scene.add(sceneGroup);

// Floor plan
const floorGeo = new THREE.PlaneGeometry(14, 14);
const floorMat = new THREE.MeshPhongMaterial({ color: 0x1a2233, transparent: true, opacity: 0.9 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
sceneGroup.add(floor);

// Walls
const wallMat = new THREE.MeshPhongMaterial({ color: 0x334466, transparent: true, opacity: 0.6 });
const wallHeight = 2;
function addWall(x1, z1, x2, z2) {
  const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
  const angle = Math.atan2(z2 - z1, x2 - x1);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(len, wallHeight, 0.2), wallMat);
  wall.position.set((x1 + x2) / 2, wallHeight / 2, (z1 + z2) / 2);
  wall.rotation.y = -angle;
  sceneGroup.add(wall);
}
// L-shaped room
addWall(-6, -6, 6, -6);
addWall(6, -6, 6, 2);
addWall(6, 2, 2, 2);
addWall(2, 2, 2, 6);
addWall(2, 6, -6, 6);
addWall(-6, 6, -6, -6);
// Interior obstacle
addWall(-2, -1, 1, -1);
addWall(-2, -1, -2, 1);

// Grid lines
const gridHelper = new THREE.GridHelper(14, 14, 0x223344, 0x112233);
sceneGroup.add(gridHelper);

// Particles
const PARTICLE_COUNT = 200;
const particles = [];
const particleMeshes = [];
const particleGeo = new THREE.ConeGeometry(0.12, 0.3, 4);
particleGeo.rotateX(Math.PI / 2);

function randomPose() {
  return {
    x: (Math.random() - 0.5) * 10,
    y: (Math.random() - 0.5) * 10,
    theta: Math.random() * Math.PI * 2,
    weight: 1 / PARTICLE_COUNT
  };
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const p = randomPose();
  // Clamp to room
  if (p.x > 5.5) p.x = 5.5; if (p.x < -5.5) p.x = -5.5;
  if (p.y > 5.5) p.y = 5.5; if (p.y < -5.5) p.y = -5.5;
  particles.push(p);

  const mat = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.7 });
  const pm = new THREE.Mesh(particleGeo, mat);
  sceneGroup.add(pm);
  particleMeshes.push(pm);
}

// Robot
const robotGroup = new THREE.Group();
sceneGroup.add(robotGroup);
const robotBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16),
  new THREE.MeshPhongMaterial({ color: 0xff4400, emissive: 0x441100 })
);
robotBody.position.y = 0.15;
robotGroup.add(robotBody);
const robotDir = new THREE.Mesh(
  new THREE.ConeGeometry(0.12, 0.3, 4),
  new THREE.MeshPhongMaterial({ color: 0xffaa00 })
);
robotDir.position.set(0.3, 0.15, 0);
robotDir.rotation.z = -Math.PI / 2;
robotGroup.add(robotDir);

// Robot pose
const robot = { x: 0, y: 0, theta: 0 };

// Sensor reading (walls in view)
function getSensorReading(rx, ry, rtheta) {
  const ranges = [];
  const angles = [-0.5, -0.25, 0, 0.25, 0.5];
  const walls = [
    { x1: -6, z1: -6, x2: 6, z2: -6 },
    { x1: 6, z1: -6, x2: 6, z2: 2 },
    { x1: 6, z1: 2, x2: 2, z2: 2 },
    { x1: 2, z1: 2, x2: 2, z2: 6 },
    { x1: 2, z1: 6, x2: -6, z2: 6 },
    { x1: -6, z1: 6, x2: -6, z2: -6 },
    { x1: -2, z1: -1, x2: 1, z2: -1 },
    { x1: -2, z1: -1, x2: -2, z2: 1 },
  ];
  angles.forEach(a => {
    const rayAngle = rtheta + a;
    let minDist = 12;
    walls.forEach(w => {
      const dx = w.x2 - w.x1, dz = w.z2 - w.z1;
      const t = Math.max(0, Math.min(1, ((rx - w.x1) * dx + (ry - w.z1) * dz) / (dx * dx + dz * dz)));
      const ix = w.x1 + t * dx - rx;
      const iz = w.z1 + t * dz - ry;
      const dist = Math.sqrt(ix * ix + iz * iz);
      const rayDot = Math.cos(rayAngle) * ix + Math.sin(rayAngle) * iz;
      if (rayDot > 0 && dist < minDist) minDist = dist;
    });
    ranges.push(minDist);
  });
  return ranges;
}

// Compute particle weights
function weightParticles() {
  const sensor = getSensorReading(robot.x, robot.y, robot.theta);
  let total = 0;
  particles.forEach((p, i) => {
    const pSensor = getSensorReading(p.x, p.y, p.theta);
    let likelihood = 1;
    sensor.forEach((s, j) => {
      const diff = s - pSensor[j];
      likelihood *= Math.exp(-diff * diff / 0.5);
    });
    p.weight = likelihood;
    total += likelihood;
  });
  if (total > 0) particles.forEach(p => p.weight /= total);
}

// Resample
function resample() {
  const cumWeights = [];
  let sum = 0;
  particles.forEach(p => { sum += p.weight; cumWeights.push(sum); });
  const newParticles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = Math.random() * sum;
    for (let j = 0; j < cumWeights.length; j++) {
      if (r <= cumWeights[j]) {
        const src = particles[j];
        newParticles.push({ x: src.x + (Math.random() - 0.5) * 0.3, y: src.y + (Math.random() - 0.5) * 0.3, theta: src.theta + (Math.random() - 0.5) * 0.2, weight: 1 / PARTICLE_COUNT });
        break;
      }
    }
  }
  particles.length = 0;
  particles.push(...newParticles);
}

// Variance
function getVariance() {
  const mx = particles.reduce((s, p) => s + p.x * p.weight, 0);
  const my = particles.reduce((s, p) => s + p.y * p.weight, 0);
  const varX = particles.reduce((s, p) => s + p.weight * (p.x - mx) ** 2, 0);
  const varY = particles.reduce((s, p) => s + p.weight * (p.y - my) ** 2, 0);
  return Math.sqrt(varX + varY);
}

// Move robot
function moveRobot(dx, dy, dtheta) {
  robot.x += dx; robot.y += dy; robot.theta += dtheta;
  robot.x = Math.max(-5.5, Math.min(5.5, robot.x));
  robot.y = Math.max(-5.5, Math.min(5.5, robot.y));
  // Move particles too (odometry noise)
  particles.forEach(p => {
    p.x += dx + (Math.random() - 0.5) * 0.2;
    p.y += dy + (Math.random() - 0.5) * 0.2;
    p.theta += dtheta + (Math.random() - 0.5) * 0.1;
    p.x = Math.max(-5.5, Math.min(5.5, p.x));
    p.y = Math.max(-5.5, Math.min(5.5, p.y));
  });
  weightParticles();
}

// Update particle mesh positions and colors
function updateParticles() {
  const mx = particles.reduce((s, p) => s + p.x * p.weight, 0);
  const my = particles.reduce((s, p) => s + p.y * p.weight, 0);
  particles.forEach((p, i) => {
    const pm = particleMeshes[i];
    pm.position.set(p.x, 0.15, p.y);
    pm.rotation.y = -p.theta;
    const w = p.weight * PARTICLE_COUNT;
    const hue = Math.max(0, 0.55 - w * 0.3);
    pm.material.color.setHSL(hue, 0.9, 0.5);
    pm.material.opacity = 0.4 + w * 0.5;
  });
  return { mx, my };
}
const estimated = updateParticles();

// Robot estimated pose from particle cloud
let estX = 0, estY = 0;
function updateEstimated() {
  estX = particles.reduce((s, p) => s + p.x * p.weight, 0);
  estY = particles.reduce((s, p) => s + p.y * p.weight, 0);
}
updateEstimated();

// UI
const guiDiv = document.createElement('div');
guiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#aaccdd;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:14px;border-radius:8px;z-index:100;';
document.body.appendChild(guiDiv);
guiDiv.innerHTML = `
  <div style="color:#ffaa44;font-size:15px">Particle Filter Localization</div>
  <div style="margin-top:6px;font-size:12px;color:#6688aa">
    Particles: <span style="color:#fff">${PARTICLE_COUNT}</span><br>
    Variance: <span id="variance" style="color:#88ff88">${getVariance().toFixed(3)}</span><br>
    Est. Pose: (<span id="ex">0.00</span>, <span id="ey">0.00</span>)
  </div>
  <div style="margin-top:10px">
    <button id="fwdBtn" style="padding:6px 12px;background:#224488;color:#fff;border:none;border-radius:4px;cursor:pointer">↑ Forward</button>
  </div>
  <div style="margin-top:4px">
    <button id="leftBtn" style="padding:6px 12px;background:#224488;color:#fff;border:none;border-radius:4px;cursor:pointer">↰ Left</button>
    <button id="rightBtn" style="padding:6px 12px;background:#224488;color:#fff;border:none;border-radius:4px;cursor:pointer">Right ↱</button>
  </div>
  <div style="margin-top:8px">
    <button id="resampBtn" style="padding:6px 12px;background:#882244;color:#fff;border:none;border-radius:4px;cursor:pointer">Resample</button>
    <button id="scatterBtn" style="padding:6px 12px;background:#224488;color:#fff;border:none;border-radius:4px;cursor:pointer">Scatter</button>
  </div>
  <div style="margin-top:8px;font-size:11px;color:#556677">
    🔵 High weight | 🔶 Low weight | 🟠 Robot | ⬜ Estimate
  </div>
`;

document.getElementById('fwdBtn').addEventListener('click', () => moveRobot(0.8 * Math.cos(robot.theta), 0.8 * Math.sin(robot.theta), 0));
document.getElementById('leftBtn').addEventListener('click', () => moveRobot(0, 0, 0.4));
document.getElementById('rightBtn').addEventListener('click', () => moveRobot(0, 0, -0.4));
document.getElementById('resampBtn').addEventListener('click', () => { resample(); updateParticles(); });
document.getElementById('scatterBtn').addEventListener('click', () => {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles[i].x = (Math.random() - 0.5) * 10;
    particles[i].y = (Math.random() - 0.5) * 10;
    particles[i].theta = Math.random() * Math.PI * 2;
  }
  updateParticles();
});

let stepCount = 0;
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.01;
  stepCount++;

  // Auto-move robot slowly in a circle
  if (stepCount % 60 === 0) {
    robot.theta += 0.15;
    moveRobot(0.3 * Math.cos(robot.theta), 0.3 * Math.sin(robot.theta), 0);
  }

  // Update particle visuals
  particles.forEach((p, i) => {
    const pm = particleMeshes[i];
    const w = p.weight * PARTICLE_COUNT;
    pm.material.opacity = 0.35 + w * 0.55;
    const hue = Math.max(0.05, 0.6 - w * 0.35);
    pm.material.color.setHSL(hue, 0.85, 0.5);
    pm.scale.setScalar(0.7 + w * 0.6);
  });

  // Robot mesh
  robotGroup.position.set(robot.x, 0, robot.y);
  robotGroup.rotation.y = -robot.theta;

  // Estimated robot pose from particle cloud
  updateEstimated();
  estX = particles.reduce((s, p) => s + p.x * p.weight, 0);
  estY = particles.reduce((s, p) => s + p.y * p.weight, 0);

  // Show estimated pose as a marker
  if (!window.estMarker) {
    window.estMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.4, 16),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    sceneGroup.add(window.estMarker);
  }
  window.estMarker.position.set(estX, 0.05, estY);

  // Variance display
  if (stepCount % 10 === 0) {
    document.getElementById('variance').textContent = getVariance().toFixed(3);
    document.getElementById('ex').textContent = estX.toFixed(2);
    document.getElementById('ey').textContent = estY.toFixed(2);

    // Auto-resample when variance is high
    if (getVariance() > 1.5) resample();
  }

  // Pulse robot
  robotGroup.scale.setScalar(1 + Math.sin(t * 3) * 0.05);

  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
