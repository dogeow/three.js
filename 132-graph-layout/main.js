import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ─── Scene Setup ─────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.Fog(0x0a0a0f, 60, 120);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 22, 38);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '1';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI / 2 - 0.02;

// ─── Lighting ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 0.8));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(20, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 150;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x4466aa, 0.4);
fill.position.set(-15, 10, -10);
scene.add(fill);

// ─── Ground Plane + Grid ─────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x0d0d1a,
  roughness: 0.9,
  metalness: 0.1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.name = 'ground';
scene.add(ground);

const grid = new THREE.GridHelper(200, 40, 0x1a2040, 0x111828);
grid.position.y = 0.02;
scene.add(grid);

// ─── Force Simulation State ──────────────────────────────────────────────────
let damping = 0.88;
let repulsion = 8.0;
let springK = 0.06;
const restLength = 6.0;
const dt = 0.016;
const substeps = 3; // iterations per frame

const nodes = [];  // { id, mesh, label, vx, vy, vz, fx, fy, fz, pinned }
const edges = [];  // { line, a, b }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const palette = [
  0x5ab9c1, 0xc16b9a, 0x6ec96e, 0xe0a040, 0x8888f0,
  0x50d8d8, 0xf06060, 0xa0d080, 0xd878d8, 0x70a0f0,
];
let colorIdx = 0;
const nextColor = () => palette[colorIdx++ % palette.length];

let nodeIdCounter = 0;

function makeNode(id, x, z) {
  const y = THREE.MathUtils.randFloat(2, 6);
  const radius = THREE.MathUtils.randFloat(0.5, 1.2);
  const geo = new THREE.SphereGeometry(radius, 28, 28);
  const mat = new THREE.MeshStandardMaterial({
    color: nextColor(),
    roughness: 0.3,
    metalness: 0.5,
    emissive: new THREE.Color(nextColor()).multiplyScalar(0.15),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.userData.nodeId = id;
  mesh.userData.radius = radius;
  scene.add(mesh);

  // CSS2D label
  const labelDiv = document.createElement('div');
  labelDiv.className = 'label2d';
  labelDiv.textContent = `N${id}`;
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, radius + 0.5, 0);
  mesh.add(label);

  nodes.push({
    id,
    mesh,
    label,
    vx: 0, vy: 0, vz: 0,
    fx: 0, fy: 0, fz: 0,
    pinned: false,
  });
  return nodes[nodes.length - 1];
}

function makeEdge(a, b) {
  const points = [a.mesh.position.clone(), b.mesh.position.clone()];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0x2a3a60, transparent: true, opacity: 0.6 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);

  const edge = { line, a, b };
  edges.push(edge);
  return edge;
}

function updateEdgePositions() {
  for (const e of edges) {
    const positions = e.line.geometry.attributes.position;
    positions.setXYZ(0, e.a.mesh.position.x, e.a.mesh.position.y, e.a.mesh.position.z);
    positions.setXYZ(1, e.b.mesh.position.x, e.b.mesh.position.y, e.b.mesh.position.z);
    positions.needsUpdate = true;
  }
}

function updateNodeCount() {
  document.getElementById('node-count').textContent =
    `Nodes: ${nodes.length}  |  Edges: ${edges.length}`;
}

// ─── Initial Graph ────────────────────────────────────────────────────────────
function initGraph() {
  const ids = [0, 1, 2, 3, 4, 5];
  const positions = [
    [0, 0], [6, 1], [-5, 3], [3, -4], [-3, -3], [7, -5],
  ];
  ids.forEach((id, i) => makeNode(id, positions[i][0], positions[i][1]));

  const edgePairs = [[0,1],[0,2],[0,3],[1,2],[2,4],[3,4],[4,5],[1,5],[2,3],[3,5]];
  for (const [ai, bi] of edgePairs) {
    makeEdge(nodes[ai], nodes[bi]);
  }
  updateNodeCount();
}

// ─── Force Simulation ─────────────────────────────────────────────────────────
function computeForces() {
  // Reset forces
  for (const n of nodes) {
    n.fx = 0; n.fy = 0; n.fz = 0;
  }

  // Coulomb repulsion — O(n²)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.mesh.position.x - a.mesh.position.x;
      const dy = b.mesh.position.y - a.mesh.position.y;
      const dz = b.mesh.position.z - a.mesh.position.z;
      const distSq = dx * dx + dy * dy + dz * dz + 0.01;
      const dist = Math.sqrt(distSq);
      const force = repulsion / distSq;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      if (!a.pinned) { a.fx -= fx; a.fy -= fy; a.fz -= fz; }
      if (!b.pinned) { b.fx += fx; b.fy += fy; b.fz += fz; }
    }
  }

  // Hooke spring attraction along edges
  for (const e of edges) {
    const a = e.a, b = e.b;
    const dx = b.mesh.position.x - a.mesh.position.x;
    const dy = b.mesh.position.y - a.mesh.position.y;
    const dz = b.mesh.position.z - a.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
    const stretch = dist - restLength;
    const force = springK * stretch;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    const fz = (dz / dist) * force;

    if (!a.pinned) { a.fx += fx; a.fy += fy; a.fz += fz; }
    if (!b.pinned) { b.fx -= fx; b.fy -= fy; b.fz -= fz; }
  }

  // Gravity toward y=0
  for (const n of nodes) {
    if (!n.pinned) {
      n.fy -= (n.mesh.position.y - 2) * 0.3;
    }
  }
}

