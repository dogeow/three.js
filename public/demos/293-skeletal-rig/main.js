import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Renderer ───────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ─── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.3, 0);

// Lights
scene.add(new THREE.AmbientLight(0x334466, 0.5));
const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
sun.position.set(4, 8, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 30;
sun.shadow.camera.left = sun.shadow.camera.bottom = -5;
sun.shadow.camera.right = sun.shadow.camera.top = 5;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x4466aa, 0.3);
fill.position.set(-4, 3, -2);
scene.add(fill);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
scene.add(new THREE.GridHelper(20, 20, 0x1e2d40, 0x162030));

// ─── Flat Bone Hierarchy (all children of root) ──────────────────────────────
// Each bone stores its LOCAL offset from root. World pos = root.pos + local offset.
// Root at feet level (y=0). Character total height ≈ 1.75 units.
const BONE_DEFS = [
  // idx, name,               localY,  localX,  parentIdx,  halfLen (for cylinder)
  { idx:  0, name: 'root',     y: 0.00, x: 0,    parent: -1,  r: 0 },
  { idx:  1, name: 'hip',      y: 0.85, x: 0,    parent:  0,  r: 0.13 },   // pelvis top
  { idx:  2, name: 'spine',    y: 1.25, x: 0,    parent:  0,  r: 0.12 },   // lower spine
  { idx:  3, name: 'chest',    y: 1.60, x: 0,    parent:  0,  r: 0.14 },   // chest center
  { idx:  4, name: 'neck',     y: 1.78, x: 0,    parent:  0,  r: 0.06 },   // neck
  { idx:  5, name: 'head',     y: 1.98, x: 0,    parent:  0,  r: 0.10 },   // head center
  // Left arm (from chest)
  { idx:  6, name: 'lClavicle',y: 1.62, x:-0.18, parent:  0,  r: 0.05 },   // collarbone
  { idx:  7, name: 'lShoulder',y: 1.60, x:-0.22, parent:  0,  r: 0.05 },   // shoulder joint
  { idx:  8, name: 'lElbow',   y: 1.60, x:-0.22, parent:  0,  r: 0.04 },   // elbow
  { idx:  9, name: 'lWrist',   y: 1.60, x:-0.22, parent:  0,  r: 0.03 },   // wrist
  { idx: 10, name: 'lHand',    y: 1.60, x:-0.22, parent:  0,  r: 0 },      // hand tip
  // Right arm (mirror)
  { idx: 11, name: 'rClavicle',y: 1.62, x: 0.18, parent:  0,  r: 0.05 },
  { idx: 12, name: 'rShoulder',y: 1.60, x: 0.22, parent:  0,  r: 0.05 },
  { idx: 13, name: 'rElbow',   y: 1.60, x: 0.22, parent:  0,  r: 0.04 },
  { idx: 14, name: 'rWrist',   y: 1.60, x: 0.22, parent:  0,  r: 0.03 },
  { idx: 15, name: 'rHand',    y: 1.60, x: 0.22, parent:  0,  r: 0 },
  // Left leg (from hip)
  { idx: 16, name: 'lHipJoint',y: 0.85, x:-0.12, parent:  0,  r: 0.06 },   // hip ball
  { idx: 17, name: 'lKnee',    y: 0.85, x:-0.12, parent:  0,  r: 0.05 },   // knee
  { idx: 18, name: 'lAnkle',   y: 0.85, x:-0.12, parent:  0,  r: 0.04 },   // ankle
  { idx: 19, name: 'lToe',     y: 0.85, x:-0.12, parent:  0,  r: 0 },       // toe tip
  // Right leg
  { idx: 20, name: 'rHipJoint',y: 0.85, x: 0.12, parent:  0,  r: 0.06 },
  { idx: 21, name: 'rKnee',    y: 0.85, x: 0.12, parent:  0,  r: 0.05 },
  { idx: 22, name: 'rAnkle',   y: 0.85, x: 0.12, parent:  0,  r: 0.04 },
  { idx: 23, name: 'rToe',     y: 0.85, x: 0.12, parent:  0,  r: 0 },
];

// Build bones as children of root (flat hierarchy)
const rootBone = new THREE.Bone();
rootBone.name = 'root';
const bones = [rootBone];

