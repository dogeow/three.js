// 3944. Arch Bridge Stone Stress Analysis — Structural analysis visualization
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c1410);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 15, 40);
camera.lookAt(0, 5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x604830, 0.6));
const sun = new THREE.DirectionalLight(0xffe0a0, 1.2);
sun.position.set(20, 30, 10);
scene.add(sun);

// Stone material
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a8870, roughness: 0.95, metalness: 0.0 });

// Arch bridge construction
function createArchBridge() {
  const group = new THREE.Group();

  // Bridge deck
  const deckGeo = new THREE.BoxGeometry(30, 1, 6);
  const deck = new THREE.Mesh(deckGeo, stoneMat.clone());
  deck.position.set(0, 10, 0);
  group.add(deck);

  // Voussoirs (arch stones)
  const archRadius = 12;
  const numStones = 24;
  const stoneMeshes = [];

  for (let i = 0; i <= numStones; i++) {
    const angle = Math.PI * (i / numStones);
    const x = Math.cos(angle) * archRadius;
    const y = Math.sin(angle) * archRadius;

    const stoneGeo = new THREE.BoxGeometry(1.8, 2.2, 5);
    const sm = new THREE.Mesh(stoneGeo, stoneMat.clone());
    sm.position.set(x, y, 0);
    sm.rotation.z = angle - Math.PI / 2;
    sm.userData = { baseColor: 0x9a8870, stress: 0 };
    stoneMeshes.push(sm);
    group.add(sm);
  }

  // Piers (pillars)
  const pierPositions = [-10, 0, 10];
  for (const px of pierPositions) {
    const height = px === 0 ? 15 : 12;
    const pierGeo = new THREE.BoxGeometry(4, height, 6);
    const pier = new THREE.Mesh(pierGeo, stoneMat.clone());
    pier.position.set(px, height / 2, 0);
    pier.userData = { baseColor: 0x9a8870, stress: 0 };
    group.add(pier);
  }

  // Abutments
  for (const sx of [-16, 16]) {
    const abutGeo = new THREE.BoxGeometry(4, 10, 8);
    const abut = new THREE.Mesh(abutGeo, stoneMat.clone());
    abut.position.set(sx, 5, 0);
    abut.userData = { baseColor: 0x9a8870, stress: 0 };
    group.add(abut);
  }

  return { group, stoneMeshes };
}

const { group: bridgeGroup, stoneMeshes } = createArchBridge();
scene.add(bridgeGroup);

// Ground
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 1.0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Load blocks on deck
const loadBlocks = [];
let loadApplied = false;
let loadTime = 0;

function applyLoad() {
  loadApplied = true;
  loadTime = 0;
  // Add load blocks progressively
  for (let i = 0; i < 15; i++) {
    const blockGeo = new THREE.BoxGeometry(1.5, 1.5, 5);
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
    const block = new THREE.Mesh(blockGeo, blockMat);
    const x = (Math.random() - 0.5) * 26;
    block.position.set(x, 10.75, 0);
    block.userData = { targetY: 10.75, delay: i * 0.1 };
    scene.add(block);
    loadBlocks.push(block);
  }
}

function resetLoad() {
  loadApplied = false;
  loadBlocks.forEach(b => scene.remove(b));
  loadBlocks.length = 0;
  stoneMeshes.forEach(sm => {
    sm.userData.stress = 0;
    sm.material.color.setHex(sm.userData.baseColor);
  });
}

document.getElementById('loadBtn').addEventListener('click', applyLoad);
document.getElementById('resetBtn').addEventListener('click', resetLoad);

// Stress visualization
function updateStress() {
  if (!loadApplied) return;

  stoneMeshes.forEach((sm, i) => {
    // Stress distribution: higher at crown and springing
    const normalizedPos = i / stoneMeshes.length;
    const distFromCrown = Math.abs(normalizedPos - 0.5) * 2; // 0 at crown, 1 at edges
    const baseStress = (1 - distFromCrown * 0.6) * 0.8;

    // Add time-varying load effect
    const loadEffect = Math.min(1, loadTime * 0.5) * 0.3;
    const stress = Math.min(1, baseStress + loadEffect * (1 - distFromCrown));

    sm.userData.stress = stress;

    // Color: green (low) -> yellow -> red (high stress)
    const r = stress;
    const g = (1 - stress) * 0.7;
    const b = 0;
    sm.material.color.setRGB(r, g, b);
    sm.material.emissive = new THREE.Color(r * 0.3, g * 0.1, 0);
  });
}

// Camera orbit
let orbitAngle = 0.3;
let mouseDown = false, lastX = 0;
renderer.domElement.addEventListener('mousedown', e => { mouseDown = true; lastX = e.clientX; });
window.addEventListener('mouseup', () => mouseDown = false);
window.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  orbitAngle -= (e.clientX - lastX) * 0.005;
  lastX = e.clientX;
});
window.addEventListener('wheel', e => {
  camera.position.z = Math.max(20, Math.min(80, camera.position.z + e.deltaY * 0.05));
});

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (loadApplied) {
    loadTime += dt;
    loadBlocks.forEach(b => {
      if (b.userData.delay && loadTime > b.userData.delay) {
        b.position.y = b.userData.targetY;
      }
    });
  }

  updateStress();

  orbitAngle += dt * 0.03;
  camera.position.x = Math.sin(orbitAngle) * 40;
  camera.position.z = Math.cos(orbitAngle) * 40;
  camera.lookAt(0, 5, 0);

  const maxStress = stoneMeshes.length > 0
    ? Math.max(...stoneMeshes.map(s => s.userData.stress))
    : 0;
  const stats = document.getElementById('stats');
  if (stats) stats.textContent = `Load: ${loadApplied ? 'ACTIVE' : 'NONE'} | Max stress: ${(maxStress * 100).toFixed(0)}%`;

  renderer.render(scene, camera);
}
animate();
