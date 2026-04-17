import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Color Schemes ---
const schemes = {
  ice:      { accent: new THREE.Color(0xa8e6ff), secondary: new THREE.Color(0xd4f4ff), bg: 0x050a10, spark: 0xffffff },
  amethyst: { accent: new THREE.Color(0xc77dff), secondary: new THREE.Color(0xe4b3ff), bg: 0x0a0510, spark: 0xffffff },
  emerald:  { accent: new THREE.Color(0x7fffb2), secondary: new THREE.Color(0xb3ffd9), bg: 0x05100a, spark: 0xffffff },
  ruby:     { accent: new THREE.Color(0xff7a7a), secondary: new THREE.Color(0xffb3b3), bg: 0x100505, spark: 0xffffff },
  gold:     { accent: new THREE.Color(0xffd700), secondary: new THREE.Color(0xfff4b3), bg: 0x100f05, spark: 0xffffff },
};
let currentScheme = 'ice';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(schemes[currentScheme].bg, 0.015);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 10, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
document.body.appendChild(renderer.domElement);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 8;
controls.maxDistance = 50;
controls.target.set(0, 1, 0);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0x334455, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
dirLight.position.set(8, 18, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 60;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0x88aaff, 1.2);
rimLight.position.set(-10, 5, -10);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xa8e6ff, 1.5, 30);
fillLight.position.set(0, 6, 0);
scene.add(fillLight);

// --- Ground Plane ---
const groundGeo = new THREE.PlaneGeometry(60, 60, 1, 1);
const groundMat = new THREE.MeshPhysicalMaterial({
  color: 0x111318,
  metalness: 0.2,
  roughness: 0.3,
  reflectivity: 0.8,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- Crystal System ---
let crystals = [];
let crystalData = []; // { mesh, targetScale, currentScale, delay, growthSpeed }
let growthPhase = true;
let growthStartTime = 0;

const CRYSTAL_COUNT_MIN = 30;
const CRYSTAL_COUNT_MAX = 50;
const CYCLE_DURATION = 5; // seconds

function disposeCrystals() {
  for (const cd of crystalData) {
    scene.remove(cd.mesh);
    cd.mesh.geometry.dispose();
    cd.mesh.material.dispose();
  }
  crystals = [];
  crystalData = [];
}

function hexToRgb(hex) {
  return new THREE.Color(hex);
}

function createCrystalMesh(scheme) {
  // Elongated octahedron: scale Y to make it tall and pointed
  const geo = new THREE.OctahedronGeometry(1, 0);

  const schemeData = schemes[scheme];
  const isAccent = Math.random() > 0.3;
  const color = isAccent ? schemeData.accent : schemeData.secondary;

  const mat = new THREE.MeshPhysicalMaterial({
    color: color,
    metalness: Math.random() * 0.4 + 0.3,
    roughness: Math.random() * 0.1 + 0.02,
    transmission: 0.6 + Math.random() * 0.35,
    thickness: 1.0 + Math.random() * 2.0,
    ior: 1.5 + Math.random() * 0.8,
    iridescence: 0.8 + Math.random() * 0.2,
    iridescenceIOR: 1.3 + Math.random() * 0.3,
    iridescenceThicknessRange: [100, 400],
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 2.5,
    transparent: true,
    opacity: 0.92,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function generateCrystals() {
  disposeCrystals();
  growthPhase = true;
  growthStartTime = performance.now() / 1000;

  const count = Math.floor(Math.random() * (CRYSTAL_COUNT_MAX - CRYSTAL_COUNT_MIN + 1)) + CRYSTAL_COUNT_MIN;
  const schemeData = schemes[currentScheme];

  for (let i = 0; i < count; i++) {
    const mesh = createCrystalMesh(currentScheme);

    // Position on ground, avoiding center area slightly for variation
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 9 + 1;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    mesh.position.set(x, 0, z);

    // Random rotation
    mesh.rotation.x = (Math.random() - 0.5) * 0.5;
    mesh.rotation.z = (Math.random() - 0.5) * 0.5;
    mesh.rotation.y = Math.random() * Math.PI * 2;

    // Scale: tall and elongated
    const sx = Math.random() * 0.5 + 0.25;
    const sy = Math.random() * 1.8 + 0.8;
    const sz = Math.random() * 0.5 + 0.25;
    const targetScale = new THREE.Vector3(sx, sy, sz);

    mesh.scale.set(0, 0, 0);

    scene.add(mesh);

    const cd = {
      mesh,
      targetScale: targetScale.clone(),
      currentScale: new THREE.Vector3(0, 0, 0),
      delay: Math.random() * 1.5,
      growthSpeed: 0.8 + Math.random() * 1.2,
      rotYSpeed: (Math.random() - 0.5) * 0.15,
    };
    crystals.push(mesh);
    crystalData.push(cd);
  }
}

// --- Background Sparkles ---
let sparkles = [];
const SPARKLE_COUNT = 200;

function createSparkles() {
  for (const s of sparkles) {
    scene.remove(s.mesh);
    s.mesh.geometry.dispose();
    s.mesh.material.dispose();
  }
  sparkles = [];

  const geo = new THREE.SphereGeometry(0.04, 4, 4);
  const schemeData = schemes[currentScheme];

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: schemeData.spark,
      transparent: true,
      opacity: Math.random() * 0.7 + 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = 12 + Math.random() * 16;
    mesh.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      Math.random() * 14 + 2,
      r * Math.sin(phi) * Math.sin(theta)
    );

    scene.add(mesh);
    sparkles.push({
      mesh,
      baseOpacity: Math.random() * 0.5 + 0.2,
      twinkleSpeed: Math.random() * 2 + 0.5,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
}

// --- UI Controls ---
let speedMultiplier = 1;
const speedSlider = document.getElementById('speedSlider');
speedSlider.addEventListener('input', (e) => {
  speedMultiplier = parseFloat(e.target.value);
  controls.autoRotateSpeed = 0.6 * speedMultiplier;
});

const regenBtn = document.getElementById('regenBtn');
regenBtn.addEventListener('click', () => {
  generateCrystals();
  createSparkles();
  cycleTimer = CYCLE_DURATION;
});

const schemeBtns = document.querySelectorAll('.scheme-btn');
schemeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    schemeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentScheme = btn.dataset.scheme;

    const sd = schemes[currentScheme];
    scene.fog.color.setHex(sd.bg);
    renderer.setClearColor(sd.bg);
    fillLight.color.set(sd.accent);
    fillLight.color.convertSRGBToLinear();

    // Update crystal materials
    for (const cd of crystalData) {
      const isAccent = Math.random() > 0.3;
      const color = isAccent ? sd.accent : sd.secondary;
      cd.mesh.material.color.copy(color);
    }

    createSparkles();
    cycleTimer = CYCLE_DURATION;
  });
});

// --- Cycle Timer ---
let cycleTimer = CYCLE_DURATION;
const countdownEl = document.getElementById('countdown');

// --- Apply initial background ---
renderer.setClearColor(schemes[currentScheme].bg);
scene.fog.color.setHex(schemes[currentScheme].bg);

// --- Generate Initial Scene ---
generateCrystals();
createSparkles();

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  const delta = clock.getDelta();

  // Update controls
  controls.update();

  // Crystal growth animation
  if (growthPhase) {
    let allDone = true;
    const now = performance.now() / 1000;

    for (const cd of crystalData) {
      const timeSinceStart = now - growthStartTime - cd.delay;
      if (timeSinceStart < 0) {
        allDone = false;
        continue;
      }

      const t = Math.min(timeSinceStart / cd.growthSpeed, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);

      cd.currentScale.lerpVectors(
        new THREE.Vector3(0, 0, 0),
        cd.targetScale,
        eased
      );
      cd.mesh.scale.copy(cd.currentScale);

      if (t < 1) allDone = false;
    }

    if (allDone && crystalData.length > 0) growthPhase = false;
  }

  // Gentle crystal sway / wobble
  for (const cd of crystalData) {
    if (!growthPhase || cd.mesh.scale.x > 0.01) {
      cd.mesh.rotation.y += cd.rotYSpeed * 0.016 * speedMultiplier;
      cd.mesh.rotation.x = Math.sin(elapsed * 0.4 + cd.delay) * 0.03;
      cd.mesh.rotation.z = Math.cos(elapsed * 0.3 + cd.delay) * 0.03;
    }
  }

  // Sparkle twinkling
  for (const s of sparkles) {
    const tw = Math.sin(elapsed * s.twinkleSpeed + s.twinkleOffset);
    s.mesh.material.opacity = s.baseOpacity * (0.3 + tw * 0.7);
    s.mesh.scale.setScalar(0.5 + tw * 0.5);
  }

  // Fill light subtle animation
  fillLight.position.x = Math.sin(elapsed * 0.3) * 4;
  fillLight.position.z = Math.cos(elapsed * 0.3) * 4;

  // Cycle timer
  cycleTimer -= 0.016 * speedMultiplier;
  if (cycleTimer <= 0) {
    cycleTimer = CYCLE_DURATION;
    generateCrystals();
    createSparkles();
  }
  countdownEl.textContent = Math.max(0, cycleTimer).toFixed(1);

  renderer.render(scene, camera);
}

animate();

// --- Resize Handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Attach to window for debugging ---
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.crystals = crystals;
window.crystalData = crystalData;