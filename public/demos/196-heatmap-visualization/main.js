import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ── Scene setup ──────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a14);
scene.fog = new THREE.Fog(0x0a0a14, 60, 120);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 38, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 15;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2.1;

// ── Lights ───────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x334466, 0.8));

const sun = new THREE.DirectionalLight(0xaaccff, 1.2);
sun.position.set(20, 50, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
scene.add(sun);

const rim = new THREE.DirectionalLight(0x4455ff, 0.4);
rim.position.set(-30, 10, -20);
scene.add(rim);

// ── Color palettes ────────────────────────────────────────────
const palettes = {
  'Thermal': [
    new THREE.Color(0x1a1aff),
    new THREE.Color(0x00ccff),
    new THREE.Color(0x00ff88),
    new THREE.Color(0xffdd00),
    new THREE.Color(0xff3300),
  ],
  'Monochrome': [
    new THREE.Color(0x111111),
    new THREE.Color(0x444466),
    new THREE.Color(0x8888aa),
    new THREE.Color(0xccddff),
    new THREE.Color(0xffffff),
  ],
  'Viridis': [
    new THREE.Color(0x440154),
    new THREE.Color(0x3b528b),
    new THREE.Color(0x21918c),
    new THREE.Color(0x5ec962),
    new THREE.Color(0xfde725),
  ],
};

// ── State ─────────────────────────────────────────────────────
let gridSize = 50;
let hotSpotIntensity = 1.0;
let currentPalette = 'Thermal';
let showWireframe = false;
const hotSpots = [];
const dataGrid = [];

// ── Shaders ───────────────────────────────────────────────────
const vertexShader = /* glsl */`
  varying float vValue;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vValue = position.z; // z stores height value
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */`
  uniform vec3 uColors[5];
  uniform float uMinVal;
  uniform float uMaxVal;
  uniform vec3 uHighlightPos;
  uniform float uHighlightRadius;

  varying float vValue;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  vec3 getColor(float t) {
    t = clamp(t, 0.0, 1.0);
    float seg = t * 4.0;
    int idx = int(floor(seg));
    float f = fract(seg);
    idx = clamp(idx, 0, 4);
    int idx2 = clamp(idx + 1, 0, 4);
    return mix(uColors[idx], uColors[idx2], f);
  }

  void main() {
    float t = (vValue - uMinVal) / max(uMaxVal - uMinVal, 0.001);
    vec3 col = getColor(t);

    // simple diffuse
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float diff = max(dot(vNormal, lightDir), 0.0);
    col = col * (0.5 + 0.5 * diff);

    // hover highlight
    float dist = distance(vWorldPos, uHighlightPos);
    if (dist < uHighlightRadius) {
      float glow = 1.0 - dist / uHighlightRadius;
      col = mix(col, vec3(1.0, 1.0, 1.0), glow * 0.6);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const wireVertexShader = /* glsl */`
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const wireFragmentShader = /* glsl */`
  void main() {
    gl_FragColor = vec4(0.6, 0.8, 1.0, 0.15);
  }
`;

// ── Build geometry ─────────────────────────────────────────────
let mesh, wireMesh, highlightMesh;
let minVal = 0, maxVal = 1;

function generateData() {
  hotSpots.length = 0;
  const count = 6 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    hotSpots.push({
      x: (Math.random() - 0.5) * 0.85,
      y: (Math.random() - 0.5) * 0.85,
      r: 0.06 + Math.random() * 0.12,
      v: 0.6 + Math.random() * 0.4,
    });
  }
}

function buildGrid() {
  dataGrid.length = 0;
  for (let i = 0; i < gridSize; i++) {
    dataGrid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const nx = i / (gridSize - 1);
      const ny = j / (gridSize - 1);
      let val = 0;
      for (const hs of hotSpots) {
        const dx = nx - (hs.x + 0.5);
        const dy = ny - (hs.y + 0.5);
        const d = Math.sqrt(dx * dx + dy * dy);
        val += hs.v * Math.max(0, 1 - d / hs.r) * hotSpotIntensity;
      }
      dataGrid[i][j] = Math.min(1.0, val);
    }
  }
}

function computeMinMax() {
  minVal = Infinity; maxVal = -Infinity;
  for (let i = 0; i < gridSize; i++)
    for (let j = 0; j < gridSize; j++) {
      const v = dataGrid[i][j];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
}

function buildMesh() {
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
  if (wireMesh) { scene.remove(wireMesh); wireMesh.geometry.dispose(); }
  if (highlightMesh) { scene.remove(highlightMesh); highlightMesh.geometry.dispose(); }

  const segs = gridSize - 1;
  const geom = new THREE.PlaneGeometry(40, 40, segs, segs);
  const pos = geom.attributes.position;
  geom.attributes.position.setUsage(THREE.DynamicDrawUsage);

  // Map grid data to Y (Z in local plane space)
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const vi = j * gridSize + i;
      const val = dataGrid[i][j];
      pos.setY(vi, val * 10);
      pos.setZ(vi, val); // store raw value
    }
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();

  const colors = palettes[currentPalette];
  const uniforms = {
    uColors: { value: colors },
    uMinVal: { value: minVal },
    uMaxVal: { value: maxVal },
    uHighlightPos: { value: new THREE.Vector3(1e9, 1e9, 1e9) },
    uHighlightRadius: { value: 1.5 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: THREE.DoubleSide,
  });
  mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  // Wireframe overlay
  const wireGeom = new THREE.PlaneGeometry(40, 40, segs, segs);
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const vi = j * gridSize + i;
      wireGeom.attributes.position.setY(vi, dataGrid[i][j] * 10);
      wireGeom.attributes.position.setZ(vi, dataGrid[i][j]);
    }
  }
  wireGeom.attributes.position.needsUpdate = true;
  wireMesh = new THREE.Mesh(wireGeom, new THREE.ShaderMaterial({
    vertexShader: wireVertexShader,
    fragmentShader: wireFragmentShader,
    transparent: true,
    depthWrite: false,
    wireframe: true,
  }));
  wireMesh.rotation.x = -Math.PI / 2;
  wireMesh.visible = showWireframe;
  scene.add(wireMesh);

  // Invisible hover plane for raycasting
  const hoverGeom = new THREE.PlaneGeometry(40, 40, segs, segs);
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const vi = j * gridSize + i;
      hoverGeom.attributes.position.setY(vi, dataGrid[i][j] * 10 + 0.05);
    }
  }
  hoverGeom.attributes.position.needsUpdate = true;
  hoverGeom.computeVertexNormals();
  const hoverMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
  highlightMesh = new THREE.Mesh(hoverGeom, hoverMat);
  highlightMesh.rotation.x = -Math.PI / 2;
  highlightMesh.userData.isHoverPlane = true;
  scene.add(highlightMesh);
}

// ── Raycasting ────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
const tipVal = document.getElementById('tip-val');
let hoveredIdx = null;

function cellFromPoint(pt) {
  const half = 20;
  const u = (pt.x + half) / 40;
  const v = (pt.z + half) / 40;
  const ci = Math.round(u * (gridSize - 1));
  const cj = Math.round(v * (gridSize - 1));
  return {
    i: Math.max(0, Math.min(gridSize - 1, ci)),
    j: Math.max(0, Math.min(gridSize - 1, cj)),
  };
}

function onMouseMove(e) {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(highlightMesh);
  if (hits.length > 0) {
    const pt = hits[0].point;
    const { i, j } = cellFromPoint(pt);
    const val = dataGrid[i][j];
    tooltip.style.display = 'block';
    tooltip.style.left = e.clientX + 14 + 'px';
    tooltip.style.top = e.clientY - 10 + 'px';
    tipVal.textContent = val.toFixed(4);
    // update highlight uniform
    mesh.material.uniforms.uHighlightPos.value.copy(pt);
    hoveredIdx = `${i},${j}`;
  } else {
    tooltip.style.display = 'none';
    mesh.material.uniforms.uHighlightPos.value.set(1e9, 1e9, 1e9);
    hoveredIdx = null;
  }
}

function onClick(e) {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(highlightMesh);
  if (hits.length > 0) {
    const pt = hits[0].point;
    const { i, j } = cellFromPoint(pt);
    const nx = i / (gridSize - 1);
    const ny = j / (gridSize - 1);
    hotSpots.push({
      x: nx - 0.5,
      y: ny - 0.5,
      r: 0.08,
      v: 0.7,
    });
    buildGrid();
    computeMinMax();
    mesh.material.uniforms.uMinVal.value = minVal;
    mesh.material.uniforms.uMaxVal.value = maxVal;
    buildMesh();
  }
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onClick);

// ── GUI ───────────────────────────────────────────────────────
const gui = new GUI({ title: 'Heatmap Controls' });
const state = {
  gridSize: 50,
  hotSpotIntensity: 1.0,
  colorPalette: 'Thermal',
  wireframe: false,
};

gui.add(state, 'gridSize', 10, 100, 1).name('Grid Size').onFinishChange(v => {
  gridSize = v;
  generateData();
  buildGrid();
  computeMinMax();
  mesh.material.uniforms.uMinVal.value = minVal;
  mesh.material.uniforms.uMaxVal.value = maxVal;
  buildMesh();
});

gui.add(state, 'hotSpotIntensity', 0.1, 3.0, 0.05).name('Intensity').onChange(v => {
  hotSpotIntensity = v;
  buildGrid();
  computeMinMax();
  mesh.material.uniforms.uMinVal.value = minVal;
  mesh.material.uniforms.uMaxVal.value = maxVal;
  buildMesh();
});

gui.add(state, 'colorPalette', Object.keys(palettes)).name('Palette').onChange(v => {
  currentPalette = v;
  const colors = palettes[v];
  mesh.material.uniforms.uColors.value = colors;
});

gui.add(state, 'wireframe').name('Wireframe').onChange(v => {
  showWireframe = v;
  if (wireMesh) wireMesh.visible = v;
});

gui.add({ reset: () => {
  generateData();
  buildGrid();
  computeMinMax();
  mesh.material.uniforms.uMinVal.value = minVal;
  mesh.material.uniforms.uMaxVal.value = maxVal;
  buildMesh();
}}, 'reset').name('🔄 Reset Hot Spots');

// ── Ground grid ───────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(60, 30, 0x223344, 0x112233);
gridHelper.position.y = -0.1;
scene.add(gridHelper);

// ── Init ──────────────────────────────────────────────────────
generateData();
buildGrid();
computeMinMax();
buildMesh();

// ── Resize ─────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ── Render loop ───────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();