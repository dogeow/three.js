import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Renderer ───────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// ─── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111827);
scene.fog = new THREE.FogExp2(0x111827, 0.025);

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 5, 10);

// ─── Lights ──────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x334466, 1.2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e4, 2.5);
sunLight.position.set(20, 40, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 200;
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x4466aa, 0.6);
fillLight.position.set(-15, 10, -10);
scene.add(fillLight);

// ─── Ground ─────────────────────────────────────────────────────────────────
const groundSize = 100;
const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, groundSize, groundSize);

// Checkerboard texture via canvas
function makeCheckerTexture(size, divisions, c1, c2) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const step = size / divisions;
  for (let y = 0; y < divisions; y++) {
    for (let x = 0; x < divisions; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? c1 : c2;
      ctx.fillRect(x * step, y * step, step, step);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(groundSize / 4, groundSize / 4);
  return tex;
}

const checkerTex = makeCheckerTexture(512, 16, '#1e293b', '#0f172a');
const groundMat = new THREE.MeshStandardMaterial({
  map: checkerTex,
  roughness: 0.85,
  metalness: 0.05,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ─── Obstacles ───────────────────────────────────────────────────────────────
const obstacles = [];

function createBoxObstacle(x, y, z, w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color: color || 0x334155,
    roughness: 0.7,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  obstacles.push({
    mesh,
    min: new THREE.Vector3(x - w / 2, y, z - d / 2),
    max: new THREE.Vector3(x + w / 2, y + h, z + d / 2),
  });
  return mesh;
}

const obstacleConfigs = [
  [8, 0, 8, 2, 3, 2, 0x3b82f6],
  [-8, 0, 8, 2, 2, 2, 0x6366f1],
  [12, 0, -5, 3, 4, 3, 0x8b5cf6],
  [-12, 0, -5, 3, 2, 3, 0xec4899],
  [0, 0, 14, 4, 2, 2, 0x10b981],
  [-5, 0, -12, 2, 5, 2, 0xf59e0b],
  [15, 0, 10, 2, 3, 2, 0xef4444],
  [-15, 0, 2, 2, 2, 4, 0x14b8a6],
  [5, 0, -15, 3, 3, 3, 0x84cc16],
  [-10, 0, 15, 2, 4, 2, 0xf97316],
  [20, 0, 0, 2, 6, 2, 0x06b6d4],
  [-20, 0, 0, 2, 2, 6, 0xa855f7],
  [0, 0, -20, 6, 2, 2, 0x22c55e],
  [8, 0, -8, 2, 2, 2, 0xf43f5e],
  [-8, 0, -8, 2, 2, 2, 0x2dd4bf],
];

obstacleConfigs.forEach(([x, y, z, w, h, d, c]) => createBoxObstacle(x, y, z, w, h, d, c));

// ─── Character ───────────────────────────────────────────────────────────────
const character = new THREE.Group();
character.position.set(0, 0, 0);
scene.add(character);

// Materials
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5, metalness: 0.1 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.6, metalness: 0.0 });
const limbMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7, metalness: 0.1 });

// Body (capsule approximated with cylinder + spheres)
const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12);
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
bodyMesh.position.y = 0.9;
bodyMesh.castShadow = true;
character.add(bodyMesh);

// Head (sphere)
const headGeo = new THREE.SphereGeometry(0.28, 16, 12);
const headMesh = new THREE.Mesh(headGeo, headMat);
headMesh.position.y = 1.73;
headMesh.castShadow = true;
character.add(headMesh);

// Arms
const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
const leftArmPivot = new THREE.Group();
leftArmPivot.position.set(-0.5, 1.1, 0);
const leftArm = new THREE.Mesh(armGeo, limbMat);
leftArm.position.y = -0.325;
leftArm.castShadow = true;
leftArmPivot.add(leftArm);
character.add(leftArmPivot);

const rightArmPivot = new THREE.Group();
rightArmPivot.position.set(0.5, 1.1, 0);
const rightArm = new THREE.Mesh(armGeo, limbMat);
rightArm.position.y = -0.325;
rightArm.castShadow = true;
rightArmPivot.add(rightArm);
character.add(rightArmPivot);

// Legs
const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
const leftLegPivot = new THREE.Group();
leftLegPivot.position.set(-0.18, 0.4, 0);
const leftLeg = new THREE.Mesh(legGeo, limbMat);
leftLeg.position.y = -0.35;
leftLeg.castShadow = true;
leftLegPivot.add(leftLeg);
character.add(leftLegPivot);

