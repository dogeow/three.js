// 4333. Finite Element Stress Analysis
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(20, 15, 30);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Bridge-like structure
const nodes = [];
const SIZE = 20;
const ROWS = 8;
const COLS = 12;
const DX = SIZE / COLS;
const DY = SIZE / ROWS;
const stress = new Float32Array(ROWS * COLS);

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = c * DX - SIZE/2;
    const y = r * DY - SIZE/4;
    const pinned = r === 0 && (c === 0 || c === COLS-1);
    nodes.push({ x, y, z: 0, pinned, fx: 0, fy: pinned ? 0 : -2, originalY: y });
  }
}

// Draw mesh
const lineGeo = new THREE.BufferGeometry();
const linePositions = [];
const meshEdges = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const idx = r * COLS + c;
    if (c < COLS-1) meshEdges.push([idx, idx+1]);
    if (r < ROWS-1) meshEdges.push([idx, idx+COLS]);
  }
}

// Simple gravity + spring relaxation
for (let iter = 0; iter < 200; iter++) {
  for (const [a, b] of meshEdges) {
    const na = nodes[a], nb = nodes[b];
    const dx = nb.x - na.x, dy = nb.y - na.y;
    const dist = Math.sqrt(dx*dx + dy*dy) + 0.0001;
    const rest = dist < 1.5 ? DX : DY;
    const force = (dist - rest) * 0.1;
    const fx = dx / dist * force;
    const fy = dy / dist * force;
    if (!na.pinned) { na.fx += fx; na.fy += fy; }
    if (!nb.pinned) { nb.fx -= fx; nb.fy -= fy; }
  }
  for (const n of nodes) {
    if (!n.pinned) { n.y += n.fy * 0.1; n.fy = n.pinned ? 0 : -2; n.fx = 0; }
  }
}

// Visualize
const colors = new Float32Array(ROWS * COLS * 3);
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c;
    const disp = Math.abs(nodes[i].y - nodes[i].originalY);
    const s = Math.min(disp / 2, 1);
    colors[i*3] = s;
    colors[i*3+1] = 1 - s;
    colors[i*3+2] = 0;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshPhongMaterial({ color: new THREE.Color(s, 1-s, 0) })
    );
    sphere.position.set(nodes[i].x, nodes[i].y, nodes[i].z);
    scene.add(sphere);
  }
}

// Draw edges
const lineMat = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.6 });
for (const [a, b] of meshEdges) {
  const pts = [new THREE.Vector3(nodes[a].x, nodes[a].y, nodes[a].z),
               new THREE.Vector3(nodes[b].x, nodes[b].y, nodes[b].z)];
  const lg = new THREE.BufferGeometry().setFromPoints(pts);
  scene.add(new THREE.Line(lg, lineMat));
}

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
scene.add(new THREE.DirectionalLight(0xffffff, 1));

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });