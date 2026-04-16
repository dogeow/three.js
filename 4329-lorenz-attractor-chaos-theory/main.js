// 4329. Lorenz Attractor Chaos Theory
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x050510, 0.008);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 10, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const sigma = 10, rho = 28, beta = 8/3;
const DT = 0.005;
const STEPS = 8000;
const pos = new Float32Array(STEPS * 3);
let x = 0.1, y = 0, z = 0;

for (let i = 0; i < STEPS; i++) {
  const dx = sigma * (y - x) * DT;
  const dy = (x * (rho - z) - y) * DT;
  const dz = (x * y - beta * z) * DT;
  x += dx; y += dy; z += dz;
  pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const colors = new Float32Array(STEPS * 3);
for (let i = 0; i < STEPS; i++) {
  const t = i / STEPS;
  colors[i*3] = 0.1 + t * 0.9;
  colors[i*3+1] = 0.4 * (1 - t);
  colors[i*3+2] = 1.0;
}
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })));

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
scene.add(Object.assign(new THREE.PointLight(0x4488ff, 2, 100), { position: new THREE.Vector3(30, 30, 30) }));

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });