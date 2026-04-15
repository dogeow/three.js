// 2981. Procedural Texture Shaders
// 程序化纹理着色器 - GLSL 程序生成砖块/木材/大理石等纹理

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 4)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 2
controls.maxDistance = 10

scene.add(new THREE.AmbientLight(0xffffff, 0.3))
const key = new THREE.DirectionalLight(0xffffff, 1.2)
key.position.set(3, 5, 3)
scene.add(key)
const fill = new THREE.DirectionalLight(0x4488ff, 0.4)
fill.position.set(-3, -2, -3)
scene.add(fill)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.5, 0.7)
composer.addPass(bloom)

// Shader uniforms
const uniforms = {
  uTime: { value: 0 },
  uScale: { value: 8.0 },
  uColor1: { value: new THREE.Color(0xd4a574) },
  uColor2: { value: new THREE.Color(0x8b5a2b) },
  uAccent: { value: new THREE.Color(0xf5deb3) },
  uTurbulence: { value: 0.5 },
  uOctaves: { value: 5.0 },
}

const fragmentShader = `
precision highp float;
uniform float uTime;
uniform float uScale;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uAccent;
uniform float uTurbulence;
uniform float uOctaves;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

// --- Noise utilities ---
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p, float oct) {
  float v = 0.0, a = 0.5, f = 1.0;
  for (float i = 0.0; i < 8.0; i++) {
    if (i >= oct) break;
    v += a * noise(p * f);
    f *= 2.0; a *= 0.5;
  }
  return v;
}

// --- Patterns ---
vec3 brickPattern(vec2 uv, float scale) {
  vec2 p = uv * scale;
  float row = floor(p.y);
  float offset = mod(row, 2.0) * 0.5;
  p.x += offset;
  vec2 brick = fract(p);
  float mortar = step(brick.x, 0.04) + step(1.0 - brick.x, 0.04) + step(brick.y, 0.05) + step(1.0 - brick.y, 0.05);
  mortar = clamp(mortar, 0.0, 1.0);
  vec2 brickId = floor(p);
  float ran = hash(brickId) * 0.15;
  vec3 col = mix(uColor1 * (0.8 + ran), uColor2 * 0.5, ran * 2.0);
  col = mix(col, vec3(0.7), mortar);
  return col;
}

vec3 woodGrain(vec2 uv, float scale) {
  float ring = fbm(uv * vec2(scale * 0.5, scale * 8.0), uOctaves);
  float dist = length(uv) * scale * 0.3;
  ring = sin((dist + ring * 1.5) * 8.0) * 0.5 + 0.5;
  ring = pow(ring, 0.6);
  float knot = fbm(uv * vec2(scale * 0.2), 3.0);
  knot = smoothstep(0.3, 0.7, knot) * 0.4;
  vec3 light = uColor1 * 1.3;
  vec3 dark = uColor2 * 0.6;
  vec3 col = mix(dark, light, ring);
  col = mix(col, dark * 1.2, knot);
  return col;
}

vec3 marble(vec2 uv, float scale) {
  float n = fbm(uv * scale * 0.5, uOctaves);
  float vein = sin((uv.x * scale * 2.0 + uv.y * scale + n * 8.0) + n * 5.0);
  vein = abs(vein);
  vein = pow(vein, 2.0);
  vec3 base = uAccent;
  vec3 veinCol = vec3(0.15, 0.13, 0.11);
  vec3 col = mix(veinCol, base, vein);
  float shimmer = fbm(uv * scale * 0.3 + uTime * 0.02, 3.0);
  col += shimmer * 0.08;
  return col;
}

vec3 checkerboard(vec2 uv, float scale) {
  vec2 p = floor(uv * scale);
  float c = mod(p.x + p.y, 2.0);
  return mix(uColor1, uColor2, c);
}

vec3 voronoiTexture(vec2 uv, float scale) {
  vec2 p = uv * scale;
  vec2 n = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  float secondMin = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neighbor = vec2(float(i), float(j));
      vec2 point = hash(n + neighbor + 0.5) * vec2(0.5) + n + neighbor + 0.5;
      float d = length(p - point);
      if (d < minDist) { secondMin = minDist; minDist = d; }
      else if (d < secondMin) { secondMin = d; }
    }
  }
  float edge = secondMin - minDist;
  float cellId = hash(n + 0.5);
  vec3 cellColor = vec3(0.3 + cellId * 0.7, 0.2 + cellId * 0.5, 0.1 + cellId * 0.3);
  float edgeFactor = smoothstep(0.02, 0.08, edge);
  vec3 col = mix(uColor1 * 0.8, cellColor, edgeFactor);
  return col;
}

vec3 wavyDistort(vec2 uv, float scale) {
  float n = fbm(uv * scale * 0.3 + uTime * 0.05, uOctaves);
  vec2 offset = vec2(
    sin(uv.y * scale + n * 3.0) * 0.05,
    cos(uv.x * scale + n * 3.0) * 0.05
  );
  return mix(uColor1, uColor2, n) + vec3(offset.x * 2.0, offset.y * 2.0, 0.0);
}

uniform int uPattern; // 0=brick, 1=wood, 2=marble, 3=checker, 4=voronoi, 5=wavy

void main() {
  vec2 uv = vUv;
  float scale = uScale;

  vec3 col;
  if (uPattern == 0) col = brickPattern(uv, scale);
  else if (uPattern == 1) col = woodGrain(uv, scale);
  else if (uPattern == 2) col = marble(uv, scale);
  else if (uPattern == 3) col = checkerboard(uv, scale);
  else if (uPattern == 4) col = voronoiTexture(uv, scale);
  else col = wavyDistort(uv, scale);

  // Lighting
  vec3 N = normalize(vNormal);
  vec3 L = normalize(key.position);
  vec3 V = normalize(vViewDir);
  float diff = max(dot(N, L), 0.0) * 0.6 + 0.4;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.3;

  gl_FragColor = vec4(col * diff + spec, 1.0);
}
`

