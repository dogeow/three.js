import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000510);
scene.fog = new THREE.FogExp2(0x000510, 0.02);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 8, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Stars background
const starGeo = new THREE.BufferGeometry();
const starCount = 3000;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 300;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 }));
scene.add(stars);

// Fixed celestial bodies
const bodyGeo = new THREE.SphereGeometry(1, 16, 12);
const bodies = [];
const bodyData = [
  { pos: [-20, 2, -15], r: 1.2, col: 0xff4422 },
  { pos: [15, -1, -20], r: 0.8, col: 0x4488ff },
  { pos: [-10, 3, 10], r: 0.5, col: 0x44ff88 },
  { pos: [25, 0, 5], r: 1.5, col: 0xffaa22 },
  { pos: [-30, -2, -5], r: 0.7, col: 0xaa44ff },
  { pos: [8, 5, -25], r: 0.4, col: 0xffffff },
];
bodyData.forEach(b => {
  const mesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: b.col, emissive: b.col, emissiveIntensity: 0.4 }));
  mesh.position.set(...b.pos);
  mesh.scale.setScalar(b.r);
  scene.add(mesh);
  bodies.push(mesh);
});

// Ambient + directional light
scene.add(new THREE.AmbientLight(0x222244, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Grid floor
const grid = new THREE.GridHelper(100, 50, 0x112244, 0x0a1020);
grid.position.y = -3;
scene.add(grid);

// Spacecraft
const shipGroup = new THREE.Group();
scene.add(shipGroup);

// Ship body (cone)
const body2 = new THREE.ConeGeometry(0.5, 2, 8);
const shipMesh = new THREE.Mesh(body2, new THREE.MeshStandardMaterial({ color: 0x88aaff, metalness: 0.8, roughness: 0.2 }));
shipMesh.rotation.x = Math.PI / 2;
shipGroup.add(shipMesh);

// Wings
const wingGeo = new THREE.BoxGeometry(3, 0.05, 0.8);
const wingMat = new THREE.MeshStandardMaterial({ color: 0x6688cc, metalness: 0.9, roughness: 0.1 });
const wings = new THREE.Mesh(wingGeo, wingMat);
wings.position.z = -0.3;
shipGroup.add(wings);

// Engine glow
const engineGeo = new THREE.SphereGeometry(0.3, 8, 6);
const engineMat = new THREE.MeshBasicMaterial({ color: 0x0088ff });
const engine = new THREE.Mesh(engineGeo, engineMat);
engine.position.z = -1.1;
shipGroup.add(engine);

// Doppler effect shader (color shift based on velocity direction)
const dopplerShader = {
  uniforms: {
    uColor: { value: new THREE.Color(0x88aaff) },
    uShift: { value: 0.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uShift;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float ndotv = dot(vNormal, viewDir);
      // Front is blue-shifted, back is red-shifted
      float shift = -ndotv * uShift;
      vec3 col = uColor;
      col.r -= shift * 1.5;
      col.b += shift * 1.5;
      col.g = clamp(col.g + shift * 0.5, 0.0, 1.0);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

// Doppler material for ship
const dopplerMat = new THREE.ShaderMaterial({
  uniforms: dopplerShader.uniforms,
  vertexShader: dopplerShader.vertexShader,
  fragmentShader: dopplerShader.fragmentShader,
});
shipMesh.material = dopplerMat;
wings.material = dopplerMat;

// Doppler point light (blue front / red back)
const blueLight = new THREE.PointLight(0x4488ff, 2, 10);
const redLight = new THREE.PointLight(0xff4444, 1, 10);
shipGroup.add(blueLight);
shipGroup.add(redLight);

// Trajectory trail (line)
const trailLen = 200;
const trailPts = [];
for (let i = 0; i < trailLen; i++) trailPts.push(new THREE.Vector3(0, 0, 0));
const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x00aaff, opacity: 0.4, transparent: true }));
scene.add(trailLine);
const trailIdx = { head: 0 };

// Clock
const clock = new THREE.Clock();
let groundTime = 0;
let shipTime = 0;

// Parameters
const params = {
  velocity: 0.0,
  doppler: true,
  lengthContract: true,
  showTrail: true,
};

// GUI
const gui = new GUI();
gui.add(params, 'velocity', 0, 0.99, 0.001).name('速度 v (c)').onChange(updateRelativity);
gui.add(params, 'doppler').name('多普勒效应').onChange(v => { blueLight.visible = v; redLight.visible = v; });
gui.add(params, 'lengthContract').name('长度收缩');
gui.add(params, 'showTrail').name('轨迹线');

function updateRelativity() {
  const v = params.velocity;
  const beta2 = v * v;
  const gamma = 1 / Math.sqrt(Math.max(0.001, 1 - beta2));
  const shift = v * 2.0;

  dopplerMat.uniforms.uShift.value = shift;
  blueLight.color.setHSL(0.6 + shift * 0.1, 1, 0.5);
  redLight.color.setHSL(0.0 - shift * 0.1, 1, 0.5);

  // HUD update
  document.getElementById('v').textContent = v.toFixed(3);
  document.getElementById('v2').textContent = beta2.toFixed(5);
  document.getElementById('gamma').textContent = gamma.toFixed(3);
  document.getElementById('len').textContent = (1 / gamma).toFixed(3);
}

function updateHUD(dt) {
  groundTime += dt;
  const v = params.velocity;
  const gamma = v > 0.999 ? 1000 : 1 / Math.sqrt(Math.max(0.001, 1 - v * v));
  shipTime += dt / gamma;
  document.getElementById('ground').textContent = groundTime.toFixed(3);
  document.getElementById('ship').textContent = shipTime.toFixed(3);
}

updateRelativity();

// Orbit path for spacecraft
let shipAngle = 0;
const orbitR = 18;
shipGroup.position.set(orbitR, 0, 0);

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  const v = params.velocity;
  if (v > 0.001) {
    const omega = v * 0.5; // angular speed
    shipAngle += omega * dt;
    const lf = params.lengthContract ? Math.sqrt(Math.max(0.01, 1 - v * v)) : 1;
    shipGroup.position.x = orbitR * Math.cos(shipAngle) * lf;
    shipGroup.position.z = orbitR * Math.sin(shipAngle) * lf;
    shipGroup.rotation.y = -shipAngle + Math.PI / 2;
    // Scale for length contraction
    shipGroup.scale.x = lf;

    // Trail
    if (params.showTrail) {
      trailPts[trailIdx.head % trailLen].copy(shipGroup.position);
      trailIdx.head++;
      for (let i = 0; i < trailLen; i++) {
        const idx = (trailIdx.head + i) % trailLen;
        trailGeo.attributes.position.setXYZ(i, trailPts[idx].x, trailPts[idx].y, trailPts[idx].z);
      }
      trailGeo.attributes.position.needsUpdate = true;
    }
  }

  // Engine pulse
  const engineScale = 0.8 + Math.sin(Date.now() * 0.01) * 0.4 + v * 2;
  engine.scale.setScalar(engineScale);
  engineMat.color.setHSL(0.6, 1, 0.4 + v * 0.3);

  bodies.forEach((b, i) => { b.rotation.y += 0.002 * (i + 1); });

  updateHUD(dt);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});