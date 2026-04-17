import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151821);
scene.fog = new THREE.FogExp2(0x151821, 0.01);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 8, 20);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.95));
const dir = new THREE.DirectionalLight(0xffe0ad, 3.2);
dir.position.set(22, 34, 16);
scene.add(dir);
scene.add(new THREE.HemisphereLight(0x8dc7ff, 0x2b2115, 0.9));
const fillSun = new THREE.DirectionalLight(0xfff3d6, 1.6);
fillSun.position.set(-18, 18, -10);
scene.add(fillSun);

// Sun marker
const sunMarker = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffeebb })
);
sunMarker.position.set(20, 30, 20);
scene.add(sunMarker);

const haloMarker = new THREE.Mesh(
  new THREE.SphereGeometry(3.5, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffeebb, transparent: true, opacity: 0.08 })
);
haloMarker.position.copy(sunMarker.position);
scene.add(haloMarker);

const sunGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.45 })
);
sunGlow.position.copy(sunMarker.position);
sunGlow.scale.setScalar(9);
scene.add(sunGlow);

// Scene objects
const grid = new THREE.GridHelper(200, 40, 0x31557a, 0x182434);
scene.add(grid);

const mat1 = new THREE.MeshStandardMaterial({ color: 0x607aa3, roughness: 0.55, metalness: 0.22 });
const mat2 = new THREE.MeshStandardMaterial({ color: 0xa95f73, roughness: 0.5, metalness: 0.22 });
const mat3 = new THREE.MeshStandardMaterial({ color: 0x5a9a74, roughness: 0.55, metalness: 0.22 });
const mats = [mat1, mat2, mat3];

for (let i = 0; i < 20; i++) {
  const geo = new THREE.BoxGeometry(
    1 + Math.random() * 3,
    1 + Math.random() * 4,
    1 + Math.random() * 3
  );
  const mesh = new THREE.Mesh(geo, mats[i % 3]);
  mesh.position.set(
    (Math.random() - 0.5) * 80,
    Math.random() * 2 + 0.5,
    (Math.random() - 0.5) * 80
  );
  mesh.rotation.y = Math.random() * Math.PI;
  scene.add(mesh);
}

for (let i = 0; i < 10; i++) {
  const geo = new THREE.CylinderGeometry(0.5 + Math.random(), 0.5 + Math.random(), 2 + Math.random() * 3, 8);
  const mesh = new THREE.Mesh(geo, mat1);
  mesh.position.set(
    (Math.random() - 0.5) * 80,
    geo.parameters.height / 2,
    (Math.random() - 0.5) * 80
  );
  scene.add(mesh);
}

for (let i = 0; i < 8; i++) {
  const geo = new THREE.SphereGeometry(0.5 + Math.random() * 1.5, 16, 12);
  const mesh = new THREE.Mesh(geo, mat3);
  mesh.position.set(
    (Math.random() - 0.5) * 80,
    geo.parameters.radius,
    (Math.random() - 0.5) * 80
  );
  scene.add(mesh);
}

// ── Controls ──────────────────────────────────────────────────────────────
let controls = null;

function disposeControls() {
  if (!controls) return;
  controls.dispose();
  controls = null;
}

function setOrbit() {
  disposeControls();
  camera.position.set(0, 8, 20);
  camera.rotation.set(0, 0, 0);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 200;
}

function setFirstPerson() {
  disposeControls();
  camera.position.set(0, 2, 5);
  camera.rotation.set(0, 0, 0);
  controls = new FirstPersonControls(camera, renderer.domElement);
  controls.movementSpeed = 20;
  controls.lookSpeed = 0.05;
  controls.lookVertical = true;
}

function setFly() {
  disposeControls();
  camera.position.set(0, 10, 30);
  camera.rotation.set(0, 0, 0);
  controls = new FlyControls(camera, renderer.domElement);
  controls.movementSpeed = 20;
  controls.rollSpeed = 0.05;
}

// Button handlers
document.getElementById('btn-orbit').addEventListener('click', () => {
  setOrbit();
  setActive('btn-orbit');
});

document.getElementById('btn-first').addEventListener('click', () => {
  setFirstPerson();
  setActive('btn-first');
});

document.getElementById('btn-fly').addEventListener('click', () => {
  setFly();
  setActive('btn-fly');
});

function setActive(id) {
  document.querySelectorAll('#ctrl-btns button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Init orbit
setOrbit();
setActive('btn-orbit');

// ── Resize ──────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Loop ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (controls && controls.update) {
    controls.update(delta);
  }
  renderer.render(scene, camera);
}

animate();
