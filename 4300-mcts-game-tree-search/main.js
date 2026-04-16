// {title: "MCTS: Monte Carlo Tree Search"}
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080818);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 5, 25);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Tree structure
const nodes = [];
const edges = [];
const nodeGroup = new THREE.Group();
const edgeGroup = new THREE.Group();
scene.add(edgeGroup);
scene.add(nodeGroup);

class MCTSNode {
  constructor(id, parent, visits = 0, wins = 0, depth = 0) {
    this.id = id;
    this.parent = parent;
    this.visits = visits;
    this.wins = wins;
    this.depth = depth;
    this.children = [];
    this.x = 0; this.y = 0; this.z = 0;
    this.winRate = visits > 0 ? wins / visits : 0.5;
    this.uct = 0;
  }
  computeUCT(parentVisits) {
    if (this.visits === 0) return 999;
    const C = 1.414;
    return this.winRate + C * Math.sqrt(Math.log(parentVisits) / this.visits);
  }
}

// Build initial tree (root + partial expansion)
const root = new MCTSNode(0, null, 10, 5, 0);
nodes.push(root);
const levelCounts = [1, 3, 9];
for (let d = 0; d < 3; d++) {
  const parents = nodes.filter(n => n.depth === d);
  parents.forEach((p, pi) => {
    for (let c = 0; c < 3; c++) {
      const wins = Math.floor(Math.random() * (p.visits + 1));
      const child = new MCTSNode(
        nodes.length, p,
        Math.max(1, Math.floor(Math.random() * 8)),
        wins,
        d + 1
      );
      p.children.push(child);
      nodes.push(child);
    }
  });
}

// Layout nodes in tree levels
function layoutNodes() {
  const levels = {};
  nodes.forEach(n => {
    if (!levels[n.depth]) levels[n.depth] = [];
    levels[n.depth].push(n);
  });
  const maxDepth = Math.max(...nodes.map(n => n.depth));
  const spreadX = 14;
  const spreadY = 3.5;
  Object.keys(levels).forEach(d => {
    const pts = levels[d];
    pts.forEach((n, i) => {
      n.x = (i - pts.length / 2) * (spreadX / Math.pow(1.6, d));
      n.y = -n.depth * spreadY;
      n.z = 0;
    });
  });
}
layoutNodes();

// Draw nodes and edges
const nodeGeo = new THREE.SphereGeometry(0.3, 12, 12);
const nodeMeshes = [];
const edgeMeshes = [];

function nodeColor(visits, wins, uct) {
  const wr = visits > 0 ? wins / visits : 0.5;
  // Color: blue = high exploitation (win rate), red = high exploration (UCT but low visits)
  const r = uct > 50 ? 0.9 : wr * 0.3;
  const g = wr * 0.5;
  const b = uct > 50 ? 0.2 : 0.9;
  return new THREE.Color(r, g, b);
}

