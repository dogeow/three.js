import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const NUM_NODES    = 150;
const NUM_TARGETS  = 1200;
const K_NEIGHBORS  = 6;     // edges per node
const MAX_EPOCHS   = 3000;
const TAU_LAMBDA   = 1000;  // decay time constant for λ
const TAU_EPSILON  = 800;   // decay time constant for ε

// ─── STATE ────────────────────────────────────────────────────────────────────
let nodes        = [];
let targetPoints = [];
let epoch        = 0;
let running      = true;
let speed        = 5;
let baseLambda   = 0.5;     // fraction of spread, set by slider
let baseEps      = 0.5;
let shape        = 'torus';
let stepTimes    = [];
let winnerFlash  = -1;
let winnerFlashT = 0;
let nodeAdaptionCount = new Array(NUM_NODES).fill(0);
let maxAdapt = 1;

// ─── THREE.JS SETUP ──────────────────────────────────────────────────────────
const canvas   = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0a0f, 1);

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x0a0a0f, 0.018);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(0, 6, 18);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance   = 4;
controls.maxDistance   = 60;

// Lights
scene.add(new THREE.AmbientLight(0x1a1f3a, 2.5));
const dirLight = new THREE.DirectionalLight(0x6699ff, 1.4);
dirLight.position.set(8, 14, 8);
scene.add(dirLight);
const rimLight = new THREE.DirectionalLight(0xaa44ff, 0.6);
rimLight.position.set(-10, -4, -6);
scene.add(rimLight);

// ─── GEOMETRY HELPERS ────────────────────────────────────────────────────────
function spread() { return 7; }

function generateTargetPoints(shape) {
  const pts = [];
  const n   = NUM_TARGETS;
  if (shape === 'torus') {
    for (let i = 0; i < n; i++) {
      const u = (i / n) * Math.PI * 2 * 3;
      const v = (i / n) * Math.PI * 2 * 2;
      const R = 4.5, r = 1.5;
      const x = (R + r * Math.cos(v)) * Math.cos(u);
      const y = r * Math.sin(v);
      const z = (R + r * Math.cos(v)) * Math.sin(u);
      // Add gentle noise
      pts.push(x + (Math.random()-0.5)*0.3, y + (Math.random()-0.5)*0.3, z + (Math.random()-0.5)*0.3);
    }
  } else if (shape === 'spiral') {
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 7;
      const r = 1.0 + (i / n) * 3.5;
      const x = r * Math.cos(t);
      const y = (i / n - 0.5) * 8 + (Math.random()-0.5)*0.2;
      const z = r * Math.sin(t);
      pts.push(x, y, z);
    }
  } else { // blob
    const centers = [
      new THREE.Vector3(3, 1, 0),
      new THREE.Vector3(-3, -1, 1),
      new THREE.Vector3(0, -2, -3),
      new THREE.Vector3(-2, 2.5, 2),
      new THREE.Vector3(2, -2, 2),
    ];
    for (let i = 0; i < n; i++) {
      const c = centers[i % centers.length];
      const r = 2.5 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const sx = r * Math.sin(phi) * Math.cos(theta);
      const sy = r * Math.sin(phi) * Math.sin(theta);
      const sz = r * Math.cos(phi);
      pts.push(c.x + sx, c.y + sy, c.z + sz);
    }
  }
  return pts;
}

// ─── NODE INIT ───────────────────────────────────────────────────────────────
function initNodes() {
  const s = spread();
  nodes = Array.from({ length: NUM_NODES }, () => ({
    pos:       new THREE.Vector3((Math.random()-0.5)*s*2, (Math.random()-0.5)*s*2, (Math.random()-0.5)*s*2),
    adaptFreq: 0,
    mesh:      null,
    lineIndices: [],  // indices of neighbor nodes (for edges)
  }));
}

// ─── MESH CREATION ───────────────────────────────────────────────────────────
let nodeGroup     = new THREE.Group();
let targetGroup   = new THREE.Group();
let edgeGroup     = new THREE.Group();
let winnerMarker  = new THREE.Mesh();

