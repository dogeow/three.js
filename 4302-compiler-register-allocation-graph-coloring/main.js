// {title: "Compiler Register Allocation — Chaitin-Briggs Graph Coloring Visualization"}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Import Map (browsers require this HTML-level tag, but we include it here for completeness)
// The HTML shell should include:
// <script type="importmap">
// { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
//                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/" }}
// </script>

// ─── Scene Setup ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 8, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─── Lighting ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x404060, 2.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);
const pointLight = new THREE.PointLight(0x00d4ff, 1.0, 80);
pointLight.position.set(-10, 5, -10);
scene.add(pointLight);

// ─── Register Colors (4 registers) ──────────────────────────────────────────
const REG_COLORS = [
  new THREE.Color(0xff3366), // R0 — hot pink
  new THREE.Color(0xffd700), // R1 — gold
  new THREE.Color(0x00e676), // R2 — mint green
  new THREE.Color(0x00b0ff), // R3 — electric blue
];
const SPILL_COLOR = new THREE.Color(0x777777);
const STACK_COLOR = new THREE.Color(0xff9100);
const HIGHLIGHT_COLOR = new THREE.Color(0xffffff);
const EDGE_COLOR = new THREE.Color(0x334455);

const K = 4; // number of registers

// ─── Graph Data ──────────────────────────────────────────────────────────────
// Variables and their adjacency list (interference edges)
const variableNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const adjList = {
  a: ['b', 'c', 'd', 'e'],
  b: ['a', 'c', 'f'],
  c: ['a', 'b', 'd', 'g', 'h'],
  d: ['a', 'c', 'e', 'h'],
  e: ['a', 'd', 'f', 'g'],
  f: ['b', 'e', 'g'],
  g: ['c', 'e', 'f', 'h'],
  h: ['c', 'd', 'g'],
};

const varKeys = Object.keys(adjList);
const N = varKeys.length;

// Compute initial degrees
const degree = {};
varKeys.forEach(v => { degree[v] = adjList[v].length; });

// ─── Node & Edge Mesh Storage ────────────────────────────────────────────────
const nodeMeshes = {};     // varName → THREE.Mesh
const edgeMeshes = [];     // Array of { line, v1, v2 }
const labelSprites = {};   // varName → canvas sprite
const group3D = new THREE.Group();
scene.add(group3D);

let nodeGeo = new THREE.SphereGeometry(0.65, 32, 32);

// Build a line material pool
const edgeMat = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.55 });

// Helper: canvas texture for label
function makeLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = color;
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.8, 0.9, 1);
  return sprite;
}

// Helper: get or compute initial node position in a circle
function initialPosition(index, total) {
  const angle = (index / total) * Math.PI * 2;
  const radius = 8;
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

// Build the graph
function buildGraph() {
  // Nodes
  varKeys.forEach((name, i) => {
    const pos = initialPosition(i, N);
    const mat = new THREE.MeshPhongMaterial({
      color: REG_COLORS[i % REG_COLORS.length],
      emissive: new THREE.Color(0x111122),
      shininess: 80,
      transparent: true,
      opacity: 1.0,
    });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    mesh.position.copy(pos);
    group3D.add(mesh);
    nodeMeshes[name] = mesh;

    // Label
    const lbl = makeLabel(name, '#ffffff');
    lbl.position.copy(pos).add(new THREE.Vector3(0, 1.1, 0));
    group3D.add(lbl);
    labelSprites[name] = lbl;
  });

  // Edges (deduplicate)
  const drawn = new Set();
  varKeys.forEach(v1 => {
    adjList[v1].forEach(v2 => {
      const key = [v1, v2].sort().join('-');
      if (drawn.has(key)) return;
      drawn.add(key);
      const p1 = nodeMeshes[v1].position;
      const p2 = nodeMeshes[v2].position;
      const pts = [p1.clone(), p2.clone()];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, edgeMat.clone());
      group3D.add(line);
      edgeMeshes.push({ line, v1, v2 });
    });
  });
}

buildGraph();

