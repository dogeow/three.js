// {title: "Petri Net Workflow Simulation"}
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 18);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Places and Transitions definitions
const placesDef = [
  { id: 0, label: 'Start', x: -6, y: 0 },
  { id: 1, label: 'Review', x: -2, y: 2 },
  { id: 2, label: 'Approve', x: 2, y: 2 },
  { id: 3, label: 'Reject', x: -2, y: -2 },
  { id: 4, label: 'Revise', x: 2, y: -2 },
  { id: 5, label: 'End', x: 6, y: 0 },
];
const transitionsDef = [
  { id: 0, label: 'Submit', x: -4, y: 0 },
  { id: 1, label: 'OK?', x: 0, y: 0 },
  { id: 2, label: 'Yes', x: 0, y: 2 },
  { id: 3, label: 'No', x: 0, y: -2 },
  { id: 4, label: 'Revise', x: 4, y: 0 },
];
const arcs = [
  { from: 0, to: 0, dir: 'p2t' },
  { from: 0, to: 1, dir: 'p2t' },
  { from: 1, to: 2, dir: 't2p' },
  { from: 1, to: 3, dir: 't2p' },
  { from: 2, to: 4, dir: 'p2t' },
  { from: 3, to: 4, dir: 'p2t' },
  { from: 4, to: 1, dir: 'p2t' },
  { from: 5, to: 1, dir: 'p2t' },
  { from: 2, to: 5, dir: 'p2t' },
];

const tokens = [{ placeId: 0 }, { placeId: 0 }];
const netGroup = new THREE.Group();
scene.add(netGroup);

// Draw arcs
arcs.forEach(arc => {
  const fromNode = placesDef.find(p => p.id === arc.from) || transitionsDef.find(t => t.id === arc.from);
  const toNode = placesDef.find(p => p.id === arc.to) || transitionsDef.find(t => t.id === arc.to);
  const startX = fromNode.x + (arc.dir === 'p2t' ? 0.5 : -0.5);
  const startY = fromNode.y;
  const endX = toNode.x + (arc.dir === 't2p' ? 0.5 : -0.5);
  const endY = toNode.y;
  const midX = (startX + endX) / 2 - (endY - startY) * 0.15;
  const midY = (startY + endY) / 2 + (endX - startX) * 0.15;
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(startX, startY, 0),
    new THREE.Vector3(midX, midY, 0),
    new THREE.Vector3(endX, endY, 0),
  ]);
  netGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.6 })));
});

// Draw places (circles)
const placeMeshes = [];
placesDef.forEach(p => {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.7, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ccff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
  );
  ring.position.set(p.x, p.y, 0);
  netGroup.add(ring);
  netGroup.add(new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x001a33, transparent: true, opacity: 0.7 })
  )).position.set(p.x, p.y, -0.05);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 32;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#88ccff';
      ctx.font = '16px monospace'; ctx.textAlign = 'center';
      ctx.fillText(p.label, 64, 22);
      return new THREE.CanvasTexture(c);
    })(), transparent: true
  }));
  sprite.scale.set(1.5, 0.4, 1);
  sprite.position.set(p.x, p.y - 1.1, 0);
  netGroup.add(sprite);
  placeMeshes.push({ place: p, mesh: ring });
});

// Draw transitions (rectangles)
const transitionMeshes = [];
transitionsDef.forEach(t => {
  const rect = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.85 })
  );
  rect.position.set(t.x, t.y, 0);
  netGroup.add(rect);
  netGroup.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.9, 0.5)),
    new THREE.LineBasicMaterial({ color: 0xffcc44 })
  )).position.set(t.x, t.y, 0.01);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 32;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#ffcc66';
      ctx.font = '14px monospace'; ctx.textAlign = 'center';
      ctx.fillText(t.label, 64, 22);
      return new THREE.CanvasTexture(c);
    })(), transparent: true
  }));
  sprite.scale.set(1.2, 0.3, 1);
  sprite.position.set(t.x, t.y - 0.7, 0);
  netGroup.add(sprite);
  const hitMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  hitMesh.position.set(t.x, t.y, 0.1);
  hitMesh.userData.transitionId = t.id;
  netGroup.add(hitMesh);
  transitionMeshes.push(hitMesh);
});

