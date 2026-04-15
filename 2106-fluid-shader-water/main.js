// ============================================================
// 2106. 着色器水面 — 高级水面模拟
// ============================================================
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.1/dist/lil-gui.esm.min.js'

// ── Scene ────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050d1a)
scene.fog = new THREE.FogExp2(0x071525, 0.012)

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500)
camera.position.set(0, 18, 32)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.9
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.4, 0.82
)
composer.addPass(bloomPass)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.04
controls.maxPolarAngle = Math.PI / 2.1
controls.minDistance = 8
controls.maxDistance = 80
controls.target.set(0, 0, 0)

// ── Parameters ─────────────────────────────────────────────────────────────
const params = {
  waveHeight: 0.5,
  waveSpeed: 1.2,
  foamThreshold: 0.75,
  causticScale: 4.0,
  causticSpeed: 1.0,
  bloomStrength: 0.55,
  mouseRadius: 0.25,
  mouseForce: 1.2,
  sunElevation: 0.6,
  waterDepth: 8.0,
}

// ── Water Geometry ────────────────────────────────────────────────────────
const WATER_SIZE = 60
const WATER_SEGS = 200
const geo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, WATER_SEGS, WATER_SEGS)
geo.rotateX(-Math.PI / 2)

// ── Water Shader ───────────────────────────────────────────────────────────
const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uMouseForce: { value: 0.0 },
    uWaveHeight: { value: params.waveHeight },
    uFoamThreshold: { value: params.foamThreshold },
    uCausticScale: { value: params.causticScale },
    uCausticSpeed: { value: params.causticSpeed },
    uSunDir: { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
    uWaterDepth: { value: params.waterDepth },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uWaveHeight;
    uniform float uMouseForce;
    uniform vec2 uMouse;
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPos;
    varying vec3 vNormal2;
    varying float vDistToCamera;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y
      );
    }

    float fbm(vec2 p, int oct) {
      float v = 0.0, a = 0.5, f = 1.0;
      for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        v += a * noise(p * f);
        a *= 0.5; f *= 2.1;
      }
      return v;
    }

    // Gerstner wave
    vec3 gerstner(vec2 pos, float steep, float wlen, vec2 dir, float time) {
      float k = 6.28318 / wlen;
      float c = sqrt(9.8 / k);
      float d = dot(dir, pos);
      float f = k * (d - c * time);
      float a = steep / k;
      return vec3(dir.x * a * cos(f), a * sin(f), dir.y * a * cos(f));
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      vec2 p = pos.xz;
      float t = uTime;

      // 4 Gerstner waves
      vec3 w1 = gerstner(p, 0.25 * uWaveHeight, 12.0, normalize(vec2(1.0, 0.5)), t * 1.0);
      vec3 w2 = gerstner(p, 0.18 * uWaveHeight, 7.0,  normalize(vec2(-0.6, 1.0)), t * 1.3);
      vec3 w3 = gerstner(p, 0.12 * uWaveHeight, 4.0,  normalize(vec2(0.8, -0.4)), t * 0.9);
      vec3 w4 = gerstner(p, 0.08 * uWaveHeight, 2.2,  normalize(vec2(-0.3, -0.8)), t * 1.7);

      float n = fbm(p * 0.3 + t * 0.15, 5) * 0.35 * uWaveHeight;
      vec3 disp = w1 + w2 + w3 + w4;
      disp.y += n;

      pos += disp;
      vElevation = disp.y;
      vWorldPos = pos;

      // Approximate normal from displacement
      float eps = 0.5;
      vec3 dx = gerstner(p + vec2(eps, 0.0), 0.25*uWaveHeight, 12.0, normalize(vec2(1,0.5)), t)
               + gerstner(p + vec2(eps, 0.0), 0.18*uWaveHeight, 7.0, normalize(vec2(-0.6,1)), t)
               + gerstner(p + vec2(eps, 0.0), 0.12*uWaveHeight, 4.0, normalize(vec2(0.8,-0.4)), t)
               + gerstner(p + vec2(eps, 0.0), 0.08*uWaveHeight, 2.2, normalize(vec2(-0.3,-0.8)), t);
      vec3 dz = gerstner(p + vec2(0.0, eps), 0.25*uWaveHeight, 12.0, normalize(vec2(1,0.5)), t)
               + gerstner(p + vec2(0.0, eps), 0.18*uWaveHeight, 7.0, normalize(vec2(-0.6,1)), t)
               + gerstner(p + vec2(0.0, eps), 0.12*uWaveHeight, 4.0, normalize(vec2(0.8,-0.4)), t)
               + gerstner(p + vec2(0.0, eps), 0.08*uWaveHeight, 2.2, normalize(vec2(-0.3,-0.8)), t);
      vec3 dn = cross(vec3(eps, dx.y - disp.y, 0), vec3(0, dz.y - disp.y, eps));
      vNormal2 = normalize(dn);

      vDistToCamera = length(cameraPosition - pos);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uMouseForce;
    uniform vec2 uMouse;
    uniform float uFoamThreshold;
    uniform float uCausticScale;
    uniform float uCausticSpeed;
    uniform vec3 uSunDir;
    uniform float uWaterDepth;
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPos;
    varying vec3 vNormal2;
    varying float vDistToCamera;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p), u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
    float fbm2(vec2 p) { float v=0.0,a=0.5,f=1.0; for(int i=0;i<4;i++){v+=a*noise(p*f);a*=0.5;f*=2.1;} return v; }

    void main() {
      vec3 N = normalize(vNormal2);
      vec3 V = normalize(cameraPosition - vWorldPos);

      // ── Water color gradient by depth ──────────────────────────────────
      vec3 deepCol    = vec3(0.01, 0.06, 0.18);
      vec3 midCol     = vec3(0.03, 0.20, 0.45);
      vec3 shallowCol = vec3(0.06, 0.45, 0.65);
      vec3 foamCol    = vec3(0.88, 0.95, 1.00);

      float heightT = smoothstep(-1.2, 1.2, vElevation);
      vec3 baseCol = mix(deepCol, midCol, heightT);
      baseCol = mix(baseCol, shallowCol, smoothstep(0.4, 0.8, heightT));

      // ── Foam at wave crests ────────────────────────────────────────────
      float foam = smoothstep(uFoamThreshold, uFoamThreshold + 0.18, heightT);
      float foamNoise = fbm2(vWorldPos.xz * 3.0 + uTime * 0.3);
      foam *= foamNoise;
      baseCol = mix(baseCol, foamCol, foam * 0.85);

      // ── Lighting ───────────────────────────────────────────────────────
      vec3 L = normalize(uSunDir);
      float NdotL = max(dot(N, L), 0.0);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 128.0);
      float diff = NdotL * 0.6 + 0.4;

      // ── Fresnel ────────────────────────────────────────────────────────
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      fresnel = mix(0.04, 1.0, fresnel);

      // ── Refraction tint ────────────────────────────────────────────────
      vec3 refrCol = mix(vec3(0.05, 0.25, 0.5), vec3(0.0, 0.1, 0.3), fresnel);

      // ── Caustics ────────────────────────────────────────────────────────
      float ca = fbm2(vWorldPos.xz * uCausticScale + uTime * uCausticSpeed * 0.5);
      float cb = fbm2(vWorldPos.xz * uCausticScale * 1.7 - uTime * uCausticSpeed * 0.3);
      float caustics = pow(ca * cb, 2.2) * 0.7;

      // ── Depth-based attenuation ───────────────────────────────────────
      float depthFade = exp(-vDistToCamera * 0.015);

      vec3 col = mix(baseCol, refrCol, fresnel * 0.65);
      col += vec3(1.0, 0.92, 0.75) * spec * 1.2;
      col += vec3(0.2, 0.5, 0.8) * caustics * (1.0 - fresnel) * 0.4 * depthFade;
      col *= diff;

      // ── Sky reflection ─────────────────────────────────────────────────
      vec3 skyTop = vec3(0.12, 0.28, 0.55);
      vec3 skyHor = vec3(0.50, 0.72, 0.85);
      vec3 R = reflect(-V, N);
      float skyT = smoothstep(-0.1, 0.5, R.y);
      vec3 skyCol = mix(skyHor, skyTop, skyT);
      col = mix(col, skyCol, fresnel * 0.4);

      // ── Mouse ripple glow ──────────────────────────────────────────────
      if (uMouseForce > 0.0) {
        float d = distance(vUv, uMouse);
        float ripple = sin(d * 35.0 - uTime * 7.0) * exp(-d * 5.0) * uMouseForce;
        ripple = max(ripple, 0.0);
        col += vec3(0.3, 0.6, 1.0) * ripple * 0.8;
        col += vec3(1.0) * pow(ripple, 3.0) * 1.5;
      }

      float alpha = mix(0.82, 0.97, fresnel);
      gl_FragColor = vec4(col, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
})

const water = new THREE.Mesh(geo, waterMat)
water.position.y = 0
scene.add(water)

// ── Water bottom ──────────────────────────────────────────────────────────
const bottomGeo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE)
bottomGeo.rotateX(-Math.PI / 2)
const bottomMat = new THREE.MeshStandardMaterial({
  color: 0x020815, roughness: 1.0, metalness: 0.0,
})
const bottom = new THREE.Mesh(bottomGeo, bottomMat)
bottom.position.y = -params.waterDepth
scene.add(bottom)

// ── Shallow shore plane ────────────────────────────────────────────────────
const shoreGeo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE)
shoreGeo.rotateX(-Math.PI / 2)
const shoreMat = new THREE.MeshStandardMaterial({
  color: 0x1a3a50, roughness: 0.9, transparent: true, opacity: 0.6,
})
const shore = new THREE.Mesh(shoreGeo, shoreMat)
shore.position.y = -0.5
scene.add(shore)

// ── Floating debris particles ─────────────────────────────────────────────
const DEBRIS_COUNT = 300
const debrisGeo = new THREE.BufferGeometry()
const debrisPos = new Float32Array(DEBRIS_COUNT * 3)
const debrisSizes = new Float32Array(DEBRIS_COUNT)
const debrisPhase = new Float32Array(DEBRIS_COUNT)

for (let i = 0; i < DEBRIS_COUNT; i++) {
  debrisPos[i * 3]     = (Math.random() - 0.5) * WATER_SIZE
  debrisPos[i * 3 + 1] = -0.5 + Math.random() * 2.0
  debrisPos[i * 3 + 2] = (Math.random() - 0.5) * WATER_SIZE
  debrisSizes[i]  = 0.05 + Math.random() * 0.2
  debrisPhase[i]  = Math.random() * Math.PI * 2
}
debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3))
debrisGeo.setAttribute('size', new THREE.BufferAttribute(debrisSizes, 1))

const debrisMat = new THREE.PointsMaterial({
  color: 0x88ccff, size: 0.12,
  transparent: true, opacity: 0.55,
  sizeAttenuation: true, depthWrite: false,
  blending: THREE.AdditiveBlending,
})
const debris = new THREE.Points(debrisGeo, debrisMat)
scene.add(debris)

// ── Lights ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x1a2a4a, 0.7)
scene.add(ambient)

const sunLight = new THREE.DirectionalLight(0xfff0dd, 1.6)
sunLight.position.set(15, 30, 10)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 100
sunLight.shadow.camera.left = -40
sunLight.shadow.camera.right = 40
sunLight.shadow.camera.top = 40
sunLight.shadow.camera.bottom = -40
scene.add(sunLight)