// ─── UI Overlay ──────────────────────────────────────────────────────────────
const uiEl = document.createElement('div');
uiEl.style.cssText = `
  position:fixed;top:18px;left:18px;color:#e0e0e0;font-family:'Courier New',monospace;
  font-size:14px;line-height:1.7;pointer-events:none;z-index:10;
  background:rgba(0,0,0,0.55);padding:12px 18px;border-radius:8px;
  border:1px solid rgba(255,255,255,0.08);min-width:240px;backdrop-filter:blur(6px);
`;
document.body.appendChild(uiEl);

function updateUI(phase, message, registerMap) {
  let regLines = '';
  if (registerMap) {
    const entries = Object.entries(registerMap).filter(([, v]) => v !== 'spill');
    if (entries.length === 0) regLines = '  (none assigned yet)';
    else entries.forEach(([v, r]) => { regLines += `  ${v} → R${r}\n`; });
  }
  const spillNodes = registerMap
    ? Object.entries(registerMap).filter(([, v]) => v === 'spill').map(([v]) => v)
    : [];
  const spillStr = spillNodes.length ? `\n  ⛔ Spilled: ${spillNodes.join(', ')}` : '';
  uiEl.innerHTML = `
    <div style="color:#00e5ff;font-weight:bold;margin-bottom:4px;">▸ ${phase}</div>
    <div style="color:#bbbbbb;">${message}</div>
    ${regLines ? `<div style="margin-top:6px;color:#aaaaaa;">Registers:${regLines}</div>` : ''}${spillStr}
  `;
}

// ─── Algorithm State ─────────────────────────────────────────────────────────
let simplifyStack = [];    // nodes pushed during simplify
let selectStack  = [];    // nodes popped during select (reverse order of removal)
let currentDegree = { ...degree };
let activeAdjList = JSON.parse(JSON.stringify(adjList));
let colored = {};         // varName → register index or 'spill'
let phase = 'IDLE';
let stepDelay = 600;       // ms between animation steps
let animating = false;
let pendingTimeout = null;

// ─── Highlight / Dim helpers ──────────────────────────────────────────────────
function highlight(name) {
  nodeMeshes[name].material.emissive.set(HIGHLIGHT_COLOR);
}
function unhighlight(name) {
  const i = varKeys.indexOf(name);
  const base = REG_COLORS[i % REG_COLORS.length];
  nodeMeshes[name].material.emissive.set(base.clone().multiplyScalar(0.15));
}
function dimAll() {
  varKeys.forEach(v => {
    if (colored[v] === undefined) unhighlight(v);
  });
}
function setNodeColor(name, color, emissiveIntensity = 0.15) {
  nodeMeshes[name].material.color.copy(color);
  nodeMeshes[name].material.emissive.copy(color);
  nodeMeshes[name].material.emissiveIntensity = emissiveIntensity;
}
function markSpilled(name) {
  setNodeColor(name, SPILL_COLOR, 0.05);
  labelSprites[name].material.color.set(0xff4444);
}
function markStacked(name) {
  setNodeColor(name, STACK_COLOR, 0.25);
  labelSprites[name].material.color.set(0xff9100);
}
function markColored(name, regIdx) {
  setNodeColor(name, REG_COLORS[regIdx], 0.3);
  labelSprites[name].material.color.set(0xffffff);
}

// ─── Edge visibility ─────────────────────────────────────────────────────────
function setEdgeVisible(v1, v2, visible) {
  edgeMeshes.forEach(e => {
    if ((e.v1 === v1 && e.v2 === v2) || (e.v1 === v2 && e.v2 === v1)) {
      e.line.visible = visible;
    }
  });
}

// ─── Simplify Phase ──────────────────────────────────────────────────────────
// Returns a node with degree < K, or null
function findSimplifiable() {
  return varKeys.find(v => colored[v] === undefined && currentDegree[v] < K) || null;
}

async function simplifyStep() {
  const node = findSimplifiable();
  if (!node) return false; // cannot simplify further

  phase = 'SIMPLIFY';
  highlight(node);
  updateUI(phase, `Push "${node}" (deg=${currentDegree[node]} < ${K}) onto stack`, colored);

  await sleep(stepDelay);

  // Remove edges from graph virtually
  if (activeAdjList[node]) {
    activeAdjList[node].forEach(nbr => {
      if (colored[nbr] === undefined) {
        currentDegree[nbr]--;
      }
    });
    activeAdjList[node] = [];
  }

  // Visual: dim the edges from this node
  varKeys.forEach(v => {
    if (adjList[node].includes(v)) setEdgeVisible(node, v, false);
  });

  simplifyStack.push(node);
  markStacked(node);
  updateUI(phase, `"${node}" removed from graph`, colored);

  await sleep(stepDelay * 0.8);
  unhighlight(node);
  return true;
}

