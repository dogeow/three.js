<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compiler Register Allocation – Graph Coloring</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0d1117; overflow: hidden; font-family: 'Courier New', monospace; }
    canvas { display: block; }

    #ui {
      position: fixed;
      top: 18px;
      left: 18px;
      color: #e6edf3;
      font-size: 13px;
      pointer-events: none;
      user-select: none;
      line-height: 1.7;
    }
    #ui .title {
      font-size: 16px;
      font-weight: bold;
      color: #58a6ff;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    #phase-label {
      position: fixed;
      top: 18px;
      right: 18px;
      color: #e6edf3;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      pointer-events: none;
      text-align: right;
      line-height: 1.6;
    }
    #phase-label .phase {
      font-size: 20px;
      font-weight: bold;
      color: #79c0ff;
      display: block;
      margin-bottom: 4px;
    }
    #phase-label .sub {
      color: #8b949e;
      font-size: 12px;
    }
    #legend {
      position: fixed;
      bottom: 18px;
      left: 18px;
      color: #e6edf3;
      font-size: 12px;
      pointer-events: none;
    }
    #legend table { border-collapse: collapse; }
    #legend td { padding: 2px 8px; }
    #legend td.swatch {
      width: 14px; height: 14px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
    }
    #controls {
      position: fixed;
      bottom: 18px;
      right: 18px;
      display: flex;
      gap: 8px;
    }
    #controls button {
      padding: 8px 18px;
      background: #21262d;
      color: #e6edf3;
      border: 1px solid #30363d;
      border-radius: 6px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      transition: background 0.15s, border-color 0.15s;
    }
    #controls button:hover { background: #30363d; border-color: #58a6ff; }
    #controls button:disabled { opacity: 0.4; cursor: default; }
  </style>
</head>
<body>

<div id="ui">
  <div class="title">Register Allocation</div>
  <div id="info">Initializing…</div>
  <div id="stack-info" style="color:#8b949e; margin-top:4px;"></div>
</div>

<div id="phase-label">
  <span class="phase" id="phase-text">—</span>
  <span class="sub" id="phase-sub">Click Step / Auto to begin</span>
</div>

<div id="legend">
  <table>
    <tr><td><span class="swatch" style="background:#f85149"></span>R0 — Register 0</td></tr>
    <tr><td><span class="swatch" style="background:#a371f7"></span>R1 — Register 1</td></tr>
    <tr><td><span class="swatch" style="background:#3fb950"></span>R2 — Register 2</td></tr>
    <tr><td><span class="swatch" style="background:#ff7b72"></span>R3 — Register 3</td></tr>
    <tr><td><span class="swatch" style="background:#ffa657; border: 1px solid #444;"></span>SPILL — Memory</td></tr>
    <tr><td><span class="swatch" style="background:#79c0ff; border: 1px solid #444;"></span>UNCOLORED</td></tr>
  </table>
</div>

<div id="controls">
  <button id="btn-step">Step →</button>
  <button id="btn-auto">Auto Play</button>
  <button id="btn-reset">Reset</button>
</div>

<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_REGISTERS = 4;
const COLORS = {
  R0:      0xf85149,
  R1:      0xa371f7,
  R2:      0x3fb950,
  R3:      0xffa657,
  SPILL:   0xff7b72,
  UNCOLORED: 0x58a6ff,
  EDGE:    0x30363d,
  EDGE_ACTIVE: 0x79c0ff,
};
const REGISTER_COLOR_LIST = [COLORS.R0, COLORS.R1, COLORS.R2, COLORS.R3];
const SPHERE_R = 0.45;
const LABEL_FONT_SIZE = 0.32;

// ─── Scene setup ─────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
scene.fog = new THREE.FogExp2(0x0d1117, 0.045);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 6, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 35;

// ─── Lighting ────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(6, 12, 8);
scene.add(dirLight);
const ptLight = new THREE.PointLight(0x58a6ff, 0.8, 30);
ptLight.position.set(-6, 6, -4);
scene.add(ptLight);

// ─── Graph data ──────────────────────────────────────────────────────────────
// Variables: name, initial position (x, y, z), neighbors (interference edges)
const VARIABLES = [
  { name: 'a', pos: [-3.5,  1.5,  0], neighbors: ['b','c','d','e','f'] },
  { name: 'b', pos: [-1.5,  3.0,  0], neighbors: ['a','c','d','e','g'] },
  { name: 'c', pos: [ 1.5,  3.0,  0], neighbors: ['a','b','d','f','g'] },
  { name: 'd', pos: [ 3.5,  1.5,  0], neighbors: ['a','b','c','e','g'] },
  { name: 'e', pos: [-2.5, -1.5,  0], neighbors: ['a','b','d','f','g'] },
  { name: 'f', pos: [ 0.0, -2.5,  0], neighbors: ['a','c','e','g'] },
  { name: 'g', pos: [ 2.5, -1.5,  0], neighbors: ['b','c','d','e','f'] },
];

// Build neighbor sets for quick lookup
const neighborSet = {};
VARIABLES.forEach(v => { neighborSet[v.name] = new Set(v.neighbors); });

// All unique edges (deduplicated)
const EDGES = [];
const seen = new Set();
VARIABLES.forEach(v => {
  v.neighbors.forEach(n => {
    const key = [v.name, n].sort().join('-');
    if (!seen.has(key)) { seen.add(key); EDGES.push([v.name, n]); }
  });
});

// ─── State ────────────────────────────────────────────────────────────────────
let nodeObjs  = {};   // name → { mesh, ring, glow, label }
let edgeObjs  = [];   // [{ line, aName, bName }]
let simStack  = [];   // stack of { name } during simplify
let alloc    = {};    // name → register index or 'SPILL'
let phase    = 'idle'; // idle | simplify | select | done
let stepIdx  = 0;
let autoOn   = false;
let autoTimer = null;

// ─── Geometry helpers ────────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(SPHERE_R, 28, 28);
const ringGeo   = new THREE.RingGeometry(SPHERE_R + 0.08, SPHERE_R + 0.22, 32);
const boxGeo    = new THREE.BoxGeometry(0.7, 0.28, 0.12);

function hexToColor(hex) {
  return new THREE.Color(hex);
}

// ─── Build edges ─────────────────────────────────────────────────────────────
const lineMat  = new THREE.LineBasicMaterial({ color: COLORS.EDGE, transparent: true, opacity: 0.55 });
const lineMatA = new THREE.LineBasicMaterial({ color: COLORS.EDGE_ACTIVE, transparent: true, opacity: 0.9 });

function buildEdges() {
  EDGES.forEach(([an, bn]) => {
    const a = VARIABLES.find(v => v.name === an);
    const b = VARIABLES.find(v => v.name === bn);
    const points = [new THREE.Vector3(...a.pos), new THREE.Vector3(...b.pos)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, lineMat.clone());
    line.userData = { aName: an, bName: bn };
    scene.add(line);
    edgeObjs.push(line);
  });
}

// ─── Build nodes ─────────────────────────────────────────────────────────────
function buildNodes() {
  VARIABLES.forEach(v => {
    const mat = new THREE.MeshPhongMaterial({
      color: COLORS.UNCOLORED,
      emissive: new THREE.Color(COLORS.UNCOLORED).multiplyScalar(0.25),
      shininess: 80,
      transparent: true,
      opacity: 0.92,
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.position.set(...v.pos);
    scene.add(mesh);

    // Selection ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.userData.basePos = new THREE.Vector3(...v.pos);
    mesh.add(ring);

    // Glow sprite (billboard circle)
    const glowMat = new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: COLORS.UNCOLORED,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(2.2, 2.2, 1);
    mesh.add(glow);

    // Label sprite
    const label = makeLabel(v.name.toUpperCase());
    label.position.set(0, SPHERE_R + 0.28, 0);
    mesh.add(label);

    nodeObjs[v.name] = { mesh, ring, ringMat, glow, glowMat, label, labelTxt: v.name.toUpperCase(), mat };
  });
}

// ─── Glow texture (radial gradient) ──────────────────────────────────────────
let glowTex = null;
function makeGlowTexture() {
  if (glowTex) return glowTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

// ─── Label sprite ─────────────────────────────────────────────────────────────
function makeLabel(txt) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 36px Courier New';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(LABEL_FONT_SIZE * 2.2, LABEL_FONT_SIZE, 1);
  sp.userData.canvas = c;
  sp.userData.ctx = ctx;
  sp.userData.tex = tex;
  return sp;
}

function updateLabelText(sprite, txt) {
  const ctx = sprite.userData.ctx;
  const tex = sprite.userData.tex;
  const c   = sprite.userData.canvas;
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 36px Courier New';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, 64, 32);
  tex.needsUpdate = true;
}

// ─── Graph coloring algorithm ─────────────────────────────────────────────────
// Build work list: nodes sorted by degree (descending)
function buildWorkList() {
  return [...VARIABLES].sort((a, b) => {
    return neighborSet[b.name].size - neighborSet[a.name].size;
  });
}

// Returns neighbors that ARE colored (have an alloc entry)
function getColoredNeighbors(name) {
  return [...neighborSet[name]].filter(n => alloc[n] !== undefined);
}

// Can this node use register r?
function canUseReg(name, r) {
  const colored = getColoredNeighbors(name);
  return !colored.some(n => alloc[n] === r);
}

// Pick a node for simplification: highest degree with degree < MAX_REGISTERS available colors
function pickSimplifyNode(workList) {
  for (const v of workList) {
    if (alloc[v.name] !== undefined) continue;
    // Count how many of its uncolored neighbors
    const uncoloredNeighbors = [...neighborSet[v.name]].filter(n => alloc[n] === undefined);
    if (uncoloredNeighbors.length < MAX_REGISTERS) return v;
  }
  return null; // all remaining nodes must potentially spill
}

// ─── Animation helpers ────────────────────────────────────────────────────────
let animQueue = [];
let animRunning = false;

function enqueue(fn) { animQueue.push(fn); }
function runQueue() {
  if (animRunning || animQueue.length === 0) return;
  animRunning = true;
  const fn = animQueue.shift();
  const dur = 350;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    fn(t);
    if (t < 1) { requestAnimationFrame(tick); }
    else { animRunning = false; runQueue(); }
  }
  requestAnimationFrame(tick);
}

function tweenPos(mesh, from, to, t) {
  mesh.position.lerpVectors(from, to, t);
}
function tweenColor(mat, fromHex, toHex, t, emissiveMul = 0.25) {
  const c = new THREE.Color(fromHex).lerp(new THREE.Color(toHex), t);
  mat.color.set(c);
  mat.emissive.set(c.clone().multiplyScalar(emissiveMul));
}

// ─── Highlight node ────────────────────────────────────────────────────────────
function highlightNode(name, on) {
  const { ringMat, glowMat } = nodeObjs[name];
  ringMat.opacity = on ? 0.85 : 0;
  glowMat.opacity = on ? 0.35 : 0;
}

// Highlight edges adjacent to a node
function highlightEdges(name, on) {
  edgeObjs.forEach(e => {
    if (e.userData.aName === name || e.userData.bName === name) {
      e.material.color.set(on ? COLORS.EDGE_ACTIVE : COLORS.EDGE);
      e.material.opacity = on ? 0.9 : 0.55;
    }
  });
}

// ─── Pulse animation for newly colored / spilled nodes ────────────────────────
function pulseNode(name) {
  const { mesh, mat } = nodeObjs[name];
  const baseScale = 1.0;
  const dur = 500;
  const start = performance.now();
  function tick(now) {
    const t = (now - start) / dur;
    const s = baseScale + Math.sin(t * Math.PI) * 0.3;
    mesh.scale.setScalar(s);
    if (t < 1) requestAnimationFrame(tick);
    else mesh.scale.setScalar(baseScale);
  }
  requestAnimationFrame(tick);
}

// ─── Step: Simplify ──────────────────────────────────────────────────────────
function doSimplify() {
  const work = buildWorkList();
  const node = pickSimplifyNode(work);
  if (!node) {
    setPhase('select', 'All nodes spillable — forcing spill…');
    return false;
  }
  const name = node.name;
  simStack.push(name);
  alloc[name] = '__pending__'; // mark as removed from graph

  enqueue((t) => {
    const { mat } = nodeObjs[name];
    tweenColor(mat, COLORS.UNCOLORED, 0x2d333b, t, 0.08);
    mat.opacity = 1 - t * 0.5;
    highlightNode(name, true);
    highlightEdges(name, true);
  });
  setTimeout(() => {
    highlightNode(name, false);
    highlightEdges(name, false);
    // dim the sphere
    nodeObjs[name].mat.opacity = 0.45;
    nodeObjs[name].mat.emissive.setScalar(0.05);
  }, 380);

  updateInfo();
  setPhase('simplify', `Removed "${name.toUpperCase()}" — pushed to stack`);
  return true;
}

// ─── Step: Select (assign registers) ─────────────────────────────────────────
function doSelect() {
  if (simStack.length === 0) {
    setPhase('done', 'Allocation complete!');
    return false;
  }
  const name = simStack.pop();

  // Find first available register
  let reg = null;
  for (let r = 0; r < MAX_REGISTERS; r++) {
    if (canUseReg(name, r)) { reg = r; break; }
  }

  if (reg !== null) {
    alloc[name] = reg;
    const col = REGISTER_COLOR_LIST[reg];
    enqueue((t) => {
      const { mat } = nodeObjs[name];
      tweenColor(mat, COLORS.UNCOLORED, col, t, 0.3);
      mat.opacity = 0.95;
      nodeObjs[name].glowMat.color.set(col);
    });
    setPhase('select', `Assigned R${reg} → ${name.toUpperCase()}`);
    setTimeout(() => pulseNode(name), 350);
  } else {
    alloc[name] = 'SPILL';
    enqueue((t) => {
      const { mat } = nodeObjs[name];
      tweenColor(mat, COLORS.UNCOLORED, COLORS.SPILL, t, 0.3);
      mat.opacity = 0.95;
      nodeObjs[name].glowMat.color.set(COLORS.SPILL);
    });
    setPhase('select', `No register free — SPILL ${name.toUpperCase()} to memory`);
    setTimeout(() => pulseNode(name), 350);
  }

  // Restore full opacity & color for this node
  setTimeout(() => {
    nodeObjs[name].mat.opacity = 0.95;
    updateStackDisplay();
  }, 400);

  updateInfo();
  return true;
}

// ─── Auto ─────────────────────────────────────────────────────────────────────
function runAuto() {
  if (phase === 'done') return;
  const ok = (phase === 'idle' || phase === 'simplify') ? doSimplify() : doSelect();
  if (phase !== 'done') {
    autoTimer = setTimeout(runAuto, 900);
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
const phaseText = document.getElementById('phase-text');
const phaseSub  = document.getElementById('phase-sub');
const infoEl    = document.getElementById('info');
const stackEl   = document.getElementById('stack-info');
const btnStep   = document.getElementById('btn-step');
const btnAuto   = document.getElementById('btn-auto');
const btnReset  = document.getElementById('btn-reset');

function setPhase(p, sub) {
  phase = p;
  phaseText.textContent = p === 'idle'      ? 'READY'  :
                          p === 'simplify'  ? 'SIMPLIFY' :
                          p === 'select'    ? 'SELECT' :
                          p === 'done'      ? 'DONE ✓' : p.toUpperCase();
  phaseSub.textContent = sub || '';
}

function updateInfo() {
  const colored = Object.entries(alloc).filter(([,v]) => v !== '__pending__').length;
  const spilled = Object.values(alloc).filter(v => v === 'SPILL').length;
  const stack   = simStack.length;
  const pending = simStack.length;
  infoEl.textContent = `Variables: ${VARIABLES.length}  |  Colored: ${colored}  |  Spilled: ${spilled}  |  Stack: ${stack}`;
}

function updateStackDisplay() {
  const top = simStack[simStack.length - 1];
  if (top) {
    stackEl.textContent = `Top of stack: ${top.toUpperCase()}`;
  } else {
    stackEl.textContent = '';
  }
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
btnStep.addEventListener('click', () => {
  if (phase === 'done') return;
  clearTimeout(autoTimer);
  autoOn = false;
  btnAuto.textContent = 'Auto Play';
  if (phase === 'idle' || phase === 'simplify') {
    if (!doSimplify()) doSelect();
  } else if (phase === 'select') {
    doSelect();
  }
});

btnAuto.addEventListener('click', () => {
  autoOn = !autoOn;
  btnAuto.textContent = autoOn ? 'Pause' : 'Auto Play';
  if (autoOn) {
    if (phase === 'done') return;
    runAuto();
  } else {
    clearTimeout(autoTimer);
  }
});

btnReset.addEventListener('click', () => {
  clearTimeout(autoTimer);
  autoOn = false;
  btnAuto.textContent = 'Auto Play';
  resetAll();
});

function resetAll() {
  // Clear anim queue
  animQueue = [];
  animRunning = false;

  // Reset state
  simStack = [];
  alloc    = {};
  phase    = 'idle';
  animQueue = [];

  // Reset node visuals
  VARIABLES.forEach(v => {
    const { mat, glowMat } = nodeObjs[v.name];
    mat.color.set(COLORS.UNCOLORED);
    mat.emissive.set(new THREE.Color(COLORS.UNCOLORED).multiplyScalar(0.25));
    mat.opacity = 0.92;
    glowMat.opacity = 0;
    glowMat.color.set(COLORS.UNCOLORED);
  });

  // Reset edge colors
  edgeObjs.forEach(e => {
    e.material.color.set(COLORS.EDGE);
    e.material.opacity = 0.55;
  });

  setPhase('idle', 'Click Step or Auto to begin');
  infoEl.textContent = 'Initializing…';
  stackEl.textContent = '';
}

// ─── Resize handler ────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─── Grid / ground plane ─────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(20, 20, 0x21262d, 0x21262d);
gridHelper.position.y = -3.5;
scene.add(gridHelper);

// ─── Animate loop ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Gentle floating animation for uncolored nodes
  VARIABLES.forEach(v => {
    const name = v.name;
    if (alloc[name] === undefined || alloc[name] === '__pending__') {
      const { mesh } = nodeObjs[name];
      if (alloc[name] === '__pending__') return; // dimmed, skip
      const base = new THREE.Vector3(...v.pos);
      mesh.position.y = base.y + Math.sin(t * 0.8 + v.pos[0]) * 0.06;
    }
  });

  // Rotate selection rings slowly
  Object.values(nodeObjs).forEach(({ ring }) => {
    ring.rotation.z = t * 0.6;
    ring.rotation.x = Math.sin(t * 0.4) * 0.3;
  });

  controls.update();
  renderer.render(scene, camera);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
buildEdges();
buildNodes();
setPhase('idle', 'Click Step or Auto to begin');
updateInfo();
animate();
</script>
</body>
</html>
