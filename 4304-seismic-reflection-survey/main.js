// {title: "Seismic Reflection Survey"}
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 5, 22);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const sceneGroup = new THREE.Group();
scene.add(sceneGroup);

// Underground layers (y = depth)
const layerDefs = [
  { y: -2, vel: 1.5, color: 0x7a5c14, label: 'Soil (1.5 km/s)' },
  { y: -5, vel: 2.5, color: 0x5a3a1a, label: 'Sandstone (2.5 km/s)' },
  { y: -9, vel: 3.5, color: 0x3a2050, label: 'Shale (3.5 km/s)' },
  { y: -14, vel: 4.5, color: 0x201828, label: 'Limestone (4.5 km/s)' },
  { y: -20, vel: 6.0, color: 0x100d15, label: 'Basement (6.0 km/s)' },
];

layerDefs.forEach(l => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(44, 0.25, 6),
    new THREE.MeshPhongMaterial({ color: l.color, transparent: true, opacity: 0.92 })
  );
  mesh.position.set(0, l.y, 0);
  sceneGroup.add(mesh);
  // Layer label
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#aabbcc'; ctx.font = '17px monospace';
  ctx.fillText(l.label, 8, 22);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  sprite.scale.set(5, 0.5, 1); sprite.position.set(-14, l.y + 0.6, 3);
  sceneGroup.add(sprite);
});

// Ground surface line
const groundLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-22, 0, 0), new THREE.Vector3(22, 0, 0)]),
  new THREE.LineBasicMaterial({ color: 0x88aa44 })
);
sceneGroup.add(groundLine);

// Surface
const surfaceMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 6),
  new THREE.MeshPhongMaterial({ color: 0x334422, transparent: true, opacity: 0.5 })
);
surfaceMesh.rotation.x = -Math.PI / 2;
surfaceMesh.position.y = 0.01;
sceneGroup.add(surfaceMesh);

// Seismic source
const sourceMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff4400 })
);
sourceMesh.position.set(0, 0.5, 0);
sceneGroup.add(sourceMesh);

// Pulse rings expanding from source
const pulseRings = [];
for (let i = 0; i < 4; i++) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.55, 32),
    new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
  );
  ring.position.set(0, 0.02, 0);
  sceneGroup.add(ring);
  pulseRings.push(ring);
}

// Ray paths group
const rayGroup = new THREE.Group();
sceneGroup.add(rayGroup);

// Downgoing rays (from source to layer)
const downRays = [];
// Reflected rays (from layer back to surface)
const upRays = [];
const offsets = [-10, -5, -2, 0, 2, 5, 10, 15];

offsets.forEach((ox, ri) => {
  // Down ray
  const layerIdx = Math.min(Math.floor(Math.abs(ox) / 4), layerDefs.length - 1);
  const ly = layerDefs[layerIdx].y;
  const downGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.5, 0),
    new THREE.Vector3(ox, ly, 0)
  ]);
  const downLine = new THREE.Line(downGeo, new THREE.LineBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 }));
  rayGroup.add(downLine);
  downRays.push({ line: downLine, x: ox, ly });

  // Up ray (reflected)
  const upGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(ox, ly, 0),
    new THREE.Vector3(ox, 0.1, 0)
  ]);
  const upLine = new THREE.Line(upGeo, new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.7 }));
  rayGroup.add(upLine);
  upRays.push({ line: upLine, x: ox, ly });

  // Reflection point marker
  const reflMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 })
  );
  reflMarker.position.set(ox, ly, 0);
  rayGroup.add(reflMarker);
});

// Seismograph traces (right side panel)
const seisGroup = new THREE.Group();
sceneGroup.add(seisGroup);
seisGroup.position.set(14, 0, 0);

// Seismograph canvas
const seisCanvas = document.createElement('canvas');
seisCanvas.width = 512; seisCanvas.height = 256;
const seisCtx = seisCanvas.getContext('2d');
const seisTex = new THREE.CanvasTexture(seisCanvas);
const seisSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: seisTex, transparent: true, opacity: 0.9 }));
seisSprite.scale.set(8, 4, 1);
seisSprite.position.set(14, -4, -3);
sceneGroup.add(seisSprite);

