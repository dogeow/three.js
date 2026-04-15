import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// ─── Vertex Shader ───────────────────────────────────────────────────────────
const vertexShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ─── Fragment Shader ──────────────────────────────────────────────────────────
const fragmentShader = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform float uIridescence;
  uniform float uTransparency;
  uniform float uNoiseScale;
  uniform float uNoiseSpeed;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying vec3 vViewDir;

  // ── noise utilities ────────────────────────────────────────────────────────
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  // ── thin-film interference ─────────────────────────────────────────────────
  vec3 thinFilm(float cosTheta, float thickness) {
    // Approximate spectral contributions for R/G/B
    float phi = 6.28318 * thickness * 2.0;
    float r = 0.5 + 0.5 * cos(phi * 1.0 + cosTheta * 8.0);
    float g = 0.5 + 0.5 * cos(phi * 1.4 + cosTheta * 10.0 + 2.094);
    float b = 0.5 + 0.5 * cos(phi * 1.8 + cosTheta * 12.0 + 4.189);
    return vec3(r, g, b);
  }

  // ── HSV to RGB helper ──────────────────────────────────────────────────────
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);

    float cosTheta = abs(dot(N, V));

    // Fresnel (stronger at grazing angles)
    float fresnel = pow(1.0 - cosTheta, 3.0);
    fresnel = clamp(fresnel, 0.0, 1.0);

    // Animated noise on the surface
    float t = uTime * uNoiseSpeed;
    vec2 noiseUv = vUv * uNoiseScale + vec2(t * 0.3, t * 0.2);
    float n = fbm(noiseUv);
    float n2 = fbm(noiseUv * 2.0 + vec2(50.0, 70.0) + t * 0.15);
    float noisePat = mix(n, n2, 0.5);

    // Film thickness varies across bubble + animated noise
    float thickness = 0.4 + 0.6 * noisePat;

    // Thin-film iridescent color
    vec3 filmColor = thinFilm(cosTheta, thickness);

    // Extra hue shimmer driven by noise + angle
    float hue = fract(cosTheta * 1.5 + noisePat * 2.0 + uTime * 0.05);
    vec3 extraColor = hsv2rgb(vec3(hue, 0.6, 1.0));

    // Blend film color with extra shimmer
    vec3 iridColor = mix(filmColor, extraColor, 0.4) * uIridescence;

    // Specular highlight (caustic-like)
    vec3 lightDir = normalize(vec3(0.8, 1.0, 0.6));
    vec3 halfVec = normalize(lightDir + V);
    float spec = pow(max(dot(N, halfVec), 0.0), 64.0);

    // Soft rim light from behind
    vec3 backLight = normalize(vec3(-0.5, 0.3, -1.0));
    float rim = pow(max(dot(N, -V), 0.0), 2.0) * 0.3;

    // Combine
    float alpha = mix(0.08, 0.65, fresnel) * uTransparency + spec * 0.5 + rim * 0.2;
    alpha = clamp(alpha, 0.0, 1.0);

    vec3 col = iridColor + vec3(spec * 0.8) + vec3(rim * 0.5, rim * 0.6, rim * 0.8);

    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Scene Setup ─────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Background gradient via a large sphere
{
  const bgVert = /* glsl */`
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const bgFrag = /* glsl */`
    varying vec3 vPos;
    void main() {
      float t = clamp((normalize(vPos).y + 1.0) * 0.5, 0.0, 1.0);
      vec3 top = vec3(0.03, 0.04, 0.10);
      vec3 mid = vec3(0.01, 0.02, 0.06);
      vec3 bot = vec3(0.00, 0.00, 0.01);
      vec3 col = mix(bot, mid, smoothstep(0.0, 0.5, t));
      col = mix(col, top, smoothstep(0.5, 1.0, t));
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  const bgGeo = new THREE.SphereGeometry(200, 32, 16);
  const bgMat = new THREE.ShaderMaterial({
    vertexShader: bgVert, fragmentShader: bgFrag, side: THREE.BackSide
  });
  scene.add(new THREE.Mesh(bgGeo, bgMat));
}

// Stars
{
  const starCount = 2000;
  const pos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 150 + Math.random() * 40;
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.6
  });
  scene.add(new THREE.Points(starGeo, starMat));
}

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 3, 18);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 60;

// Lights
const ambientLight = new THREE.AmbientLight(0x112233, 0.5);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0xff88cc, 3, 40);
pointLight1.position.set(8, 10, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x88ccff, 2, 40);
pointLight2.position.set(-8, 6, -5);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0xffddaa, 1.5, 30);
pointLight3.position.set(0, -2, 8);
scene.add(pointLight3);

// Floor reflective plane
{
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x050510,
    metalness: 0.8,
    roughness: 0.15,
    transparent: true,
    opacity: 0.6,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4;
  scene.add(floor);
}

// ─── Bubble Class ─────────────────────────────────────────────────────────────
const bubbleUniforms = () => ({
  uTime:          { value: 0 },
  uIridescence:   { value: 1.0 },
  uTransparency:  { value: 1.0 },
  uNoiseScale:    { value: 4.0 },
  uNoiseSpeed:    { value: 1.0 },
});

class SoapBubble {
  constructor(radius, position) {
    this.radius = radius;
    this.phase = Math.random() * Math.PI * 2;
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.speedY = (Math.random() - 0.5) * 0.15 + 0.05;
    this.speedZ = (Math.random() - 0.5) * 0.3;
    this.wobbleAmp = 0.02 + Math.random() * 0.03;
    this.wobbleFreq = 1 + Math.random() * 1.5;

    const geo = new THREE.SphereGeometry(radius, 64, 48);
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: bubbleUniforms(),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
  }

  update(time, windSpeed) {
    const t = time + this.phase;
    this.mesh.position.x += Math.sin(t * 0.7) * 0.003 * windSpeed;
    this.mesh.position.y += Math.sin(t * this.wobbleFreq) * this.wobbleAmp * windSpeed;
    this.mesh.position.z += Math.cos(t * 0.5) * 0.003 * windSpeed;
    this.mesh.material.uniforms.uTime.value = time;
  }
}

// ─── Bubble Pool ─────────────────────────────────────────────────────────────
let bubbles = [];
window.bubbles = bubbles;

function createBubble() {
  const radius = 0.5 + Math.random() * 1.5;
  const pos = new THREE.Vector3(
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 8 + 2,
    (Math.random() - 0.5) * 12
  );
  const b = new SoapBubble(radius, pos);
  scene.add(b.mesh);
  bubbles.push(b);
  return b;
}

function removeBubble() {
  if (bubbles.length === 0) return;
  const b = bubbles.pop();
  scene.remove(b.mesh);
  b.mesh.geometry.dispose();
  b.mesh.material.dispose();
}

// ─── Post-processing ─────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength
  0.4,   // radius
  0.2    // threshold
);
composer.addPass(bloomPass);

// ─── GUI ─────────────────────────────────────────────────────────────────────
const params = {
  bubbleCount:  12,
  windSpeed:    1.0,
  iridescence:  1.0,
  transparency:  1.0,
  bloomStrength: 0.8,
  bloomRadius:   0.4,
};

const gui = new GUI({ title: 'Soap Bubbles' });
gui.add(params, 'bubbleCount', 1, 40, 1).name('Bubble Count').onChange(v => {
  while (bubbles.length < v) createBubble();
  while (bubbles.length > v) removeBubble();
});
gui.add(params, 'windSpeed', 0, 3, 0.05).name('Wind Speed');
gui.add(params, 'iridescence', 0, 2, 0.05).name('Iridescence').onChange(v => {
  bubbles.forEach(b => { b.mesh.material.uniforms.uIridescence.value = v; });
});
gui.add(params, 'transparency', 0.1, 2, 0.05).name('Transparency').onChange(v => {
  bubbles.forEach(b => { b.mesh.material.uniforms.uTransparency.value = v; });
});
gui.add(params, 'bloomStrength', 0, 3, 0.05).name('Bloom Strength').onChange(v => {
  bloomPass.strength = v;
});
gui.add(params, 'bloomRadius', 0, 1, 0.05).name('Bloom Radius').onChange(v => {
  bloomPass.radius = v;
});

// Initial bubbles
for (let i = 0; i < params.bubbleCount; i++) createBubble();

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  controls.update();

  // Gentle light orbit
  pointLight1.position.x = Math.sin(time * 0.3) * 12;
  pointLight1.position.z = Math.cos(time * 0.3) * 12;
  pointLight2.position.x = Math.sin(time * 0.2 + 2) * 10;
  pointLight2.position.z = Math.cos(time * 0.2 + 2) * 10;

  bubbles.forEach(b => b.update(time, params.windSpeed));

  composer.render();
}

animate();

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
});