const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const PATTERNS = ['Brick', 'Wood', 'Marble', 'Checkerboard', 'Voronoi', 'Wavy']
let currentPattern = 0

const mat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
})

const ballGeo = new THREE.SphereGeometry(1.2, 64, 64)
const ball = new THREE.Mesh(ballGeo, mat)
scene.add(ball)

const planeGeo = new THREE.PlaneGeometry(4, 4)
const plane = new THREE.Mesh(planeGeo, mat.clone())
plane.position.set(0, -2, -2)
plane.rotation.x = -0.5
scene.add(plane)

// GUI
const gui = new GUI()
const params = {
  pattern: PATTERNS[currentPattern],
  scale: 8.0,
  turbulence: 0.5,
  octaves: 5.0,
  color1: '#d4a574',
  color2: '#8b5a2b',
  accent: '#f5deb3',
  autoRotate: true,
}

gui.add(params, 'pattern', PATTERNS).name('Pattern').onChange(v => {
  currentPattern = PATTERNS.indexOf(v)
  uniforms.uPattern.value = currentPattern
})

gui.add(params, 'scale', 1, 30, 0.5).name('Scale').onChange(v => {
  uniforms.uScale.value = v
})

gui.add(params, 'turbulence', 0, 1).name('Turbulence').onChange(v => {
  uniforms.uTurbulence.value = v
})

gui.add(params, 'octaves', 1, 8, 1).name('Octaves').onChange(v => {
  uniforms.uOctaves.value = v
})

gui.addColor(params, 'color1').name('Color 1').onChange(v => {
  uniforms.uColor1.value.set(v)
})

gui.addColor(params, 'color2').name('Color 2').onChange(v => {
  uniforms.uColor2.value.set(v)
})

gui.addColor(params, 'accent').name('Accent').onChange(v => {
  uniforms.uAccent.value.set(v)
})

gui.add(params, 'autoRotate').name('Auto Rotate')

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  uniforms.uTime.value = t

  if (params.autoRotate) {
    ball.rotation.y = t * 0.3
    ball.rotation.x = Math.sin(t * 0.2) * 0.2
  }

  controls.update()
  composer.render()
}

animate()