const rightLegPivot = new THREE.Group();
rightLegPivot.position.set(0.18, 0.4, 0);
const rightLeg = new THREE.Mesh(legGeo, limbMat);
rightLeg.position.y = -0.35;
rightLeg.castShadow = true;
rightLegPivot.add(rightLeg);
character.add(rightLegPivot);

// Character bounding box for AABB collision (feet at y=0)
const charHalfW = 0.35;
const charHalfH = 1.8;
const charHalfD = 0.35;

// ─── Controls (OrbitControls with character follow) ──────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minPolarAngle = 0.1;
controls.target.copy(character.position).add(new THREE.Vector3(0, 1, 0));

// ─── Input State ─────────────────────────────────────────────────────────────
const keys = { w: false, a: false, s: false, d: false, space: false };
let pointerLocked = false;

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': keys.w = true; break;
    case 'KeyA': keys.a = true; break;
    case 'KeyS': keys.s = true; break;
    case 'KeyD': keys.d = true; break;
    case 'Space': keys.space = true; break;
  }
  e.preventDefault();
}, { passive: false });

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': keys.w = false; break;
    case 'KeyA': keys.a = false; break;
    case 'KeyS': keys.s = false; break;
    case 'KeyD': keys.d = false; break;
    case 'Space': keys.space = false; break;
  }
});

// ─── Physics State ───────────────────────────────────────────────────────────
const velocity = new THREE.Vector3();
const gravity = -22;
const jumpForce = 9;
let onGround = true;
const moveSpeed = 6;

// Camera orbit state (theta/phi in radians)
let camTheta = Math.PI; // horizontal angle around character
let camPhi = Math.PI / 6; // vertical angle
let camDist = 10;
let camTargetTheta = camTheta;
let camTargetPhi = camPhi;
let camTargetDist = camDist;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Mouse drag for orbit override
renderer.domElement.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

document.addEventListener('mouseup', () => { isDragging = false; });

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  camTargetTheta -= dx * 0.008;
  camTargetPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, camTargetPhi + dy * 0.008));
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

// Scroll to zoom
renderer.domElement.addEventListener('wheel', (e) => {
  camTargetDist = Math.max(2, Math.min(25, camTargetDist + e.deltaY * 0.01));
}, { passive: true });

// Touch support
let lastTouchX = 0, lastTouchY = 0, lastPinchDist = 0;
renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    lastPinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
});
renderer.domElement.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const dx = e.touches[0].clientX - lastTouchX;
    const dy = e.touches[0].clientY - lastTouchY;
    camTargetTheta -= dx * 0.01;
    camTargetPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, camTargetPhi + dy * 0.01));
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    camTargetDist = Math.max(2, Math.min(25, camTargetDist - (dist - lastPinchDist) * 0.03));
    lastPinchDist = dist;
  }
}, { passive: false });

// ─── AABB Collision ───────────────────────────────────────────────────────────
function aabbOverlap(minA, maxA, minB, maxB) {
  return (
    minA.x < maxB.x && maxA.x > minB.x &&
    minA.y < maxB.y && maxA.y > minB.y &&
    minA.z < maxB.z && maxA.z > minB.z
  );
}

function resolveCollisions(pos) {
  const charMin = new THREE.Vector3(pos.x - charHalfW, pos.y, pos.z - charHalfD);
  const charMax = new THREE.Vector3(pos.x + charHalfW, pos.y + charHalfH, pos.z + charHalfD);

  for (const obs of obstacles) {
    if (aabbOverlap(charMin, charMax, obs.min, obs.max)) {
      // Find smallest overlap axis and push out
      const overlapX = Math.min(charMax.x - obs.min.x, obs.max.x - charMin.x);
      const overlapZ = Math.min(charMax.z - obs.min.z, obs.max.z - charMin.z);
      const overlapY = Math.min(charMax.y - obs.min.y, obs.max.y - charMin.y);

      if (overlapX <= overlapY && overlapX <= overlapZ) {
        // Push on X
        if (pos.x < (obs.min.x + obs.max.x) / 2) {
          pos.x = obs.min.x - charHalfW;
        } else {
          pos.x = obs.max.x + charHalfW;
        }
        velocity.x = 0;
      } else if (overlapZ <= overlapY && overlapZ <= overlapX) {
        // Push on Z
        if (pos.z < (obs.min.z + obs.max.z) / 2) {
          pos.z = obs.min.z - charHalfD;
        } else {
          pos.z = obs.max.z + charHalfD;
        }
        velocity.z = 0;
      } else {
        // Push on Y (top/bottom of obstacle)
        if (pos.y < (obs.min.y + obs.max.y) / 2) {
          pos.y = obs.min.y;
          onGround = true;
          velocity.y = 0;
        } else {
          pos.y = obs.max.y + charHalfH;
          velocity.y = 0;
        }
      }

      // Re-check bounds after push
      charMin.set(pos.x - charHalfW, pos.y, pos.z - charHalfD);
      charMax.set(pos.x + charHalfW, pos.y + charHalfH, pos.z + charHalfD);
    }
  }

  // Clamp to ground boundary
  const halfGround = groundSize / 2 - 0.5;
  pos.x = Math.max(-halfGround, Math.min(halfGround, pos.x));
  pos.z = Math.max(-halfGround, Math.min(halfGround, pos.z));
}

// ─── Animation State ─────────────────────────────────────────────────────────
let walkCycle = 0;
let isWalking = false;
let facingAngle = 0;

// ─── Clock ───────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

// ─── Attach to window ────────────────────────────────────────────────────────
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.character = character;

// ─── Main Loop ────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // ── Input movement direction (camera-relative) ──
  const moveDir = new THREE.Vector3();
  if (keys.w) moveDir.z -= 1;
  if (keys.s) moveDir.z += 1;
  if (keys.a) moveDir.x -= 1;
  if (keys.d) moveDir.x += 1;

  isWalking = moveDir.length() > 0;
  if (isWalking) moveDir.normalize();

  // Rotate move direction by camera horizontal angle
  const sin = Math.sin(camTargetTheta);
  const cos = Math.cos(camTargetTheta);
  const worldMoveX = moveDir.x * cos + moveDir.z * sin;
  const worldMoveZ = moveDir.x * (-sin) + moveDir.z * cos;

  // Apply movement
  velocity.x = worldMoveX * moveSpeed;
  velocity.z = worldMoveZ * moveSpeed;

  // Jump
  if (keys.space && onGround) {
    velocity.y = jumpForce;
    onGround = false;
  }

  // Gravity
  if (!onGround) {
    velocity.y += gravity * dt;
  }

  // Update position
  character.position.x += velocity.x * dt;
  character.position.y += velocity.y * dt;
  character.position.z += velocity.z * dt;

  // Ground collision
  if (character.position.y <= 0) {
    character.position.y = 0;
    velocity.y = 0;
    onGround = true;
  } else {
    // Check if landed on top of an obstacle
    if (character.position.y <= 0.05) {
      character.position.y = 0;
      velocity.y = 0;
      onGround = true;
    }
  }

  // AABB collision resolution
  resolveCollisions(character.position);

  // Face movement direction
  if (isWalking) {
    const targetAngle = Math.atan2(-worldMoveX, -worldMoveZ);
    let diff = targetAngle - facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    facingAngle += diff * 10 * dt;
    character.rotation.y = facingAngle;
  }

  // ── Limb animation ──
  if (isWalking) {
    walkCycle += dt * 8;
    const swing = Math.sin(walkCycle) * 0.6;
    leftArmPivot.rotation.x = swing;
    rightArmPivot.rotation.x = -swing;
    leftLegPivot.rotation.x = -swing * 0.8;
    rightLegPivot.rotation.x = swing * 0.8;

    // Slight body bob
    bodyMesh.position.y = 0.9 + Math.abs(Math.sin(walkCycle * 2)) * 0.05;
    headMesh.position.y = 1.73 + Math.abs(Math.sin(walkCycle * 2)) * 0.05;
  } else {
    // Return to rest pose
    const restSpeed = 8 * dt;
    leftArmPivot.rotation.x *= (1 - restSpeed);
    rightArmPivot.rotation.x *= (1 - restSpeed);
    leftLegPivot.rotation.x *= (1 - restSpeed);
    rightLegPivot.rotation.x *= (1 - restSpeed);
    bodyMesh.position.y += (0.9 - bodyMesh.position.y) * restSpeed;
    headMesh.position.y += (1.73 - headMesh.position.y) * restSpeed;
  }

  // ── Camera orbit ──
  camTheta += (camTargetTheta - camTheta) * 0.1;
  camPhi += (camTargetPhi - camPhi) * 0.1;
  camDist += (camTargetDist - camDist) * 0.1;

  const charCenter = character.position.clone().add(new THREE.Vector3(0, 1, 0));
  camera.position.x = charCenter.x + Math.sin(camTheta) * Math.cos(camPhi) * camDist;
  camera.position.y = charCenter.y + Math.sin(camPhi) * camDist;
  camera.position.z = charCenter.z + Math.cos(camTheta) * Math.cos(camPhi) * camDist;
  camera.lookAt(charCenter);

  controls.target.lerp(charCenter, 0.12);

  renderer.render(scene, camera);
}

animate();

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});