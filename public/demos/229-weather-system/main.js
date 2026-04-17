import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ─── Scene Setup ───────────────────────────────────────────────────────────
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 80, 600);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 18, 60);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Lighting ──────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x6688aa, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
sunLight.position.set(100, 200, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
scene.add(sunLight);

const lightningLight = new THREE.DirectionalLight(0xffffff, 0);
lightningLight.position.set(0, 100, 0);
scene.add(lightningLight);

// ─── Ground ──────────────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(400, 400, 80, 80);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x3a5f3a,
  roughness: 0.9,
  metalness: 0.0,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ─── Noise Utilities ──────────────────────────────────────────────────────
function hash(n) {
  return Math.sin(n * 127.1) * 43758.5453123 % 1;
}
function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + iy * 57.0);
  const b = hash(ix + 1 + iy * 57.0);
  const c = hash(ix + (iy + 1) * 57.0);
  const d = hash(ix + 1 + (iy + 1) * 57.0);
  return a + (b - a) * ux + (c - a) * uy + (d - b + a - c) * ux * uy;
}
function fbm(x, y, octaves = 5) {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.1;
  }
  return v;
}

// ─── Cloud Shader ─────────────────────────────────────────────────────────
const cloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const cloudFragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uScale;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv * uScale;
    float t = uTime * 0.015;
    vec2 offset = vec2(t * 0.3, t * 0.1);
    float c = fbm(uv + offset) * fbm(uv * 1.4 - offset * 0.5);
    c = smoothstep(0.25, 0.65, c);
    float alpha = c * uOpacity;
    if (alpha < 0.01) discard;
    vec3 col = mix(vec3(0.85, 0.88, 0.95), vec3(1.0), c * 0.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Cloud Layers ─────────────────────────────────────────────────────────
const cloudMat = new THREE.ShaderMaterial({
  vertexShader: cloudVertexShader,
  fragmentShader: cloudFragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: 0.85 },
    uScale: { value: 4.0 },
  },
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const cloudLayers = [];
const cloudPositions = [
  { x: 0, y: 55, z: -80, w: 140, h: 50, scale: 5.0, rotY: 0 },
  { x: 40, y: 65, z: -100, w: 160, h: 55, scale: 6.0, rotY: 0.3 },
  { x: -50, y: 60, z: -60, w: 130, h: 45, scale: 4.5, rotY: -0.2 },
  { x: 0, y: 70, z: -120, w: 180, h: 60, scale: 7.0, rotY: 0.1 },
  { x: 60, y: 50, z: -50, w: 100, h: 40, scale: 3.5, rotY: 0.5 },
];

cloudPositions.forEach((p, i) => {
  const mat = cloudMat.clone();
  mat.uniforms.uScale.value = p.scale;
  const geo = new THREE.PlaneGeometry(p.w, p.h, 1, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(p.x, p.y, p.z);
  mesh.rotation.y = p.rotY;
  scene.add(mesh);
  cloudLayers.push({ mesh, baseY: p.y, rotY: p.rotY });
});

// ─── Rain Particle System ─────────────────────────────────────────────────
const RAIN_COUNT = 12000;
const rainGeo = new THREE.BufferGeometry();
const rainPositions = new Float32Array(RAIN_COUNT * 3);
const rainVelocities = new Float32Array(RAIN_COUNT);
const rainLife = new Float32Array(RAIN_COUNT);

for (let i = 0; i < RAIN_COUNT; i++) {
  const i3 = i * 3;
  rainPositions[i3 + 0] = (Math.random() - 0.5) * 300;
  rainPositions[i3 + 1] = Math.random() * 120 + 5;
  rainPositions[i3 + 2] = (Math.random() - 0.5) * 300;
  rainVelocities[i] = 0.8 + Math.random() * 0.6;
  rainLife[i] = Math.random();
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

const rainMat = new THREE.PointsMaterial({
  color: 0x8899cc,
  size: 0.35,
  transparent: true,
  opacity: 0.7,
  depthWrite: false,
  sizeAttenuation: true,
});
const rainSystem = new THREE.Points(rainGeo, rainMat);
scene.add(rainSystem);

// ─── Weather State ────────────────────────────────────────────────────────
const presets = {
  clear: {
    sky: new THREE.Color(0x87ceeb),
    fog: new THREE.Color(0x87ceeb),
    fogNear: 150,
    fogFar: 600,
    ambient: 0x6688aa,
    sun: 1.2,
    rainOpacity: 0,
    rainSpeed: 0,
    windX: 0.5,
    windZ: 0.1,
    cloudOpacity: 0.85,
    cloudScale: 4.0,
    lightningInterval: 0,
  },
  rainy: {
    sky: new THREE.Color(0x555566),
    fog: new THREE.Color(0x444455),
    fogNear: 30,
    fogFar: 200,
    ambient: 0x445566,
    sun: 0.4,
    rainOpacity: 0.7,
    rainSpeed: 1.0,
    windX: 2.0,
    windZ: 0.5,
    cloudOpacity: 1.0,
    cloudScale: 6.0,
    lightningInterval: 0,
  },
  stormy: {
    sky: new THREE.Color(0x222233),
    fog: new THREE.Color(0x111122),
    fogNear: 15,
    fogFar: 120,
    ambient: 0x223344,
    sun: 0.15,
    rainOpacity: 1.0,
    rainSpeed: 1.8,
    windX: 5.0,
    windZ: 1.5,
    cloudOpacity: 1.0,
    cloudScale: 8.0,
    lightningInterval: 0.02,
  },
};

const current = {
  sky: new THREE.Color(0x87ceeb),
  fog: new THREE.Color(0x87ceeb),
  fogNear: 150,
  fogFar: 600,
  ambient: 0x6688aa,
  sun: 1.2,
  rainOpacity: 0,
  rainSpeed: 0,
  windX: 0.5,
  windZ: 0.1,
  cloudOpacity: 0.85,
  cloudScale: 4.0,
  lightningInterval: 0,
};

function lerpColor(out, a, b, t) {
  out.r = a.r + (b.r - a.r) * t;
  out.g = a.g + (b.g - a.g) * t;
  out.b = a.b + (b.b - a.b) * t;
}
function lerpVal(a, b, t) { return a + (b - a) * t; }

function applyPreset(name) {
  const p = presets[name];
  const t = 0.035;
  lerpColor(current.sky, current.sky, p.sky, t);
  lerpColor(current.fog, current.fog, p.fog, t);
  current.fogNear += (p.fogNear - current.fogNear) * t;
  current.fogFar += (p.fogFar - current.fogFar) * t;
  current.ambient = p.ambient;
  current.sun = p.sun;
  current.rainOpacity = p.rainOpacity;
  current.rainSpeed = p.rainSpeed;
  current.windX = p.windX;
  current.windZ = p.windZ;
  current.cloudOpacity = p.cloudOpacity;
  current.cloudScale = p.cloudScale;
  current.lightningInterval = p.lightningInterval;
}

// ─── GUI ──────────────────────────────────────────────────────────────────
const params = {
  preset: 'clear',
  windStrength: 1.0,
  rainDensity: 0.0,
};

const gui = new GUI({ title: '🌦️ Weather Controls' });
gui.add(params, 'preset', ['clear', 'rainy', 'stormy']).name('Weather Preset').onChange(v => {
  const p = presets[v];
  params.windStrength = Math.round((Math.abs(p.windX) + Math.abs(p.windZ)) / 3 * 100) / 100;
  params.rainDensity = Math.round(p.rainOpacity * 100) / 100;
});
gui.add(params, 'windStrength', 0, 5, 0.1).name('Wind Strength').onChange(v => {
  current.windX = v * 2.0;
  current.windZ = v * 0.5;
});
gui.add(params, 'rainDensity', 0, 1, 0.01).name('Rain Density').onChange(v => {
  current.rainOpacity = v;
  rainMat.opacity = v * 0.7;
});
gui.open();

// ─── Lightning Timer ───────────────────────────────────────────────────────
let lightningTimer = 0;
let lightningBurst = 0;

// ─── Clock ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

// ─── Animation Loop ───────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // ── Apply preset smoothly
  applyPreset(params.preset);

  // ── Scene background & fog
  lerpColor(scene.background, scene.background, current.sky, 0.03);
  scene.fog.color.copy(current.fog);
  scene.fog.near = current.fogNear;
  scene.fog.far = current.fogFar;

  // ── Lighting
  ambientLight.color.set(current.ambient);
  sunLight.intensity = current.sun;

  // ── Cloud update
  cloudLayers.forEach((cl, i) => {
    const mat = cl.mesh.material;
    mat.uniforms.uTime.value = elapsed + i * 12.7;
    mat.uniforms.uOpacity.value = current.cloudOpacity;
    mat.uniforms.uScale.value = current.cloudScale + i * 0.5;

    // Wind drift on cloud position
    cl.mesh.position.x += current.windX * dt * (0.3 + i * 0.1);
    cl.mesh.position.z += current.windZ * dt * (0.3 + i * 0.1);

    // Wrap clouds that drift too far
    if (cl.mesh.position.x > 200) cl.mesh.position.x = -200;
    if (cl.mesh.position.z > 0) cl.mesh.position.z = -150;
    if (cl.mesh.position.x < -200) cl.mesh.position.x = 200;

    // Slight Y oscillation for depth
    cl.mesh.position.y = cl.baseY + Math.sin(elapsed * 0.2 + i) * 0.8;
  });

  // ── Rain update
  const pos = rainGeo.attributes.position.array;
  const windX = current.windX;
  const windZ = current.windZ;
  const fallSpeed = 35 * current.rainSpeed;

  for (let i = 0; i < RAIN_COUNT; i++) {
    const i3 = i * 3;
    const vel = rainVelocities[i] * fallSpeed;

    pos[i3 + 0] += windX * dt * 8;
    pos[i3 + 1] -= vel * dt;
    pos[i3 + 2] += windZ * dt * 8;

    // Reset drop when below ground or out of bounds
    if (pos[i3 + 1] < -2 || pos[i3 + 0] > 160 || pos[i3 + 0] < -160 || pos[i3 + 2] > 160 || pos[i3 + 2] < -160) {
      pos[i3 + 0] = (Math.random() - 0.5) * 280;
      pos[i3 + 1] = 100 + Math.random() * 30;
      pos[i3 + 2] = (Math.random() - 0.5) * 280;
    }
  }
  rainGeo.attributes.position.needsUpdate = true;
  rainMat.opacity = current.rainOpacity * 0.7;

  // ── Lightning
  lightningTimer += dt;
  if (current.lightningInterval > 0 && lightningTimer > 2.5 + Math.random() * 3) {
    lightningBurst = 1.0;
    lightningTimer = 0;
  }
  if (lightningBurst > 0) {
    lightningLight.intensity = lightningBurst * 4.0;
    lightningBurst -= dt * 5;
    if (lightningBurst < 0) { lightningBurst = 0; lightningLight.intensity = 0; }
  }

  renderer.render(scene, camera);
}

animate();