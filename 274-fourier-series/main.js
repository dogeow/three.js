import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ─── Scene Setup ──────────────────────────────────────────────────────────────
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d12);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxDistance = 60;
controls.minDistance = 5;

// ─── Config ───────────────────────────────────────────────────────────────────
const params = {
  harmonics: 7,
  waveType: 'square',
  frequency: 1.0,
  particleSpeed: 1.0,
};

// ─── Fourier Math ─────────────────────────────────────────────────────────────
function fourierCoefficient(n, type) {
  if (type === 'square') {
    // a_n = 4/π * 1/n for odd n, 0 for even n
    return n % 2 === 1 ? (4 / Math.PI) * (1 / n) : 0;
  } else if (type === 'sawtooth') {
    // a_n = 2/π * (-1)^(n+1) * 1/n
    return (2 / Math.PI) * (Math.pow(-1, n + 1)) * (1 / n);
  } else if (type === 'triangle') {
    // a_n = 8/π² * 1/n² for odd n (alternating sign), 0 for even n
    if (n % 2 === 0) return 0;
    const sign = ((n - 1) / 2) % 2 === 0 ? 1 : -1;
    return sign * (8 / (Math.PI * Math.PI)) * (1 / (n * n));
  }
  return 0;
}

// Get all coefficients up to N
function getCoefficients(N, type) {
  const coeffs = [];
  for (let n = 1; n <= N; n++) {
    coeffs.push({ n, value: fourierCoefficient(n, type) });
  }
  return coeffs;
}

// Evaluate Fourier series at time t
function fourierSum(t, coeffs) {
  let sum = 0;
  for (const { n, value } of coeffs) {
    sum += value * Math.sin(n * t);
  }
  return sum;
}

// ─── Scene Groups ──────────────────────────────────────────────────────────────
const harmonicGroup = new THREE.Group();
const particleGroup = new THREE.Group();
const waveGroup = new THREE.Group();
const coefficientGroup = new THREE.Group();

scene.add(harmonicGroup, particleGroup, waveGroup, coefficientGroup);

// ─── Coefficient Bars (2D sprites) ───────────────────────────────────────────
const barWidth = 0.22;
const barGap = 0.55;
const barStartX = -3.5;
const barMaxHeight = 4.5;

let barMeshes = [];

function createBarMeshes(maxHarmonics) {
  // Remove old
  barMeshes.forEach(m => coefficientGroup.remove(m));
  barMeshes = [];

  for (let i = 1; i <= maxHarmonics; i++) {
    const geometry = new THREE.BoxGeometry(barWidth, 0.01, 0.18);
    const material = new THREE.MeshBasicMaterial({ color: 0xa5d6a7, transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    coefficientGroup.add(mesh);
    barMeshes.push(mesh);
  }
}

createBarMeshes(20);

function updateCoefficientBars(coeffs) {
  const maxAbs = Math.max(...coeffs.map(c => Math.abs(c.value)), 0.01);
  coeffs.forEach(({ n, value }, i) => {
    if (!barMeshes[i]) return;
    const mesh = barMeshes[i];
    const sign = value >= 0 ? 1 : -1;
    const height = Math.abs(value) / maxAbs * barMaxHeight;
    mesh.scale.y = Math.max(height, 0.02);
    mesh.position.set(barStartX + i * barGap, sign * height * 0.5, 4);
    mesh.visible = i < coeffs.length;
  });
}

// ─── Harmonic Ring Lines ──────────────────────────────────────────────────────
const SPACING = 1.8;
const MAX_HARMONICS = 20;
const WAVE_SEGMENTS = 240;
const RING_RADIUS = 0.9;

let harmonicLines = [];

function createHarmonicLines() {
  harmonicLines.forEach(l => harmonicGroup.remove(l));
  harmonicLines = [];

  for (let i = 0; i < MAX_HARMONICS; i++) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(WAVE_SEGMENTS * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.0,
    });

    const line = new THREE.Line(geometry, material);
    harmonicGroup.add(line);
    harmonicLines.push(line);
  }
}

createHarmonicLines();

function updateHarmonicLines(time, coeffs) {
  coeffs.forEach(({ n, value }, i) => {
    const line = harmonicLines[i];
    if (!line || !line.visible) return;

    const positions = line.geometry.attributes.position.array;
    const yBase = (coeffs.length - 1 - i) * SPACING - (coeffs.length - 1) * SPACING * 0.5;

    for (let j = 0; j < WAVE_SEGMENTS; j++) {
      const angle = (j / WAVE_SEGMENTS) * Math.PI * 2;
      const t = angle + time;
      const x = Math.cos(t) * RING_RADIUS;
      const y = Math.sin(t) * RING_RADIUS + yBase;
      const z = Math.sin(n * t) * value * 2.5;

      positions[j * 3] = x;
      positions[j * 3 + 1] = y;
      positions[j * 3 + 2] = z;
    }

    line.geometry.attributes.position.needsUpdate = true;
    line.material.opacity = i < coeffs.length ? 0.45 : 0;
    line.visible = i < coeffs.length;
  });
}

// ─── Particles on Harmonic Rings ──────────────────────────────────────────────
let particles = [];

