import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ─── Scene Setup ───────────────────────────────────────────────────────────
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05050e);
scene.fog = new THREE.FogExp2(0x05050e, 0.035);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 6, 14);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 40;

// ─── Grid / Axes ─────────────────────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(30, 30, 0x1a0033, 0x0d001a);
gridHelper.position.y = -0.01;
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(3);
scene.add(axesHelper);

// ─── Spline Points ──────────────────────────────────────────────────────────
const ctrlPoints = [
  new THREE.Vector3(-6,  1,  4),
  new THREE.Vector3(-2,  3,  2),
  new THREE.Vector3( 2, -1, -2),
  new THREE.Vector3( 5,  2,  1),
  new THREE.Vector3( 7,  0,  4),
];

const curve = new THREE.CatmullRomCurve3(ctrlPoints, true, 'centripetal', 0.5);

// ─── Draw Spline with LineSegments (tessellated) ───────────────────────────
const SPLINE_SEGMENTS = 400;
const splinePoints = curve.getPoints(SPLINE_SEGMENTS);

const lineGeo = new THREE.BufferGeometry().setFromPoints(splinePoints);
const lineMat = new THREE.LineBasicMaterial({
  color: 0x00ffcc,
  linewidth: 2,
  transparent: true,
  opacity: 0.8,
});
const splineLine = new THREE.Line(lineGeo, lineMat);
scene.add(splineLine);

// Glow pass — slightly thicker line offset
const glowMat = new THREE.LineBasicMaterial({
  color: 0x00ffcc,
  transparent: true,
  opacity: 0.15,
  linewidth: 6,
});
const glowLine = new THREE.Line(lineGeo.clone(), glowMat);
glowLine.scale.setScalar(1.02);
scene.add(glowLine);

// ─── Control Point Markers ──────────────────────────────────────────────────
ctrlPoints.forEach((pt, i) => {
  const markerGeo = new THREE.SphereGeometry(0.15, 16, 16);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.copy(pt);
  scene.add(marker);

  // Tiny ring around control point
  const ringGeo = new THREE.RingGeometry(0.22, 0.28, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff00aa,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pt);
  ring.lookAt(camera.position);
  scene.add(ring);
});

// ─── Moving Object ───────────────────────────────────────────────────────────
// Torus
const torusGeo = new THREE.TorusGeometry(0.35, 0.12, 16, 48);
const torusMat = new THREE.MeshStandardMaterial({
  color: 0xff00aa,
  emissive: 0xff00aa,
  emissiveIntensity: 0.6,
  metalness: 0.9,
  roughness: 0.1,
});
const torus = new THREE.Mesh(torusGeo, torusMat);
scene.add(torus);

// Trail of small spheres
const TRAIL_COUNT = 60;
const trailSpheres = [];
for (let i = 0; i < TRAIL_COUNT; i++) {
  const r = 0.06 * (1 - i / TRAIL_COUNT);
  const sg = new THREE.SphereGeometry(r, 8, 8);
  const sm = new THREE.MeshBasicMaterial({
    color: 0xff00aa,
    transparent: true,
    opacity: (1 - i / TRAIL_COUNT) * 0.5,
  });
  const s = new THREE.Mesh(sg, sm);
  scene.add(s);
  trailSpheres.push(s);
}

// ─── Point Light on Torus ───────────────────────────────────────────────────
const torusLight = new THREE.PointLight(0xff00aa, 3, 6);
torus.add(torusLight);

// Ambient + Directional
scene.add(new THREE.AmbientLight(0x110022, 1.5));
const dirLight = new THREE.DirectionalLight(0x00ffcc, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Rim light
const rimLight = new THREE.PointLight(0x00ffcc, 1, 20);
rimLight.position.set(-8, 5, -8);
scene.add(rimLight);

// ─── GUI ────────────────────────────────────────────────────────────────────
const params = {
  speed: 0.3,
  trailLength: 0.4,
  curveVisible: true,
  pointLights: true,
};

const gui = new GUI({ title: 'Spline Controls' });
gui.add(params, 'speed', 0.01, 2.0, 0.01).name('Speed');
gui.add(params, 'trailLength', 0.05, 1.0, 0.01).name('Trail Length');
gui.add(params, 'curveVisible').name('Show Curve').onChange(v => {
  splineLine.visible = v;
  glowLine.visible = v;
});
gui.add(params, 'pointLights').name('Point Light');

// ─── Animation State ─────────────────────────────────────────────────────────
let t = 0;
const tDisplay = document.getElementById('t-display');

// Current position for trail history
const trailHistory = [];
const MAX_HISTORY = 80;

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render Loop ─────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  // Advance t
  t += params.speed * 0.0008;
  if (t > 1) t -= 1;

  // Current point on curve
  const pos = curve.getPoint(t);
  torus.position.copy(pos);

  // Orient torus along tangent
  const tangent = curve.getTangent(t).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const axis = new THREE.Vector3().crossVectors(up, tangent).normalize();
  const angle = Math.acos(up.dot(tangent));
  torus.quaternion.setFromAxisAngle(axis, angle);

  // Rotate torus itself
  torus.rotation.x += 0.02;
  torus.rotation.y += 0.015;

  // Torus light flicker
  if (params.pointLights) {
    torusLight.intensity = 3 + Math.sin(Date.now() * 0.01) * 0.5;
  }

  // Update trail
  trailHistory.unshift(pos.clone());
  if (trailHistory.length > MAX_HISTORY) trailHistory.pop();

  const historyToShow = Math.floor(MAX_HISTORY * params.trailLength);
  for (let i = 0; i < trailSpheres.length; i++) {
    const idx = Math.min(Math.floor((i / trailSpheres.length) * historyToShow), trailHistory.length - 1);
    if (idx >= 0 && trailHistory[idx]) {
      trailSpheres[i].position.copy(trailHistory[idx]);
      trailSpheres[i].visible = true;
    } else {
      trailSpheres[i].visible = false;
    }
  }

  // Update t display
  tDisplay.textContent = `t = ${t.toFixed(3)}`;

  // Pulse effect: modulate emissive intensity with t
  const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.005);
  torusMat.emissiveIntensity = pulse;

  controls.update();
  renderer.render(scene, camera);
}

animate();