// {title: "Vortex Lattice Wing Aerodynamics"}
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04080f);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 18, 16);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.1;

const sceneGroup = new THREE.Group();
scene.add(sceneGroup);

// Wing panel (top view, XY plane, Z = span)
const chord = 3;    // chord length
const span = 12;    // span
const sweep = 2;     // sweep angle offset
const N = 6;         // number of panels spanwise
const M = 3;         // number of panels chordwise
const dy = span / N;
const dx = chord / M;

const wingPanels = [];
for (let i = 0; i < N; i++) {
  for (let j = 0; j < M; j++) {
    const yc = -span / 2 + i * dy + dy / 2;
    const xc = j * dx + sweep * (i / N);
    wingPanels.push({ x: xc, y: yc, z: 0, lift: 0, vorticity: 0 });
  }
}

// Draw wing surface
const wingGeo = new THREE.BufferGeometry();
const verts = [];
const indices = [];
for (let i = 0; i < N; i++) {
  for (let j = 0; j < M; j++) {
    const y0 = -span / 2 + i * dy;
    const y1 = y0 + dy;
    const x0 = j * dx + sweep * (i / N);
    const x1 = x0 + dx;
    // Wing as flat plate with slight camber
    verts.push(x0, -0.02 * Math.sin(j * Math.PI / M), y0);
    verts.push(x1, -0.02 * Math.sin((j + 1) * Math.PI / M), y0);
    verts.push(x1, -0.02 * Math.sin((j + 1) * Math.PI / M), y1);
    verts.push(x0, -0.02 * Math.sin(j * Math.PI / M), y1);
    const base = (i * M + j) * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
wingGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
wingGeo.setIndex(indices);
wingGeo.computeVertexNormals();
const wingMesh = new THREE.Mesh(
  wingGeo,
  new THREE.MeshPhongMaterial({ color: 0x445566, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
);
sceneGroup.add(wingMesh);

// Wing outline
const outlinePts = [
  new THREE.Vector3(0, 0, -span / 2),
  new THREE.Vector3(sweep, 0, -span / 2),
  new THREE.Vector3(chord + sweep, 0, -span / 2),
  new THREE.Vector3(chord + sweep, 0, span / 2),
  new THREE.Vector3(sweep, 0, span / 2),
  new THREE.Vector3(0, 0, span / 2),
  new THREE.Vector3(0, 0, -span / 2),
];
const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts);
sceneGroup.add(new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({ color: 0x88aacc })));

// Bound vortices (on each panel, going back)
const vortexGroup = new THREE.Group();
sceneGroup.add(vortexGroup);
const boundVortices = [];

wingPanels.forEach((panel, idx) => {
  // Bound vortex: arrow going backward from front of panel
  const x0 = panel.x;
  const x1 = panel.x + chord * 0.8;
  const y0 = panel.y - dy * 0.35;
  const y1 = panel.y + dy * 0.35;
  const pts = [
    new THREE.Vector3(x0, 0, y0),
    new THREE.Vector3(x0, 0, y1),
    new THREE.Vector3(x1, 0, y1),
    new THREE.Vector3(x1, 0, y0),
    new THREE.Vector3(x0, 0, y0),
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const col = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.8, 0.5);
  const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7 });
  const line = new THREE.Line(geo, mat);
  vortexGroup.add(line);
  boundVortices.push({ line, panel, color: col });
});

// Trailing vortices (from rear of wing, going to infinity)
const trailVortices = [];
for (let i = 0; i < N + 1; i++) {
  const y = -span / 2 + i * dy;
  const xStart = (i / N) * sweep + chord;
  const col = new THREE.Color().setHSL(0.05 + i * 0.12, 0.9, 0.5);
  // Left trailing vortex (goes down-left)
  const pts1 = [];
  for (let s = 0; s < 20; s++) {
    const t = s / 20;
    pts1.push(new THREE.Vector3(xStart + t * 8, -t * 4, y - t * 8));
  }
  const geo1 = new THREE.BufferGeometry().setFromPoints(pts1);
  const line1 = new THREE.Line(geo1, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.8 }));
  sceneGroup.add(line1);
  trailVortices.push({ line: line1, color: col });

  // Right trailing vortex
  const pts2 = [];
  for (let s = 0; s < 20; s++) {
    const t = s / 20;
    pts2.push(new THREE.Vector3(xStart + t * 8, -t * 4, y + t * 8));
  }
  const geo2 = new THREE.BufferGeometry().setFromPoints(pts2);
  const line2 = new THREE.Line(geo2, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.8 }));
  sceneGroup.add(line2);
  trailVortices.push({ line: line2, color: col });
}

// Downwash field (grid of arrows below wing)
const downwashGroup = new THREE.Group();
sceneGroup.add(downwashGroup);

function computeDownwash(x, y, z) {
  // Simplified: downwash proportional to lift and inversely to distance
  let wy = 0;
  boundVortices.forEach(bv => {
    const p = bv.panel;
    const dist = Math.sqrt((x - p.x) ** 2 + (z - p.y) ** 2) + 0.5;
    wy += p.lift * 0.15 / dist;
  });
  return Math.max(-1.5, Math.min(1.5, wy));
}

// Downwash arrows
const downwashArrows = [];
for (let xi = 0; xi < 8; xi++) {
  for (let yi = 0; yi < 8; yi++) {
    const ax = xi * 1.5 - 2;
    const ay = -2 - yi * 0.8;
    const az = (yi - 4) * 1.5;
    const w = computeDownwash(ax, ay, az);
    const arrowLen = Math.abs(w) * 0.5;
    const col = new THREE.Color().setHSL(w > 0 ? 0.55 : 0.0, 0.8, 0.5);
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, arrowLen > 0.05 ? arrowLen : 0.05, 6),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6 })
    );
    arrow.position.set(ax, ay - arrowLen / 2, az);
    arrow.rotation.x = Math.PI / 2;
    downwashGroup.add(arrow);
    downwashArrows.push({ arrow, ax, ay, az });
  }
}

// Airflow particles (small dots flowing over wing)
const particleCount = 500;
const particleGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
const pVelocities = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  resetParticle(i);
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const particleMat = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.08, transparent: true, opacity: 0.6 });
const particlePoints = new THREE.Points(particleGeo, particleMat);
sceneGroup.add(particlePoints);

function resetParticle(i) {
  const x = -5 + Math.random() * 14;
  const y = 1 + Math.random() * 4;
  const z = (Math.random() - 0.5) * span * 1.2;
  pPositions[i * 3] = x;
  pPositions[i * 3 + 1] = y;
  pPositions[i * 3 + 2] = z;
  pVelocities[i * 3] = 0;
  pVelocities[i * 3 + 1] = 0;
  pVelocities[i * 3 + 2] = 0;
}

function updateParticles(t) {
  for (let i = 0; i < particleCount; i++) {
    let px = pPositions[i * 3];
    let py = pPositions[i * 3 + 1];
    let pz = pPositions[i * 3 + 2];

    // Flow direction: mostly +x with some vy based on downwash
    px += 0.06;
    const dw = computeDownwash(px, py, pz);
    py += dw * 0.008;

    if (px > 14 || py < -6 || py > 6) resetParticle(i);
    else {
      pPositions[i * 3] = px;
      pPositions[i * 3 + 1] = py;
      pPositions[i * 3 + 2] = pz;
    }
  }
  particleGeo.attributes.position.needsUpdate = true;
}

// Lift distribution (elliptical)
function updateLift(t) {
  boundVortices.forEach((bv, i) => {
    const panel = bv.panel;
    const yNorm = Math.abs(panel.y) / (span / 2);
    const lift = Math.sqrt(1 - yNorm * yNorm) * 1.2;
    panel.lift = lift;
    // Vorticity color: blue=low, red=high
    const hue = Math.max(0.0, 0.55 - lift * 0.3);
    bv.line.material.color.setHSL(hue, 0.9, 0.55);
    bv.line.material.opacity = 0.5 + lift * 0.4;
  });

  // Update downwash arrows
  downwashArrows.forEach(dwa => {
    const w = computeDownwash(dwa.ax, dwa.ay, dwa.az);
    const arrowLen = Math.max(0.05, Math.abs(w) * 0.6);
    dwa.arrow.scale.y = arrowLen / 0.5;
    dwa.arrow.position.y = dwa.ay - arrowLen / 2;
    const hue = w > 0 ? Math.max(0.0, 0.55 - w * 0.2) : Math.min(1.0, 0.0 + Math.abs(w) * 0.2);
    dwa.arrow.material.color.setHSL(hue, 0.8, 0.5);
  });
}

// UI
const guiDiv = document.createElement('div');
guiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#aaccdd;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:14px;border-radius:8px;z-index:100;';
document.body.appendChild(guiDiv);
guiDiv.innerHTML = `
  <div style="color:#4488cc;font-size:15px">Vortex Lattice Method</div>
  <div style="margin-top:6px;font-size:12px;color:#6688aa">Wing panels: <span style="color:#fff">${N * M}</span> bound vortices</div>
  <div style="margin-top:8px;font-size:12px;color:#6688aa">Trailing vortices: <span style="color:#fff">${(N + 1) * 2}</span></div>
  <div style="margin-top:8px;font-size:11px;color:#556677">
    🔵 Low lift (blue) | 🔴 High lift (red)<br>
    🟢 Downwash | 🔵 Upwash<br>
    🔶 Airflow particles
  </div>
`;

let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.02;
  updateLift(t);
  updateParticles(t);

  // Animate trailing vortices slightly
  trailVortices.forEach((tv, i) => {
    tv.line.material.opacity = 0.4 + Math.sin(t + i * 0.5) * 0.3;
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