// ─── Spill Phase ─────────────────────────────────────────────────────────────
async function spillStep() {
  // Pick a node with highest degree to spill
  const candidates = varKeys.filter(v => colored[v] === undefined);
  if (candidates.length === 0) return false;

  // Pick node with max degree (break ties by name)
  candidates.sort((a, b) => currentDegree[b] - currentDegree[a] || a.localeCompare(b));
  const spillNode = candidates[0];

  phase = 'SPILL';
  highlight(spillNode);
  updateUI(phase, `⛔ Spill "${spillNode}" (deg=${currentDegree[spillNode]} ≥ ${K}): store to memory`, colored);

  await sleep(stepDelay);

  colored[spillNode] = 'spill';
  markSpilled(spillNode);
  updateUI(phase, `"${spillNode}" marked as spilled`, colored);

  await sleep(stepDelay * 0.8);
  // Remove it from graph too
  if (activeAdjList[spillNode]) {
    activeAdjList[spillNode].forEach(nbr => {
      if (colored[nbr] === undefined) currentDegree[nbr]--;
    });
    activeAdjList[spillNode] = [];
  }
  varKeys.forEach(v => {
    if (adjList[spillNode].includes(v)) setEdgeVisible(spillNode, v, false);
  });

  await sleep(stepDelay * 0.5);
  unhighlight(spillNode);
  return true;
}

// ─── Select Phase ────────────────────────────────────────────────────────────
async function selectPhase() {
  phase = 'SELECT';
  updateUI(phase, 'Pop from stack and assign registers…', colored);
  await sleep(stepDelay * 1.2);

  while (simplifyStack.length > 0) {
    const node = simplifyStack.pop();
    selectStack.push(node);

    highlight(node);
    phase = `SELECT: ${node}`;
    updateUI(phase, `Pop "${node}" — find safe color`, colored);

    await sleep(stepDelay);

    // Determine neighbors' colors
    const neighborColors = new Set();
    adjList[node].forEach(nbr => {
      const c = colored[nbr];
      if (typeof c === 'number') neighborColors.add(c);
    });

    // Find first available color
    let assigned = -1;
    for (let r = 0; r < K; r++) {
      if (!neighborColors.has(r)) { assigned = r; break; }
    }

    if (assigned !== -1) {
      colored[node] = assigned;
      markColored(node, assigned);
      updateUI(phase, `Color "${node}" → R${assigned}`, colored);
    } else {
      // This shouldn't happen with pure simplify (degree < K guarantees a color),
      // but guard anyway — if it does, mark as spilled
      colored[node] = 'spill';
      markSpilled(node);
      updateUI(phase, `⚠️ "${node}" forced spill (no color)`, colored);
    }

    await sleep(stepDelay * 0.8);
    unhighlight(node);
  }

  // Final state
  phase = 'DONE';
  const spilled = Object.entries(colored).filter(([, v]) => v === 'spill').map(([k]) => k);
  const spilledMsg = spilled.length
    ? `\n  ⛔ Spilled variables: ${spilled.join(', ')}\n  ( spilled variables would be re-loaded from memory at extra cost )`
    : '\n  ✅ All variables assigned registers — no spills!';
  updateUI(phase, `Coloring complete!${spilledMsg}`, colored);
}

