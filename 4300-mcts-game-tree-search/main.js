// {title: "MCTS Game Tree Search — UCT Algorithm Visualization"}
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class MCTSNode {
  constructor(parent = null, action = null) {
    this.parent = parent; this.action = action;
    this.children = []; this.wins = 0; this.visits = 0;
    this.untried = ['A','B','C','D'];
    this.depth = parent ? parent.depth + 1 : 0;
    this._pos = new THREE.Vector3();
  }
  uct(c = 1.4) { return this.visits === 0 ? Infinity : (this.wins / this.visits) + c * Math.sqrt(Math.log(this.parent.visits) / this.visits); }
  bestChild() { return this.children.reduce((b, n) => n.uct() > b.uct() ? n : b, this.children[0]); }
  expand() {
    const a = this.untried.splice(Math.floor(Math.random() * this.untried.length), 1)[0];
    const child = new MCTSNode(this, a);
    this.children.push(child); return child;
  }
  simulate() {
    let n = this;
    while (n.children.length || n.untried.length) {
      if (n.untried.length) {
        const a = n.untried.splice(Math.floor(Math.random() * n.untried.length), 1)[0];
        n.children.push(new MCTSNode(n, a));
      }
      n = n.children[Math.floor(Math.random() * n.children.length)];
    }
    return Math.random() > 0.5 ? 1 : 0;
  }
  backpropagate(r) { let n = this; while (n) { n.visits++; n.wins += r; r = 1 - r; n = n.parent; } }
}

function layoutTree(root) {
  const map = new Map();
  function collect(n, d) { if (!map.has(d)) map.set(d, []); map.get(d).push(n); n.children.forEach(c => collect(c, d + 1)); }
  collect(root, 0);
  map.forEach((nodes, depth) => {
    nodes.forEach((n, i) => n._pos.set((i - (nodes.length - 1) / 2) * 3.5, depth * -2.2, 0));
  });
}

function winColor(w) { return new THREE.Color(1 - w, 0.4 * w, w); }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(5, 10, 7); scene.add(dir);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 0, 18);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
scene.add(new THREE.OrbitControls(camera, renderer.domElement));

const nodeGroup = new THREE.Group(), edgeGroup = new THREE.Group(), uiGroup = new THREE.Group();
scene.add(nodeGroup, edgeGroup, uiGroup);

function makeLabel(text) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 48;
  const ctx = cv.getContext('2d'); ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 24);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  spr.scale.set(1.2, 0.45, 1); return spr;
}

function buildVisuals() {
  while (nodeGroup.children.length) nodeGroup.remove(nodeGroup.children[0]);
  while (edgeGroup.children.length) edgeGroup.remove(edgeGroup.children[0]);
  const all = []; function f(n) { all.push(n); n.children.forEach(f); }
  f(root); layoutTree(root);
  all.forEach(n => {
    if (n.parent) edgeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([n.parent._pos, n._pos]), new THREE.LineBasicMaterial({ color: 0x223344 })));
    const sz = 0.25 + Math.log2(n.visits + 1) * 0.25;
    const wr = n.visits ? n.wins / n.visits : 0.5;
    const col = winColor(wr);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(Math.max(sz, 0.25), 14, 10), new THREE.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(0.2) }));
    mesh.position.copy(n._pos); mesh.userData.node = n;
    mesh.add(makeLabel(`${n.wins}/${n.visits}`));
    nodeGroup.add(mesh);
  });
}

let phase = 'idle', curNode = root, selPath = [], simNodes = [], simLine = null;
let highlights = [];

function clearHL() { highlights.forEach(m => { m.material.emissiveIntensity = 0.2; }); highlights = []; }
function hl(mesh, col) { if (!mesh) return; mesh.userData.prev = mesh.material.emissive.clone(); mesh.material.emissive.set(col); mesh.material.emissiveIntensity = 1.0; highlights.push(mesh); }
function findMesh(n) { return nodeGroup.children.find(m => m.userData.node === n); }

function stepSelection() {
  if (phase !== 'selection') return;
  if (curNode.children.length) {
    curNode = curNode.bestChild(); selPath.push(curNode);
    hl(findMesh(curNode), 0x00ffff); setTimeout(stepSelection, 320);
  } else { phase = 'expansion'; setTimeout(stepExpansion, 320); }
}

function stepExpansion() {
  const expanded = curNode.expand(); simNodes = [...selPath, expanded];
  buildVisuals(); hl(findMesh(expanded), 0xff8800); phase = 'simulation'; setTimeout(stepSimulation, 450);
}