for (const def of BONE_DEFS) {
  if (def.idx === 0) continue;
  const bone = new THREE.Bone();
  bone.name = def.name;
  bone.position.set(def.x, def.y, 0);
  rootBone.add(bone);
  bones.push(bone);
}

// Cylinder limb segments: [startBoneIdx, endBoneIdx, radius, color]
const LIMB_SEGS = [
  // Torso
  [1, 2, 0.13, 0x60a5fa],  // hip → spine
  [2, 3, 0.14, 0x60a5fa],  // spine → chest
  [3, 4, 0.07, 0x60a5fa],  // chest → neck
  [4, 5, 0.10, 0xffd5b5],  // neck → head
  // Left arm
  [7, 8, 0.05, 0x60a5fa],  // shoulder → elbow
  [8, 9, 0.04, 0x60a5fa],  // elbow → wrist
  [9, 10, 0.03, 0xffd5b5], // wrist → hand
  // Right arm
  [12, 13, 0.05, 0x60a5fa],
  [13, 14, 0.04, 0x60a5fa],
  [14, 15, 0.03, 0xffd5b5],
  // Left leg
  [16, 17, 0.06, 0x4ade80], // hip → knee
  [17, 18, 0.05, 0x4ade80], // knee → ankle
  [18, 19, 0.04, 0x334466], // ankle → toe (shoe)
  // Right leg
  [20, 21, 0.06, 0x4ade80],
  [21, 22, 0.05, 0x4ade80],
  [22, 23, 0.04, 0x334466],
];

// Helper: get bone world position
function boneWorld(bi) {
  return bones[bi].getWorldPosition(new THREE.Vector3());
}

// Build cylinder between two bone world positions
function makeLimbCylinder(bi, bj, radius, color) {
  const geo = new THREE.CylinderGeometry(radius, radius, 1, 8, 1, false);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

// Create all limb cylinders
const limbMeshes = LIMB_SEGS.map(([bi, bj, r, col]) => {
  const m = makeLimbCylinder(bi, bj, r, col);
  scene.add(m);
  return m;
});

// Head sphere
const headMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.14, 12, 10),
  new THREE.MeshStandardMaterial({ color: 0xffd5b5, roughness: 0.6 })
);
headMesh.castShadow = true;
scene.add(headMesh);

// Hand groups
function makeHand(isLeft) {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd5b5, roughness: 0.7 });
  // Palm
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.05), skinMat));
  // Fingers
  for (let f = 0; f < 4; f++) {
    const fMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.008, 0.06, 5), skinMat);
    fMesh.position.set(-0.026 + f * 0.018, -0.045, 0);
    g.add(fMesh);
  }
  // Thumb
  const th = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.009, 0.04, 5), skinMat);
  th.position.set(isLeft ? 0.044 : -0.044, -0.015, 0.01);
  th.rotation.z = isLeft ? -0.6 : 0.6;
  g.add(th);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// Foot group
function makeFoot(isLeft) {
  const g = new THREE.Group();
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.8 });
  // Main foot
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.14), shoeMat));
  // Toe box
  const toe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.06), shoeMat);
  toe.position.set(0, -0.002, 0.10);
  g.add(toe);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

const lHand = makeHand(true);
const rHand = makeHand(false);
const lFoot = makeFoot(true);
const rFoot = makeFoot(false);
scene.add(lHand, rHand, lFoot, rFoot);

// Joint spheres (visual)
const jointSpheres = bones.map((bone, bi) => {
  const r = bi === 0 ? 0.06 : bi >= 10 && bi <= 15 ? 0.025 : bi >= 19 && bi <= 23 ? 0.025 : 0.04;
  const mat = new THREE.MeshStandardMaterial({
    color: bi === 0 ? 0xffffff : bi >= 16 && bi <= 23 ? 0x4ade80 : 0xaaddff,
    emissive: bi === 0 ? 0x224466 : 0x112233,
    roughness: 0.3, metalness: 0.6,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
  m.castShadow = true;
  m.userData.boneIdx = bi;
  scene.add(m);
  return m;
});

// Bone lines (visual)
const boneLinePositions = [];
const boneLineColors = [];

for (const [bi, bj, , col] of LIMB_SEGS) {
  const bp = boneWorld(bi);
  const bq = boneWorld(bj);
  const c = new THREE.Color(col);
  boneLinePositions.push(bp.x, bp.y, bp.z, bq.x, bq.y, bq.z);
  boneLineColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
}

const boneLinesGeo = new THREE.BufferGeometry();
boneLinesGeo.setAttribute('position', new THREE.Float32BufferAttribute(boneLinePositions, 3));
boneLinesGeo.setAttribute('color', new THREE.Float32BufferAttribute(boneLineColors, 3));
const boneLines = new THREE.LineSegments(boneLinesGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
scene.add(boneLines);

// Axis indicator for dragging
const axisGroup = new THREE.Group();
axisGroup.visible = false;
scene.add(axisGroup);
[[0xff4444, 1,0,0], [0x44ff44, 0,1,0], [0x4488ff, 0,0,1]].forEach(([col, x,y,z]) => {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(x,y,z).multiplyScalar(0.5)]),
    new THREE.LineBasicMaterial({ color: col })
  );
  axisGroup.add(line);
});

// ─── Update Functions ────────────────────────────────────────────────────────
function updateLimbMesh(mesh, bi, bj) {
  const bp = boneWorld(bi);
  const bq = boneWorld(bj);
  const dir = bq.clone().sub(bp);
  const len = dir.length();
  const mid = bp.clone().add(bq).multiplyScalar(0.5);

  mesh.position.copy(mid);

  // Orient cylinder along dir
  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dir.dot(up)) < 0.999) {
    mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize());
  } else if (dir.y < 0) {
    mesh.quaternion.set(1, 0, 0, 0); // 180° flip
  } else {
    mesh.quaternion.identity();
  }

  // Scale height to match bone length
  mesh.scale.set(1, len, 1);
}

function updateAllLimbMeshes() {
  for (let i = 0; i < LIMB_SEGS.length; i++) {
    const [bi, bj] = LIMB_SEGS[i];
    updateLimbMesh(limbMeshes[i], bi, bj);
  }
}

function updateBoneLines() {
  const pos = boneLinesGeo.attributes.position.array;
  for (let i = 0; i < LIMB_SEGS.length; i++) {
    const [bi, bj] = LIMB_SEGS[i];
    const bp = boneWorld(bi);
    const bq = boneWorld(bj);
    const base = i * 6;
    pos[base]     = bp.x; pos[base+1] = bp.y; pos[base+2] = bp.z;
    pos[base + 3] = bq.x; pos[base+4] = bq.y; pos[base+5] = bq.z;
  }
  boneLinesGeo.attributes.position.needsUpdate = true;
}

function updateJointSpheres() {
  for (let i = 0; i < bones.length; i++) {
    jointSpheres[i].position.copy(boneWorld(i));
  }
}

function updateHandsFeet() {
  // Hands
  const lhp = boneWorld(10);
  lHand.position.copy(lhp);
  lHand.quaternion.copy(bones[10].getWorldQuaternion(new THREE.Quaternion()));

  const rhp = boneWorld(15);
  rHand.position.copy(rhp);
  rHand.quaternion.copy(bones[15].getWorldQuaternion(new THREE.Quaternion()));

  // Feet
  const lfp = boneWorld(19);
  lFoot.position.copy(lfp);
  lFoot.quaternion.copy(bones[19].getWorldQuaternion(new THREE.Quaternion()));

  const rfp = boneWorld(23);
  rFoot.position.copy(rfp);
  rFoot.quaternion.copy(bones[23].getWorldQuaternion(new THREE.Quaternion()));
}

function updateHead() {
  const hp = boneWorld(5);
  headMesh.position.copy(hp);
  headMesh.quaternion.copy(bones[5].getWorldQuaternion(new THREE.Quaternion()));
}

// ─── Bone Dragging ───────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane();
let dragBone = null;
let dragAxis = null;
let prevAngle = 0;

renderer.domElement.addEventListener('mousedown', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(jointSpheres);
  if (hits.length > 0) {
    const bi = hits[0].object.userData.boneIdx;
    if (bi === 0) return;
    dragBone = bones[bi];
    controls.enabled = false;
    // Determine drag axis
    const axes = [
      { axis: 'x', dir: new THREE.Vector3(1,0,0) },
      { axis: 'y', dir: new THREE.Vector3(0,1,0) },
    ];
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    let best = axes[0];
    let bestDot = Math.abs(camDir.dot(best.dir));
    for (const a of axes) {
      const d = Math.abs(camDir.dot(a.dir));
      if (d > bestDot) { bestDot = d; best = a; }
    }
    dragAxis = best.axis;
    const boneWP = boneWorld(bi);
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), boneWP);
    prevAngle = Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2);
    axisGroup.visible = true;
    axisGroup.position.copy(boneWP);
  }
});

renderer.domElement.addEventListener('mousemove', e => {
  if (!dragBone) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, hit)) {
    const currentAngle = Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2);
    const delta = currentAngle - prevAngle;
    prevAngle = currentAngle;
    const euler = new THREE.Euler().setFromQuaternion(dragBone.quaternion, 'XYZ');
    euler[dragAxis] += delta;
    dragBone.quaternion.setFromEuler(euler);
    dragBone.updateMatrixWorld(true);
  }
  axisGroup.position.copy(boneWorld(bones.indexOf(dragBone)));
});

renderer.domElement.addEventListener('mouseup', () => {
  if (dragBone) { dragBone = null; dragAxis = null; controls.enabled = true; axisGroup.visible = false; }
});
renderer.domElement.addEventListener('mouseleave', () => {
  if (dragBone) { dragBone = null; dragAxis = null; controls.enabled = true; axisGroup.visible = false; }
});

// ─── GUI ─────────────────────────────────────────────────────────────────────
const params = {
  animSpeed: 1.0,
  showBones: true,
  showMesh: true,
  showAxes: false,
  walk: true,
};

const gui = new GUI({ title: 'Controls' });
gui.add(params, 'animSpeed', 0, 3, 0.01).name('Anim Speed');
gui.add(params, 'walk').name('Walk Cycle');
gui.add(params, 'showBones').onChange(v => {
  boneLines.visible = v;
  jointSpheres.forEach(m => { m.visible = v; });
}).name('Show Bones');
gui.add(params, 'showMesh').onChange(v => {
  limbMeshes.forEach(m => { m.visible = v; });
  headMesh.visible = v;
  lHand.visible = v; rHand.visible = v;
  lFoot.visible = v; rFoot.visible = v;
}).name('Show Mesh');
gui.add(params, 'showAxes').onChange(v => {
  if (!dragBone) axisGroup.visible = v;
}).name('Show Axes');

// ─── Walk Animation ─────────────────────────────────────────────────────────
let walkTime = 0;

function animateWalk(t) {
  // Hip sway
  bones[1].rotation.z = Math.sin(t * 2) * 0.06;
  // Spine lean
  bones[2].rotation.z = Math.sin(t * 2) * 0.03;
  bones[3].rotation.z = Math.sin(t * 2) * 0.02;
  // Head bob
  bones[5].rotation.x = Math.sin(t * 4) * 0.03;
  bones[5].rotation.z = Math.sin(t * 2) * 0.02;

  // Arm swing (opposite to legs)
  const arm = Math.sin(t) * 0.4;
  bones[7].rotation.x = arm;    // l shoulder
  bones[8].rotation.x = Math.max(0, arm) * 0.5 + 0.1; // l elbow
  bones[12].rotation.x = -arm;  // r shoulder
  bones[13].rotation.x = Math.max(0, -arm) * 0.5 + 0.1; // r elbow

  // Leg swing
  const leg = Math.sin(t) * 0.5;
  bones[16].rotation.x = -leg;   // l hip
  bones[17].rotation.x = Math.max(0, leg) * 0.6;       // l knee (bend when swinging forward)
  bones[20].rotation.x = leg;    // r hip
  bones[21].rotation.x = Math.max(0, -leg) * 0.6;       // r knee

  // Feet: keep roughly horizontal
  bones[18].rotation.x = Math.sin(t + 0.5) * 0.1;
  bones[22].rotation.x = Math.sin(t - 0.5) * 0.1;

  bones.forEach(b => b.updateMatrixWorld(true));
}

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─── Loop ────────────────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  controls.update();

  if (params.walk) {
    walkTime += dt * params.animSpeed * 2.5;
    animateWalk(walkTime);
  }

  updateAllLimbMeshes();
  updateBoneLines();
  updateJointSpheres();
  updateHead();
  updateHandsFeet();

  renderer.render(scene, camera);
}

animate();
