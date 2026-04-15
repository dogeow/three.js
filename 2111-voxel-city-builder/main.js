import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(30, 25, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 10;
controls.maxDistance = 80;

const ambient = new THREE.AmbientLight(0x334466, 0.4);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);
const pointLight = new THREE.PointLight(0x4488ff, 0.8, 60);
pointLight.position.set(-10, 15, -10);
scene.add(pointLight);

const BLOCK_COLORS = [0x5588cc, 0x44aa88, 0xcc6644, 0xccaa44, 0xaa44cc, 0x44aaaa, 0xcc4466, 0x88cc44];
const buildings = [];
const GRID = 20, SIZE = 2;
const rng = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const random = rng(42);

for (let gx = -GRID / 2; gx < GRID / 2; gx++) {
  for (let gz = -GRID / 2; gz < GRID / 2; gz++) {
    const streetChance = random();
    if (streetChance < 0.22) continue;
    const x = gx * SIZE + (random() - 0.5) * 0.3;
    const z = gz * SIZE + (random() - 0.5) * 0.3;
    const height = random() < 0.15 ? 0.5 + random() * 1 : 2 + random() * 8;
    const color = BLOCK_COLORS[Math.floor(random() * BLOCK_COLORS.length)];
    const geo = new THREE.BoxGeometry(SIZE * 0.85, height, SIZE * 0.85);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.baseY = height / 2;
    mesh.userData.phase = random() * Math.PI * 2;
    buildings.push(mesh);
    scene.add(mesh);
    if (random() < 0.4) {
      const windowGeo = new THREE.BoxGeometry(SIZE * 0.85, height * 0.15, SIZE * 0.85);
      const windowMat = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffee88, emissiveIntensity: 0.6, roughness: 0.3 });
      const windowMesh = new THREE.Mesh(windowGeo, windowMat);
      windowMesh.position.set(x, height * 0.7, z);
      windowMesh.castShadow = false;
      buildings.push(windowMesh);
      scene.add(windowMesh);
    }
  }
}

const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9, metalness: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hovered = null;
let hue = 0;

document.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  controls.update();
  buildings.forEach((b, i) => {
    const floatY = Math.sin(t * 0.5 + b.userData.phase) * 0.15;
    b.position.y = b.userData.baseY + floatY;
  });
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(buildings);
  if (hovered) { hovered.material.emissive?.setHex(0x000000); hovered = null; }
  if (intersects.length > 0) {
    hovered = intersects[0].object;
    if (hovered.material.emissive) hovered.material.emissive.setHex(0x224466);
    document.body.style.cursor = 'pointer';
  } else {
    document.body.style.cursor = 'default';
  }
  hue = (hue + 0.001) % 1;
  pointLight.color.setHSL(hue, 0.8, 0.5);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
