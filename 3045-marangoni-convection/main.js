import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020206)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 25, 35)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI * 0.45

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.8, 0.5, 0.15)
composer.addPass(bloom)

// Lighting
scene.add(new THREE.AmbientLight(0x112244, 0.4))
const dirLight = new THREE.DirectionalLight(0x88aaff, 0.6)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

// =========================================================
// Marangoni Flow Simulation
// Marangoni effect: flow from low surface tension (hot) to high surface tension (cold)
// dσ/dT * ∇T drives velocity field
// =========================================================

const GRID = 128
const SIZE = 40
const HEAT_SOURCES = [{ x: 0, y: 0, strength: 1.0 }]
const particles = []
const NUM_PARTICLES = 12000

// Temperature field (stored as DataTexture)
const tempData = new Float32Array(GRID * GRID)
const velXData = new Float32Array(GRID * GRID)
const velYData = new Float32Array(GRID * GRID)

// Temperature texture
const tempTex = new THREE.DataTexture(tempData, GRID, GRID, THREE.RedFormat, THREE.FloatType)
tempTex.needsUpdate = true

// Velocity field visualization plane with custom shader
const planeGeo = new THREE.PlaneGeometry(SIZE, SIZE, GRID - 1, GRID - 1)

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D uTempTex;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  vec3 heatColor(float t) {
    // Dark blue -> cyan -> green -> yellow -> red -> white
    vec3 c0 = vec3(0.0, 0.0, 0.1);
    vec3 c1 = vec3(0.0, 0.2, 0.6);
    vec3 c2 = vec3(0.0, 0.6, 0.4);
    vec3 c3 = vec3(0.2, 0.8, 0.1);
    vec3 c4 = vec3(0.9, 0.6, 0.0);
    vec3 c5 = vec3(1.0, 0.3, 0.0);
    vec3 c6 = vec3(1.0, 0.9, 0.7);
    if (t < 0.166) return mix(c0, c1, t / 0.166);
    if (t < 0.333) return mix(c1, c2, (t - 0.166) / 0.166);
    if (t < 0.5) return mix(c2, c3, (t - 0.333) / 0.166);
    if (t < 0.666) return mix(c3, c4, (t - 0.5) / 0.166);
    if (t < 0.833) return mix(c4, c5, (t - 0.666) / 0.166);
    return mix(c5, c6, (t - 0.833) / 0.167);
  }

  void main() {
    vec2 centeredUv = vUv - 0.5;
    float dist = length(centeredUv);

    // Radial heat pattern
    float heat = exp(-dist * 3.5) * 0.8;
    // Add convection cells
    float angle = atan(centeredUv.y, centeredUv.x);
    float cells = sin(angle * 6.0 + uTime * 0.5) * 0.5 + 0.5;
    heat += cells * exp(-dist * 2.0) * 0.3;
    // Add smaller scale turbulence
    float turb = sin(vUv.x * 40.0 + uTime * 1.5) * sin(vUv.y * 40.0 + uTime * 1.2) * 0.05;
    heat += turb * exp(-dist * 2.0);
    // Vignette
    float edge = smoothstep(0.5, 0.3, dist);
    heat *= edge;
    // Dark background
    vec3 bg = vec3(0.01, 0.01, 0.03);
    vec3 col = heatColor(clamp(heat * 1.5, 0.0, 1.0));
    col = mix(bg, col, heat * 1.2 + 0.1);
    // Glow at center
    float glow = exp(-dist * 6.0) * 0.5;
    col += vec3(0.3, 0.5, 1.0) * glow;
    gl_FragColor = vec4(col, 1.0);
  }
