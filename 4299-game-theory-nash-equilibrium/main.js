// {title: "Game Theory Nash Equilibrium — Payoff Matrix Visualization"}
<script type="importmap">
{ "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js", "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/" } }
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

// ─── Scene Setup ─────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(12, 10, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 8; controls.maxDistance = 40;
controls.target.set(2.5, 0, 2.5);

// ─── Lighting ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(8, 15, 10); dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 1; dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -15; dirLight.shadow.camera.right = 15;
dirLight.shadow.camera.top = 15; dirLight.shadow.camera.bottom = -15;
scene.add(dirLight);
scene.add(new THREE.DirectionalLight(0x4488ff, 0.8)).position.set(-5, 3, -8);
scene.add(new THREE.DirectionalLight(0xff4488, 0.4)).position.set(5, -2, 5);

// ─── Grid & Axis Labels ───────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(6, 6, 0x334466, 0x1a2240);
gridHelper.position.set(2.5, -0.01, 2.5);
scene.add(gridHelper);

function makeLabel(text, color) {
  const c = document.createElement('canvas'); c.width = 200; c.height = 60;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color; ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 100, 30);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  spr.scale.set(2.2, 0.66, 1); return spr;
}
const lX = makeLabel('Player A Strategy', '#44ffaa'); lX.position.set(2.5, -0.6, 6.5); scene.add(lX);
const lY = makeLabel('Player B Strategy', '#ffaa44'); lY.position.set(6.5, -0.6, 2.5); scene.add(lY);

// ─── Payoff Matrix State ──────────────────────────────────────────────────────
// payoff[i][j] = Player A's payoff when A=i, B=j. Player B payoff = 5 - payoff[i][j]
const basePayoff = [
  [3,0,0,0,0,0],[4,2,1,0,0,0],[4,3,2,1,0,0],[4,3,2,1,0,0],[4,3,2,1,0,0],[4,3,2,1,0,0]
];
const payoff = Array.from({length:6}, (_,i) => [...basePayoff[i]]);

// ─── Bar Meshes ───────────────────────────────────────────────────────────────
const barGroup = new THREE.Group(); scene.add(barGroup);
const barMeshes = [];

function getBarColor(v) {
  const t = Math.max(0, Math.min(1, v / 5));
  return new THREE.Color(0.8 + t * 0.2, 0.1 + t * 0.8, 0.5 - t * 0.5);
}

function buildBars() {
  barMeshes.forEach(row => row.forEach(m => {
    barGroup.remove(m); m.geometry.dispose(); m.material.dispose();
  }));
  barMeshes.length = 0;
  for (let i = 0; i < 6; i++) {
    barMeshes[i] = [];
    for (let j = 0; j < 6; j++) {
      const h = payoff[i][j];
      const geo = new THREE.BoxGeometry(0.72, h * 0.45, 0.72);
      const col = getBarColor(h);
      const mat = new THREE.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(0.15), shininess: 80, transparent: true, opacity: 0.88 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(i, h * 0.225, j);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData = { i, j };
      barMeshes[i][j] = mesh;
      barGroup.add(mesh);
    }
  }
}

// ─── Nash Equilibrium Spheres ─────────────────────────────────────────────────
const nashGroup = new THREE.Group(); scene.add(nashGroup);
const nashMats = [
  new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.7, shininess: 200 }),
  new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.7, shininess: 200 }),
];
const nashMeshes = [];

function findNash() {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const u = payoff[i][j];
      let aBest = payoff.every((row, ip) => row[j] <= u);
      let bBest = payoff[i].every((v, jp) => v <= u);
      if (aBest && bBest) pts.push({ i, j, payoffA: u, payoffB: 5 - u });
    }
  }
  return pts;
}

function updateNash() {
  nashMeshes.forEach(m => nashGroup.remove(m));
  nashMeshes.length = 0;
  const pts = findNash();
  pts.forEach((pt, idx) => {
    const mat = nashMats[idx % 2];
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), mat);
    sphere.position.set(pt.i, payoff[pt.i][pt.j] * 0.45 + 0.35, pt.j);
    sphere.castShadow = true;
    const ringGeo = new THREE.RingGeometry(0.28, 0.42, 32);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0x00ffff : 0xff00ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.position.set(pt.i, payoff[pt.i][pt.j] * 0.45 + 0.01, pt.j);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.isRing = true;
    nashMeshes.push(sphere, ring);
    nashGroup.add(sphere); nashGroup.add(ring);
  });
  nashInfoEl.textContent = pts.length > 0
    ? `Nash Eq: ${pts.map(p => `(${p.i},${p.j}) A:${p.payoffA} B:${p.payoffB}`).join(' | ')}`
    : 'No pure Nash equilibrium';
}

// ─── Best Response Arrows ─────────────────────────────────────────────────────
const arrowGroup = new THREE.Group(); scene.add(arrowGroup);

function updateArrows() {
  while (arrowGroup.children[0]) { const c = arrowGroup.children[0]; arrowGroup.remove(c); c.geometry?.dispose(); c.material?.dispose(); }
  // Player A best responses (green arrows pointing toward B strategy axis)
  for (let j = 0; j < 6; j++) {
    const maxA = Math.max(...Array.from({length:6}, (_,i) => payoff[i][j]));
    for (let i = 0; i < 6; i++) {
      if (payoff[i][j] === maxA) {
        const start = new THREE.Vector3(i, payoff[i][j] * 0.45 + 0.08, j);
        const end = new THREE.Vector3(i, payoff[i][j] * 0.45 + 0.08, j + 0.72);
        arrowGroup.add(new THREE.ArrowHelper(end.clone().sub(start).normalize(), start, end.clone().sub(start).length(), 0x44ff88, 0.35, 0.18));
      }
    }
  }
  // Player B best responses (orange arrows pointing toward A strategy axis)
  for (let i = 0; i < 6; i++) {
    const maxB = Math.max(...payoff[i]);
    for (let j = 0; j < 6; j++) {
      if (payoff[i][j] === maxB) {
        const start = new THREE.Vector3(i, payoff[i][j] * 0.45 + 0.08, j);
        const end = new THREE.Vector3(i + 0.72, payoff[i][j] * 0.45 + 0.08, j);
        arrowGroup.add(new THREE.ArrowHelper(end.clone().sub(start).normalize(), start, end.clone().sub(start).length(), 0xff8844, 0.35, 0.18));
      }
    }
  }
}

// ─── Cell Selection / Raycasting ──────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const highlightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.05, 0.78), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
highlightMesh.visible = false; scene.add(highlightMesh);

const infoEl = Object.assign(document.createElement('div'), { style: 'position:fixed;bottom:24px;left:24px;background:rgba(10,10,30,0.88);color:#e0e8ff;padding:12px 18px;border-radius:8px;font-family:monospace;font-size:13px;border:1px solid #334466;min-width:220px;' });
document.body.appendChild(infoEl);

const nashInfoEl = Object.assign(document.createElement('div'), { style: 'position:fixed;top:24px;left:24px;background:rgba(10,10,30,0.88);color:#44ffaa;padding:10px 16px;border-radius:8px;font-family:monospace;font-size:13px;border:1px solid #2a6644;max-width:520px;' });
document.body.appendChild(nashInfoEl);

window.addEventListener('click', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(barMeshes.flat());
  if (hits.length > 0) {
    const { i, j } = hits[0].object.userData;
    const pa = payoff[i][j], pb = 5 - pa;
    highlightMesh.position.set(i, pa * 0.45 + 0.025, j);
    highlightMesh.visible = true;
    infoEl.innerHTML = `<b style="color:#44ffaa">Cell (A:${i}, B:${j})</b><br>Player A payoff: <b style="color:#44ffaa">${pa}</b><br>Player B payoff: <b style="color:#ffaa44">${pb}</b><br><span style="color:#888;font-size:11px">Total: ${pa+pb}</span>`;
  } else {
    highlightMesh.visible = false;
    infoEl.innerHTML = '<span style="color:#888">Click a cell to inspect</span>';
  }
});

// ─── GUI ──────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: '🎮 Payoff Matrix' });
const P = { coopBonus: 1, defectPen: 0, opacity: 0.88, showArrows: true, showNash: true };

function applyParams() {
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      payoff[i][j] = Math.max(0, Math.min(5, basePayoff[i][j] + (i === 0 && j === 0 ? P.coopBonus : 0) + (i > 3 && j > 3 ? -P.defectPen : 0)));
      const h = payoff[i][j], col = getBarColor(h), mesh = barMeshes[i][j];
      mesh.position.y = h * 0.225;
      mesh.geometry.dispose(); mesh.geometry = new THREE.BoxGeometry(0.72, h * 0.45, 0.72);
      mesh.material.color.copy(col); mesh.material.emissive.copy(col).multiplyScalar(0.15);
      mesh.material.opacity = P.opacity;
    }
  }
  arrowGroup.visible = P.showArrows; nashGroup.visible = P.showNash;
  updateNash(); updateArrows();
}

gui.add(P, 'coopBonus', -3, 3, 0.1).name('Cooperation Bonus').onChange(applyParams);
gui.add(P, 'defectPen', -3, 3, 0.1).name('Defection Penalty').onChange(applyParams);
gui.add(P, 'opacity', 0.3, 1, 0.05).name('Bar Opacity').onChange(applyParams);
gui.add(P, 'showArrows').name('Show Best Response ↕').onChange(applyParams);
gui.add(P, 'showNash').name('Show Nash Points').onChange(applyParams);

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─── Animation ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
buildBars(); applyParams();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  nashGroup.children.forEach(c => {
    if (c.geometry?.type === 'SphereGeometry') c.scale.setScalar(1 + 0.12 * Math.sin(t * 3 + c.id * 0.5));
    if (c.userData.isRing) c.rotation.z = t * 0.8;
  });
  controls.update();
  renderer.render(scene, camera);
}
animate();
</script>