function integrateForces() {
  for (const n of nodes) {
    if (n.pinned) continue;
    n.vx = (n.vx + n.fx * dt) * damping;
    n.vy = (n.vy + n.fy * dt) * damping;
    n.vz = (n.vz + n.fz * dt) * damping;

    n.mesh.position.x += n.vx * dt;
    n.mesh.position.y += n.vy * dt;
    n.mesh.position.z += n.vz * dt;

    // Floor collision
    const r = n.mesh.userData.radius;
    if (n.mesh.position.y < r) {
      n.mesh.position.y = r;
      n.vy *= -0.3;
    }

    // Soft boundary
    const bound = 80;
    if (Math.abs(n.mesh.position.x) > bound) { n.vx *= -0.5; n.mesh.position.x = Math.sign(n.mesh.position.x) * bound; }
    if (Math.abs(n.mesh.position.z) > bound) { n.vz *= -0.5; n.mesh.position.z = Math.sign(n.mesh.position.z) * bound; }
  }
}

function simulationStep() {
  for (let s = 0; s < substeps; s++) {
    computeForces();
    integrateForces();
  }
  updateEdgePositions();
}

// ─── Drag Interaction ─────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragOffset = new THREE.Vector3();
const dragNode = { node: null, active: false };

function getMouseNDC(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  getMouseNDC(e);
  raycaster.setFromCamera(mouse, camera);

  const meshes = nodes.map(n => n.mesh);
  const hits = raycaster.intersectObjects(meshes);

  if (hits.length > 0) {
    const hit = hits[0];
    const node = nodes.find(n => n.mesh === hit.object);
    if (!node) return;

    dragNode.node = node;
    dragNode.active = true;
    node.pinned = true;
    node.vx = 0; node.vy = 0; node.vz = 0;

    // Drag plane at node's y
    dragPlane.constant = -node.mesh.position.y;
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, target);
    dragOffset.subVectors(node.mesh.position, target);

    controls.enabled = false;
  }
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!dragNode.active || !dragNode.node) return;
  getMouseNDC(e);
  raycaster.setFromCamera(mouse, camera);

  const target = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, target)) {
    const n = dragNode.node;
    n.mesh.position.x = target.x + dragOffset.x;
    n.mesh.position.z = target.z + dragOffset.z;
    n.mesh.position.y = Math.max(n.mesh.userData.radius, n.mesh.position.y);
    // Drag plane follows node y
    dragPlane.constant = -n.mesh.position.y;
  }
});

renderer.domElement.addEventListener('mouseup', (e) => {
  if (!dragNode.active || !dragNode.node) return;
  dragNode.node.pinned = false;
  dragNode.node = null;
  dragNode.active = false;
  controls.enabled = true;
});

// ─── Click Ground to Add Node ─────────────────────────────────────────────────
renderer.domElement.addEventListener('click', (e) => {
  if (e.button !== 0) return;
  if (dragNode.active) return;

  getMouseNDC(e);
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObject(ground);
  if (hits.length === 0) return;

  const pt = hits[0].point;
  const id = ++nodeIdCounter;
  const newNode = makeNode(id, pt.x, pt.z);

  // Connect to 1-2 random existing nodes
  if (nodes.length > 1) {
    const count = Math.floor(Math.random() * 2) + 1;
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length - 1); i++) {
      makeEdge(newNode, shuffled[i]);
    }
  }

  updateNodeCount();
});

// ─── UI Controls ──────────────────────────────────────────────────────────────
document.getElementById('btn-add').addEventListener('click', () => {
  const id = ++nodeIdCounter;
  const angle = Math.random() * Math.PI * 2;
  const r = THREE.MathUtils.randFloat(4, 12);
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const newNode = makeNode(id, x, z);

  if (nodes.length > 1) {
    const count = Math.floor(Math.random() * 2) + 1;
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length - 1); i++) {
      makeEdge(newNode, shuffled[i]);
    }
  }
  updateNodeCount();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  // Remove all objects
  for (const n of nodes) {
    scene.remove(n.mesh);
    n.mesh.geometry.dispose();
    n.mesh.material.dispose();
  }
  for (const e of edges) {
    scene.remove(e.line);
    e.line.geometry.dispose();
    e.line.material.dispose();
  }
  nodes.length = 0;
  edges.length = 0;
  nodeIdCounter = 0;
  colorIdx = 0;

  initGraph();
});

const dampSlider = document.getElementById('damp-slider');
const dampVal = document.getElementById('damp-val');
dampSlider.addEventListener('input', () => {
  damping = parseFloat(dampSlider.value);
  dampVal.textContent = damping.toFixed(2);
});

const repulsSlider = document.getElementById('repuls-slider');
const repulsVal = document.getElementById('repul-val');
repulsSlider.addEventListener('input', () => {
  repulsion = parseFloat(repulsSlider.value);
  repulsVal.textContent = repulsion.toFixed(1);
});

const springSlider = document.getElementById('spring-slider');
const springVal = document.getElementById('spring-val');
springSlider.addEventListener('input', () => {
  springK = parseFloat(springSlider.value);
  springVal.textContent = springK.toFixed(3);
});

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ─── Expose to Window ─────────────────────────────────────────────────────────
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.nodes = nodes;
window.edges = edges;

// ─── Animation Loop ───────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  simulationStep();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
initGraph();
animate();