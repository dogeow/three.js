// 3946. Ancient Typewriter Mechanism Reconstruction
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1f14);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 20, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffe0a0, 0.5));
const key = new THREE.DirectionalLight(0xffe0a0, 1.0);
key.position.set(5, 20, 10);
scene.add(key);
const fill = new THREE.PointLight(0xd4a056, 0.3, 50);
fill.position.set(-10, 5, 5);
scene.add(fill);

// Typewriter body
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9, metalness: 0.2 });
const bodyGroup = new THREE.Group();
scene.add(bodyGroup);

// Base frame
const baseGeo = new THREE.BoxGeometry(36, 2, 20);
const base = new THREE.Mesh(baseGeo, bodyMat);
base.position.y = 0;
bodyGroup.add(base);

// Keyboard bed (sloped)
const kbGeo = new THREE.BoxGeometry(32, 1, 14);
const kb = new THREE.Mesh(kbGeo, bodyMat);
kb.position.set(0, 1.5, 4);
kb.rotation.x = 0.2;
bodyGroup.add(kb);

// Key layout (QWERTY simplified, 3 rows)
const keyLayout = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M']
];

const keyMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.7, metalness: 0.3 });
const keyCapMat = new THREE.MeshStandardMaterial({ color: 0x4a3820, roughness: 0.6, metalness: 0.4 });

const keyMeshes = {};
const keyGroup = new THREE.Group();
keyGroup.position.set(-13, 2.2, 1);
keyGroup.rotation.x = 0.2;

for (let row = 0; row < keyLayout.length; row++) {
  for (let col = 0; col < keyLayout[row].length; col++) {
    const keyGeo = new THREE.BoxGeometry(2.2, 0.6, 2.2);
    const key = new THREE.Mesh(keyGeo, keyCapMat.clone());
    const xOffset = row === 1 ? 1.2 : row === 2 ? 2.4 : 0;
    key.position.set(col * 2.5 + xOffset, 0, row * 2.4);
    key.userData = { letter: keyLayout[row][col], row, col, pressed: false, pressAmount: 0 };
    keyMeshes[keyLayout[row][col]] = key;
    keyGroup.add(key);
  }
}
bodyGroup.add(keyGroup);

// Typebars (segmented fan of striking arms)
const typebarGroup = new THREE.Group();
typebarGroup.position.set(-12, 4, -6);

const typebarData = {};
const letters = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');
const typebarCount = letters.length;

for (let i = 0; i < typebarCount; i++) {
  const angle = (i / typebarCount) * Math.PI - Math.PI / 2;
  const length = 12 + Math.random() * 3;
  const barGeo = new THREE.BoxGeometry(0.3, length, 0.15);
  const barMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
  const bar = new THREE.Mesh(barGeo, barMat);

  bar.position.set(
    Math.sin(angle) * length / 2,
    Math.cos(angle) * length / 2,
    0
  );
  bar.rotation.z = angle + Math.PI / 2;

  bar.userData = { letter: letters[i], restAngle: angle + Math.PI / 2, strikeAngle: -0.3 };

  typebarGroup.add(bar);
  typebarData[letters[i]] = bar;
}
bodyGroup.add(typebarGroup);

// Ribbon carriage
const carriageGroup = new THREE.Group();
carriageGroup.position.set(-14, 3, -8);
bodyGroup.add(carriageGroup);

// Carriage rail
const railGeo = new THREE.CylinderGeometry(0.2, 0.2, 32, 8);
const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
const rail = new THREE.Mesh(railGeo, railMat);
rail.rotation.z = Math.PI / 2;
rail.position.y = 0;
carriageGroup.add(rail);

// Paper cylinder (platen)
const platenGeo = new THREE.CylinderGeometry(1.5, 1.5, 26, 16);
const platenMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8, metalness: 0.1 });
const platen = new THREE.Mesh(platenGeo, platenMat);
platen.rotation.z = Math.PI / 2;
platen.position.set(0, 1.5, 0);
carriageGroup.add(platen);

// Ribbon spool left
const spoolGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.8, 12);
const spoolMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 });
const spoolL = new THREE.Mesh(spoolGeo, spoolMat);
spoolL.rotation.z = Math.PI / 2;
spoolL.position.set(-12, 0, 0);
carriageGroup.add(spoolL);

// Ribbon spool right
const spoolR = new THREE.Mesh(spoolGeo, spoolMat);
spoolR.rotation.z = Math.PI / 2;
spoolR.position.set(12, 0, 0);
carriageGroup.add(spoolR);

// Ribbon
const ribbonGeo = new THREE.PlaneGeometry(24, 1.2);
const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, side: THREE.DoubleSide, roughness: 0.9 });
const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
ribbon.position.set(0, 0.8, 0);
carriageGroup.add(ribbon);

// Paper
const paperGeo = new THREE.PlaneGeometry(24, 10);
const paperMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e0, side: THREE.DoubleSide, roughness: 0.9 });
const paper = new THREE.Mesh(paperGeo, paperMat);
paper.position.set(0, 1.6, 0);
paper.rotation.x = -0.05;
carriageGroup.add(paper);

// Printed characters on paper (as small meshes)
const printedChars = [];
function printChar(char) {
  const xPos = (carriageGroup.position.x + 14) * 0.9 - 12 + printedChars.length * 0.8;
  const charGeo = new THREE.PlaneGeometry(0.6, 0.8);
  const charMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.0 });
  const charMesh = new THREE.Mesh(charGeo, charMat);
  charMesh.position.set(xPos, 2.5, -0.1);
  carriageGroup.add(charMesh);
  printedChars.push({ mesh: charMesh, opacity: 0.0 });
}

// Animate typebar strike
function strikeKey(letter) {
  const bar = typebarData[letter];
  if (!bar) return;

  const key = keyMeshes[letter];
  if (key) {
    key.userData.pressed = true;
    key.position.y -= 0.4;
  }

  // Animate typebar striking
  const startAngle = bar.rotation.z;
  const targetAngle = bar.userData.strikeAngle;
  let t = 0;

  const strikeAnim = setInterval(() => {
    t += 0.15;
    if (t < 0.5) {
      bar.rotation.z = startAngle + (targetAngle - startAngle) * (t / 0.5);
    } else if (t < 1.0) {
      bar.rotation.z = targetAngle + (startAngle - targetAngle) * ((t - 0.5) / 0.5);
    } else {
      bar.rotation.z = startAngle;
      clearInterval(strikeAnim);
    }
    if (key && t >= 1.0) {
      key.position.y += 0.4;
      key.userData.pressed = false;
    }
  }, 16);

  // Advance carriage slightly
  carriageGroup.position.x += 0.8;
  if (carriageGroup.position.x > 10) carriageGroup.position.x = -10;

  // Print character
  printChar(letter);
}

function autoType() {
  const allLetters = 'ETAOINSHRDLU'.split('');
  let idx = 0;
  const interval = setInterval(() => {
    strikeKey(allLetters[idx % allLetters.length]);
    idx++;
    if (idx > 30) clearInterval(interval);
  }, 200);
}

function reset() {
  carriageGroup.position.x = -14;
  printedChars.forEach(c => carriageGroup.remove(c.mesh));
  printedChars.length = 0;
}

document.getElementById('typeBtn').addEventListener('click', autoType);
document.getElementById('resetBtn').addEventListener('click', reset);

// Keyboard click handlers
Object.entries(keyMeshes).forEach(([letter, key]) => {
  key.userData.letter = letter;
  key.callback = () => strikeKey(letter);
  key.material.emissive = new THREE.Color(0x000000);
});

// Raycaster for clicking keys
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(keyGroup.children, true);
  for (const hit of intersects) {
    let obj = hit.object;
    while (obj && !obj.userData.letter) obj = obj.parent;
    if (obj && obj.userData.letter && obj.callback) {
      obj.callback();
      break;
    }
  }
});

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
  camera.position.z = Math.max(15, Math.min(60, camera.position.z + e.deltaY * 0.05));
});

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  // Rotate spools slowly
  spoolL.rotation.x += dt * 0.5;
  spoolR.rotation.x -= dt * 0.5;

  // Animate printed characters appearing
  printedChars.forEach(c => {
    if (c.opacity < 1.0) c.opacity = Math.min(1.0, c.opacity + dt * 5);
    c.mesh.material.opacity = c.opacity;
  });

  orbitAngle += dt * 0.04;
  camera.position.x = Math.sin(orbitAngle) * 30;
  camera.position.z = Math.cos(orbitAngle) * 30;
  camera.position.y = 20 + Math.sin(orbitAngle * 0.3) * 5;
  camera.lookAt(0, 2, 0);

  renderer.render(scene, camera);
}
animate();
