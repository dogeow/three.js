import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Scene Setup ──────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.fog = new THREE.FogExp2(0x0a0a12, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 28, 38);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 5;
controls.maxDistance = 120;
controls.target.set(0, 0, 0);
// 左键用来雕刻地形，右键旋转视角，中键缩放；避免左键拖动时相机跟随移动
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

// ─── Lighting ─────────────────────────────────────────────────────────────────

const ambientLight = new THREE.AmbientLight(0x8090b0, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 120;
dirLight.shadow.camera.left = -40;
dirLight.shadow.camera.right = 40;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x4080ff, 0.3);
fillLight.position.set(-20, 15, -20);
scene.add(fillLight);

// ─── Terrain ──────────────────────────────────────────────────────────────────

const TERRAIN_SIZE = 50;
const TERRAIN_SEGS = 128;

const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
terrainGeo.rotateX(-Math.PI / 2);

// Initialize vertex colors
const vertCount = terrainGeo.attributes.position.count;
const colorArray = new Float32Array(vertCount * 3);
terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
  side: THREE.DoubleSide,
});

const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
terrainMesh.receiveShadow = true;
terrainMesh.castShadow = true;
scene.add(terrainMesh);

// Wireframe overlay
const wireMat = new THREE.MeshBasicMaterial({
  color: 0x3a3aff,
  wireframe: true,
  transparent: true,
  opacity: 0.08,
});
const wireMesh = new THREE.Mesh(terrainGeo, wireMat);
wireMesh.visible = false;
scene.add(wireMesh);

// Grid helper (subtle)
const gridHelper = new THREE.GridHelper(TERRAIN_SIZE, 25, 0x1a1a2e, 0x1a1a2e);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// ─── Height Color Mapping ──────────────────────────────────────────────────────

function updateVertexColors() {
  const positions = terrainGeo.attributes.position;
  const colors = terrainGeo.attributes.color;
  const count = positions.count;

  let maxH = 0;

  for (let i = 0; i < count; i++) {
    const h = positions.getY(i);
    if (h > maxH) maxH = h;
  }

  for (let i = 0; i < count; i++) {
    const h = positions.getY(i);
    const t = Math.max(0, Math.min(1, h / 12));

    let r, g, b;

    if (t < 0.2) {
      // Deep water → shallow water
      r = 0.05 + t * 0.5;
      g = 0.15 + t * 1.5;
      b = 0.4 + t * 1.0;
    } else if (t < 0.35) {
      // Sand / beach
      const s = (t - 0.2) / 0.15;
      r = 0.76 + s * 0.04;
      g = 0.70 - s * 0.05;
      b = 0.45 - s * 0.1;
    } else if (t < 0.6) {
      // Grass green → darker green
      const s = (t - 0.35) / 0.25;
      r = 0.15 + (1 - s) * 0.15;
      g = 0.45 + s * 0.1;
      b = 0.12;
    } else if (t < 0.8) {
      // Rock / brown
      const s = (t - 0.6) / 0.2;
      r = 0.35 + s * 0.25;
      g = 0.28 + s * 0.05;
      b = 0.18;
    } else {
      // Snow / white
      const s = Math.min(1, (t - 0.8) / 0.2);
      r = 0.6 + s * 0.4;
      g = 0.62 + s * 0.38;
      b = 0.65 + s * 0.35;
    }

    colors.setXYZ(i, r, g, b);
  }

  colors.needsUpdate = true;
  document.getElementById('maxHeight').textContent = maxH.toFixed(2);
}

updateVertexColors();

// ─── Brush Cursor ─────────────────────────────────────────────────────────────

const cursorGeo = new THREE.TorusGeometry(1, 0.06, 8, 40);
const cursorMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.6,
});
const cursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
cursorMesh.rotation.x = -Math.PI / 2;
cursorMesh.visible = false;
scene.add(cursorMesh);

// Cursor inner ring for smooth mode indicator
const innerGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 40);
const innerMesh = new THREE.Mesh(innerGeo, cursorMat.clone());
innerMesh.visible = false;
scene.add(innerMesh);

// ─── Raycaster ────────────────────────────────────────────────────────────────

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ─── State ────────────────────────────────────────────────────────────────────

let brushMode = 'raise';
let brushSize = 2.0;
let brushStrength = 0.5;
let wireframeOn = false;
let heightColorsOn = true;
let isBrushDown = false;
let lastBrushPos = null;

const shiftHeld = { current: false };

// ─── Terrain Editing ──────────────────────────────────────────────────────────

function getVerticesInBrush(cx, cz) {
  const positions = terrainGeo.attributes.position;
  const count = positions.count;
  const result = [];

  for (let i = 0; i < count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const dx = x - cx;
    const dz = z - cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= brushSize) {
      result.push({ index: i, dist });
    }
  }
  return result;
}

function applyRaise(cx, cz) {
  const positions = terrainGeo.attributes.position;
  const verts = getVerticesInBrush(cx, cz);

  for (const v of verts) {
    const falloff = 1 - (v.dist / brushSize);
    const strength = falloff * falloff * brushStrength;
    const idx = v.index;
    const y = positions.getY(idx);
    positions.setY(idx, y + strength);
  }
  positions.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  updateVertexColors();
}

function applyLower(cx, cz) {
  const positions = terrainGeo.attributes.position;
  const verts = getVerticesInBrush(cx, cz);

  for (const v of verts) {
    const falloff = 1 - (v.dist / brushSize);
    const strength = falloff * falloff * brushStrength;
    const idx = v.index;
    const y = positions.getY(idx);
    positions.setY(idx, y - strength);
  }
  positions.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  updateVertexColors();
}

function applySmooth(cx, cz) {
  const positions = terrainGeo.attributes.position;
  const verts = getVerticesInBrush(cx, cz);

  // Store original heights
  const origHeights = verts.map(v => positions.getY(v.index));
  const avgH = origHeights.reduce((a, b) => a + b, 0) / verts.length;

  for (let i = 0; i < verts.length; i++) {
    const falloff = 1 - (verts[i].dist / brushSize);
    const blend = falloff * falloff * brushStrength * 0.5;
    const idx = verts[i].index;
    const orig = origHeights[i];
    positions.setY(idx, orig + (avgH - orig) * blend);
  }
  positions.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  updateVertexColors();
}

function applyReset() {
  const positions = terrainGeo.attributes.position;
  const count = positions.count;

  for (let i = 0; i < count; i++) {
    positions.setY(i, 0);
  }
  positions.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  updateVertexColors();
}

// ─── Mouse / Pointer Events ───────────────────────────────────────────────────

function getTerrainIntersection(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  mouse.set(x, y);
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(terrainMesh);
  if (intersects.length > 0) {
    return intersects[0].point;
  }
  return null;
}

function updateCursor(point) {
  if (!point) {
    cursorMesh.visible = false;
    innerMesh.visible = false;
    return;
  }

  // Sample terrain height at cursor
  const px = point.x;
  const pz = point.z;
  const positions = terrainGeo.attributes.position;
  let terrainY = 0;
  let minDist = Infinity;

  for (let i = 0; i < positions.count; i++) {
    const dx = positions.getX(i) - px;
    const dz = positions.getZ(i) - pz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < minDist) {
      minDist = d;
      terrainY = positions.getY(i);
    }
  }

  const y = terrainY + 0.15;

  cursorMesh.position.set(px, y, pz);
  cursorMesh.visible = true;

  const modeColors = {
    raise: 0x4caf50,
    lower: 0xf44336,
    smooth: 0x2196f3,
    reset: 0xffc107,
  };

  cursorMesh.scale.setScalar(brushSize);
  cursorMat.color.setHex(modeColors[brushMode] || 0xffffff);

  innerMesh.position.set(px, y, pz);
  innerMesh.scale.setScalar(brushSize * 0.5);
  innerMesh.material.color.setHex(modeColors[brushMode] || 0xffffff);
  innerMesh.material.opacity = 0.35;
  innerMesh.visible = brushMode === 'smooth';
}

function applyBrushAt(point) {
  if (!point) return;

  switch (brushMode) {
    case 'raise':   applyRaise(point.x, point.z); break;
    case 'lower':   applyLower(point.x, point.z); break;
    case 'smooth':  applySmooth(point.x, point.z); break;
    case 'reset':   applyReset(); break;
  }
}

// Track mouse for drag painting
let pointerMoved = false;

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button === 0 && !e.shiftKey) {
    isBrushDown = true;
    pointerMoved = false;
    // 雕刻过程中禁用 OrbitControls，避免左键拖拽时地形随视角运动
    controls.enabled = false;
    const pt = getTerrainIntersection(e);
    if (pt) {
      applyBrushAt(pt);
      lastBrushPos = pt.clone();
    }
  }
});

renderer.domElement.addEventListener('pointermove', (e) => {
  pointerMoved = true;
  const pt = getTerrainIntersection(e);
  updateCursor(pt);

  if (isBrushDown && !shiftHeld.current) {
    applyBrushAt(pt);
    lastBrushPos = pt ? pt.clone() : null;
  }
});

renderer.domElement.addEventListener('pointerup', () => {
  isBrushDown = false;
  lastBrushPos = null;
  controls.enabled = true;
});

renderer.domElement.addEventListener('pointerleave', () => {
  cursorMesh.visible = false;
  innerMesh.visible = false;
  isBrushDown = false;
  lastBrushPos = null;
  controls.enabled = true;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') shiftHeld.current = true;
  if (e.shiftKey) {
    const prevMode = brushMode;
    brushMode = 'lower';
    updateModeUI();
    brushMode = prevMode;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') shiftHeld.current = false;
});

// ─── UI Controls ─────────────────────────────────────────────────────────────

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    brushMode = btn.dataset.mode;
    updateModeUI();
  });
});

function updateModeUI() {
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === brushMode);
  });
}

const sizeSlider = document.getElementById('brushSize');
const strengthSlider = document.getElementById('brushStrength');
const sizeVal = document.getElementById('sizeVal');
const strengthVal = document.getElementById('strengthVal');

sizeSlider.addEventListener('input', () => {
  brushSize = parseFloat(sizeSlider.value);
  sizeVal.textContent = brushSize.toFixed(1);
});

strengthSlider.addEventListener('input', () => {
  brushStrength = parseFloat(strengthSlider.value);
  strengthVal.textContent = brushStrength.toFixed(2);
});

document.getElementById('wireframeToggle').addEventListener('click', (e) => {
  wireframeOn = !wireframeOn;
  e.target.classList.toggle('on', wireframeOn);
  wireMesh.visible = wireframeOn;
});

document.getElementById('colorToggle').addEventListener('click', (e) => {
  heightColorsOn = !heightColorsOn;
  e.target.classList.toggle('on', heightColorsOn);
  terrainMat.vertexColors = heightColorsOn;
  terrainMat.needsUpdate = true;
});

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation Loop ───────────────────────────────────────────────────────────

let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Animate cursor pulse
  frameCount++;
  const pulse = 0.9 + 0.1 * Math.sin(frameCount * 0.08);
  cursorMesh.material.opacity = 0.5 + 0.15 * Math.sin(frameCount * 0.08);

  renderer.render(scene, camera);
}

animate();

// ─── Expose to Window ─────────────────────────────────────────────────────────

window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.terrainMesh = terrainMesh;
window.terrainGeo = terrainGeo;

console.log('[Terrain Carver] Ready. Try clicking and dragging on the terrain.');