function drawTree() {
  // Clear
  nodeGroup.clear();
  edgeGroup.clear();
  nodeMeshes.length = 0;
  edgeMeshes.length = 0;

  // Edges
  nodes.forEach(n => {
    if (n.parent) {
      const mat = new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.5 });
      const pts = [
        new THREE.Vector3(n.parent.x, n.parent.y, n.parent.z),
        new THREE.Vector3(n.x, n.y, n.z)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, mat);
      edgeGroup.add(line);
    }
  });

  // Nodes
  nodes.forEach(n => {
    const wr = n.visits > 0 ? n.wins / n.visits : 0.5;
    n.computeUCT(n.parent ? n.parent.visits : 1);
    const col = nodeColor(n.visits, n.wins, n.uct);
    const mat = new THREE.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(0.3) });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    const scale = 0.3 + wr * 0.5;
    mesh.scale.setScalar(scale);
    mesh.position.set(n.x, n.y, n.z);
    nodeGroup.add(mesh);
    nodeMeshes.push(mesh);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${n.visits}/${n.wins}`, 64, 28);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaccff';
    ctx.fillText(`d${n.depth}`, 64, 52);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(1.2, 0.6, 1);
    sprite.position.set(n.x, n.y + 0.8, n.z);
    nodeGroup.add(sprite);
  });
}
drawTree();

// Animate MCTS steps
let phase = 0;
const phases = ['Selection', 'Expansion', 'Simulation', 'Backpropagation'];
let highlightNodes = [];
let simNodes = [];

function animatePhase() {
  highlightNodes.forEach(n => {
    if (n.mesh) n.mesh.material.emissive.setHex(0x000000);
  });
  highlightNodes = [];

  if (phase === 0) {
    // Selection: highlight path from root to leaf (highest UCT)
    let cur = root;
    const path = [cur];
    while (cur.children.length > 0) {
      cur = cur.children.reduce((best, c) => c.uct > best.uct ? c : best);
      path.push(cur);
    }
    path.forEach((n, i) => {
      const idx = nodes.indexOf(n);
      if (nodeMeshes[idx]) {
        nodeMeshes[idx].material.emissive.setHex(0x0044ff);
        highlightNodes.push({ node: n, mesh: nodeMeshes[idx] });
      }
    });
  } else if (phase === 1) {
    // Expansion: add a new child
    const leafNodes = nodes.filter(n => n.depth === 3 && n.children.length === 0);
    if (leafNodes.length > 0) {
      const parent = leafNodes[Math.floor(Math.random() * leafNodes.length)];
      const child = new MCTSNode(nodes.length, parent, 0, 0, 4);
      parent.children.push(child);
      nodes.push(child);
      layoutNodes();
      drawTree();
      const idx = nodes.indexOf(child);
      if (nodeMeshes[idx]) nodeMeshes[idx].material.emissive.setHex(0xff8800);
      highlightNodes.push({ node: child, mesh: nodeMeshes[idx] });
    }
  } else if (phase === 2) {
    // Simulation: trace random path
    simNodes = [];
    let cur = nodes[Math.floor(Math.random() * nodes.length)];
    for (let i = 0; i < 5; i++) {
      if (cur.children.length > 0) cur = cur.children[Math.floor(Math.random() * cur.children.length)];
      simNodes.push(cur);
    }
    simNodes.forEach((n, i) => {
      const idx = nodes.indexOf(n);
      if (nodeMeshes[idx]) nodeMeshes[idx].material.emissive.setHex(0xff2200);
      highlightNodes.push({ node: n, mesh: nodeMeshes[idx] });
    });
  } else if (phase === 3) {
    // Backpropagation: update win rates
    const winner = simNodes[simNodes.length - 1];
    let cur = winner;
    while (cur) {
      cur.visits++;
      cur.wins += Math.random() > 0.5 ? 1 : 0;
      cur = cur.parent;
    }
    layoutNodes();
    drawTree();
    highlightNodes = [];
  }

  phase = (phase + 1) % 4;
  document.getElementById('phase').textContent = `Phase: ${phases[phase]}`;
}

const infoDiv = document.createElement('div');
infoDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#aaccdd;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:14px;border-radius:8px;z-index:100;';
document.body.appendChild(infoDiv);
infoDiv.innerHTML = `
  <div id="phase" style="color:#ffaa00;font-size:18px">Phase: Selection</div>
  <button id="stepBtn" style="margin-top:8px;padding:6px 14px;background:#2244aa;color:#fff;border:none;border-radius:4px;cursor:pointer">Step →</button>
  <button id="autoBtn" style="margin-top:8px;margin-left:8px;padding:6px 14px;background:#226644;color:#fff;border:none;border-radius:4px;cursor:pointer">Auto</button>
  <br><br>
  <div style="color:#6688aa;font-size:12px">🔵 Selection (UCT) | 🟠 Expansion | 🔴 Simulation | ⬆️ Backprop</div>
`;
let autoMode = false;
let autoInterval = null;
document.getElementById('stepBtn').addEventListener('click', () => { autoMode = false; if (autoInterval) { clearInterval(autoInterval); autoInterval = null; } animatePhase(); });
document.getElementById('autoBtn').addEventListener('click', () => {
  autoMode = !autoMode;
  document.getElementById('autoBtn').textContent = autoMode ? 'Stop' : 'Auto';
  if (autoMode) {
    autoInterval = setInterval(animatePhase, 1200);
    animatePhase();
  } else if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
});

let camAngle = 0;
function render() {
  requestAnimationFrame(render);
  camAngle += 0.003;
  camera.position.x = Math.sin(camAngle) * 25;
  camera.position.z = Math.cos(camAngle) * 25;
  camera.lookAt(0, -5, 0);
  controls.update();
  renderer.render(scene, camera);
}
render();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
