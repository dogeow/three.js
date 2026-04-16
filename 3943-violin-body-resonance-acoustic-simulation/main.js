// 3943. Violin Body Resonance Acoustic Simulation
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0f0a);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 8, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xfff0d0, 0.4));
const keyLight = new THREE.SpotLight(0xffe0a0, 2.0);
keyLight.position.set(10, 20, 10);
scene.add(keyLight);
const fill = new THREE.PointLight(0xd4a056, 0.3, 50);
fill.position.set(-10, 5, 5);
scene.add(fill);

const violin = new THREE.Group();
scene.add(violin);

// Violin top plate (curvy shape)
const topShape = new THREE.Shape();
topShape.moveTo(0, -10);
topShape.bezierCurveTo(5, -9, 6, -6, 5, 0);
topShape.bezierCurveTo(5, 5, 4, 8, 3, 9);
topShape.bezierCurveTo(1.5, 10, 1, 10, 0, 10);
topShape.bezierCurveTo(-1, 10, -1.5, 10, -3, 9);
topShape.bezierCurveTo(-4, 8, -5, 5, -5, 0);
topShape.bezierCurveTo(-6, -6, -5, -9, 0, -10);

const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 });
const topMat = new THREE.MeshStandardMaterial({ color: 0xc8902a, roughness: 0.4, metalness: 0.1 });
const top = new THREE.Mesh(topGeo, topMat);
top.rotation.x = -Math.PI / 2;
top.position.y = 0.2;
violin.add(top);

// f-holes
function createFHole(x, y) {
  const fShape = new THREE.Shape();
  fShape.moveTo(0, -1.5);
  fShape.bezierCurveTo(0.4, -1.2, 0.5, 0, 0.3, 1.5);
  fShape.bezierCurveTo(0.1, 2.5, -0.1, 2.8, -0.2, 2.5);
  fShape.bezierCurveTo(-0.3, 2.0, -0.2, 0.5, 0, -1.5);
  const fGeo = new THREE.ExtrudeGeometry(fShape, { depth: 0.15, bevelEnabled: false });
  const fMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
  const f = new THREE.Mesh(fGeo, fMat);
  f.position.set(x, 0.25, y);
  f.rotation.x = -Math.PI / 2;
  f.scale.setScalar(0.7);
  return f;
}
violin.add(createFHole(1.0, 2.5));
violin.add(createFHole(-1.0, 2.5));

// Bridge
const bridgeGeo = new THREE.BoxGeometry(1.2, 0.2, 0.5);
const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
bridge.position.set(0, 0.35, -1.5);
violin.add(bridge);

// Strings
const stringColors = [0xaaaaaa, 0xcccccc, 0xdddddd, 0xffffff];
const stringGauges = [0.08, 0.06, 0.045, 0.035];
const stringYs = [-0.5, -1.0, -1.5, -2.0];
const stringMeshes = [];

for (let i = 0; i < 4; i++) {
  const stringGeo = new THREE.CylinderGeometry(stringGauges[i], stringGauges[i], 14, 8);
  const stringMat = new THREE.MeshStandardMaterial({ color: stringColors[i], metalness: 0.9, roughness: 0.2 });
  const string = new THREE.Mesh(stringGeo, stringMat);
  string.position.set(0, 0.3, stringYs[i]);
  string.rotation.x = Math.PI / 2;
  stringMeshes.push(string);
  violin.add(string);
}

// Neck
const neckGeo = new THREE.BoxGeometry(0.5, 1, 8);
const neckMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
const neck = new THREE.Mesh(neckGeo, neckMat);
neck.position.set(0, 0.1, -7);
violin.add(neck);

// Scroll
const scrollGeo = new THREE.SphereGeometry(0.7, 12, 8);
const scroll = new THREE.Mesh(scrollGeo, neckMat);
scroll.position.set(0, 0.1, -11.5);
scroll.scale.set(1, 1, 1.5);
violin.add(scroll);

// Vibration mode plane
const modePlaneGeo = new THREE.PlaneGeometry(12, 16, 48, 48);
const modePlaneMat = new THREE.MeshStandardMaterial({
  color: 0xd4a056, transparent: true, opacity: 0.2,
  wireframe: true, roughness: 0.5
});
const modePlane = new THREE.Mesh(modePlaneGeo, modePlaneMat);
modePlane.position.y = -0.5;
modePlane.rotation.x = -Math.PI / 2;
violin.add(modePlane);

// Sound post
const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
const postMat = new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.5 });
const soundPost = new THREE.Mesh(postGeo, postMat);
soundPost.position.set(0.8, 0, -3);
soundPost.rotation.x = Math.PI / 2;
violin.add(soundPost);

// Modes
const modes = [
  { n: 1, m: 1, name: 'T1', freq: 440 },
  { n: 2, m: 1, name: 'T2', freq: 520 },
  { n: 1, m: 2, name: 'T3', freq: 650 },
  { n: 2, m: 2, name: 'T4/C2', freq: 880 },
];
let modeIndex = 0;
let activeString = -1;
let stringGlowTime = 0;
let bowAnimating = false;
let bowTime = 0;

function setMode(idx) {
  modeIndex = idx % modes.length;
  const m = modes[modeIndex];
  currentMode.n = m.n; currentMode.m = m.m;
  currentMode.freq = m.freq;
}

const currentMode = { n: 1, m: 1, freq: 440, amplitude: 0.3 };

function plateDisplacement(x, z, t) {
  const { n, m, freq, amplitude } = currentMode;
  const Lx = 6, Lz = 10;
  const dx = Math.sin(n * Math.PI * (x + Lx) / (2 * Lx)) * Math.sin(m * Math.PI * (z + Lz) / (2 * Lz));
  return dx * amplitude * Math.sin(2 * Math.PI * freq * t);
}

function updateViolinVibration(t) {
  const positions = modePlaneGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);
    const y = positions.getZ(i);
    const disp = plateDisplacement(x, z, t);
    positions.setZ(i, y + disp);
  }
  positions.needsUpdate = true;
  modePlaneGeo.computeVertexNormals();

  if (activeString >= 0) {
    stringGlowTime += 0.016;
    const glow = 0.5 + 0.5 * Math.sin(stringGlowTime * currentMode.freq * 0.1);
    stringMeshes[activeString].material.emissive = new THREE.Color(stringColors[activeString]);
    stringMeshes[activeString].material.emissiveIntensity = glow * 0.5;
  }

  const wobble = Math.sin(2 * Math.PI * currentMode.freq * t) * 0.02;
  bridge.position.y = 0.35 + wobble;
  bridge.rotation.z = wobble * 2;
}

function playString(idx) {
  activeString = idx;
  stringGlowTime = 0;
  setMode(idx);
}

document.getElementById('playG').addEventListener('click', () => playString(0));
document.getElementById('playD').addEventListener('click', () => playString(1));
document.getElementById('playA').addEventListener('click', () => playString(2));
document.getElementById('playE').addEventListener('click', () => playString(3));
document.getElementById('bowBtn').addEventListener('click', () => { bowAnimating = !bowAnimating; });

let orbitAngle = 0;
let mouseDown = false, lastX = 0;
renderer.domElement.addEventListener('mousedown', e => { mouseDown = true; lastX = e.clientX; });
window.addEventListener('mouseup', () => mouseDown = false);
window.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  orbitAngle -= (e.clientX - lastX) * 0.005;
  lastX = e.clientX;
});

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  const t = now / 1000;

  orbitAngle += dt * 0.05;
  camera.position.x = Math.sin(orbitAngle) * 18;
  camera.position.z = Math.cos(orbitAngle) * 18;
  camera.position.y = 8 + Math.sin(orbitAngle * 0.3) * 3;
  camera.lookAt(0, 0, 0);

  updateViolinVibration(t);

  if (bowAnimating) {
    bowTime += dt;
    const bowZ = -1.5 + Math.sin(bowTime * 4) * 3;
    bridge.position.z = bowZ;
    bridge.position.x = Math.sin(bowTime * 4) * 0.1;
  }

  renderer.render(scene, camera);
}
animate();