// ─── Main Animation Loop ──────────────────────────────────────────────────────
async function runColoring() {
  if (animating) return;
  animating = true;

  // Reset
  Object.keys(colored).forEach(k => delete colored[k]);
  simplifyStack = [];
  selectStack = [];
  Object.assign(currentDegree, degree);
  Object.assign(activeAdjList, JSON.parse(JSON.stringify(adjList)));

  // Reset visuals
  varKeys.forEach((name, i) => {
    setNodeColor(name, REG_COLORS[i % REG_COLORS.length]);
    labelSprites[name].material.color.set(0xffffff);
  });
  edgeMeshes.forEach(e => { e.line.visible = true; });

  updateUI('INIT', 'Starting Chaitin-Briggs coloring…', colored);
  await sleep(stepDelay * 1.5);

  // Simplify loop
  let didWork = true;
  while (didWork) {
    didWork = await simplifyStep();
    if (!animating) return;
  }

  // Spill loop — only runs if simplify can't progress
  const stillUncolored = varKeys.filter(v => colored[v] === undefined);
  if (stillUncolored.length > 0) {
    // Try to color spilled nodes — one round of spill then select
    // In classic Chaitin-Briggs, we may need multiple iterations;
    // here we do one optimistic spill pass then select
    await spillStep();
    // Now try simplify again after spill
    didWork = true;
    while (didWork) {
      didWork = await simplifyStep();
      if (!animating) return;
    }
  }

  await selectPhase();
  animating = false;
}

// ─── UI Controls ─────────────────────────────────────────────────────────────
const btn = document.createElement('button');
btn.textContent = '▶ Run Coloring';
btn.style.cssText = `
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
  padding:10px 28px;font-size:15px;font-family:'Courier New',monospace;
  background:#00e5ff;color:#000;border:none;border-radius:6px;cursor:pointer;
  z-index:10;font-weight:bold;letter-spacing:0.05em;
`;
btn.addEventListener('click', () => {
  if (!animating) { runColoring(); btn.textContent = '⏸ Running…'; }
  else { animating = false; btn.textContent = '▶ Run Coloring'; }
});
document.body.appendChild(btn);

// Speed control
const speedDiv = document.createElement('div');
speedDiv.style.cssText = `
  position:fixed;bottom:24px;right:24px;color:#aaa;font-family:'Courier New',monospace;
  font-size:12px;z-index:10;display:flex;align-items:center;gap:8px;
`;
speedDiv.innerHTML = `
  <span style="color:#888">Speed:</span>
  <input type="range" id="speedSlider" min="100" max="1500" value="600" step="50"
   style="accent-color:#00e5ff;width:100px;">
  <span id="speedVal" style="color:#00e5ff;width:30px;">600ms</span>
`;
document.body.appendChild(speedDiv);
document.getElementById('speedSlider').addEventListener('input', e => {
  stepDelay = parseInt(e.target.value);
  document.getElementById('speedVal').textContent = stepDelay + 'ms';
});

// Legend
const legend = document.createElement('div');
legend.style.cssText = `
  position:fixed;top:18px;right:18px;color:#e0e0e0;font-family:'Courier New',monospace;
  font-size:13px;pointer-events:none;z-index:10;
  background:rgba(0,0,0,0.55);padding:12px 16px;border-radius:8px;
  border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(6px);
`;
legend.innerHTML = `
  <div style="margin-bottom:6px;color:#00e5ff;font-weight:bold;">Legend</div>
  ${REG_COLORS.map((c, i) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;">
    <div style="width:14px;height:14px;background:#${c.getHexString()};border-radius:50%;"></div>
    <span>R${i} (Register ${i})</span>
  </div>`).join('')}
  <div style="display:flex;align-items:center;gap:8px;margin:3px 0;">
    <div style="width:14px;height:14px;background:#${SPILL_COLOR.getHexString()};border-radius:50%;"></div>
    <span>Spilled (memory)</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin:3px 0;">
    <div style="width:14px;height:14px;background:#${STACK_COLOR.getHexString()};border-radius:50%;"></div>
    <span>On stack</span>
  </div>
`;
document.body.appendChild(legend);

// ─── Render Loop ─────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => {
    if (pendingTimeout) clearTimeout(pendingTimeout);
    pendingTimeout = setTimeout(resolve, ms);
  });
}

// Animate node idle floating
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  varKeys.forEach((name, i) => {
    const m = nodeMeshes[name];
    // Subtle float
    m.position.y = initialPosition(i, N).y + Math.sin(t * 0.8 + i * 0.9) * 0.18;
    // Update label to follow
    labelSprites[name].position.y = m.position.y + 1.1;
  });
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Start hint
updateUI('READY', 'Press ▶ Run Coloring to start the Chaitin-Briggs algorithm', {});
