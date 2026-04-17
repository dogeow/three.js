import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

// ─── Scene Setup ───────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.025);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 6, 18);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3;
controls.maxDistance = 60;

// ─── Lighting ──────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.4);
dirLight.position.set(8, 14, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 60;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x4488ff, 0.5, 40);
fillLight.position.set(-10, 5, -5);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xff8844, 0.4, 30);
rimLight.position.set(5, -3, -10);
scene.add(rimLight);

// ─── Grid / Axes ───────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(30, 30, 0x222233, 0x181828);
scene.add(gridHelper);

// ─── Initial Control Points ────────────────────────────────────────────────
function createInitialPoints() {
  return [
    new THREE.Vector3(-7, 0,  3),
    new THREE.Vector3(-4, 1.5, -2),
    new THREE.Vector3(-1, -1, 4),
    new THREE.Vector3( 2, 2, -3),
    new THREE.Vector3( 5, 0, 2),
    new THREE.Vector3( 7, -1.5, -1),
    new THREE.Vector3( 9, 1, 3),
    new THREE.Vector3( 6, 2.5, -2),
  ];
}

let points = createInitialPoints();
let curve = null;
let tubeMesh = null;
let crawlerMesh = null;
let crawlerT = 0;

// ─── Spline & Tube ─────────────────────────────────────────────────────────
function rebuildTube() {
  if (points.length < 2) return;

  curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', params.tension);
  curve.closed = false;

  if (tubeMesh) {
    scene.remove(tubeMesh);
    tubeMesh.geometry.dispose();
  }

  const segments = Math.max(8, params.tubeSegments);
  const tubeGeo = new THREE.TubeGeometry(curve, segments * points.length, params.tubeRadius, 12, false);
  tubeMesh = new THREE.Mesh(tubeGeo, tubeMaterial);
  tubeMesh.castShadow = true;
  tubeMesh.receiveShadow = true;
  scene.add(tubeMesh);

  updateInfo();
}

function updateInfo() {
  if (!curve) return;
  const len = curve.getLength();
  document.getElementById('length').textContent = len.toFixed(2);
  document.getElementById('pointCount').textContent = points.length;
}

// ─── Materials ─────────────────────────────────────────────────────────────
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 0x7af7c8,
  emissive: 0x2a5540,
  roughness: 0.3,
  metalness: 0.6,
  envMapIntensity: 1.0,
});

const sphereSelectedMaterial = new THREE.MeshStandardMaterial({
  color: 0xffcc44,
  emissive: 0x664400,
  roughness: 0.2,
  metalness: 0.7,
});

const crawlerMaterial = new THREE.MeshStandardMaterial({
  color: 0xff6b6b,
  emissive: 0x441111,
  roughness: 0.2,
  metalness: 0.8,
});

const tubeMaterial = new THREE.MeshStandardMaterial({
  color: 0x4488cc,
  emissive: 0x112233,
  roughness: 0.4,
  metalness: 0.3,
  transparent: true,
  opacity: 0.85,
});

// ─── Sphere Helpers (per control point) ───────────────────────────────────
const sphereGroup = new THREE.Group();
scene.add(sphereGroup);

let sphereHelpers = [];
let selectedIndex = -1;

function createSphereHelpers() {
  // Remove old
  sphereHelpers.forEach(sh => sphereGroup.remove(sh.mesh));
  sphereHelpers = [];

  points.forEach((pt, i) => {
    const geo = new THREE.SphereGeometry(0.28, 20, 20);
    const mat = i === selectedIndex ? sphereSelectedMaterial.clone() : sphereMaterial.clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pt);
    mesh.castShadow = true;
    mesh.userData.index = i;
    sphereGroup.add(mesh);
    sphereHelpers.push({ mesh, index: i });
  });
}

function updateSphereMaterials() {
  sphereHelpers.forEach(({ mesh, index }) => {
    if (index === selectedIndex) {
      mesh.material = sphereSelectedMaterial.clone();
    } else {
      mesh.material = sphereMaterial.clone();
    }
  });
}

// ─── Crawler ───────────────────────────────────────────────────────────────
const crawlerGeo = new THREE.SphereGeometry(0.22, 18, 18);
crawlerMesh = new THREE.Mesh(crawlerGeo, crawlerMaterial);
crawlerMesh.castShadow = true;
scene.add(crawlerMesh);

// ─── Raycaster / Drag ──────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragOffset = new THREE.Vector3();
let isDragging = false;
let dragIndex = -1;
let prevPosition = new THREE.Vector3();

function getMouseNDC(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  getMouseNDC(e);
  raycaster.setFromCamera(mouse, camera);

  const meshes = sphereHelpers.map(sh => sh.mesh);
  const hits = raycaster.intersectObjects(meshes);

  if (hits.length > 0) {
    controls.enabled = false;
    isDragging = true;
    dragIndex = hits[0].object.userData.index;
    selectedIndex = dragIndex;
    updateSphereMaterials();

    const hitPoint = hits[0].point;
    dragPlane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).negate(),
      hitPoint
    );
    dragOffset.copy(hitPoint).sub(points[dragIndex]);
    prevPosition.copy(points[dragIndex]);

    renderer.domElement.style.cursor = 'grabbing';
  }
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (!isDragging || dragIndex < 0) {
    // Hover hint
    getMouseNDC(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(sphereHelpers.map(sh => sh.mesh));
    renderer.domElement.style.cursor = hits.length > 0 ? 'grab' : 'default';
    return;
  }

  getMouseNDC(e);
  raycaster.setFromCamera(mouse, camera);

  const intersectPt = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, intersectPt)) {
    intersectPt.sub(dragOffset);
    // Clamp y slightly
    intersectPt.y = Math.max(-8, Math.min(8, intersectPt.y));
    points[dragIndex].copy(intersectPt);
    sphereHelpers[dragIndex].mesh.position.copy(intersectPt);

    rebuildTube();
    prevPosition.copy(intersectPt);
  }
});

renderer.domElement.addEventListener('pointerup', () => {
  if (isDragging) {
    isDragging = false;
    dragIndex = -1;
    controls.enabled = true;
    renderer.domElement.style.cursor = 'default';
  }
});

// ─── Keyboard ──────────────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.key === 'n' || e.key === 'N') {
    // Add point at center
    const center = new THREE.Vector3();
    points.forEach(p => center.add(p));
    center.divideScalar(points.length);
    // Nudge it slightly random
    center.x += (Math.random() - 0.5) * 2;
    center.y += (Math.random() - 0.5) * 2;
    center.z += (Math.random() - 0.5) * 2;
    points.push(center);
    createSphereHelpers();
    rebuildTube();
  }

  if (e.key === 'r' || e.key === 'R') {
    points = createInitialPoints();
    selectedIndex = -1;
    createSphereHelpers();
    rebuildTube();
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIndex >= 0) {
    if (points.length > 2) {
      points.splice(selectedIndex, 1);
      selectedIndex = -1;
      createSphereHelpers();
      rebuildTube();
    }
  }
});

// ─── GUI ───────────────────────────────────────────────────────────────────
const params = {
  tension: 0.5,
  tubeRadius: 0.18,
  tubeSegments: 64,
  crawlerSpeed: 0.3,
};

const gui = new GUI({ title: 'Spline Controls' });
gui.add(params, 'tension', 0, 1, 0.01).name('Tension').onChange(rebuildTube);
gui.add(params, 'tubeRadius', 0.05, 0.8, 0.01).name('Tube Radius').onChange(rebuildTube);
gui.add(params, 'tubeSegments', 8, 256, 1).name('Tube Segments').onChange(rebuildTube);
gui.add(params, 'crawlerSpeed', 0.05, 2, 0.05).name('Crawler Speed');

// ─── Animation Loop ────────────────────────────────────────────────────────
let lastTime = 0;

function animate(time) {
  requestAnimationFrame(animate);
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  // Move crawler
  if (curve && curve.getLength() > 0) {
    crawlerT += params.crawlerSpeed * delta / curve.getLength() * 0.5;
    if (crawlerT > 1) crawlerT -= 1;
    if (crawlerT < 0) crawlerT += 1;

    const crawlerPos = curve.getPointAt(Math.max(0, Math.min(1, crawlerT)));
    crawlerMesh.position.copy(crawlerPos);

    // Orient crawler along tangent
    const tangent = curve.getTangentAt(Math.max(0, Math.min(1, crawlerT)));
    crawlerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  }

  // Pulse selected sphere
  if (selectedIndex >= 0 && sphereHelpers[selectedIndex]) {
    const s = 1 + 0.08 * Math.sin(time * 0.006);
    sphereHelpers[selectedIndex].mesh.scale.setScalar(s);
  }

  controls.update();
  renderer.render(scene, camera);
}

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Expose for Debug ───────────────────────────────────────────────────────
window.curve = null;
window.points = points;

// ─── Init ───────────────────────────────────────────────────────────────────
createSphereHelpers();
rebuildTube();

window.curve = () => curve;
window.points = () => points;

requestAnimationFrame(animate);