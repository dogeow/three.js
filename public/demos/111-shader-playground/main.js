import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = {
  plasma: `// Plasma 水波 + 霓虹色
precision highp float;

uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

void main() {
  vec2 uv = vUv * 6.0;
  float t = uTime * 0.6;
  float v = 0.0;
  v += sin(uv.x + t);
  v += sin(uv.y + t * 1.2);
  v += sin(uv.x + uv.y + t * 0.8);
  float cx = uv.x + 0.5 * sin(t * 0.7);
  float cy = uv.y + 0.5 * cos(t * 0.5);
  v += sin(sqrt(cx*cx + cy*cy + 0.1) + t);
  v = v * 0.5 + 0.5;
  vec3 col = vec3(
    sin(v * 3.14159 + 0.0) * 0.5 + 0.5,
    sin(v * 3.14159 + 2.09) * 0.5 + 0.5,
    sin(v * 3.14159 + 4.18) * 0.5 + 0.5
  );
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
  col = mix(col, vec3(1.0), fresnel * 0.4);
  gl_FragColor = vec4(col, 1.0);
}`,

  marble: `// 大理石纹理
precision highp float;

uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for(int i=0;i<5;i++) { v += a*noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv * 5.0;
  float n = fbm(uv + fbm(uv + fbm(uv)));
  float vein = sin((uv.x + n * 4.0) * 8.0) * 0.5 + 0.5;
  vein = pow(vein, 3.0);
  vec3 c1 = vec3(0.95, 0.93, 0.88);
  vec3 c2 = vec3(0.15, 0.13, 0.11);
  vec3 col = mix(c1, c2, vein * 0.7);
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.5);
  col = mix(col, vec3(1.0), fresnel * 0.3);
  gl_FragColor = vec4(col, 1.0);
}`,

  voronoi: `// Voronoi 细胞纹理
precision highp float;

uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))))*43758.5453);
}

void main() {
  vec2 uv = vUv * 8.0;
  vec2 n = floor(uv);
  vec2 f = fract(uv);
  float md = 8.0;
  vec2 mr;
  for(int j=-1;j<=1;j++) {
    for(int i=-1;i<=1;i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.5*sin(uTime*0.8 + 6.2831*o);
      vec2 r = g + o - f;
      float d = dot(r,r);
      if(d < md) { md = d; mr = r; }
    }
  }
  float dist = sqrt(md);
  float edge = smoothstep(0.0, 0.12, dist);
  vec3 col = mix(vec3(0.1, 0.05, 0.2), vec3(0.6, 0.3, 0.8), dist);
  col = mix(vec3(0.05, 0.02, 0.1), col, edge);
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
  col += fresnel * 0.3;
  gl_FragColor = vec4(col, 1.0);
}`,

  wave: `// 波浪干涉
precision highp float;

uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec2 uv = vUv * 3.0;
  float t = uTime;
  float w1 = sin(uv.x * 4.0 + t * 1.2) * 0.5 + 0.5;
  float w2 = sin(uv.y * 4.0 - t * 0.9) * 0.5 + 0.5;
  float w3 = sin((uv.x + uv.y) * 3.0 + t * 0.6) * 0.5 + 0.5;
  float v = w1 * w2 * w3;
  v = pow(v, 1.5);
  vec3 col = vec3(
    sin(v * 6.28 + 0.0) * 0.5 + 0.5,
    sin(v * 6.28 + 2.09) * 0.5 + 0.5,
    sin(v * 6.28 + 4.18) * 0.5 + 0.5
  );
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
  col = mix(col, vec3(0.8, 0.9, 1.0), fresnel * 0.5);
  gl_FragColor = vec4(col, 1.0);
}`,

  noise: `// FBM 噪声山丘
precision highp float;

uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for(int i=0;i<6;i++) { v += a*noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv * 3.0;
  float n = fbm(uv + uTime * 0.15);
  vec3 deep  = vec3(0.05, 0.1, 0.3);
  vec3 mid   = vec3(0.1, 0.5, 0.3);
  vec3 high  = vec3(0.9, 0.85, 0.6);
  vec3 col = mix(deep, mid, smoothstep(0.3, 0.55, n));
  col = mix(col, high, smoothstep(0.6, 0.8, n));
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
  col = mix(col, vec3(1.0), fresnel * 0.25);
  gl_FragColor = vec4(col, 1.0);
}`,

  dissolve: `// 溶解效果
precision highp float;

uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for(int i=0;i<5;i++) { v += a*noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  float n = fbm(uv * 4.0);
  float threshold = (sin(uTime * 0.4) * 0.5 + 0.5) * 0.8 + 0.1;
  if (n < threshold) discard;
  float edge = smoothstep(threshold, threshold + 0.04, n);
  vec3 baseCol = vec3(0.1, 0.05, 0.2);
  vec3 edgeCol = vec3(1.0, 0.5, 0.1);
  vec3 col = mix(edgeCol, baseCol, edge);
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
  col += fresnel * 0.4;
  gl_FragColor = vec4(col, 1.0);
}`,
}

