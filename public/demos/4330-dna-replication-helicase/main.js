// 4330. DNA Replication Helicase
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x001122);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 5, 40);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const backbone1 = new THREE.Group();
const backbone2 = new THREE.Group();
const basePairs = new THREE.Group();

const mat1 = new THREE.MeshPhongMaterial({ color: 0x4488ff, emissive: 0x112244 });
const mat2 = new THREE.MeshPhongMaterial({ color: 0xff4444, emissive: 0x441111 });
const baseColors = [0x44ff44, 0xffff44, 0xff88ff, 0xff8844];

const TURNS = 5;
const HEIGHT = 20;
const SEGMENTS = 200;
const RADIUS = 3;

for (let i = 0; i < SEGMENTS; i++) {
  const t = i / SEGMENTS;
  const angle = t * Math.PI * 2 * TURNS;
  const y = t * HEIGHT - HEIGHT/2;
  const x1 = Math.cos(angle) * RADIUS;
  const z1 = Math.sin(angle) * RADIUS;
  const x2 = Math.cos(angle + Math.PI) * RADIUS;
  const z2 = Math.sin(angle + Math.PI) * RADIUS;
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), mat1);
  sphere.position.set(x1, y, z1);
  backbone1.add(sphere);
  const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), mat2);
  sphere2.position.set(x2, y, z2);
  backbone2.add(sphere2);
  if (i % 4 === 0) {
    const bmat = new THREE.MeshPhongMaterial({ color: baseColors[Math.floor(Math.random()*4)], transparent: true, opacity: 0.8 });
    const pair = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, RADIUS * 2 - 0.5, 8), bmat);
    pair.position.set(0, y, 0);
    pair.rotation.z = Math.PI / 2;
    pair.lookAt(x2, y, z2);
    pair.rotateY(Math.PI / 2);
    pair.scale.x = RADIUS * 2 - 0.5;
    pair.position.set((x1+x2)/2, y, (z1+z2)/2);
    basePairs.add(pair);
  }
}
scene.add(backbone1);
scene.add(backbone2);
scene.add(basePairs);

const helicaseGeo = new THREE.TorusGeometry(2.5, 0.8, 16, 32);
const helicaseMat = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0x444400 });
const helicase = new THREE.Mesh(helicaseGeo, helicaseMat);
scene.add(helicase);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
scene.add(new THREE.DirectionalLight(0xffffff, 1));
scene.add(Object.assign(new THREE.PointLight(0x4488ff, 2, 50), { position: new THREE.Vector3(10, 10, 10) }));

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  helicase.position.y = Math.sin(time) * HEIGHT/2;
  helicase.rotation.y += 0.05;
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });