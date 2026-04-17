// 4334. Mycelium Network Diffusion
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0a00);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 30, 40);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const hyphae = [];
const tips = [];

function addTip(x, y, z, angle, depth) {
  if (depth > 12) return;
  const len = 0.5 + Math.random() * 1.5;
  const endX = x + Math.cos(angle) * len;
  const endY = y + Math.sin(angle) * 0.2 + 0.1;
  const endZ = z + Math.sin(angle) * len;
  const geo = new THREE.CylinderGeometry(0.05, 0.15, len, 6);
  const brightness = 0.3 + (12 - depth) / 12 * 0.7;
  const mat = new THREE.MeshPhongMaterial({ color: 0xddaa66, emissive: new THREE.Color(brightness * 0.3, brightness * 0.15, 0), transparent: true, opacity: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((x+endX)/2, (y+endY)/2, (z+endZ)/2);
  mesh.rotation.z = angle - Math.PI/2;
  mesh.rotation.y = angle;
  scene.add(mesh);
  hyphae.push(mesh);
  if (depth < 10 && Math.random() > 0.2) {
    addTip(endX, endY, endZ, angle + 0.3 + Math.random() * 0.6, depth + 1);
    if (Math.random() > 0.5) addTip(endX, endY, endZ, angle - 0.3 - Math.random() * 0.6, depth + 1);
  } else if (depth >= 10) {
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffdd66 }));
    glow.position.set(endX, endY, endZ);
    scene.add(glow);
    tips.push(glow);
  }
}

// Start several colonies
for (let i = 0; i < 5; i++) {
  const sx = (Math.random() - 0.5) * 30;
  const sz = (Math.random() - 0.5) * 30;
  addTip(sx, 0, sz, Math.random() * Math.PI * 2, 0);
  addTip(sx, 0, sz, Math.random() * Math.PI * 2, 0);
}

scene.add(new THREE.AmbientLight(0x443322, 1));
const pointLight = new THREE.PointLight(0xffaa44, 1.5, 50);
pointLight.position.set(0, 10, 0);
scene.add(pointLight);

let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.02;
  tips.forEach((tip, i) => { tip.material.color.setHSL(0.1 + Math.sin(t + i) * 0.05, 1, 0.6 + Math.sin(t * 2 + i) * 0.2); });
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });