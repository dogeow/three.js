// {title: "Petri Net Workflow Simulation — Token Flow Visualization"}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 12, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dl = new THREE.DirectionalLight(0xffffff, 0.8);
dl.position.set(10, 20, 10);
scene.add(dl);

function makeLabel(text, color = '#c9d1d9', size = 0.7) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  spr.scale.set(size * 2, size * 0.5, 1);
  return spr;
}

const places = [
  { id: 'received',  label: 'Received',  pos: [-8,  0, 0], tokens: 3 },
  { id: 'validated', label: 'Validated', pos: [-2,  0, 0], tokens: 0 },
  { id: 'approved',  label: 'Approved',  pos: [ 4,  0, 0], tokens: 0 },
  { id: 'shipped',   label: 'Shipped',   pos: [10,  0, 0], tokens: 0 },
  { id: 'paid',      label: 'Paid',      pos: [ 4, -5, 0], tokens: 0 },
];

const transitions = [
  { id: 't_validate', label: 'Validate', pos: [-5,  0, 0] },
  { id: 't_approve',  label: 'Approve',  pos: [ 1,  0, 0] },
  { id: 't_ship',     label: 'Ship',     pos: [ 7,  0, 0] },
  { id: 't_pay',      label: 'Pay',      pos: [ 1, -3, 0] },
];

const arcs = [
  { from: 'received',  to: 't_validate' },
  { from: 't_validate', to: 'validated'  },
  { from: 'validated',  to: 't_approve'  },
  { from: 't_approve',  to: 'approved'   },
  { from: 'approved',   to: 't_ship'     },
  { from: 't_ship',     to: 'shipped'    },
  { from: 'approved',   to: 't_pay'      },
  { from: 't_pay',      to: 'paid'       },
];

const placeMap = {};
const transMap = {};
const arcGroup = new THREE.Group();
const tokenGroup = new THREE.Group();
scene.add(arcGroup);
scene.add(tokenGroup);

places.forEach(p => {
  const g = new THREE.Group();
  g.position.set(...p.pos);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x58a6ff, emissive: 0x1f6feb, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48),
    new THREE.MeshStandardMaterial({ color: 0x161b22, emissive: 0x0d419d, emissiveIntensity: 0.3 }));
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 0.01;
  g.add(fill);
  const lbl = makeLabel(p.label, '#c9d1d9');
  lbl.position.set(0, 2.2, 0);
  g.add(lbl);
  scene.add(g);
  placeMap[p.id] = { ...p, group: g, ring };
});

transitions.forEach(t => {
  const g = new THREE.Group();
  g.position.set(...t.pos);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xff7b72, emissive: 0xda3633, emissiveIntensity: 0.5 }));
  mesh.position.y = 0.25;
  g.add(mesh);
  const lbl = makeLabel(t.label, '#f0883e');
  lbl.position.set(0, 1.0, 0);
  g.add(lbl);
  scene.add(g);
  transMap[t.id] = { ...t, group: g, mesh };
});

arcs.forEach(arc => {
  let start, end;
  if (placeMap[arc.from] && transMap[arc.to]) {
    start = new THREE.Vector3(...placeMap[arc.from].pos);
    end   = new THREE.Vector3(...transMap[arc.to].pos);
  } else {
    start = new THREE.Vector3(...transMap[arc.from].pos);
    end   = new THREE.Vector3(...placeMap[arc.to].pos);
  }
  start.z += 0.3; end.z += 0.3;
  const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
  arcGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x8b949e })));
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0x8b949e }));
  arrow.position.copy(end); arrow.position.y = 0.3;
  arrow.lookAt(end.clone().add(new THREE.Vector3(0, -1, 0))); arrow.rotateX(Math.PI / 2);
  arcGroup.add(arrow);
});

const tokenObjects = [];

function createToken(pos) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xf0c000, emissiveIntensity: 1.0 }));
  m.position.copy(pos); m.position.y = 0.5;
  scene.add(m);
  return m;
}

function initTokens() {
  places.forEach(p => {
    for (let i = 0; i < p.tokens; i++) {
      const off = (i - (p.tokens - 1) / 2) * 0.6;
      tokenObjects.push({ mesh: createToken(new THREE.Vector3(p.pos[0] + off, 0, p.pos[2])), pos: new THREE.Vector3(p.pos[0] + off, 0, p.pos[2]) });
    }
  });
  updateCountLabels();
}

function updateCountLabels() {
  places.forEach(p => {
    const cnt = tokenObjects.filter(t => Math.abs(t.mesh.position.x - p.pos[0]) < 0.8 && Math.abs(t.mesh.position.z - p.pos[2]) < 0.8).length;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 48;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`×${cnt}`, 64, 24);
    if (!p._cntLbl) {
      p._cntLbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
      p._cntLbl.scale.set(1.4, 0.54, 1);
      p._cntLbl.position.set(p.pos[0], 2.8, p.pos[2]);
      scene.add(p._cntLbl);
    } else {
      p._cntLbl.material.map = new THREE.CanvasTexture(c);
      p._cntLbl.material.needsUpdate = true;
    }
  });
}

initTokens();

function isEnabled(tid) {
  const inputs = arcs.filter(a => a.to === tid).map(a => placeMap[a.from]);
  return inputs.every(pl => tokenObjects.some(t =>
    Math.abs(t.mesh.position.x - pl.pos[0]) < 0.8 && Math.abs(t.mesh.position.z - pl.pos[2]) < 0.8));
}

