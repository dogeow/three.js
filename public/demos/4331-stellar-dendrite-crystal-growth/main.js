// 4331. Stellar Dendrite Crystal Growth
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a20);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(15, 10, 15);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const arms = [];
const ARM_COUNT = 6;
const mat = new THREE.MeshPhongMaterial({ color: 0xaaddff, emissive: 0x334466, transparent: true, opacity: 0.9, side: THREE.DoubleSide });

function createBranch(x, y, z, angle, length, depth) {
  if (depth > 5 || length < 0.2) return;
  const geo = new THREE.CylinderGeometry(0.05, length * 0.15, length, 6);
  const branch = new THREE.Mesh(geo, mat);
  branch.position.set(x, y, z);
  branch.rotation.z = angle;
  branch.rotation.y = depth * 0.8;
  const endX = x + Math.sin(angle) * length;
  const endY = y + Math.cos(angle) * length;
  arms.push({ branch, endX, endY, depth });
  scene.add(branch);
  if (depth < 4 && Math.random() > 0.3) {
    createBranch(endX, endY, 0, angle + 0.5 + Math.random() * 0.5, length * 0.7, depth + 1);
    createBranch(endX, endY, 0, angle - 0.5 - Math.random() * 0.5, length * 0.7, depth + 1);
  }
}

for (let a = 0; a < ARM_COUNT; a++) {
  const baseAngle = (a / ARM_COUNT) * Math.PI * 2;
  createBranch(0, 0, 0, baseAngle, 4 + Math.random() * 2, 0);
}

const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
const sphere = new THREE.Mesh(sphereGeo, new THREE.MeshPhongMaterial({ color: 0xffffaa, emissive: 0x444400, emissiveIntensity: 0.5 }));
scene.add(sphere);

scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const light1 = new THREE.DirectionalLight(0xaaddff, 1);
light1.position.set(10, 20, 10);
scene.add(light1);
const light2 = new THREE.DirectionalLight(0xffaaff, 0.5);
light2.position.set(-10, -5, -10);
scene.add(light2);

function animate() {
  requestAnimationFrame(animate);
  arms.forEach((arm, i) => {
    arm.endX += Math.sin(Date.now() * 0.001 + i) * 0.005;
  });
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });