import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import GUI from 'https://unpkg.com/lil-gui@0.19.2/dist/lil-gui.esm.min.js';

// ── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ── Scene & Camera ───────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 12);

// ── Controls ──────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 30;

// ── Environment Map (gradient cube) ─────────────────────────────────────────
function buildGradientCube(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gen = (c1, c2, vert = false) => {
    const g = ctx.createLinearGradient(0, vert ? size : 0, 0, vert ? 0 : size);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  };
  const faces = [
    gen('#1a0a3a', '#0a051a', true),
    gen('#0a051a', '#1a0a3a', true),
    gen('#200840', '#050510', false),
    gen('#050510', '#200840', false),
    gen('#0d0620', '#1a0a3a', false),
    gen('#1a0a3a', '#0d0620', false),
  ];
  const cubeTex = new THREE.CubeTexture(faces.map(c => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    cv.getContext('2d').drawImage(canvas, 0, 0);
    return cv;
  }));
  cubeTex.needsUpdate = true;
  return cubeTex;
}

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const envScene = new THREE.Scene();
envScene.background = buildGradientCube(512);
const envMap = pmremGenerator.fromScene(envScene).texture;
scene.environment = envMap;

// ── Post-processing ─────────────────────────────────────────────────────────
let composer, bloomPass;
function initPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6, 0.4, 0.85
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}
initPostProcessing();

// ── Params ───────────────────────────────────────────────────────────────────
const params = {
  count: 20,
  transmission: 0.92,
  scale: 1.0,
  rotationSpeed: 0.3,
};

// ── Crystal geometry (elongated octahedron) ───────────────────────────────────
function makeCrystalGeometry() {
  // 8-vertex elongated octahedron
  // Top/bottom caps + 4 equatorial vertices forming a belt
  const hw = 0.28; // half-width
  const hh = 1.2;  // half-height
  const hd = 0.22; // half-depth

  // Vertices
  const pos = [
    // top pyramid
     0,  hh,  0,
    -hw,  0, -hd,
     hw,  0, -hd,
     hw,  0,  hd,
    -hw,  0,  hd,
    // bottom pyramid
     0, -hh,  0,
    -hw,  0, -hd,
     hw,  0, -hd,
     hw,  0,  hd,
    -hw,  0,  hd,
  ];

  // Normals (approximate, pointing outward)
  const nTop    = [0,  1,  0];
  const nBottom = [0, -1,  0];
  const nMid    = [0,  0,  1];  // simplified — actual norms vary per face

  const indices = [
    // top cap (4 triangles)
    0,1,2, 0,2,3, 0,3,4, 0,4,1,
    // bottom cap (4 triangles)
    5,7,6, 5,8,7, 5,9,8, 5,6,9,
    // sides
    1,2,7, 2,3,7, 3,4,8, 4,1,9, // outer sides
    // inner quads (connecting belt)
  ];

  // Better approach: use a true lathe / cylinder approach
  // Build as a tapered CylinderGeometry with 6 segments, then scale Y heavily
  const g = new THREE.CylinderGeometry(0.3, 0.05, 2.4, 6, 1);
  g.scale(1, 1, 1);
  return g;
}

// ── Rainbow hue → Color ───────────────────────────────────────────────────────
function hueColor(h) {
  return new THREE.Color().setHSL(h, 0.9, 0.55);
}

// ── Cluster group ─────────────────────────────────────────────────────────────
let cluster = null;

function createCluster() {
  if (cluster) {
    scene.remove(cluster);
    cluster.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  cluster = new THREE.Group();
  const count = params.count;

  for (let i = 0; i < count; i++) {
    const geo = makeCrystalGeometry();

    // Random elongated octahedron proportions
    const sx = 0.15 + Math.random() * 0.35;
    const sy = 0.8 + Math.random() * 2.2;
    const sz = 0.15 + Math.random() * 0.35;
    geo.scale(sx, sy, sz);

    const hue = (i / count + Math.random() * 0.15) % 1.0;
    const color = hueColor(hue);

    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      transmission: params.transmission,
      ior: 2.4,
      metalness: 0,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.5,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);

    // Spherical distribution, denser in center
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = Math.pow(Math.random(), 0.5) * 3.5;
    mesh.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.6,
      r * Math.cos(phi)
    );

    // Random orientation
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    mesh.userData.baseRotY = Math.random() * Math.PI * 2;
    mesh.userData.baseRotX = Math.random() * Math.PI * 2;
    mesh.userData.driftY   = (Math.random() - 0.5) * 0.3;
    mesh.userData.driftX   = (Math.random() - 0.5) * 0.15;

    cluster.add(mesh);
  }

  scene.add(cluster);
}

createCluster();
window.crystal = { scene, renderer, camera, cluster, createCluster, params };

// ── GUI ───────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Crystal Controls' });
gui.add(params, 'count', 5, 50, 1).name('数量').onFinishChange(createCluster);
gui.add(params, 'transmission', 0.5, 1.0, 0.01).name('透明度');
gui.add(params, 'scale', 0.2, 3.0, 0.05).name('缩放').onFinishChange(() => {
  if (cluster) cluster.scale.setScalar(params.scale);
});
gui.add(params, 'rotationSpeed', 0, 2.0, 0.05).name('旋转速度');

// ── Interaction ─────────────────────────────────────────────────────────────
window.addEventListener('click', () => {
  createCluster();
  if (params.scale !== 1.0) cluster.scale.setScalar(params.scale);
});
window.addEventListener('touchend', () => {
  createCluster();
  if (params.scale !== 1.0) cluster.scale.setScalar(params.scale);
});

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// ── Animate ───────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const rot = params.rotationSpeed;

  if (cluster) {
    cluster.rotation.y = t * rot * 0.4;
    cluster.rotation.x = Math.sin(t * 0.07) * 0.08;

    cluster.children.forEach((mesh, i) => {
      mesh.rotation.y += mesh.userData.driftY * 0.005;
      mesh.rotation.x += mesh.userData.driftX * 0.003;
    });
  }

  controls.update();
  composer.render();
}
animate();