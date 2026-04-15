import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Scene Setup ────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 4, 7);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 3;
controls.maxDistance = 20;
controls.target.set(0, 0, 0);

// ─── Lighting ────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x1a1a2e, 2.0);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 3.0);
dirLight.position.set(6, 10, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -8;
dirLight.shadow.camera.right = 8;
dirLight.shadow.camera.top = 8;
dirLight.shadow.camera.bottom = -8;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x4466ff, 1.0);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xff6644, 2.0, 20);
rimLight.position.set(-4, 5, 4);
scene.add(rimLight);

// ─── Ground Plane ───────────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(30, 30);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x111122,
  roughness: 0.9,
  metalness: 0.1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.5;
ground.receiveShadow = true;
scene.add(ground);

// Grid helper
const gridHelper = new THREE.GridHelper(20, 30, 0x222244, 0x111133);
gridHelper.position.y = -2.49;
scene.add(gridHelper);

// ─── Soft Body Parameters (GUI) ────────────────────────────────────────────
const params = {
  stiffness: 0.15,
  damping: 0.88,
  gravity: -9.8,
  restLengthScale: 1.0,
  vertexRadius: 0.06,
  showSprings: true,
  showVertices: true,
  springOpacity: 0.25,
  cubeSize: 1.4,
  reset: () => resetParticles(),
};

// ─── Particle System ─────────────────────────────────────────────────────────
const CUBE_SIZE = 1; // 1 = 8 vertices, 2 = 27 vertices, 3 = 64 vertices
const PARTICLE_COUNT = Math.pow(CUBE_SIZE + 1, 3);

let particles = [];
let springs = [];

function initParticles() {
  particles = [];
  springs = [];

  const half = params.cubeSize / 2;
  const step = params.cubeSize / CUBE_SIZE;

  // Create particles
  for (let ix = 0; ix <= CUBE_SIZE; ix++) {
    for (let iy = 0; iy <= CUBE_SIZE; iy++) {
      for (let iz = 0; iz <= CUBE_SIZE; iz++) {
        const x = -half + ix * step;
        const y = -half + iy * step;
        const z = -half + iz * step;
        particles.push({
          position: new THREE.Vector3(x, y, z),
          prevPosition: new THREE.Vector3(x, y, z),
          restPosition: new THREE.Vector3(x, y, z),
          acceleration: new THREE.Vector3(),
          mass: 1.0,
          pinned: false,
        });
      }
    }
  }

  // Create springs
  const cols = CUBE_SIZE + 1;

  // Helper to get particle index
  const idx = (x, y, z) => x * cols * cols + y * cols + z;

  for (let ix = 0; ix <= CUBE_SIZE; ix++) {
    for (let iy = 0; iy <= CUBE_SIZE; iy++) {
      for (let iz = 0; iz <= CUBE_SIZE; iz++) {
        const i = idx(ix, iy, iz);

        // Structural springs (adjacent)
        if (ix < CUBE_SIZE) addSpring(i, idx(ix + 1, iy, iz));
        if (iy < CUBE_SIZE) addSpring(i, idx(ix, iy + 1, iz));
        if (iz < CUBE_SIZE) addSpring(i, idx(ix, iy, iz + 1));

        // Shear springs (face diagonals)
        if (ix < CUBE_SIZE && iy < CUBE_SIZE) addSpring(i, idx(ix + 1, iy + 1, iz));
        if (iy < CUBE_SIZE && iz < CUBE_SIZE) addSpring(i, idx(ix, iy + 1, iz + 1));
        if (ix < CUBE_SIZE && iz < CUBE_SIZE) addSpring(i, idx(ix + 1, iy, iz + 1));

        // Bend springs (opposite face)
        if (ix < CUBE_SIZE && iy < CUBE_SIZE && iz < CUBE_SIZE) {
          addSpring(i, idx(ix + 1, iy + 1, iz + 1));
        }

        // Internal edge springs
        if (ix < CUBE_SIZE && iy < CUBE_SIZE && iz <= CUBE_SIZE) {
          addSpring(i, idx(ix + 1, iy + 1, Math.min(iz + 1, CUBE_SIZE)));
        }
        if (iy < CUBE_SIZE && iz < CUBE_SIZE && ix <= CUBE_SIZE) {
          addSpring(i, idx(Math.min(ix + 1, CUBE_SIZE), iy + 1, iz + 1));
        }
        if (ix < CUBE_SIZE && iz < CUBE_SIZE && iy <= CUBE_SIZE) {
          addSpring(i, idx(ix + 1, Math.min(iy + 1, CUBE_SIZE), iz + 1));
        }
      }
    }
  }
}

function addSpring(a, b) {
  if (a === b) return;
  const restLen = particles[a].restPosition.distanceTo(particles[b].restPosition) * params.restLengthScale;
  springs.push({ a, b, restLength: restLen });
}

function resetParticles() {
  initParticles();
  updateGeometry();
}

// ─── Mesh Geometry ───────────────────────────────────────────────────────────
const cubeGeo = new THREE.BoxGeometry(1, 1, 1, CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubeMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color().setHSL(0.58, 0.7, 0.5),
  roughness: 0.35,
  metalness: 0.3,
  flatShading: false,
  side: THREE.DoubleSide,
});

const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
cubeMesh.castShadow = true;
cubeMesh.receiveShadow = true;
scene.add(cubeMesh);

// ─── Spring Lines ────────────────────────────────────────────────────────────
const springPositions = new Float32Array(PARTICLE_COUNT * 2 * 3);
const springGeo = new THREE.BufferGeometry();
springGeo.setAttribute('position', new THREE.BufferAttribute(springPositions, 3));

const springMat = new THREE.LineBasicMaterial({
  color: 0x44ffaa,
  transparent: true,
  opacity: params.springOpacity,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const springLines = new THREE.LineSegments(springGeo, springMat);
springLines.visible = params.showSprings;
scene.add(springLines);

// ─── Vertex Markers ──────────────────────────────────────────────────────────
const vertexGeo = new THREE.SphereGeometry(params.vertexRadius, 10, 10);
const vertexMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: new THREE.Color().setHSL(0.58, 1.0, 0.5),
  emissiveIntensity: 0.8,
  roughness: 0.2,
  metalness: 0.5,
});
const vertexMesh = new THREE.InstancedMesh(vertexGeo, vertexMat, PARTICLE_COUNT);
vertexMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
vertexMesh.visible = params.showVertices;
vertexMesh.castShadow = false;
scene.add(vertexMesh);

const dummy = new THREE.Object3D();

// ─── Update Geometry ─────────────────────────────────────────────────────────
const posAttr = cubeGeo.attributes.position;

function updateGeometry() {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];
    posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
  }
  posAttr.needsUpdate = true;
  cubeGeo.computeVertexNormals();

  // Spring lines
  let si = 0;
  for (const s of springs) {
    const pa = particles[s.a].position;
    const pb = particles[s.b].position;
    springPositions[si++] = pa.x;
    springPositions[si++] = pa.y;
    springPositions[si++] = pa.z;
    springPositions[si++] = pb.x;
    springPositions[si++] = pb.y;
    springPositions[si++] = pb.z;
  }
  springGeo.attributes.position.needsUpdate = true;
  springGeo.computeBoundingSphere();

  // Vertex markers
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];
    dummy.position.copy(p.position);
    dummy.scale.setScalar(p.pinned ? 1.8 : 1.0);
    dummy.updateMatrix();
    vertexMesh.setMatrixAt(i, dummy.matrix);

    // Color pinned vertices differently
    vertexMesh.setColorAt(i, p.pinned
      ? new THREE.Color(0xff4466)
      : new THREE.Color().setHSL(0.58, 1.0, 0.7)
    );
  }
  vertexMesh.instanceMatrix.needsUpdate = true;
  if (vertexMesh.instanceColor) vertexMesh.instanceColor.needsUpdate = true;
}

// ─── Physics (Verlet Integration) ────────────────────────────────────────────
const _gravity = new THREE.Vector3();
const _springForce = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _acc = new THREE.Vector3();

function simulate(dt) {
  dt = Math.min(dt, 0.033); // cap at ~30fps equivalent

  const k = params.stiffness;
  const damp = params.damping;
  const dt2 = dt * dt;

  _gravity.set(0, params.gravity, 0);

  // Reset acceleration
  for (const p of particles) {
    if (!p.pinned) {
      p.acceleration.copy(_gravity);
    }
  }

  // Spring forces
  for (const s of springs) {
    const pa = particles[s.a];
    const pb = particles[s.b];

    _delta.subVectors(pb.position, pa.position);
    const len = _delta.length();
    if (len < 0.0001) continue;

    const stretch = len - s.restLength;
    const forceMag = k * stretch;

    _springForce.copy(_delta).normalize().multiplyScalar(forceMag);

    if (!pa.pinned) {
      pa.acceleration.add(_springForce.clone().multiplyScalar(1.0 / pa.mass));
    }
    if (!pb.pinned) {
      pb.acceleration.sub(_springForce.clone().multiplyScalar(1.0 / pb.mass));
    }
  }

  // Verlet integration
  for (const p of particles) {
    if (p.pinned) continue;

    // velocity ≈ (pos - prevPos) * damp
    _acc.copy(p.acceleration).multiplyScalar(dt2);

    // new = pos + (pos - prev) * damp + acc
    _delta.subVectors(p.position, p.prevPosition).multiplyScalar(damp).add(_acc);

    p.prevPosition.copy(p.position);
    p.position.add(_delta);

    // Floor collision
    if (p.position.y < -2.4) {
      p.position.y = -2.4;
      p.prevPosition.y = p.position.y + (p.position.y - p.prevPosition.y) * 0.3;
    }
  }
}

// ─── Interaction ─────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedParticle = null;
let isDragging = false;
let dragPlane = new THREE.Plane();
let dragOffset = new THREE.Vector3();
let intersectPoint = new THREE.Vector3();

function getParticleAtMouse(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Intersect cube
  const intersects = raycaster.intersectObject(cubeMesh);
  if (intersects.length === 0) return null;

  const hitPoint = intersects[0].point;

  // Find closest particle
  let closest = null;
  let minDist = 0.6; // max grab distance
  for (let i = 0; i < particles.length; i++) {
    const d = particles[i].position.distanceTo(hitPoint);
    if (d < minDist) {
      minDist = d;
      closest = i;
    }
  }
  return closest;
}

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const idx = getParticleAtMouse(e);
  if (idx !== null) {
    selectedParticle = idx;
    isDragging = true;
    controls.enabled = false;
    particles[idx].pinned = true;

    raycaster.setFromCamera(mouse, camera);
    dragPlane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).negate(),
      particles[idx].position
    );
    raycaster.ray.intersectPlane(dragPlane, intersectPoint);
    dragOffset.subVectors(particles[idx].position, intersectPoint);
  }
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!isDragging || selectedParticle === null) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
    particles[selectedParticle].position.copy(intersectPoint).add(dragOffset);
    particles[selectedParticle].prevPosition.copy(particles[selectedParticle].position);
  }
});

renderer.domElement.addEventListener('mouseup', () => {
  if (selectedParticle !== null) {
    particles[selectedParticle].pinned = false;
    selectedParticle = null;
  }
  isDragging = false;
  controls.enabled = true;
});

// Touch support
renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

    const idx = getParticleAtMouse({ clientX: touch.clientX, clientY: touch.clientY });
    if (idx !== null) {
      selectedParticle = idx;
      isDragging = true;
      controls.enabled = false;
      particles[idx].pinned = true;

      raycaster.setFromCamera(mouse, camera);
      dragPlane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()).negate(),
        particles[idx].position
      );
      raycaster.ray.intersectPlane(dragPlane, intersectPoint);
      dragOffset.subVectors(particles[idx].position, intersectPoint);
      e.preventDefault();
    }
  }
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (e) => {
  if (!isDragging || selectedParticle === null || e.touches.length !== 1) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
    particles[selectedParticle].position.copy(intersectPoint).add(dragOffset);
    particles[selectedParticle].prevPosition.copy(particles[selectedParticle].position);
  }
}, { passive: false });

renderer.domElement.addEventListener('touchend', () => {
  if (selectedParticle !== null) {
    particles[selectedParticle].pinned = false;
    selectedParticle = null;
  }
  isDragging = false;
  controls.enabled = true;
});

// ─── GUI ─────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Soft Body Controls', width: 240 });
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '16px';
gui.domElement.style.right = '16px';

// Physics
const physicsFolder = gui.addFolder('Physics');
physicsFolder.add(params, 'stiffness', 0.01, 0.5, 0.01).name('Stiffness').onChange(() => {
  // stiffness is read in sim loop, no re-init needed
});
physicsFolder.add(params, 'damping', 0.5, 0.99, 0.01).name('Damping');
physicsFolder.add(params, 'gravity', -20, 10, 0.1).name('Gravity');
physicsFolder.add(params, 'restLengthScale', 0.5, 1.5, 0.01).name('Spring Length')
  .onChange(() => {
    // Recompute spring rest lengths
    for (let i = 0; i < springs.length; i++) {
      const s = springs[i];
      s.restLength = particles[s.a].restPosition.distanceTo(particles[s.b].restPosition) * params.restLengthScale;
    }
  });

// Visuals
const visualFolder = gui.addFolder('Visuals');
visualFolder.add(params, 'showSprings').name('Show Springs').onChange((v) => {
  springLines.visible = v;
});
visualFolder.add(params, 'showVertices').name('Show Vertices').onChange((v) => {
  vertexMesh.visible = v;
});
visualFolder.add(params, 'springOpacity', 0, 1, 0.01).name('Spring Opacity').onChange((v) => {
  springMat.opacity = v;
});
visualFolder.addColor(cubeMat, 'color').name('Cube Color');
visualFolder.add(params, 'vertexRadius', 0.02, 0.15, 0.01).name('Vertex Size')
  .onChange((v) => {
    vertexGeo.radius = v;
    vertexGeo.needsUpdate = true;
  });

// Actions
const actionFolder = gui.addFolder('Actions');
actionFolder.add(params, 'reset').name('🔄 Reset Cube');

physicsFolder.open();
visualFolder.open();

// ─── Init ────────────────────────────────────────────────────────────────────
initParticles();
updateGeometry();

// ─── Animation Loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let accumTime = 0;
const SUBSTEPS = 4;

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  accumTime += dt;

  // Substep physics
  const subDt = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    simulate(subDt);
  }

  updateGeometry();

  // Gentle cube rotation when idle
  if (!isDragging) {
    cubeMesh.rotation.y += dt * 0.08;
    springLines.rotation.y += dt * 0.08;
    vertexMesh.rotation.y += dt * 0.08;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});