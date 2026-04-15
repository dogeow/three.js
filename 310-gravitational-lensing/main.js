import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer, controls;
const PARTICLE_COUNT = 20000;
let particleSystem, accretionDisk;

// Black hole shader material
const blackHoleMaterial = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  `,
  side: THREE.FrontSide
});

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 8, 18);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.0, 0.5, 0.2);
  composer.addPass(bloom);

  // Black hole sphere
  const bhGeom = new THREE.SphereGeometry(1.5, 64, 64);
  const bhMesh = new THREE.Mesh(bhGeom, new THREE.MeshBasicMaterial({ color: 0x000000 }));
  scene.add(bhMesh);

  // Event horizon glow ring
  const ringGeom = new THREE.TorusGeometry(1.6, 0.05, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Mesh(ringGeom, ringMat));

  // Accretion disk
  createAccretionDisk();

  // Background particles (stars)
  createStarField();

  // Light rays bending visualization
  createBendingRays();

  window.addEventListener('resize', onResize);
}

function createAccretionDisk() {
  const geom = new THREE.BufferGeometry();
  const count = 5000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = 2.0 + Math.random() * 4.0;
    const theta = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 0.3 * (1 - (r - 2) / 4);
    positions[i * 3] = r * Math.cos(theta);
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = r * Math.sin(theta);
    const t = (r - 2) / 4;
    const col = new THREE.Color().setHSL(0.05 + t * 0.1, 1.0, 0.4 + t * 0.3);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 3 + Math.random() * 5;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  accretionDisk = new THREE.Points(geom, mat);
  scene.add(accretionDisk);
}

function createStarField() {
  const geom = new THREE.BufferGeometry();
  const count = PARTICLE_COUNT;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 50 + Math.random() * 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(geom, mat));
}

function createBendingRays() {
  // Visualize light bending paths around black hole
  for (let i = 0; i < 12; i++) {
    const curve = new THREE.CatmullRomCurve3([]);
    const angle = (i / 12) * Math.PI * 2;
    const startR = 10;
    const steps = 50;
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const bendAngle = angle + t * 0.8;
      const r = startR * (1 - t * 0.7);
      const x = r * Math.cos(bendAngle);
      const z = r * Math.sin(bendAngle);
      const y = Math.sin(t * Math.PI) * 0.5;
      curve.points.push(new THREE.Vector3(x, y, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(30));
    const mat = new THREE.LineBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.3 });
    scene.add(new THREE.Line(geom, mat));
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  controls.update();
  if (accretionDisk) {
    accretionDisk.rotation.y += 0.003;
  }
  composer.render();
}
init();
animate();