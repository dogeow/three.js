import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Scene Setup ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 14, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI / 2;
controls.enabled = false;

// ── Lighting ───────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x404060, 1.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 3);
mainLight.position.set(5, 12, 4);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(2048, 2048);
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 40;
mainLight.shadow.camera.left = -10;
mainLight.shadow.camera.right = 10;
mainLight.shadow.camera.top = 10;
mainLight.shadow.camera.bottom = -10;
scene.add(mainLight);

const rimLight = new THREE.DirectionalLight(0x4060ff, 1.5);
rimLight.position.set(-4, 8, -6);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xd4af37, 2, 20);
fillLight.position.set(0, 8, 0);
scene.add(fillLight);

// ── Pinball Table ─────────────────────────────────────────────────────────────
const TABLE_W = 10;
const TABLE_H = 18;

const tableGroup = new THREE.Group();
scene.add(tableGroup);

// Felt surface
const feltGeo = new THREE.BoxGeometry(TABLE_W, 0.15, TABLE_H);
const feltMat = new THREE.MeshStandardMaterial({
  color: 0x0d4d0d,
  roughness: 0.9,
  metalness: 0.0,
});
const felt = new THREE.Mesh(feltGeo, feltMat);
felt.receiveShadow = true;
tableGroup.add(felt);

// Table border walls
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.3, metalness: 0.4 });
const wallThick = 0.3;
const wallH = 0.6;

// Left wall
const leftWall = new THREE.Mesh(
  new THREE.BoxGeometry(wallThick, wallH, TABLE_H),
  wallMat
);
leftWall.position.set(-TABLE_W / 2 - wallThick / 2, wallH / 2, 0);
leftWall.castShadow = true;
tableGroup.add(leftWall);

// Right wall
const rightWall = new THREE.Mesh(
  new THREE.BoxGeometry(wallThick, wallH, TABLE_H),
  wallMat
);
rightWall.position.set(TABLE_W / 2 + wallThick / 2, wallH / 2, 0);
rightWall.castShadow = true;
tableGroup.add(rightWall);

// Top wall (near shooter)
const topWall = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_W + wallThick * 2, wallH, wallThick),
  wallMat
);
topWall.position.set(0, wallH / 2, -TABLE_H / 2);
topWall.castShadow = true;
tableGroup.add(topWall);

// Bottom wall (near flippers)
const bottomWall = new THREE.Mesh(
  new THREE.BoxGeometry(TABLE_W + wallThick * 2, wallH, wallThick),
  wallMat
);
bottomWall.position.set(0, wallH / 2, TABLE_H / 2);
bottomWall.castShadow = true;
tableGroup.add(bottomWall);

// Curved wall segments near flippers (approximated with angled boxes)
function addAngledWall(x, z, rotY, w, h) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), wallMat);
  m.position.set(x, h / 2, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  tableGroup.add(m);
}
addAngledWall(-TABLE_W / 2 + 0.5, TABLE_H / 2 - 1.5, Math.PI / 6, 1.5, wallH);
addAngledWall(TABLE_W / 2 - 0.5, TABLE_H / 2 - 1.5, -Math.PI / 6, 1.5, wallH);

// ── Bumpers ───────────────────────────────────────────────────────────────────
const bumperMat = new THREE.MeshStandardMaterial({
  color: 0xcc2222,
  emissive: 0x000000,
  emissiveIntensity: 0,
  roughness: 0.2,
  metalness: 0.8,
});
const bumperGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 24);

const bumperPositions = [
  { x: 0, z: -TABLE_H / 4 },
  { x: -2.5, z: -TABLE_H / 4 + 1 },
  { x: 2.5, z: -TABLE_H / 4 + 1 },
  { x: -1.5, z: -TABLE_H / 4 - 2 },
  { x: 1.5, z: -TABLE_H / 4 - 2 },
  { x: 0, z: -TABLE_H / 4 - 3.5 },
];

const bumpers = bumperPositions.map(pos => {
  const mat = bumperMat.clone();
  const mesh = new THREE.Mesh(bumperGeo, mat);
  mesh.position.set(pos.x, 0.5, pos.z);
  mesh.castShadow = true;
  tableGroup.add(mesh);
  return {
    mesh,
    mat,
    x: pos.x,
    z: pos.z,
    radius: 0.5,
    pulseTime: 0,
    active: false,
  };
});