scene.add(nodeGroup, targetGroup, edgeGroup);

function buildMeshes(targetPosArray) {
  // Clear old
  nodeGroup.clear(); targetGroup.clear(); edgeGroup.clear();
  if (winnerMarker.parent) scene.remove(winnerMarker);

  // ── Target particles ──
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(targetPosArray), 3));
  const tMat = new THREE.PointsMaterial({
    color: 0x00e5cc, size: 0.09, transparent: true, opacity: 0.65,
    sizeAttenuation: true,
  });
  targetGroup.add(new THREE.Points(tGeo, tMat));

  // ── Node spheres ──
  const sphereGeo = new THREE.SphereGeometry(0.14, 8, 6);
  const frag = document.createDocumentFragment();
  nodes.forEach((node, i) => {
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.62, 0.9, 0.55),
      emissive: new THREE.Color(0x1a2866),
      shininess: 90,
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.position.copy(node.pos);
    mesh.userData.nodeIndex = i;
    node.mesh = mesh;
    nodeGroup.add(mesh);
  });

  // ── k-NN edge lines ──
  rebuildEdges();

  // ── Winner flash sphere ──
  const wGeo = new THREE.SphereGeometry(0.32, 12, 8);
  const wMat = new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.0 });
  winnerMarker = new THREE.Mesh(wGeo, wMat);
  scene.add(winnerMarker);
}

function rebuildEdges() {
  edgeGroup.clear();
  const edgeSet = new Set();

  // Compute k-nearest neighbors for each node
  nodes.forEach((node, i) => {
    const dists = nodes
      .map((other, j) => ({ j, d: node.pos.distanceTo(other.pos) }))
      .filter(x => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, K_NEIGHBORS);

    node.lineIndices = dists.map(x => x.j);
    dists.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      edgeSet.add(key);
    });
  });

  const positions = [];
  edgeSet.forEach(key => {
    const [a, b] = key.split('-').map(Number);
    positions.push(nodes[a].pos.x, nodes[a].pos.y, nodes[a].pos.z);
    positions.push(nodes[b].pos.x, nodes[b].pos.y, nodes[b].pos.z);
  });

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x8833cc, transparent: true, opacity: 0.28 });
  edgeGroup.add(new THREE.LineSegments(lineGeo, lineMat));
}

function updateEdgePositions() {
  const posAttr = edgeGroup.children[0]?.geometry.getAttribute('position');
  if (!posAttr) return;
  let idx = 0;
  const edgeSet = new Set();
  nodes.forEach((node, i) => {
    node.lineIndices.forEach(j => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        posAttr.setXYZ(idx++, node.pos.x, node.pos.y, node.pos.z);
        posAttr.setXYZ(idx++, nodes[j].pos.x, nodes[j].pos.y, nodes[j].pos.z);
      }
    });
  });
  posAttr.needsUpdate = true;
}

// ─── NODE COLOR BY ADAPTATION ─────────────────────────────────────────────────
function updateNodeColors() {
  nodes.forEach((node, i) => {
    const t = maxAdapt > 0 ? node.adaptFreq / maxAdapt : 0;
    // Hue: 0.65 (blue) → 0.0 (red)
    const hue = (1 - t) * 0.65;
    const sat = 0.85;
    const lig = 0.42 + t * 0.18;
    node.mesh.material.color.setHSL(hue, sat, lig);
    node.mesh.material.emissive.setHSL(hue * 0.5, 0.9, 0.05 + t * 0.12);
  });
}

// ─── NEURAL GAS LEARNING ──────────────────────────────────────────────────────
function learningRate(t) {
  return baseEps * Math.exp(-t / TAU_EPSILON);
}

function neighborhood(t) {
  return baseLambda * Math.exp(-t / TAU_LAMBDA);
}

function neuralGasStep() {
  // Pick random target point
  const ti = Math.floor(Math.random() * targetPoints.length);
  const tp = new THREE.Vector3(targetPoints[ti*3], targetPoints[ti*3+1], targetPoints[ti*3+2]);

  // Sort nodes by distance to tp
  const sorted = nodes
    .map((node, i) => ({ i, d: node.pos.distanceTo(tp) }))
    .sort((a, b) => a.d - b.d);

  const winner = sorted[0].i;
  const λ = Math.max(0.01, neighborhood(epoch));
  const ε = Math.max(0.001, learningRate(epoch));

  // Winner flash
  winnerFlash  = winner;
  winnerFlashT = 12; // frames

  nodeAdaptionCount[winner]++;
  if (nodeAdaptionCount[winner] > maxAdapt) maxAdapt = nodeAdaptionCount[winner];

  // Update all nodes
  nodes.forEach((node, i) => {
    const rank = sorted.findIndex(x => x.i === i);
    const h    = Math.exp(-rank / λ);
    node.pos.addScaledVector(
      tp.clone().sub(node.pos),
      ε * h
    );
    node.mesh.position.copy(node.pos);
    node.adaptFreq = nodeAdaptionCount[i];
  });

  // Rebuild edges every 3 epochs to keep k-NN current
  if (epoch % 3 === 0) rebuildEdges();
  else updateEdgePositions();

  updateNodeColors();
  epoch++;
}

// ─── QUANTIZATION ERROR ───────────────────────────────────────────────────────
function quantizationError() {
  let total = 0;
  const pts = NUM_TARGETS;
  for (let i = 0; i < pts; i++) {
    const tp = new THREE.Vector3(targetPoints[i*3], targetPoints[i*3+1], targetPoints[i*3+2]);
    let minD = Infinity;
    nodes.forEach(n => {
      const d = n.pos.distanceTo(tp);
      if (d < minD) minD = d;
    });
    total += minD * minD;
  }
  return Math.sqrt(total / pts);
}

// ─── RESIZE ───────────────────────────────────────────────────────────────────
function onResize() {
  const cont = canvas.parentElement;
  const w = cont.clientWidth, h = cont.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// ─── ANIMATION LOOP ───────────────────────────────────────────────────────────
let lastFrameTime = performance.now();
let framesSinceUpdate = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt  = now - lastFrameTime;
  lastFrameTime = now;

  // Run training steps
  if (running) {
    const stepStart = performance.now();
    for (let s = 0; s < speed; s++) {
      if (epoch >= MAX_EPOCHS) { running = false; updateRunButton(); break; }
      neuralGasStep();
    }
    const stepMs = performance.now() - stepStart;
    if (framesSinceUpdate++ % 30 === 0) {
      stepTimes.push(1000 / Math.max(stepMs / speed, 0.001));
      if (stepTimes.length > 10) stepTimes.shift();
    }
  }

  // Winner flash
  if (winnerFlashT > 0) {
    winnerFlashT--;
    const op = winnerFlashT / 12;
    winnerMarker.position.copy(nodes[winnerFlash].pos);
    winnerMarker.material.opacity = op * 0.7;
    winnerMarker.material.color.setHSL(0.05, 1.0, 0.5 + op * 0.3);
    winnerMarker.scale.setScalar(1 + (1 - op) * 0.5);
  }

  // Slow target point gentle drift (breathing effect)
  // not needed — static target

  controls.update();
  renderer.render(scene, camera);
}

// ─── UI WIRING ────────────────────────────────────────────────────────────────
const statEpoch    = document.getElementById('stat-epoch');
const statSps      = document.getElementById('stat-sps');
const statError    = document.getElementById('stat-error');
const errorFill    = document.getElementById('error-bar-fill');
const errorVal     = document.getElementById('error-val');
const progressFill = document.getElementById('progress-fill');
const rankList     = document.getElementById('rank-list');
const speedSlider  = document.getElementById('speed-slider');
const speedVal     = document.getElementById('speed-val');
const lambdaSlider = document.getElementById('lambda-slider');
const lambdaVal    = document.getElementById('lambda-val');
const lrSlider     = document.getElementById('lr-slider');
const lrVal        = document.getElementById('lr-val');
const shapeTorus   = document.getElementById('shape-torus');
const shapeSpiral  = document.getElementById('shape-spiral');
const shapeBlob    = document.getElementById('shape-blob');
const shapeName    = document.getElementById('shape-name');
const btnRun       = document.getElementById('btn-run');
const btnStep      = document.getElementById('btn-step');
const btnReset     = document.getElementById('btn-reset');

let uiTick = 0;
function updateUI() {
  statEpoch.textContent = epoch.toLocaleString();

  const sps = stepTimes.length
    ? Math.round(stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length)
    : 0;
  statSps.textContent = sps > 0 ? `${sps} eps/s` : '—';

  const err = quantizationError();
  statError.textContent = err.toFixed(4);
  // Normalize error display (max ~5 for big shapes)
  const errPct = Math.min(100, (err / 5) * 100);
  errorFill.style.width = errPct + '%';
  errorVal.textContent  = err.toFixed(3);

  progressFill.style.width = Math.min(100, (epoch / MAX_EPOCHS) * 100) + '%';

  // Node ranking
  if (uiTick++ % 10 === 0) {
    const top10 = nodeAdaptionCount
      .map((c, i) => ({ i, c }))
      .sort((a, b) => b.c - a.c)
      .slice(0, 10);

    rankList.innerHTML = top10.map(({ i, c }, rank) => {
      const t = maxAdapt > 0 ? c / maxAdapt : 0;
      const hue = Math.round((1 - t) * 260);
      return `<div class="rank-item">
        <span class="rank-num">#${rank + 1}</span>
        <span class="rank-name">Node ${i}</span>
        <span class="rank-val" style="color:hsl(${hue},85%,65%)">${c}</span>
      </div>`;
    }).join('');
  }
}

setInterval(updateUI, 80);

function updateRunButton() {
  btnRun.textContent = running ? '⏸ Pausing' : '▶ Resume';
  btnRun.classList.toggle('active', running);
}

btnRun.addEventListener('click', () => {
  running = !running;
  if (running && epoch >= MAX_EPOCHS) resetAll();
  updateRunButton();
});

btnStep.addEventListener('click', () => {
  for (let i = 0; i < speed; i++) {
    if (epoch >= MAX_EPOCHS) break;
    neuralGasStep();
  }
});

function resetAll() {
  epoch = 0;
  nodeAdaptionCount = new Array(NUM_NODES).fill(0);
  maxAdapt = 1;
  stepTimes = [];
  winnerFlashT = 0;
  targetPoints = generateTargetPoints(shape);
  initNodes();
  buildMeshes(targetPoints);
  running = true;
  updateRunButton();
}

btnReset.addEventListener('click', resetAll);

speedSlider.addEventListener('input', () => {
  speed = parseInt(speedSlider.value);
  speedVal.textContent = speed;
});

lambdaSlider.addEventListener('input', () => {
  const v = parseInt(lambdaSlider.value);
  baseLambda = v / 100;
  lambdaVal.textContent = baseLambda.toFixed(2);
});

lrSlider.addEventListener('input', () => {
  const v = parseInt(lrSlider.value);
  baseEps = v / 100;
  lrVal.textContent = baseEps.toFixed(2);
});

function setShape(s) {
  shape = s;
  if (s === 'torus') shapeName.textContent = 'Torus Knot';
  else if (s === 'spiral') shapeName.textContent = 'Spiral';
  else shapeName.textContent = 'Blob';
  shapeTorus.classList.toggle('active', s === 'torus');
  shapeSpiral.classList.toggle('active', s === 'spiral');
  shapeBlob.classList.toggle('active', s === 'blob');
  resetAll();
}

shapeTorus.addEventListener('click',  () => setShape('torus'));
shapeSpiral.addEventListener('click', () => setShape('spiral'));
shapeBlob.addEventListener('click',   () => setShape('blob'));

// ─── BOOT ─────────────────────────────────────────────────────────────────────
targetPoints = generateTargetPoints('torus');
initNodes();
buildMeshes(targetPoints);
animate();