// ─── Vertex Shader (shared) ───────────────────────────────────────────────────
const VERTEX_SHADER = `precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// ─── Preview Scene ────────────────────────────────────────────────────────────
const preview = document.getElementById('preview')
const canvas  = document.getElementById('canvas')

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0c0e16)
scene.fog = new THREE.FogExp2(0x0c0e16, 0.035)

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
camera.position.set(0, 0, 4)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xffffff, 1.2)
sun.position.set(5, 8, 5)
scene.add(sun)

// ─── Shader Material ─────────────────────────────────────────────────────────
let shaderMaterial = null
let currentPreset = 'plasma'

function createMaterial(fragSrc) {
  if (shaderMaterial) {
    shaderMaterial.dispose()
    scene.remove(shaderMaterial.mesh)
  }

  try {
    shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: fragSrc,
      uniforms: {
        uTime: { value: 0 },
      },
      side: THREE.DoubleSide,
    })

    const geo = new THREE.SphereGeometry(1.5, 80, 80)
    const mesh = new THREE.Mesh(geo, shaderMaterial)
    shaderMaterial.mesh = mesh
    scene.add(mesh)

    // Add second object
    const ringGeo = new THREE.TorusGeometry(2.2, 0.08, 16, 80)
    const ring = new THREE.Mesh(ringGeo, shaderMaterial.clone())
    scene.add(ring)

    document.getElementById('compileBtn').className = 'compile-btn success'
    document.getElementById('errorMsg').textContent = ''
    return true
  } catch (err) {
    document.getElementById('compileBtn').className = 'compile-btn error'
    document.getElementById('errorMsg').textContent = err.message?.slice(0, 80) || 'Compile error'
    return false
  }
}

// ─── Editor ───────────────────────────────────────────────────────────────────
const editor = document.getElementById('codeEditor')
editor.value = PRESETS[currentPreset]

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    const frag = tab.dataset.tab === 'fragment' ? editor.value : VERTEX_SHADER
    editor.value = frag
  })
})

// Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentPreset = btn.dataset.preset
    editor.value = PRESETS[currentPreset]
    createMaterial(PRESETS[currentPreset])
  })
})

// Compile
document.getElementById('compileBtn').addEventListener('click', () => {
  // Check if we're viewing vertex or fragment
  const activeTab = document.querySelector('.tab.active').dataset.tab
  if (activeTab === 'fragment') {
    createMaterial(editor.value)
  } else {
    // Both: rebuild with current frag
    const fragEditor = editor.value
    const fragTab = document.querySelector('[data-tab=fragment]')
    // Get current fragment shader from material
    if (shaderMaterial) {
      shaderMaterial.vertexShader = fragEditor
      shaderMaterial.needsUpdate = true
    }
  }
})

// Auto-resize canvas
function resize() {
  const w = preview.clientWidth
  const h = preview.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

// ─── Clock & Loop ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const elapsed = clock.elapsedTime

  if (shaderMaterial) {
    shaderMaterial.uniforms.uTime.value = elapsed
  }

  // Gentle rotation
  if (shaderMaterial?.mesh) {
    shaderMaterial.mesh.rotation.y += delta * 0.15
    shaderMaterial.mesh.rotation.x = Math.sin(elapsed * 0.2) * 0.1
  }

  controls.update()
  renderer.render(scene, camera)
}

// ─── Init ─────────────────────────────────────────────────────────────────────
createMaterial(PRESETS[currentPreset])
animate()