// Token meshes
const tokenMeshes = [];
function createToken() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff88 })
  ));
  g.add(new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.25 })
  ));
  return g;
}
function syncTokens() {
  while (tokenMeshes.length < tokens.length) { const t = createToken(); netGroup.add(t); tokenMeshes.push(t); }
  while (tokenMeshes.length > tokens.length) { netGroup.remove(tokenMeshes.pop()); }
  tokens.forEach((tok, i) => {
    const pd = placesDef.find(p => p.id === tok.placeId);
    const inPlace = tokens.filter(t => t.placeId === tok.placeId);
    const idx = inPlace.indexOf(tok);
    const cnt = inPlace.length;
    const ang = cnt > 1 ? (idx / (cnt - 1)) * Math.PI * 0.8 - Math.PI * 0.4 : 0;
    tokenMeshes[i].position.set(pd.x + Math.cos(ang) * 0.3, pd.y + Math.sin(ang) * 0.3, 0.2);
  });
}
syncTokens();

function canFire(tid) {
  return arcs.filter(a => a.to === tid && a.dir === 'p2t').every(a =>
    tokens.filter(t => t.placeId === a.from).length > 0
  );
}
function fire(tid) {
  if (!canFire(tid)) return;
  const inputs = arcs.filter(a => a.to === tid && a.dir === 'p2t').map(a => a.from);
  const outputs = arcs.filter(a => a.from === tid && a.dir === 't2p').map(a => a.to);
  inputs.forEach(pid => { const i = tokens.findIndex(t => t.placeId === pid); if (i >= 0) tokens.splice(i, 1); });
  outputs.forEach(pid => tokens.push({ placeId: pid }));
  syncTokens();
  updatePlaceColors();
  checkDeadlock();
}
function updatePlaceColors() {
  placesDef.forEach((p, i) => {
    const cnt = tokens.filter(t => t.placeId === p.id).length;
    placeMeshes[i].mesh.material.color.setHSL(cnt > 0 ? Math.max(0.1, 0.55 - cnt * 0.1) : 0.55, 0.9, 0.5);
  });
}
function checkDeadlock() {
  const firable = transitionsDef.filter(t => canFire(t.id));
  const el = document.getElementById('status');
  if (firable.length === 0 && tokens.length > 0) {
    el.textContent = '⚠️ DEADLOCK'; el.style.color = '#ff4444';
  } else {
    el.textContent = firable.length > 0 ? `Enabled: ${firable.map(t => t.label).join(', ')}` : 'No transitions enabled';
    el.style.color = '#88ffaa';
  }
}
updatePlaceColors();
checkDeadlock();

// Interaction
const raycaster = new THREE.Raycaster();
renderer.domElement.addEventListener('click', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(transitionMeshes);
  if (hits.length > 0) fire(hits[0].object.userData.transitionId);
});

// UI
const guiDiv = document.createElement('div');
guiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#aaccdd;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:14px;border-radius:8px;z-index:100;';
document.body.appendChild(guiDiv);
guiDiv.innerHTML = `<div id="status" style="color:#88ffaa">Enabled: Submit</div>
  <button id="autoBtn" style="margin-top:8px;padding:6px 14px;background:#226644;color:#fff;border:none;border-radius:4px;cursor:pointer">Auto Play</button>
  <button id="resetBtn" style="margin-top:8px;margin-left:8px;padding:6px 14px;background:#442222;color:#fff;border:none;border-radius:4px;cursor:pointer">Reset</button>
  <div style="margin-top:8px;font-size:12px;color:#6688aa">Click a transition (orange) to fire</div>`;

let autoInterval = null;
document.getElementById('autoBtn').addEventListener('click', () => {
  if (autoInterval) { clearInterval(autoInterval); autoInterval = null; return; }
  autoInterval = setInterval(() => {
    const firable = transitionsDef.filter(t => canFire(t.id));
    if (firable.length > 0) fire(firable[Math.floor(Math.random() * firable.length)]);
  }, 800);
});
document.getElementById('resetBtn').addEventListener('click', () => {
  tokens.length = 0; tokens.push({ placeId: 0 }, { placeId: 0 });
  syncTokens(); updatePlaceColors(); checkDeadlock();
});

let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.015;
  tokenMeshes.forEach((tm, i) => { tm.scale.setScalar(1 + Math.sin(t + i * 1.3) * 0.08); });
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
