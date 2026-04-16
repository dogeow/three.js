// 4335. Fourier Transform Signal Decomposition
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 5, 40);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Frequency bars (3D bar chart)
const NUM_BARS = 32;
const barGroup = new THREE.Group();
const barMeshes = [];
const barHeights = new Float32Array(NUM_BARS);
const targetHeights = new Float32Array(NUM_BARS);

for (let i = 0; i < NUM_BARS; i++) {
  const geo = new THREE.BoxGeometry(0.6, 1, 0.6);
  const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x112244 });
  const bar = new THREE.Mesh(geo, mat);
  bar.position.set((i - NUM_BARS/2) * 1.2, 0.5, 0);
  barGroup.add(bar);
  barMeshes.push(bar);
}

// Wave curve
const wavePoints = [];
const WAVE_SEGS = 200;
for (let i = 0; i < WAVE_SEGS; i++) {
  wavePoints.push(new THREE.Vector3((i - WAVE_SEGS/2) * 0.3, 0, -8));
}
const waveGeo = new THREE.BufferGeometry().setFromPoints(wavePoints);
const waveLine = new THREE.Line(waveGeo, new THREE.LineBasicMaterial({ color: 0xff4444 }));
scene.add(waveLine);

// Fourier synthesis circles
const circles = [];
for (let k = 0; k < 5; k++) {
  const radius = 2 + k * 0.8;
  const torusGeo = new THREE.TorusGeometry(radius, 0.05, 8, 64);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(k * 0.2, 1, 0.6), transparent: true, opacity: 0.5 });
  const torus = new THREE.Mesh(torusGeo, mat);
  torus.position.set(0, 0, -8);
  scene.add(torus);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: mat.color }));
  dot.position.set(radius, 0, -8);
  scene.add(dot);
  circles.push({ torus, dot, radius, offset: k * 0.5 });
}

scene.add(barGroup);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
scene.add(new THREE.DirectionalLight(0xffffff, 1));
scene.add(Object.assign(new THREE.PointLight(0x4488ff, 2, 50), { position: new THREE.Vector3(10, 10, 10) }));

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.02;
  for (let k = 0; k < NUM_BARS; k++) {
    const freq = k * 0.5 + 1;
    targetHeights[k] = Math.abs(Math.sin(time * freq * 0.3) / freq) * 8;
    barHeights[k] += (targetHeights[k] - barHeights[k]) * 0.1;
    barMeshes[k].scale.y = Math.max(barHeights[k], 0.1);
    barMeshes[k].position.y = barHeights[k] / 2;
    const hue = barHeights[k] / 8;
    barMeshes[k].material.color.setHSL(0.6 - hue * 0.5, 1, 0.5);
  }
  // Wave
  const pts = waveGeo.attributes.position;
  let y = 0;
  for (let i = 0; i < WAVE_SEGS; i++) {
    const t = (i - WAVE_SEGS/2) * 0.05;
    let val = 0;
    for (let k = 1; k <= 5; k++) val += Math.sin(t * k * 2 + time * k) / k;
    pts.setY(i, val * 3);
  }
  pts.needsUpdate = true;
  // Fourier circles
  for (let k = 0; k < circles.length; k++) {
    const angle = time * (k+1) * 0.5;
    const r = circles[k].radius;
    circles[k].dot.position.x = Math.cos(angle) * r;
    circles[k].dot.position.y = Math.sin(angle) * r;
    circles[k].dot.position.z = -8;
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });