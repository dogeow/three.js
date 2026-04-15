import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Scene Setup ─────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.fog = new THREE.FogExp2(0x0a0a12, 0.04);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2;
controls.maxDistance = 20;

// ─── Lighting ─────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x111133, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x4488ff, 2.0);
dirLight.position.set(5, 8, 5);
scene.add(dirLight);

const pointLight1 = new THREE.PointLight(0x00aaff, 3, 12);
pointLight1.position.set(-4, 4, -4);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff0044, 2, 10);
pointLight2.position.set(4, 2, -3);
scene.add(pointLight2);

// ─── Grid / Ground ───────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(20, 20, 0x112244, 0x0a1020);
gridHelper.position.y = -2.5;
scene.add(gridHelper);

const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x060810,
  roughness: 0.9,
  metalness: 0.1,
  transparent: true,
  opacity: 0.6,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.51;
scene.add(ground);

// ─── Post-processing ─────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8, 0.4, 0.85
);
composer.addPass(bloomPass);

// ─── Mesh Data Structures ─────────────────────────────────────────────────────
// Store mesh as array of faces; each face: { indices: number[], normal: THREE.Vector3 }
let meshFaces = [];
let meshGeometry = null;
let meshObject = null;
let faceEdgeObject = null;
let vertexSphereObject = null;

// Selection state
let selectedFaceIndex = -1;
let selectedVertexIndex = -1;
const selectionSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
);
selectionSphere.visible = false;
scene.add(selectionSphere);

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ─── Mesh Generation ──────────────────────────────────────────────────────────
function generateMesh(type) {
  meshFaces = [];

  if (type === 'grid') {
    // 4x4 quad grid → 9 quads
    const N = 4;
    const verts = [];
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        verts.push([i - N / 2, 0, j - N / 2]);
      }
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i;
        const b = a + 1;
        const c = a + (N + 1);
        const d = c + 1;
        meshFaces.push({ indices: [a, b, d, c], normal: new THREE.Vector3(0, 1, 0) });
      }
    }
    return verts;

  } else if (type === 'box') {
    // Simple box: 6 quad faces
    const v = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],
    ];
    meshFaces.push({ indices: [3,2,1,0], normal: new THREE.Vector3(0,0,-1) }); // front
    meshFaces.push({ indices: [4,5,6,7], normal: new THREE.Vector3(0,0,1) });  // back
    meshFaces.push({ indices: [0,1,5,4], normal: new THREE.Vector3(0,-1,0) }); // bottom
    meshFaces.push({ indices: [2,3,7,6], normal: new THREE.Vector3(0,1,0) });  // top
    meshFaces.push({ indices: [1,2,6,5], normal: new THREE.Vector3(1,0,0) });  // right
    meshFaces.push({ indices: [4,7,3,0], normal: new THREE.Vector3(-1,0,0) }); // left
    return v;

  } else if (type === 'triangulated') {
    // Box triangulated: 12 triangles
    const v = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],
    ];
    meshFaces.push({ indices: [3,2,1], normal: new THREE.Vector3(0,0,-1) });
    meshFaces.push({ indices: [3,1,0], normal: new THREE.Vector3(0,0,-1) });
    meshFaces.push({ indices: [4,5,6], normal: new THREE.Vector3(0,0,1) });
    meshFaces.push({ indices: [4,6,7], normal: new THREE.Vector3(0,0,1) });
    meshFaces.push({ indices: [0,1,5], normal: new THREE.Vector3(0,-1,0) });
    meshFaces.push({ indices: [0,5,4], normal: new THREE.Vector3(0,-1,0) });
    meshFaces.push({ indices: [2,3,7], normal: new THREE.Vector3(0,1,0) });
    meshFaces.push({ indices: [2,7,6], normal: new THREE.Vector3(0,1,0) });
    meshFaces.push({ indices: [1,2,6], normal: new THREE.Vector3(1,0,0) });
    meshFaces.push({ indices: [1,6,5], normal: new THREE.Vector3(1,0,0) });
    meshFaces.push({ indices: [4,7,3], normal: new THREE.Vector3(-1,0,0) });
    meshFaces.push({ indices: [4,3,0], normal: new THREE.Vector3(-1,0,0) });
    return v;

  } else if (type === 'ngon') {
    // Prism with n-gon caps
    const n = params.sides;
    const verts = [[0, 1, 0]]; // top center
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      verts.push([Math.cos(a), 1, Math.sin(a)]);
    }
    verts.push([0, -1, 0]); // bottom center
    for (let i = 0; i < n; i++) {
      verts.push([Math.cos((i / n) * Math.PI * 2), -1, Math.sin((i / n) * Math.PI * 2)]);
    }
    // Top face: center + all top verts
    const topIndices = [0];
    for (let i = 1; i <= n; i++) topIndices.push(i);
    meshFaces.push({ indices: topIndices, normal: new THREE.Vector3(0, 1, 0) });
    // Bottom face
    const botIndices = [n + 1];
    for (let i = n + 2; i <= n * 2 + 1; i++) botIndices.push(i);
    meshFaces.push({ indices: botIndices, normal: new THREE.Vector3(0, -1, 0) });
    // Side quads
    for (let i = 0; i < n; i++) {
      const next = i + 1;
      const bNext = n + 2 + (i + 1) % n;
      const bCurr = n + 2 + i;
      meshFaces.push({ indices: [next % n + 1, i + 1, bCurr, bNext], normal: new THREE.Vector3(0, 0, 0) });
    }
    return verts;
  }

  return [];
}

// ─── Build THREE BufferGeometry from faces ────────────────────────────────────
function buildGeometry(verts) {
  const positions = [];
  const normals = [];
  const indices = [];

  // Compute face normals and triangulate
  meshFaces.forEach((face, fi) => {
    const pts = face.indices.map(idx => new THREE.Vector3(...verts[idx]));
    const n = face.indices.length;

    // Compute normal
    if (n >= 3) {
      const e1 = new THREE.Vector3().subVectors(pts[1], pts[0]);
      const e2 = new THREE.Vector3().subVectors(pts[2], pts[0]);
      const fn = new THREE.Vector3().crossVectors(e1, e2).normalize();
      face.normal.copy(fn);
    }

    // Color based on edge count
    if (n === 3) face.color = new THREE.Color(0x44aaff);
    else if (n === 4) face.color = new THREE.Color(0x44ff88);
    else face.color = new THREE.Color(0xff4466);

    // Fan triangulation
    for (let i = 0; i < n; i++) {
      positions.push(pts[0].x, pts[0].y, pts[0].z);
      positions.push(pts[(i + 1) % n].x, pts[(i + 1) % n].y, pts[(i + 1) % n].z);
      positions.push(pts[(i + 2) % n].x, pts[(i + 2) % n].y, pts[(i + 2) % n].z);
      normals.push(fn.x, fn.y, fn.z);
      normals.push(fn.x, fn.y, fn.z);
      normals.push(fn.x, fn.y, fn.z);
      face.color.toArray(normals, normals.length - 3);
      face.color.toArray(normals, normals.length - 3);
      face.color.toArray(normals, normals.length - 3);
      const base = fi * n * 3 + i * 3;
      indices.push(base, base + 1, base + 2);
    }
  });

  // Rebuild colors properly
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─── Rebuild Mesh ──────────────────────────────────────────────────────────────
let currentVerts = [];
let currentType = 'grid';

function rebuildMesh() {
  if (meshObject) scene.remove(meshObject);
  if (faceEdgeObject) scene.remove(faceEdgeObject);
  if (vertexSphereObject) scene.remove(vertexSphereObject);

  currentVerts = generateMesh(currentType);

  const geo = buildGeometry(currentVerts);

  // Wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x003366,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });
  meshObject = new THREE.Mesh(geo, wireMat);
  scene.add(meshObject);

  // Draw edge lines
  rebuildEdges();

  // Draw vertex spheres
  rebuildVertexSpheres();

  selectedFaceIndex = -1;
  selectedVertexIndex = -1;
  selectionSphere.visible = false;
}

function rebuildEdges() {
  if (faceEdgeObject) scene.remove(faceEdgeObject);
  const edgePositions = [];
  meshFaces.forEach(face => {
    const n = face.indices.length;
    for (let i = 0; i < n; i++) {
      const a = face.indices[i];
      const b = face.indices[(i + 1) % n];
      edgePositions.push(
        currentVerts[a][0], currentVerts[a][1], currentVerts[a][2],
        currentVerts[b][0], currentVerts[b][1], currentVerts[b][2],
      );
    }
  });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x2266aa, transparent: true, opacity: 0.6 });
  faceEdgeObject = new THREE.LineSegments(edgeGeo, edgeMat);
  scene.add(faceEdgeObject);
}

function rebuildVertexSpheres() {
  if (vertexSphereObject) scene.remove(vertexSphereObject);
  const group = new THREE.Group();
  const sphereGeo = new THREE.SphereGeometry(0.06, 8, 8);
  currentVerts.forEach(v => {
    const m = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0x88aacc }));
    m.position.set(v[0], v[1], v[2]);
    group.add(m);
  });
  vertexSphereObject = group;
  scene.add(vertexSphereObject);
}

// ─── Extrude Face ──────────────────────────────────────────────────────────────
function extrudeFace(faceIndex) {
  const face = meshFaces[faceIndex];
  if (!face) return;

  const idx = face.indices;
  const n = idx.length;

  // Compute centroid of this face
  const centroid = new THREE.Vector3();
  idx.forEach(i => {
    centroid.x += currentVerts[i][0];
    centroid.y += currentVerts[i][1];
    centroid.z += currentVerts[i][2];
  });
  centroid.divideScalar(n);

  // Compute face normal
  const pts = idx.map(i => new THREE.Vector3(...currentVerts[i]));
  const e1 = new THREE.Vector3().subVectors(pts[1], pts[0]);
  const e2 = new THREE.Vector3().subVectors(pts[2], pts[0]);
  const fn = new THREE.Vector3().crossVectors(e1, e2).normalize();

  const extrudeDist = params.extrudeAmount;

  // Build new vertices: offset originals + new ones
  const newIndices = [];
  idx.forEach(oldIdx => {
    const v = currentVerts[oldIdx];
    const nv = [v[0] + fn.x * extrudeDist, v[1] + fn.y * extrudeDist, v[2] + fn.z * extrudeDist];
    newIndices.push(currentVerts.length);
    currentVerts.push(nv);
  });

  // Replace old face with new extruded quads (or n-gons for n>3)
  // Side faces: quad between old edge verts and new verts
  for (let i = 0; i < n; i++) {
    const oldA = idx[i];
    const oldB = idx[(i + 1) % n];
    const newA = newIndices[i];
    const newB = newIndices[(i + 1) % n];
    meshFaces.push({ indices: [oldA, newA, newB, oldB], normal: new THREE.Vector3(0, 1, 0) });
  }

  // New face at front
  face.indices = newIndices.slice().reverse(); // flip winding
  face.normal.copy(fn);

  rebuildMesh();
}

// ─── Face Picking ─────────────────────────────────────────────────────────────
function getFaceAtPixel(x, y) {
  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (!meshObject) return -1;

  const intersects = raycaster.intersectObject(meshObject);
  if (intersects.length > 0) {
    const fi = intersects[0].faceIndex;
    // triangulated face index maps back to original face
    // For simplicity, count triangles per face
    let count = 0;
    for (let i = 0; i < meshFaces.length; i++) {
      const n = meshFaces[i].indices.length;
      count += n - 2; // number of triangles in this face
      if (fi < count) return i;
    }
  }
  return -1;
}

function getVertexAtPixel(x, y) {
  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (!vertexSphereObject) return -1;

  const spheres = vertexSphereObject.children;
  let closest = -1;
  let minDist = 0.15;
  spheres.forEach((s, i) => {
    const d = raycaster.ray.distanceToPoint(s.position);
    if (d < minDist) {
      minDist = d;
      closest = i;
    }
  });
  return closest;
}

// ─── Interaction ───────────────────────────────────────────────────────────────
let isDragging = false;
let mouseDownPos = { x: 0, y: 0 };

renderer.domElement.addEventListener('mousedown', e => {
  mouseDownPos = { x: e.clientX, y: e.clientY };
  isDragging = false;
});

renderer.domElement.addEventListener('mousemove', e => {
  const dx = e.clientX - mouseDownPos.x;
  const dy = e.clientY - mouseDownPos.y;
  if (Math.sqrt(dx * dx + dy * dy) > 4) isDragging = true;
});

renderer.domElement.addEventListener('mouseup', e => {
  if (isDragging) return;
  if (e.button !== 0) return;

  const fi = getFaceAtPixel(e.clientX, e.clientY);
  if (fi >= 0) {
    extrudeFace(fi);
    return;
  }

  const vi = getVertexAtPixel(e.clientX, e.clientY);
  if (vi >= 0) {
    selectedVertexIndex = vi;
    const v = currentVerts[vi];
    selectionSphere.position.set(v[0], v[1], v[2]);
    selectionSphere.visible = true;
  } else {
    selectedVertexIndex = -1;
    selectedFaceIndex = -1;
    selectionSphere.visible = false;
  }
});

// ─── GUI ──────────────────────────────────────────────────────────────────────
const params = {
  meshType: 'grid',
  sides: 6,
  complexity: 4,
  extrudeAmount: 0.4,
  bloomStrength: 0.8,
};

const gui = new GUI({ title: 'Mesh Controls' });
gui.domElement.style.setProperty('--bg-color', '#0d1117');
gui.domElement.style.setProperty('--text-color', '#c0c8d8');
gui.domElement.style.setProperty('--title-color', '#4af');

gui.add(params, 'meshType', ['grid', 'box', 'triangulated', 'ngon'])
  .name('Mesh Type')
  .onChange(v => {
    currentType = v;
    rebuildMesh();
  });

gui.add(params, 'sides', 3, 12, 1).name('N-gon Sides').onChange(() => {
  if (currentType === 'ngon') rebuildMesh();
});

gui.add(params, 'extrudeAmount', 0.1, 2.0, 0.05).name('Extrude Dist');

gui.add(params, 'bloomStrength', 0.0, 2.0, 0.05).name('Bloom').onChange(v => {
  bloomPass.strength = v;
});

const btn = { reset: () => { currentVerts = generateMesh(currentType); rebuildMesh(); } };
gui.add(btn, 'reset').name('Reset Mesh');

// ─── Animate ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  controls.update();
  composer.render();
}
animate();

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
rebuildMesh();