// ── Flippers ──────────────────────────────────────────────────────────────────
const flipperMat = new THREE.MeshStandardMaterial({
  color: 0xd4af37,
  roughness: 0.2,
  metalness: 0.8,
});
const flipperGeo = new THREE.BoxGeometry(2.4, 0.35, 0.4);

const leftFlipperPivot = new THREE.Group();
leftFlipperPivot.position.set(-1.8, 0.3, TABLE_H / 2 - 1.2);
const leftFlipper = new THREE.Mesh(flipperGeo, flipperMat);
leftFlipper.position.set(1.2, 0, 0);
leftFlipper.castShadow = true;
leftFlipperPivot.add(leftFlipper);
tableGroup.add(leftFlipperPivot);

const rightFlipperPivot = new THREE.Group();
rightFlipperPivot.position.set(1.8, 0.3, TABLE_H / 2 - 1.2);
const rightFlipper = new THREE.Mesh(flipperGeo, flipperMat);
rightFlipper.position.set(-1.2, 0, 0);
rightFlipper.castShadow = true;
rightFlipperPivot.add(rightFlipper);
tableGroup.add(rightFlipperPivot);

// Flipper physics state
const flippers = {
  left: {
    pivot: leftFlipperPivot,
    restAngle: Math.PI / 6,
    activeAngle: -Math.PI / 5,
    angle: Math.PI / 6,
    dir: 1,
    pressed: false,
  },
  right: {
    pivot: rightFlipperPivot,
    restAngle: -Math.PI / 6,
    activeAngle: Math.PI / 5,
    angle: -Math.PI / 6,
    dir: 1,
    pressed: false,
  },
};

const FLIPPER_SPD = 18;
const FLIPPER_SPD_DOWN = 8;

// ── Ball ──────────────────────────────────────────────────────────────────────
const BALL_R = 0.28;
const ballGeo = new THREE.SphereGeometry(BALL_R, 32, 32);
const ballMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.05,
  metalness: 0.95,
  envMapIntensity: 1.5,
});
const ballMesh = new THREE.Mesh(ballGeo, ballMat);
ballMesh.castShadow = true;
tableGroup.add(ballMesh);

// Ball state
const ball = {
  mesh: ballMesh,
  x: 0,
  y: BALL_R,
  z: -TABLE_H / 2 + 1.5,
  vx: 0,
  vy: 0,
  vz: 0,
  active: true,
};

// Ball launcher / drain zone detection
const DRAIN_Z = TABLE_H / 2 + 0.5;
const SPAWN_Z = -TABLE_H / 2 + 1.5;
const SPAWN_X = 0;

// ── Environment Map ───────────────────────────────────────────────────────────
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x222233);
const envLight1 = new THREE.DirectionalLight(0xffffff, 2);
envLight1.position.set(5, 10, 5);
envScene.add(envLight1);
const envLight2 = new THREE.DirectionalLight(0x4060ff, 1);
envLight2.position.set(-5, 5, -5);
envScene.add(envLight2);
const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
scene.environment = envMap;

// ── Score & Game State ────────────────────────────────────────────────────────
let score = 0;
let ballsLeft = 3;
let gameOver = false;

const scoreEl = document.getElementById('score');
const ballsEl = document.getElementById('balls');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

function updateUI() {
  scoreEl.textContent = score;
  ballsEl.textContent = ballsLeft;
}

function resetBall() {
  ball.x = SPAWN_X;
  ball.y = BALL_R;
  ball.z = SPAWN_Z;
  ball.vx = 0;
  ball.vy = 0;
  ball.vz = 0;
  ball.active = true;
}

function resetGame() {
  score = 0;
  ballsLeft = 3;
  gameOver = false;
  resetBall();
  updateUI();
  gameOverEl.style.display = 'none';
  controls.enabled = false;
}

restartBtn.addEventListener('click', resetGame);

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  if (keys[e.code]) return;
  keys[e.code] = true;

  if (e.code === 'KeyZ' || e.code === 'KeyA') flippers.left.pressed = true;
  if (e.code === 'KeyX' || e.code === 'KeyD') flippers.right.pressed = true;
  if (e.code === 'KeyR') resetBall();
  if (e.code === 'Escape') {
    controls.enabled = !controls.enabled;
  }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;

  if (e.code === 'KeyZ' || e.code === 'KeyA') flippers.left.pressed = false;
  if (e.code === 'KeyX' || e.code === 'KeyD') flippers.right.pressed = false;
});