const ptLight1 = new THREE.PointLight(0x0088ff, 1.5, 60)
ptLight1.position.set(-12, 4, -8)
scene.add(ptLight1)

const ptLight2 = new THREE.PointLight(0x00ffcc, 0.8, 40)
ptLight2.position.set(10, 3, 10)
scene.add(ptLight2)

// ── Stars ─────────────────────────────────────────────────────────────────
const starGeo = new THREE.BufferGeometry()
const starCount = 2000
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount; i++) {
  const r = 150 + Math.random() * 100
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
  starPos[i*3+1] = Math.abs(r * Math.cos(phi)) // upper hemisphere
  starPos[i*3+2] = r * Math.sin(phi) * Math.sin(theta)
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true })
scene.add(new THREE.Points(starGeo, starMat))

// ── Grid ───────────────────────────────────────────────────────────────────
const grid = new THREE.GridHelper(WATER_SIZE * 1.4, 30, 0x0a1a2a, 0x061018)
grid.position.y = -params.waterDepth - 0.1
scene.add(grid)

// ── GUI ────────────────────────────────────────────────────────────────────
const gui = new GUI()
gui.add(params, 'waveHeight', 0.1, 1.5, 0.01).name('浪高').onChange(v => {
  waterMat.uniforms.uWaveHeight.value = v
})
gui.add(params, 'waveSpeed', 0.2, 3.0, 0.1).name('波浪速度').onChange(v => {
  waterMat.uniforms.uCausticSpeed.value = v
})
gui.add(params, 'foamThreshold', 0.3, 1.2, 0.01).name('浪尖泡沫').onChange(v => {
  waterMat.uniforms.uFoamThreshold.value = v
})
gui.add(params, 'causticScale', 1.0, 10.0, 0.1).name('焦散强度').onChange(v => {
  waterMat.uniforms.uCausticScale.value = v
})
gui.add(params, 'bloomStrength', 0.0, 1.5, 0.01).name('辉光').onChange(v => {
  bloomPass.strength = v
})
gui.add(params, 'waterDepth', 2.0, 20.0, 0.5).name('水深').onChange(v => {
  bottom.position.y = -v
  shore.position.y = -v * 0.05
})
gui.add(params, 'mouseForce', 0.0, 3.0, 0.1).name('鼠标力度')

// ── Mouse Interaction ───────────────────────────────────────────────────────
const mouse = new THREE.Vector2(0.5, 0.5)
let mouseDown = false
let force = 0

window.addEventListener('mousemove', e => {
  mouse.x = e.clientX / window.innerWidth
  mouse.y = 1.0 - e.clientY / window.innerHeight
})
window.addEventListener('mousedown', () => { mouseDown = true })
window.addEventListener('mouseup', () => { mouseDown = false })

// ── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// ── Animation Loop ──────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  waterMat.uniforms.uTime.value = t
  waterMat.uniforms.uMouse.value.copy(mouse)

  // Mouse force ramp
  if (mouseDown) force = Math.min(force + 0.08, params.mouseForce)
  else force = Math.max(force - 0.025, 0)
  waterMat.uniforms.uMouseForce.value = force

  // Animate point lights
  ptLight1.position.x = Math.sin(t * 0.4) * 14
  ptLight1.position.z = Math.cos(t * 0.4) * 14
  ptLight2.position.x = Math.sin(t * 0.27 + 1.5) * 12
  ptLight2.position.z = Math.cos(t * 0.27 + 1.5) * 12

  // Debris bobbing
  const dp = debris.geometry.attributes.position
  for (let i = 0; i < DEBRIS_COUNT; i++) {
    dp.array[i * 3 + 1] = -0.3 + Math.sin(t * 0.8 + debrisPhase[i]) * 0.25
  }
  dp.needsUpdate = true

  controls.update()
  composer.render()
}

animate()