`

const planeMat = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uTempTex: { value: tempTex },
  },
  side: THREE.DoubleSide,
})
const plane = new THREE.Mesh(planeGeo, planeMat)
plane.rotation.x = -Math.PI / 2
plane.position.y = -0.1
scene.add(plane)

// Particle system (Marangoni flow tracers)
const pGeo = new THREE.BufferGeometry()
const pPositions = new Float32Array(NUM_PARTICLES * 3)
const pColors = new Float32Array(NUM_PARTICLES * 3)
const pPhases = new Float32Array(NUM_PARTICLES)

for (let i = 0; i < NUM_PARTICLES; i++) {
  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * SIZE * 0.45
  pPositions[i * 3] = Math.cos(angle) * radius
  pPositions[i * 3 + 1] = 0.1 + Math.random() * 0.3
  pPositions[i * 3 + 2] = Math.sin(angle) * radius
  const hue = 0.5 + Math.random() * 0.2
  const sat = 0.7 + Math.random() * 0.3
  const c = new THREE.Color().setHSL(hue, sat, 0.5)
  pColors[i * 3] = c.r
  pColors[i * 3 + 1] = c.g
  pColors[i * 3 + 2] = c.b
  pPhases[i] = Math.random() * Math.PI * 2
}

pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3))

const pMat = new THREE.PointsMaterial({
  size: 0.18,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
})
const pSystem = new THREE.Points(pGeo, pMat)
scene.add(pSystem)

// Heat source markers (glowing spheres)
const heatGeo = new THREE.SphereGeometry(0.4, 16, 12)
for (const src of HEAT_SOURCES) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    emissive: 0xff2200,
    emissiveIntensity: 3,
  })
  const mesh = new THREE.Mesh(heatGeo, mat)
  mesh.position.set(src.x, 0.5, src.y)
  scene.add(mesh)
}

// Raycaster for click
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const heatMeshes = []

window.addEventListener('click', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(plane)
  if (intersects.length > 0) {
    const p = intersects[0].point
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 3,
    })
    const mesh = new THREE.Mesh(heatGeo, mat)
    mesh.position.set(p.x, 0.5, p.z)
    scene.add(mesh)
    heatMeshes.push({ mesh, x: p.x, z: p.z, strength: 1.0 })
  }
})

// Compute temperature at a point
function getTemperature(x, z, time) {
  let temp = 0
  const allSources = [...HEAT_SOURCES, ...heatMeshes]
  for (const src of allSources) {
    const dx = x - src.x
    const dz = z - (src.z || 0)
    const dist = Math.sqrt(dx * dx + dz * dz)
    temp += src.strength * Math.exp(-dist * dist * 0.15)
  }
  // Add convection cell pattern
  const angle = Math.atan2(z, x)
  const r = Math.sqrt(x * x + z * z)
  temp += Math.sin(angle * 6 + time * 0.5) * 0.15 * Math.exp(-r * 0.5)
  return temp
}

// Marangoni velocity: v = -k * grad(surface_tension) = k * grad(T) for linear σ(T)
function getVelocity(x, z, time) {
  const eps = 0.5
  const Tx = (getTemperature(x + eps, z, time) - getTemperature(x - eps, z, time)) / (2 * eps)
  const Tz = (getTemperature(x, z + eps, time) - getTemperature(x, z - eps, time)) / (2 * eps)
  return { vx: Tx * 3.0, vz: Tz * 3.0 }
}

// GUI
const gui = { bloomStrength: 1.8, particleSize: 0.18 }
import('https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm').then(({ GUI }) => {
  const panel = new GUI({ title: "🌊 Marangoni Convection" })
  panel.add(gui, 'bloomStrength', 0.3, 4.0).name('Bloom').onChange(v => { bloom.strength = v })
  panel.add(gui, 'particleSize', 0.05, 0.5).name('Particle Size').onChange(v => { pMat.size = v })
})

const clock = new THREE.Clock()
const positions = pGeo.attributes.position.array

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()
  const dt = Math.min(clock.getDelta(), 0.033)

  planeMat.uniforms.uTime.value = elapsed

  // Update particles
  for (let i = 0; i < NUM_PARTICLES; i++) {
    let px = positions[i * 3]
    let pz = positions[i * 3 + 2]

    const { vx, vz } = getVelocity(px, pz, elapsed)
    px += vx * dt * 2.0
    pz += vz * dt * 2.0

    // Wrap around
    const maxR = SIZE * 0.48
    const r = Math.sqrt(px * px + pz * pz)
    if (r > maxR || r < 0.2) {
      const angle = Math.random() * Math.PI * 2
      const initR = Math.random() * maxR * 0.8 + 0.3
      px = Math.cos(angle) * initR
      pz = Math.sin(angle) * initR
    }

    positions[i * 3] = px
    positions[i * 3 + 2] = pz
    // Slight vertical oscillation
    positions[i * 3 + 1] = 0.1 + Math.sin(elapsed * 2 + pPhases[i]) * 0.08
  }
  pGeo.attributes.position.needsUpdate = true

  // Rotate heat source markers
  for (const h of heatMeshes) {
    h.mesh.position.y = 0.5 + Math.sin(elapsed * 3) * 0.1
    h.mesh.material.emissiveIntensity = 2.5 + Math.sin(elapsed * 4) * 0.5
  }

  controls.update()
  composer.render()
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