function animateToken(token, targetPos, onDone) {
  const start = token.mesh.position.clone();
  const dur = 400;
  const t0 = performance.now();
  function step(now) {
    const t = Math.min((now - t0) / dur, 1);
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    token.mesh.position.lerpVectors(start, targetPos, e);
    token.mesh.position.y = 0.5 + Math.sin(t * Math.PI) * 1.2;
    if (t < 1) { requestAnimationFrame(step); }
    else { token.mesh.position.copy(targetPos); token.mesh.position.y = 0.5; if (onDone) onDone(); }
  }
  requestAnimationFrame(step);
}

function fire(tid) {
  if (!isEnabled(tid)) return;
  const inA  = arcs.filter(a => a.to === tid);
  const outA = arcs.filter(a => a.from === tid);
  const consumed = inA.map(arc => {
    const pl = placeMap[arc.from];
    let best = null, bestD = Infinity;
    tokenObjects.forEach(t => { const d = t.mesh.position.distanceTo(new THREE.Vector3(pl.pos[0], 0, pl.pos[2])); if (d < bestD) { bestD = d; best = t; } });
    return best;
  }).filter(Boolean);
  const outPl = placeMap[outA[0].to];
  const tpos = new THREE.Vector3(transMap[tid].pos[0], 0, transMap[tid].pos[2]);
  consumed.forEach(tok => animateToken(tok, tpos, () => {
    animateToken(tok, new THREE.Vector3(outPl.pos[0], 0, outPl.pos[2]), () => updateCountLabels());
  }));
}

let deadlockDetected = false;

function updateHighlights() {
  let anyEnabled = false;
  Object.values(transMap).forEach(tr => {
    const en = isEnabled(tr.id);
    if (en) anyEnabled = true;
    tr.mesh.material.color.setHex(en ? 0x3fb950 : 0xff7b72);
    tr.mesh.material.emissive.setHex(en ? 0x238636 : 0xda3633);
    tr.mesh.material.emissiveIntensity = en ? 0.8 : 0.5;
  });
  const prev = deadlockDetected;
  deadlockDetected = !anyEnabled && tokenObjects.length > 0;
  if (deadlockDetected && !prev) {
    Object.values(placeMap).forEach(p => { p.ring.material.color.setHex(0xff4444); p.ring.material.emissive.setHex(0xaa0000); });
  } else if (!deadlockDetected) {
    Object.values(placeMap).forEach(p => { p.ring.material.color.setHex(0x58a6ff); p.ring.material.emissive.setHex(0x1f6feb); });
  }
}

updateHighlights();

let autoPlay = false, autoInterval = null;

function startAuto() {
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = setInterval(() => {
    if (!autoPlay) { clearInterval(autoInterval); return; }
    const en = Object.keys(transMap).filter(id => isEnabled(id));
    if (en.length) { fire(en[Math.floor(Math.random() * en.length)]); updateHighlights(); }
  }, 1200);
}

const autoBtn = Object.assign(document.createElement('button'), { textContent: '▶ Auto-Play' });
autoBtn.style.cssText = 'position:fixed;top:20px;left:20px;padding:10px 16px;background:#238636;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:monospace;z-index:10;';
document.body.appendChild(autoBtn);

const resetBtn = Object.assign(document.createElement('button'), { textContent: '↺ Reset' });
resetBtn.style.cssText = 'position:fixed;top:20px;left:140px;padding:10px 16px;background:#6e7681;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-family:monospace;z-index:10;';
document.body.appendChild(resetBtn);

const statusEl = document.createElement('div');
statusEl.style.cssText = 'position:fixed;top:70px;left:20px;color:#8b949e;font-size:13px;font-family:monospace;z-index:10;pointer-events:none;';
document.body.appendChild(statusEl);

autoBtn.addEventListener('click', () => {
  autoPlay = !autoPlay;
  autoBtn.textContent = autoPlay ? '⏸ Pause' : '▶ Auto-Play';
  autoBtn.style.background = autoPlay ? '#9e6a03' : '#238636';
  if (autoPlay) startAuto();
});

resetBtn.addEventListener('click', () => {
  tokenObjects.forEach(t => scene.remove(t.mesh));
  tokenObjects.length = 0;
  deadlockDetected = false;
  updateHighlights();
  initTokens();
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(Object.values(transMap).map(t => t.mesh));
  if (hits.length > 0) {
    const tid = Object.keys(transMap).find(k => transMap[k].mesh === hits[0].object);
    if (tid && isEnabled(tid)) { fire(tid); updateHighlights(); }
  }
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  const t = performance.now() * 0.003;
  Object.values(transMap).forEach((tr, i) => {
    if (isEnabled(tr.id)) tr.mesh.material.emissiveIntensity = 0.5 + Math.sin(t + i) * 0.3;
  });
  tokenObjects.forEach((tok, i) => { tok.mesh.material.emissiveIntensity = 0.8 + Math.sin(t * 2 + i) * 0.2; });
  statusEl.textContent = deadlockDetected ? '⚠ Deadlock — no transitions can fire' : autoPlay ? '▶ Auto-play running' : '⏸ Auto-play paused';
  renderer.render(scene, camera);
}
animate();