// Mouse tilt
let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;
let tiltX = 0;
let tiltZ = 0;

renderer.domElement.addEventListener('mousedown', e => {
  if (controls.enabled) return;
  isDragging = true;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
});
window.addEventListener('mousemove', e => {
  if (!isDragging || controls.enabled) return;
  const dx = (e.clientX - prevMouseX) * 0.002;
  const dy = (e.clientY - prevMouseY) * 0.001;
  tiltX = Math.max(-0.15, Math.min(0.15, tiltX - dy));
  tiltZ = Math.max(-0.15, Math.min(0.15, tiltZ + dx));
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
});
window.addEventListener('mouseup', () => { isDragging = false; });

// ── Physics Constants ────────────────────────────────────────────────────────
const GRAVITY = -12;
const FRICTION = 0.985;
const BOUNCE = 0.65;
const BUMPER_BOUNCE = 1.8;
const BALL_SPEED_MAX = 20;
const TILT_FACTOR = 3.5;

// Effective bounds considering walls
const BOUND_L = -TABLE_W / 2 + BALL_R;
const BOUND_R = TABLE_W / 2 - BALL_R;
const BOUND_T = -TABLE_H / 2 + BALL_R;
const BOUND_B = TABLE_H / 2 - BALL_R;

// ── Collision Helpers ────────────────────────────────────────────────────────
function reflectCircle(ax, az, ar, bx, bz, br) {
  const dx = ax - bx;
  const dz = az - bz;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist === 0 || dist >= ar + br) return null;
  const nx = dx / dist;
  const nz = dz / dist;
  return { nx, nz, depth: ar + br - dist };
}

function clampFlipperAngle(angle, rest, active) {
  if (angle > rest) return rest;
  if (angle < active) return active;
  return angle;
}

// ── Main Loop ─────────────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  let dt = Math.min((now - lastTime) / 1000, 0.03);
  lastTime = now;

  // Update table tilt
  const baseTiltX = 0.2;
  tableGroup.rotation.x = baseTiltX + tiltX;
  tableGroup.rotation.z = tiltZ;

  if (!gameOver && ball.active) {
    // Gravity along tilted plane
    ball.vx += Math.sin(tiltZ) * GRAVITY * dt * 0.5;
    ball.vz += Math.cos(tiltX) * Math.cos(tiltZ) * GRAVITY * dt * 0.3;
    ball.vy += Math.sin(tiltX) * Math.cos(tiltZ) * GRAVITY * dt * 0.3 - 9.8 * dt;

    // Tilt drift
    ball.vx += Math.sin(tiltZ) * TILT_FACTOR * dt;
    ball.vz += Math.sin(tiltX) * TILT_FACTOR * dt * 0.5;

    // Friction
    ball.vx *= FRICTION;
    ball.vz *= FRICTION;

    // Speed cap
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vz * ball.vz);
    if (speed > BALL_SPEED_MAX) {
      ball.vx = (ball.vx / speed) * BALL_SPEED_MAX;
      ball.vz = (ball.vz / speed) * BALL_SPEED_MAX;
    }

    // Move
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.z += ball.vz * dt;

    // Floor
    if (ball.y < BALL_R) {
      ball.y = BALL_R;
      ball.vy = -ball.vy * 0.3;
      if (Math.abs(ball.vy) < 0.5) ball.vy = 0;
    }

    // Wall collisions (left/right)
    if (ball.x < BOUND_L) {
      ball.x = BOUND_L;
      ball.vx = -ball.vx * BOUNCE;
    }
    if (ball.x > BOUND_R) {
      ball.x = BOUND_R;
      ball.vx = -ball.vx * BOUNCE;
    }

    // Wall collisions (top/bottom)
    if (ball.z < BOUND_T) {
      ball.z = BOUND_T;
      ball.vz = -ball.vz * BOUNCE;
    }
    if (ball.z > BOUND_B) {
      ball.z = BOUND_B;
      ball.vz = -ball.vz * BOUNCE;
    }

    // Bumper collisions
    for (const b of bumpers) {
      const col = reflectCircle(ball.x, ball.z, BALL_R, b.x, b.z, b.radius);
      if (col) {
        const relVn = ball.vx * col.nx + ball.vz * col.nz;
        if (relVn < 0) {
          ball.vx -= (1 + BUMPER_BOUNCE) * relVn * col.nx;
          ball.vz -= (1 + BUMPER_BOUNCE) * relVn * col.nz;
          ball.x += col.nx * col.depth;
          ball.z += col.nz * col.depth;
          b.active = true;
          b.pulseTime = 0.4;
          score += 100;
          updateUI();
        }
      }
    }

    // Flipper update
    for (const key of ['left', 'right']) {
      const f = flippers[key];
      const target = f.pressed ? f.activeAngle : f.restAngle;
      const spd = f.pressed ? FLIPPER_SPD : FLIPPER_SPD_DOWN;
      const diff = target - f.angle;
      if (Math.abs(diff) < 0.02) {
        f.angle = target;
      } else {
        f.angle += Math.sign(diff) * spd * dt;
        f.angle = clampFlipperAngle(f.angle, f.restAngle, f.activeAngle);
      }
      f.pivot.rotation.y = f.angle;
    }

    // Flipper collision (simple)
    const flipperLen = 2.4;
    const flipperThick = 0.4;
    for (const key of ['left', 'right']) {
      const f = flippers[key];
      const px = f.pivot.position.x;
      const pz = f.pivot.position.z;
      const angle = f.pivot.rotation.y;

      // End of flipper
      const ex = px + Math.cos(angle) * (key === 'left' ? flipperLen : -flipperLen);
      const ez = pz + Math.sin(angle) * (key === 'left' ? flipperLen : -flipperLen);

      // Closest point on flipper line segment to ball
      const dx = ex - px;
      const dz = ez - pz;
      const lenSq = dx * dx + dz * dz;
      let t = Math.max(0, Math.min(1, ((ball.x - px) * dx + (ball.z - pz) * dz) / lenSq));
      const cpx = px + t * dx;
      const cpz = pz + t * dz;

      const dist = Math.sqrt((ball.x - cpx) ** 2 + (ball.z - cpz) ** 2);
      const minDist = BALL_R + flipperThick / 2;

      if (dist < minDist) {
        // Push ball out
        const nx = (ball.x - cpx) / dist;
        const nz = (ball.z - cpz) / dist;
        ball.x = cpx + nx * minDist;
        ball.z = cpz + nz * minDist;

        // Reflect velocity
        const dot = ball.vx * nx + ball.vz * nz;
        if (dot < 0) {
          const bounce = f.pressed ? 2.0 : 0.8;
          ball.vx -= (1 + bounce) * dot * nx;
          ball.vz -= (1 + bounce) * dot * nz;
        }

        // Add flipper tip velocity if pressing
        if (f.pressed) {
          const tipSpeed = Math.abs(f.activeAngle - f.restAngle) * flipperLen * 8;
          ball.vx += nx * tipSpeed * 0.5;
          ball.vz += nz * tipSpeed * 0.5;
        }
      }
    }

    // Drain
    if (ball.z > DRAIN_Z || ball.y < -2) {
      ball.active = false;
      ballsLeft--;
      updateUI();
      if (ballsLeft <= 0) {
        gameOver = true;
        finalScoreEl.textContent = score;
        gameOverEl.style.display = 'block';
      } else {
        setTimeout(() => {
          if (!gameOver) resetBall();
        }, 800);
      }
    }

    // Sync mesh
    ballMesh.position.set(ball.x, ball.y, ball.z);
    ballMesh.rotation.x += ball.vz * dt * 2;
    ballMesh.rotation.z -= ball.vx * dt * 2;
  }

  // Bumper pulse
  for (const b of bumpers) {
    if (b.pulseTime > 0) {
      b.pulseTime -= dt;
      const t = b.pulseTime / 0.4;
      b.mat.emissiveIntensity = t * 3;
      b.mat.emissive.setHex(0xff4400);
      const s = 1 + t * 0.3;
      b.mesh.scale.set(s, 1, s);
    } else {
      b.mat.emissiveIntensity = 0;
      b.mesh.scale.set(1, 1, 1);
    }
  }

  // Flippers emissive pulse
  for (const f of [leftFlipper, rightFlipper]) {
    // subtle idle glow
  }

  controls.update();
  renderer.render(scene, camera);
}

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Attach to window ──────────────────────────────────────────────────────────
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.ball = ball;
window.flippers = flippers;

// ── Start ─────────────────────────────────────────────────────────────────────
resetBall();
updateUI();
animate();