// Generate seismograph traces
let traceData = [];
function generateTraces() {
  traceData = offsets.map(ox => {
    const layerIdx = Math.min(Math.floor(Math.abs(ox) / 4), layerDefs.length - 1);
    const ly = layerDefs[layerIdx].y;
    const dist = Math.sqrt(ox * ox + (ly - 0.5) ** 2);
    const t = dist / 2;
    const trace = [];
    for (let i = 0; i < 128; i++) {
      const ti = i / 128 * 4;
      const amp = Math.exp(-(ti - t) * 8) * Math.sin((ti - t) * 20) * Math.exp(-dist * 0.1);
      trace.push(amp);
    }
    return trace;
  });
  drawSeismograph();
}

function drawSeismograph() {
  seisCtx.fillStyle = '#050510';
  seisCtx.fillRect(0, 0, 512, 256);
  traceData.forEach((trace, ri) => {
    const yBase = 20 + ri * 28;
    seisCtx.strokeStyle = `hsl(${ri * 40 + 180}, 80%, 60%)`;
    seisCtx.lineWidth = 1.5;
    seisCtx.beginPath();
    trace.forEach((amp, i) => {
      const x = i * 4;
      const y = yBase + amp * 10;
      if (i === 0) seisCtx.moveTo(x, y);
      else seisCtx.lineTo(x, y);
    });
    seisCtx.stroke();
    // Trace label
    seisCtx.fillStyle = `hsl(${ri * 40 + 180}, 60%, 60%)`;
    seisCtx.font = '12px monospace';
    seisCtx.fillText(`x=${offsets[ri]}m`, 4, yBase - 5);
  });
  seisTex.needsUpdate = true;
}
generateTraces();

// Fire button / auto-fire
let shotCount = 0;
let t = 0;
let shotActive = false;
let shotT = 0;
let shotOx = 0;

function fireShot(ox = 0) {
  shotActive = true;
  shotT = 0;
  shotOx = ox;
  sourceMesh.position.x = ox;
  sourceMesh.position.y = 0.5;
  pulseRings.forEach(r => r.position.x = ox);
}

const guiDiv = document.createElement('div');
guiDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#aaccdd;font-family:monospace;font-size:14px;background:rgba(0,0,0,0.7);padding:14px;border-radius:8px;z-index:100;';
document.body.appendChild(guiDiv);
guiDiv.innerHTML = `
  <div style="color:#ffaa44;font-size:15px">Seismic Reflection Survey</div>
  <div style="margin-top:6px;font-size:12px;color:#6688aa">Shot: <span id="shotNum" style="color:#fff">0</span></div>
  <div style="margin-top:8px">
    <button id="fireBtn" style="padding:6px 14px;background:#883322;color:#fff;border:none;border-radius:4px;cursor:pointer">Fire Shot</button>
    <button id="autoBtn" style="margin-left:6px;padding:6px 14px;background:#224488;color:#fff;border:none;border-radius:4px;cursor:pointer">Auto Fire</button>
  </div>
  <div style="margin-top:8px;font-size:12px;color:#556677">
    🔴 Downgoing waves | 🔵 Reflected waves | 🟡 Reflection points
  </div>
`;
document.getElementById('fireBtn').addEventListener('click', () => {
  shotCount++;
  document.getElementById('shotNum').textContent = shotCount;
  fireShot(Math.random() * 10 - 5);
  generateTraces();
});
let autoInterval = null;
document.getElementById('autoBtn').addEventListener('click', () => {
  if (autoInterval) { clearInterval(autoInterval); autoInterval = null; return; }
  autoInterval = setInterval(() => {
    shotCount++;
    document.getElementById('shotNum').textContent = shotCount;
    fireShot(Math.random() * 12 - 6);
    generateTraces();
  }, 1500);
});

function animate() {
  requestAnimationFrame(animate);
  t += 0.02;

  // Animate pulse rings
  pulseRings.forEach((r, i) => {
    const phase = (t * 2 + i * 0.5) % 4;
    r.scale.setScalar(1 + phase * 3);
    r.material.opacity = Math.max(0, 0.7 - phase * 0.18);
    r.position.x = shotOx > -20 ? shotOx : 0;
  });

  // Animate ray path visibility
  downRays.forEach((dr, i) => {
    dr.line.material.opacity = 0.2 + Math.sin(t + i) * 0.2;
  });
  upRays.forEach((ur, i) => {
    ur.line.material.opacity = 0.3 + Math.sin(t + i + 1) * 0.2;
  });

  // Animate source pulse
  sourceMesh.scale.setScalar(1 + Math.sin(t * 5) * 0.2);
  sourceMesh.position.x = shotOx;

  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
