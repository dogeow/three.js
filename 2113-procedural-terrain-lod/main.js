import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2030);
scene.fog = new THREE.FogExp2(0x1a2030, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 30, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
dirLight.position.set(50, 60, 30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0x334466, 0.6));

const CHUNK = 64, CELL = 1.0, MAX_DETAIL = 4;
const chunks = [];

function noise2d(x, z) {
  const X = Math.floor(x) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); z -= Math.floor(z);
  const u = x * x * (3 - 2 * x), v = z * z * (3 - 2 * z);
  const hash = (n) => { let s = n * 16807 % 2147483647; return (s - 1) / 2147483646; };
  const h00 = hash(X + Z * 57), h10 = hash(X + 1 + Z * 57);
  const h01 = hash(X + (Z + 1) * 57), h11 = hash(X + 1 + (Z + 1) * 57);
  return h00 + (h10 - h00) * u + (h01 - h00) * v + (h00 - h10 - h01 + h11) * u * v;
}

function fbm(x, z) {
  let val = 0, amp = 1, freq = 0.02, total = 0;
  for (let i = 0; i < 6; i++) { val += noise2d(x * freq, z * freq) * amp; total += amp; amp *= 0.5; freq *= 2.1; }
  return val / total;
}

function createChunk(cx, cz) {
  const detail = MAX_DETAIL;
  const size = CHUNK / detail;
  const positions = [], colors = [], normals = [];
  const color = new THREE.Color();
  for (let j = 0; j < CHUNK; j += detail) {
    for (let i = 0; i < CHUNK; i += detail) {
      const wx = cx + i * CELL, wz = cz + j * CELL;
      const h00 = fbm(wx, wz) * 20;
      const h10 = fbm(wx + CELL * detail, wz) * 20;
      const h01 = fbm(wx, wz + CELL * detail) * 20;
      const h11 = fbm(wx + CELL * detail, wz + CELL * detail) * 20;
      const y = (h00 + h10 + h01 + h11) / 4;
      const tri = (x0, z0, h0, x1, z1, h1, x2, z2, h2) => {
        positions.push(x0, h0, z0, x1, h1, z1, x2, h2, z2);
        const ax = x1 - x0, ay = h1 - h0, az = z1 - z0;
        const bx = x2 - x0, by = h2 - h0, bz = z2 - z0;
        const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const len = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
        normals.push(nx/len, ny/len, nz/len, nx/len, ny/len, nz/len, nx/len, ny/len, nz/len);
        const t = Math.max(0, Math.min(1, (y + 5) / 22));
        if (y < 1) color.set(0x1a3a6a);
        else if (y < 4) color.set(0x2a5a3a);
        else if (y < 10) color.set(0x3a6a2a);
        else if (y < 16) color.set(0x7a7a6a);
        else color.set(0xeeeeee);
        colors.push(color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b);
      };
      tri(wx, wz, h00, wx + CELL * detail, wz, h10, wx, wz + CELL * detail, h01);
      tri(wx + CELL * detail, wz, h10, wx + CELL * detail, wz + CELL * detail, h11, wx, wz + CELL * detail, h01);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05, flatShading: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(cx, 0, cz);
  scene.add(mesh);
  return mesh;
}

for (let cx = -3; cx <= 3; cx++) {
  for (let cz = -3; cz <= 3; cz++) {
    chunks.push(createChunk(cx * CHUNK * CELL, cz * CHUNK * CELL));
  }
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
