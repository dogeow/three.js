// 4332. Tsunami Shallow Water Equation
import * as THREE from 'three';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x001133);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 40, 40);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const SIZE = 80;
const RES = 80;
const geo = new THREE.PlaneGeometry(SIZE, SIZE, RES, RES);
geo.rotateX(-Math.PI / 2);
const pos = geo.attributes.position;

const heights = new Float32Array((RES+1)*(RES+1));
const target = new Float32Array(heights.length);
for (let i = 0; i < heights.length; i++) heights[i] = target[i] = Math.random() * 0.2;

const mat = new THREE.MeshPhongMaterial({
  color: 0x2266aa,
  emissive: 0x112244,
  shininess: 100,
  wireframe: false,
  flatShading: true,
});
const wireMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, wireframe: true, transparent: true, opacity: 0.3 });

const mesh = new THREE.Mesh(geo, mat);
const wire = new THREE.Mesh(geo, wireMat);
scene.add(mesh);
scene.add(wire);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// Tsunami wave source
function disturb(x, z, strength) {
  const ix = Math.floor((x / SIZE + 0.5) * RES);
  const iz = Math.floor((z / SIZE + 0.5) * RES);
  for (let di = -5; di <= 5; di++) for (let dj = -5; dj <= 5; dj++) {
    const ni = ix + di, nj = iz + dj;
    if (ni >= 0 && ni <= RES && nj >= 0 && nj <= RES) {
      const dist = Math.sqrt(di*di + dj*dj);
      if (dist < 5) target[(nj)*(RES+1)+ni] += strength * (5 - dist) / 5;
    }
  }
}

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.016;
  if (Math.random() < 0.005) disturb((Math.random()-0.5)*SIZE*0.5, (Math.random()-0.5)*SIZE*0.5, 3 + Math.random() * 2);
  for (let i = 0; i < heights.length; i++) heights[i] += (target[i] - heights[i]) * 0.05;
  for (let i = 0; i < pos.count; i++) {
    const ix = i % (RES+1), iy = Math.floor(i / (RES+1));
    const h = heights[iy*(RES+1)+ix];
    pos.setY(i, h);
    const c = new THREE.Color();
    c.setHSL(0.55 + h * 0.1, 1, 0.2 + h * 0.3);
    mat.color = c;
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });