import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Plasma Shader ────────────────────────────────────────────────────────────
const plasmaVertexShader = /* glsl */`
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const plasmaFragmentShader = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uColorIntensity;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  // 3D value noise
  vec3 hash3(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yxz + 19.19);
    return fract((p.xxy + p.yxx) * p.zyx);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(dot(hash3(i), f), dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), f.x),
        mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), f.x),
        f.y
      ),
      mix(
        mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), f.x),
        mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.1 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float t = uTime * uSpeed;

    // Multiple layered plasma waves
    float p1 = sin(vPosition.x * 4.0 + t * 1.2) * 0.5 + 0.5;
    float p2 = sin(vPosition.y * 5.0 + t * 0.8 + 1.0) * 0.5 + 0.5;
    float p3 = sin(vPosition.z * 3.5 + t * 1.5 + 2.0) * 0.5 + 0.5;
    float p4 = sin(length(vPosition) * 6.0 - t * 2.0) * 0.5 + 0.5;

    // Organic fbm noise layer
    float n = fbm(vPosition * 2.5 + t * 0.3);

    // Combine plasma waves
    float plasma = (p1 * 0.25 + p2 * 0.25 + p3 * 0.25 + p4 * 0.25 + n * 0.4);
    plasma = smoothstep(0.1, 0.9, plasma);

    // Color blending
    vec3 colA = uColor1 * uColorIntensity; // electric blue
    vec3 colB = uColor2 * uColorIntensity; // purple
    vec3 colC = uColor3 * uColorIntensity; // white / cyan

    vec3 color = mix(colA, colB, plasma);
    color = mix(color, colC, pow(plasma, 3.0));

    // Core glow
    float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    fresnel = pow(fresnel, 1.5);
    color += colC * fresnel * 0.5;

    // Bright hot spots
    float hotspot = pow(plasma, 6.0) * 2.0;
    color += colC * hotspot;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Lightning Bolt Generator ─────────────────────────────────────────────────
function createBolt() {
  const points = [];
  const start = new THREE.Vector3(
    (Math.random() - 0.5) * 0.8,
    (Math.random() - 0.5) * 0.8,
    (Math.random() - 0.5) * 0.8
  );
  const end = new THREE.Vector3(
    (Math.random() - 0.5) * 1.6,
    (Math.random() - 0.5) * 1.6,
    (Math.random() - 0.5) * 1.6
  );

  function subdivide(a, b, depth) {
    if (depth === 0) {
      points.push(a.x, a.y, a.z);
      points.push(b.x, b.y, b.z);
      return;
    }
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25
    );
    mid.add(jitter);

    const left = new THREE.Vector3().addVectors(a, mid).multiplyScalar(0.5);
    const right = new THREE.Vector3().addVectors(mid, b).multiplyScalar(0.5);
    left.addScaledVector(jitter, 0.5);
    right.addScaledVector(jitter, 0.5);

    subdivide(a, mid, depth - 1);
    subdivide(mid, b, depth - 1);

    // Branch
    if (depth >= 2 && Math.random() < 0.35) {
      const branchEnd = new THREE.Vector3(
        mid.x + (Math.random() - 0.5) * 0.4,
        mid.y + (Math.random() - 0.5) * 0.4,
        mid.z + (Math.random() - 0.5) * 0.4
      );
      const branchMid = new THREE.Vector3().addVectors(mid, branchEnd).multiplyScalar(0.5);
      branchMid.addScaledVector(new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      ), 1);
      points.push(mid.x, mid.y, mid.z);
      points.push(branchMid.x, branchMid.y, branchMid.z);
      points.push(branchMid.x, branchMid.y, branchMid.z);
      points.push(branchEnd.x, branchEnd.y, branchEnd.z);
    }
  }

  subdivide(start, end, 5);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

// ─── Scene Setup ─────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
window.scene = scene;

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.8, 0.4, 0.85
);
composer.addPass(bloomPass);

// ─── Inner Plasma Sphere ──────────────────────────────────────────────────────
const plasmaUniforms = {
  uTime:           { value: 0 },
  uSpeed:          { value: 1.0 },
  uColorIntensity: { value: 1.2 },
  uColor1:         { value: new THREE.Color(0x0033ff) }, // electric blue
  uColor2:         { value: new THREE.Color(0x8800cc) }, // purple
  uColor3:         { value: new THREE.Color(0xffffff) }, // white / hot core
};

const plasmaMat = new THREE.ShaderMaterial({
  vertexShader:   plasmaVertexShader,
  fragmentShader: plasmaFragmentShader,
  uniforms:       plasmaUniforms,
  side:           THREE.FrontSide,
});

const plasmaGeo = new THREE.SphereGeometry(0.92, 64, 64);
const plasmaSphere = new THREE.Mesh(plasmaGeo, plasmaMat);
scene.add(plasmaSphere);

// ─── Outer Glass Sphere ──────────────────────────────────────────────────────
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission:       0.98,
  roughness:          0.05,
  metalness:          0.0,
  ior:                1.5,
  thickness:          0.4,
  transparent:        true,
  envMapIntensity:    1.0,
  clearcoat:          1.0,
  clearcoatRoughness: 0.05,
  side:               THREE.FrontSide,
});

const glassGeo = new THREE.SphereGeometry(1.0, 64, 64);
const glassSphere = new THREE.Mesh(glassGeo, glassMat);
scene.add(glassSphere);

// ─── Inner Point Light ───────────────────────────────────────────────────────
const innerLight = new THREE.PointLight(0x4488ff, 3, 3);
innerLight.position.set(0, 0, 0);
scene.add(innerLight);

// ─── Lightning Bolts ──────────────────────────────────────────────────────────
const bolts = [];
const MAX_BOLTS = 8;
for (let i = 0; i < MAX_BOLTS; i++) {
  const geo = createBolt();
  const mat = new THREE.LineBasicMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const bolt = new THREE.LineSegments(geo, mat);
  scene.add(bolt);
  bolts.push({ mesh: bolt, age: 0, maxAge: 0, active: false });
}

// ─── Ambient & Rim Lights ────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x111122, 0.5);
scene.add(ambientLight);

const rimLight1 = new THREE.PointLight(0x6600ff, 1.5, 10);
rimLight1.position.set(3, 2, 2);
scene.add(rimLight1);

const rimLight2 = new THREE.PointLight(0x0044ff, 1.0, 10);
rimLight2.position.set(-3, -2, -2);
scene.add(rimLight2);

// ─── GUI ─────────────────────────────────────────────────────────────────────
const params = {
  lightningFrequency: 0.3,   // bolts per second
  plasmaSpeed:        1.0,
  colorIntensity:     1.2,
  bloomStrength:      0.8,
};

const gui = new GUI();
gui.title('Plasma Ball Controls');
gui.add(params, 'lightningFrequency', 0.0, 2.0, 0.01).name('Lightning Freq');
gui.add(params, 'plasmaSpeed', 0.1, 3.0, 0.05).name('Plasma Speed');
gui.add(params, 'colorIntensity', 0.3, 3.0, 0.05).name('Color Intensity');
gui.add(params, 'bloomStrength', 0.1, 2.5, 0.05).name('Bloom Strength')
  .onChange(v => { bloomPass.strength = v; });

// ─── Resize Handler ───────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ─── Animation ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let lastBoltTime = 0;

function spawnBolt() {
  // Find an inactive slot
  for (const bolt of bolts) {
    if (!bolt.active) {
      // Regenerate geometry
      bolt.mesh.geometry.dispose();
      bolt.mesh.geometry = createBolt();
      bolt.mesh.material.opacity = 1.0;
      bolt.age = 0;
      bolt.maxAge = 0.08 + Math.random() * 0.12;
      bolt.active = true;
      return;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Update plasma uniforms
  plasmaUniforms.uTime.value = elapsed;
  plasmaUniforms.uSpeed.value = params.plasmaSpeed;
  plasmaUniforms.uColorIntensity.value = params.colorIntensity;

  // Inner light pulse
  innerLight.intensity = 2.5 + Math.sin(elapsed * 3.0) * 0.8 + Math.sin(elapsed * 7.0) * 0.4;

  // Spawn bolts based on frequency
  const interval = params.lightningFrequency > 0 ? 1 / params.lightningFrequency : 9999;
  if (elapsed - lastBoltTime > interval) {
    spawnBolt();
    lastBoltTime = elapsed;
  }

  // Update bolts
  for (const bolt of bolts) {
    if (!bolt.active) continue;
    bolt.age += delta;
    const life = bolt.age / bolt.maxAge;

    if (life >= 1.0) {
      bolt.active = false;
      bolt.mesh.material.opacity = 0;
    } else {
      // Flicker: rapid opacity variation
      const flicker = Math.random() > 0.4 ? 1.0 : 0.2;
      bolt.mesh.material.opacity = (1.0 - life) * flicker * 0.9;
    }
  }

  controls.update();
  composer.render();
}

animate();