function createParticles(maxHarmonics) {
  particles.forEach(p => particleGroup.remove(p));
  particles = [];

  for (let i = 0; i < maxHarmonics; i++) {
    const geometry = new THREE.SphereGeometry(0.055, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    particleGroup.add(mesh);
    particles.push(mesh);
  }
}

createParticles(MAX_HARMONICS);

function updateParticles(time, coeffs) {
  coeffs.forEach(({ n, value }, i) => {
    const p = particles[i];
    if (!p) return;
    p.visible = i < coeffs.length;
    if (!p.visible) return;

    const angle = time % (Math.PI * 2);
    const yBase = (coeffs.length - 1 - i) * SPACING - (coeffs.length - 1) * SPACING * 0.5;
    const x = Math.cos(angle) * RING_RADIUS;
    const y = Math.sin(angle) * RING_RADIUS + yBase;
    const z = Math.sin(n * angle) * value * 2.5;

    p.position.set(x, y, z);
  });
}

// ─── Reconstructed Wave ───────────────────────────────────────────────────────
const waveLineCount = 5;
let waveLines = [];

function createWaveLines() {
  waveLines.forEach(l => waveGroup.remove(l));
  waveLines = [];

  for (let i = 0; i < waveLineCount; i++) {
    const geometry = new THREE.BufferGeometry();
    const count = 512;
    const positions = new Float32Array(count * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const opacity = 0.9 - i * 0.18;
    const material = new THREE.LineBasicMaterial({
      color: i === 0 ? 0xff8a65 : 0xff7043,
      transparent: true,
      opacity,
    });

    const line = new THREE.Line(geometry, material);
    waveGroup.add(line);
    waveLines.push(line);
  }
}

createWaveLines();

function updateWaveLines(time, coeffs) {
  const yBase = ((coeffs.length - 1) * SPACING * 0.5) + 2.5;

  for (let w = 0; w < waveLines.length; w++) {
    const line = waveLines[w];
    const positions = line.geometry.attributes.position.array;
    const count = positions.length / 3;

    for (let j = 0; j < count; j++) {
      const phase = (j / count) * Math.PI * 2;
      const t = phase + time;
      const x = (phase / Math.PI - 1) * 6;
      const y = fourierSum(t, coeffs) + yBase;
      const z = 0;

      // Slight vertical spread for glow effect
      positions[j * 3] = x;
      positions[j * 3 + 1] = y + w * 0.06;
      positions[j * 3 + 2] = z;
    }

    line.geometry.attributes.position.needsUpdate = true;
  }
}

// ─── Coefficient Axis Lines ───────────────────────────────────────────────────
const axisGroup = new THREE.Group();
scene.add(axisGroup);

function createAxisLines() {
  axisGroup.clear();

  const mat = new THREE.LineBasicMaterial({ color: 0x303048, transparent: true, opacity: 0.5 });

  // Zero line
  const zeroGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(barStartX - 0.5, 0, 4),
    new THREE.Vector3(barStartX + MAX_HARMONICS * barGap + 0.5, 0, 4),
  ]);
  axisGroup.add(new THREE.Line(zeroGeo, mat));

  // Tick marks
  for (let i = 0; i <= MAX_HARMONICS; i++) {
    const tickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(barStartX + i * barGap, -0.15, 4),
      new THREE.Vector3(barStartX + i * barGap, 0.15, 4),
    ]);
    axisGroup.add(new THREE.Line(tickGeo, mat));
  }
}

createAxisLines();

// ─── Grid / Ambient Lines ─────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(40, 20, 0x1a1a28, 0x14141e);
gridHelper.position.y = -12;
scene.add(gridHelper);

// ─── GUI ──────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Fourier Controls' });
gui.domElement.style.fontFamily = "'JetBrains Mono', monospace";

gui.add(params, 'harmonics', 1, 20, 1).name('Harmonics').onChange(updateScene);
gui.add(params, 'waveType', ['square', 'sawtooth', 'triangle']).name('Wave Type').onChange(updateScene);
gui.add(params, 'frequency', 0.2, 4.0, 0.1).name('Frequency');
gui.add(params, 'particleSpeed', 0.1, 3.0, 0.1).name('Anim Speed');

function updateScene() {
  const coeffs = getCoefficients(params.harmonics, params.waveType);
  updateCoefficientBars(coeffs);
}

// ─── Mouse X Phase Control ────────────────────────────────────────────────────
let mouseXNorm = 0;
window.addEventListener('mousemove', (e) => {
  mouseXNorm = e.clientX / innerWidth;
});

// ─── Resize ───────────────────────────────────────────────────────────────────
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener('resize', onResize);

// ─── Animation Loop ──────────────────────────────────────────────────────────
let time = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const speed = params.frequency * params.particleSpeed;
  time += delta * speed * 1.5 + mouseXNorm * 0.008;

  const coeffs = getCoefficients(params.harmonics, params.waveType);

  updateHarmonicLines(time, coeffs);
  updateParticles(time, coeffs);
  updateWaveLines(time, coeffs);
  updateCoefficientBars(coeffs);

  // Camera gentle sway
  camera.position.x = Math.sin(time * 0.15) * 0.3;

  controls.update();
  renderer.render(scene, camera);
}

// Initial scene build
updateScene();
animate();