function stepSimulation() {
  if (phase !== 'simulation') return;
  if (simLine) { scene.remove(simLine); simLine = null; }
  const result = curNode.simulate();
  if (simNodes.length > 1) {
    const pts = simNodes.map(n => n._pos.clone());
    simLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffdd00, dashSize: 0.25, gapSize: 0.15 }));
    simLine.computeLineDistances(); scene.add(simLine);
    simNodes.forEach(n => hl(findMesh(n), 0xffdd00));
  }
  phase = 'backprop'; setTimeout(() => stepBackprop(result), 450);
}

function stepBackprop(result) {
  curNode.backpropagate(result);
  const back = []; let n = curNode; while (n) { back.push(n); n = n.parent; }
  back.forEach((bn, i) => setTimeout(() => {
    const m = findMesh(bn); if (!m) return;
    const wr = bn.visits ? bn.wins / bn.visits : 0.5;
    m.material.color.copy(winColor(wr)); m.material.emissive.copy(winColor(wr)); m.material.emissiveIntensity = 1.2;
    setTimeout(() => { if (m) m.material.emissiveIntensity = 0.2; }, 180);
  }, i * 130));
  setTimeout(() => {
    if (simLine) { scene.remove(simLine); simLine = null; }
    clearHL(); phase = 'idle'; buildVisuals();
    if (root.children.length) hl(findMesh(root.bestChild()), 0x00ff88);
  }, back.length * 130 + 250);
}

function runMCTS() { if (phase !== 'idle') return; phase = 'selection'; curNode = root; selPath = [root]; stepSelection(); }

function btnSprite(label, color, onclick) {
  const cv = document.createElement('canvas'); cv.width = 180; cv.height = 52;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#111122'; ctx.fillRect(0, 0, 180, 52);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 176, 48);
  ctx.font = 'bold 20px monospace'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 90, 26);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  spr.scale.set(3.6, 1.04, 1); spr.userData.onclick = onclick; uiGroup.add(spr); return spr;
}

let autoOn = false, autoId = null;
const bStep = btnSprite('STEP', '#4466cc', () => { if (phase === 'idle') runMCTS(); });
bStep.position.set(-3.6, -10.5, 0);
const bAuto = btnSprite('AUTO ▶', '#44cc66', () => {
  autoOn = !autoOn;
  if (autoOn) { autoId = setInterval(() => { if (phase === 'idle') runMCTS(); }, 1100); bAuto.position.set(3.6, -10.5, 0); bAuto.material.map.image.getContext('2d').clearRect(0, 0, 180, 52); const ctx = bAuto.material.map.image.getContext('2d'); ctx.fillStyle = '#111122'; ctx.fillRect(0, 0, 180, 52); ctx.strokeStyle = '#cc4444'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 176, 48); ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#cc4444'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STOP ■', 90, 26); bAuto.material.map.needsUpdate = true; }
  else { clearInterval(autoId); autoId = null; bAuto.position.set(-3.6, -10.5, 0); bAuto.material.map.image.getContext('2d').clearRect(0, 0, 180, 52); const ctx = bAuto.material.map.image.getContext('2d'); ctx.fillStyle = '#111122'; ctx.fillRect(0, 0, 180, 52); ctx.strokeStyle = '#44cc66'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 176, 48); ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#44cc66'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AUTO ▶', 90, 26); bAuto.material.map.needsUpdate = true; }
});
bAuto.position.set(-3.6, -10.5, 0);

// Legend
[[0.9, 'High Win Rate'], [0.5, 'Medium'], [0.1, 'Low Win Rate']].forEach(([w, lbl], i) => {
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 32;
  const ctx = cv.getContext('2d'); ctx.beginPath(); ctx.arc(16, 16, 9, 0, Math.PI * 2);
  const c = winColor(w); ctx.fillStyle = `rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})`; ctx.fill();
  ctx.font = '13px monospace'; ctx.fillStyle = '#aaaacc'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, 32, 16);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  spr.scale.set(4, 0.64, 1); spr.position.set(-8, 9 - i * 0.95, 0); uiGroup.add(spr);
});

// Raycaster for clicks
const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
window.addEventListener('click', e => { mv.x = (e.clientX / innerWidth) * 2 - 1; mv.y = -(e.clientY / innerHeight) * 2 + 1; ray.setFromCamera(mv, camera); ray.intersectObjects(uiGroup.children).forEach(h => h.object.userData.onclick && h.object.userData.onclick()); });

window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

layoutTree(root); buildVisuals();
(function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); })();
</script>
