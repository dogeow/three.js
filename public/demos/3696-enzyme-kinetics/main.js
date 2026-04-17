/**
 * 3696. Enzyme Kinetics
 * Michaelis-Menten kinetics visualization with particle-based substrate/enzyme/product
 * E + S ⇌ ES → E + P
 * 
 * Science: Enzymes catalyze reactions. The rate follows v = Vmax[S]/(Km+[S])
 * where Km = (k_-1 + k_2) / k_1 is the Michaelis constant.
 * 
 * Click left half = inject substrate | Click right half = inject inhibitor
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ─── Scene setup ─────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.008)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 800)
camera.position.set(0, 28, 55)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.maxPolarAngle = Math.PI * 0.85

// Lights
scene.add(new THREE.AmbientLight(0x1a2040, 0.6))
const blueLight = new THREE.DirectionalLight(0x4488ff, 1.0)
blueLight.position.set(10, 30, 20)
scene.add(blueLight)
const rimLight = new THREE.PointLight(0xff4488, 0.5, 100)
rimLight.position.set(-20, 5, -10)
scene.add(rimLight)

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.8)
composer.addPass(bloom)

// ─── Enzyme Grid ─────────────────────────────────────────────────────────────
// Fixed enzyme binding sites in a 3D lattice
const ENZYME_COUNT = 40
const enzymeGeo = new THREE.SphereGeometry(0.45, 16, 16)
const enzymeMat = new THREE.MeshStandardMaterial({
  color: 0xffaa44,
  emissive: 0xff6600,
  emissiveIntensity: 0.4,
  roughness: 0.3,
  metalness: 0.5
})
const enzymeMesh = new THREE.InstancedMesh(enzymeGeo, enzymeMat, ENZYME_COUNT * 2) // ES and E states
enzymeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(enzymeMesh)

const enzymePositions = []
const enzymeStates = [] // 0=free enzyme, 1=bound as ES complex
const dummy = new THREE.Object3D()
for (let i = 0; i < ENZYME_COUNT; i++) {
  const x = (Math.random() - 0.5) * 50
  const y = (Math.random() - 0.5) * 20
  const z = (Math.random() - 0.5) * 50
  enzymePositions.push({ x, y, z })
  enzymeStates.push({ state: 0, bindingTime: 0 })
}
updateEnzymeInstances()

function updateEnzymeInstances() {
  let esIdx = 0
  for (let i = 0; i < ENZYME_COUNT; i++) {
    const p = enzymePositions[i]
    dummy.position.set(p.x, p.y, p.z)
    if (enzymeStates[i].state === 0) {
      // Free enzyme — yellow sphere
      dummy.scale.setScalar(1.0)
      dummy.updateMatrix()
      enzymeMesh.setMatrixAt(i, dummy.matrix)
    }
  }
  // ES complexes rendered separately below
  enzymeMesh.instanceMatrix.needsUpdate = true
}

// ─── Particle pools ──────────────────────────────────────────────────────────
const MAX_SUBSTRATE = 600
const MAX_PRODUCT = 400

const subGeo = new THREE.SphereGeometry(0.28, 8, 8)
const subMat = new THREE.MeshStandardMaterial({
  color: 0x44ff88,
  emissive: 0x00ff44,
  emissiveIntensity: 0.6,
  roughness: 0.2,
  transparent: true,
  opacity: 0.85
})
const substrateMesh = new THREE.InstancedMesh(subGeo, subMat, MAX_SUBSTRATE)
substrateMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(substrateMesh)

const prodGeo = new THREE.SphereGeometry(0.24, 8, 8)
const prodMat = new THREE.MeshStandardMaterial({
  color: 0xff4466,
  emissive: 0xff2244,
  emissiveIntensity: 0.6,
  roughness: 0.2,
  transparent: true,
  opacity: 0.85
})
const productMesh = new THREE.InstancedMesh(prodGeo, prodMat, MAX_PRODUCT)
productMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(productMesh)

// ES complex mesh (enzyme + substrate bound together)
const esGeo = new THREE.SphereGeometry(0.55, 12, 12)
const esMat = new THREE.MeshStandardMaterial({
  color: 0xffaa44,
  emissive: 0xff8800,
  emissiveIntensity: 0.8,
  roughness: 0.15,
  metalness: 0.6,
  transparent: true,
  opacity: 0.95
})
const esMesh = new THREE.InstancedMesh(esGeo, esMat, ENZYME_COUNT)
esMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
scene.add(esMesh)

// ─── Simulation state ────────────────────────────────────────────────────────
const BOUNDS = { x: 40, y: 20, z: 40 }
const SUBSTRATE_COUNT = 280
const PRODUCT_COUNT = 80

// Substrate particles
const subPos = []
const subVel = []
for (let i = 0; i < SUBSTRATE_COUNT; i++) {
  subPos.push({
    x: (Math.random() - 0.5) * BOUNDS.x * 2,
    y: (Math.random() - 0.5) * BOUNDS.y * 2,
    z: (Math.random() - 0.5) * BOUNDS.z * 2
  })
  subVel.push({
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
    z: (Math.random() - 0.5) * 2
  })
}

// Product particles
const prodPos = []
const prodVel = []
for (let i = 0; i < PRODUCT_COUNT; i++) {
  prodPos.push({
    x: (Math.random() - 0.5) * BOUNDS.x * 2,
    y: (Math.random() - 0.5) * BOUNDS.y * 2,
    z: (Math.random() - 0.5) * BOUNDS.z * 2
  })
  prodVel.push({
    x: (Math.random() - 0.5) * 3,
    y: (Math.random() - 0.5) * 3 + 0.5,
    z: (Math.random() - 0.5) * 3
  })
}

// Michaelis-Menten parameters
let K_M = 2.0      // mM (normalized substrate concentration at half Vmax)
let V_MAX = 1.0    // relative max velocity
let k_cat = 0.12   // turnover number (reactions per time step per bound enzyme)
let k_bind = 0.008 // association rate
let k_unbind = 0.04 // dissociation rate

// ES complex tracking
const esComplexes = [] // { enzymeIdx, subIdx, timer }
const esMeshIdx = 0

// ─── UI elements ─────────────────────────────────────────────────────────────
const barS = document.getElementById('bar-s')
const barES = document.getElementById('bar-es')
const barP = document.getElementById('bar-p')
const barV = document.getElementById('bar-v')
const kmEl = document.getElementById('km')
const vmaxEl = document.getElementById('vmax')
const dtEl = document.getElementById('dt')

// ─── Interactions ────────────────────────────────────────────────────────────
let lastClick = 0
let injectionCooldown = 0

window.addEventListener('click', (e) => {
  if (Date.now() - lastClick < 300) return
  lastClick = Date.now()
  
  // Left half = substrate injection, Right half = change Km
  if (e.clientX < innerWidth / 2) {
    // Inject 30 new substrate particles at center
    for (let k = 0; k < 30; k++) {
      if (subPos.length < MAX_SUBSTRATE) {
        subPos.push({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8 })
        subVel.push({ x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 4 })
      }
    }
    // Flash injection effect
    flashLight(0x44ff88, 2.0)
  } else {
    // Increase Km (decrease affinity)
    K_M = Math.min(10.0, K_M + 0.5)
    kmEl.textContent = K_M.toFixed(1)
    flashLight(0xff4488, 1.5)
  }
})

// Keyboard: +/- to change Vmax, R to reset
window.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === '=') {
    V_MAX = Math.min(3.0, V_MAX + 0.2)
    vmaxEl.textContent = V_MAX.toFixed(1)
  } else if (e.key === '-') {
    V_MAX = Math.max(0.2, V_MAX - 0.2)
    vmaxEl.textContent = V_MAX.toFixed(1)
  } else if (e.key === 'r' || e.key === 'R') {
    // Reset
    subPos.length = Math.min(subPos.length, SUBSTRATE_COUNT)
    prodPos.length = Math.min(prodPos.length, PRODUCT_COUNT)
    K_M = 2.0; V_MAX = 1.0
    kmEl.textContent = K_M.toFixed(1)
    vmaxEl.textContent = V_MAX.toFixed(1)
    esComplexes.length = 0
  }
})

// Substrate injection every ~4 seconds (passive input)
setInterval(() => {
  if (subPos.length < MAX_SUBSTRATE && Math.random() < 0.4) {
    subPos.push({ x: (Math.random() - 0.5) * 20, y: -BOUNDS.y, z: (Math.random() - 0.5) * 20 })
    subVel.push({ x: (Math.random() - 0.5) * 1, y: Math.random() * 2, z: (Math.random() - 0.5) * 1 })
  }
}, 4000)

function flashLight(color, intensity) {
  const flash = new THREE.PointLight(color, intensity, 30)
  flash.position.set(0, 0, 0)
  scene.add(flash)
  setTimeout(() => scene.remove(flash), 200)
}

// ─── Physics update ───────────────────────────────────────────────────────────
let simTime = 0
const dt = 0.016

function updatePhysics() {
  simTime += dt
  
  // 1. Move substrate particles (brownian motion + drift toward enzyme grid)
  const S = subPos.length / MAX_SUBSTRATE // normalized substrate concentration
  for (let i = 0; i < subPos.length; i++) {
    const p = subPos[i]
    const v = subVel[i]
    
    // Drift toward enzyme region (center)
    v.x += (-p.x * 0.002)
    v.y += (-p.y * 0.002)
    v.z += (-p.z * 0.002)
    
    // Random brownian kicks
    v.x += (Math.random() - 0.5) * 0.15
    v.y += (Math.random() - 0.5) * 0.15
    v.z += (Math.random() - 0.5) * 0.15
    
    // Damping
    v.x *= 0.97; v.y *= 0.97; v.z *= 0.97
    
    // Speed limit
    const speed = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z)
    if (speed > 4) { v.x *= 4/speed; v.y *= 4/speed; v.z *= 4/speed }
    
    p.x += v.x; p.y += v.y; p.z += v.z
    
    // Boundary bounce
    if (Math.abs(p.x) > BOUNDS.x) { v.x *= -0.8; p.x = Math.sign(p.x) * BOUNDS.x }
    if (Math.abs(p.y) > BOUNDS.y) { v.y *= -0.8; p.y = Math.sign(p.y) * BOUNDS.y }
    if (Math.abs(p.z) > BOUNDS.z) { v.z *= -0.8; p.z = Math.sign(p.z) * BOUNDS.z }
  }
  
  // 2. Binding: S + E → ES (Michaelis-Menten association)
  // Association probability scales with [S] and available enzyme sites
  const bindProb = k_bind * S * (1 - esComplexes.length / ENZYME_COUNT)
  
  // Find free enzyme indices
  const boundEnzymes = new Set(esComplexes.map(c => c.enzymeIdx))
  const freeEnzymes = []
  for (let i = 0; i < ENZYME_COUNT; i++) {
    if (!boundEnzymes.has(i)) freeEnzymes.push(i)
  }
  
  // Try to bind substrates to free enzymes
  if (Math.random() < bindProb && freeEnzymes.length > 0 && subPos.length > 0) {
    const eIdx = freeEnzymes[Math.floor(Math.random() * freeEnzymes.length)]
    const sIdx = Math.floor(Math.random() * subPos.length)
    
    // Remove substrate particle
    const lastS = subPos.pop(); subVel.pop()
    if (sIdx < subPos.length) {
      subPos[sIdx] = lastS
    }
    
    esComplexes.push({
      enzymeIdx: eIdx,
      subPos: { ...enzymePositions[eIdx] },
      timer: 0,
      progress: 0
    })
  }
  
  // 3. ES complex reaction: ES → E + P (catalysis)
  // Catalysis probability per complex per step: Vmax * [S] / (Km + [S])
  const currentVelocity = V_MAX * S / (K_M + S + 0.001)
  const catProb = k_cat * currentVelocity
  
  for (let i = esComplexes.length - 1; i >= 0; i--) {
    const complex = esComplexes[i]
    complex.timer += dt
    complex.progress = Math.min(1.0, complex.timer / (1.0 / k_cat))
    
    if (Math.random() < catProb) {
      // Catalysis! Release product
      esComplexes.splice(i, 1)
      
      // Spawn product near enzyme
      if (prodPos.length < MAX_PRODUCT) {
        const ep = enzymePositions[complex.enzymeIdx]
        prodPos.push({
          x: ep.x + (Math.random() - 0.5) * 2,
          y: ep.y + (Math.random() - 0.5) * 2,
          z: ep.z + (Math.random() - 0.5) * 2
        })
        prodVel.push({
          x: (Math.random() - 0.5) * 3,
          y: Math.random() * 2 + 1,
          z: (Math.random() - 0.5) * 3
        })
      }
    }
  }
  
  // 4. Dissociation (reverse reaction): ES → E + S
  for (let i = esComplexes.length - 1; i >= 0; i--) {
    if (Math.random() < k_unbind * dt * 60) {
      const complex = esComplexes.splice(i, 1)[0]
      // Return substrate to pool
      if (subPos.length < MAX_SUBSTRATE) {
        subPos.push({ x: complex.subPos.x, y: complex.subPos.y, z: complex.subPos.z })
        subVel.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 })
      }
    }
  }
  
  // 5. Product particles drift upward and fade
  for (let i = 0; i < prodPos.length; i++) {
    const p = prodPos[i]
    const v = prodVel[i]
    v.y += 0.02 // buoyancy
    v.x *= 0.98; v.y *= 0.98; v.z *= 0.98
    p.x += v.x; p.y += v.y; p.z += v.z
    
    if (p.y > BOUNDS.y * 1.5) {
      // Remove product that left the scene
      const last = prodPos.pop(); prodVel.pop()
      if (i < prodPos.length) { prodPos[i] = last }
      i--
    }
  }
  
  // 6. Update UI bars
  const fracS = subPos.length / MAX_SUBSTRATE
  const fracES = esComplexes.length / ENZYME_COUNT
  const fracP = prodPos.length / MAX_PRODUCT
  const velocity = V_MAX * fracS / (K_M / 2 + fracS + 0.001)
  
  barS.style.width = (fracS * 100).toFixed(1) + '%'
  barES.style.width = (fracES * 100).toFixed(1) + '%'
  barP.style.width = (fracP * 100).toFixed(1) + '%'
  barV.style.width = (velocity * 100).toFixed(1) + '%'
  dtEl.textContent = simTime.toFixed(2)
}

// ─── Render update ───────────────────────────────────────────────────────────
function updateInstances() {
  // Substrate
  for (let i = 0; i < subPos.length; i++) {
    dummy.position.set(subPos[i].x, subPos[i].y, subPos[i].z)
    dummy.scale.setScalar(0.8 + Math.sin(simTime * 3 + i) * 0.1)
    dummy.updateMatrix()
    substrateMesh.setMatrixAt(i, dummy.matrix)
  }
  substrateMesh.count = subPos.length
  substrateMesh.instanceMatrix.needsUpdate = true
  
  // Product
  for (let i = 0; i < prodPos.length; i++) {
    dummy.position.set(prodPos[i].x, prodPos[i].y, prodPos[i].z)
    dummy.scale.setScalar(0.7 + Math.sin(simTime * 5 + i * 0.7) * 0.15)
    dummy.updateMatrix()
    productMesh.setMatrixAt(i, dummy.matrix)
  }
  productMesh.count = prodPos.length
  productMesh.instanceMatrix.needsUpdate = true
  
  // ES complexes
  for (let i = 0; i < esComplexes.length; i++) {
    const c = esComplexes[i]
    const ep = enzymePositions[c.enzymeIdx]
    dummy.position.set(ep.x, ep.y, ep.z)
    const s = 0.8 + c.progress * 0.5
    dummy.scale.setScalar(s)
    dummy.updateMatrix()
    esMesh.setMatrixAt(i, dummy.matrix)
  }
  esMesh.count = esComplexes.length
  esMesh.instanceMatrix.needsUpdate = true
  
  // Free enzymes (scale=0 for bound ones — hidden)
  for (let i = 0; i < ENZYME_COUNT; i++) {
    const bound = esComplexes.some(c => c.enzymeIdx === i)
    dummy.position.set(enzymePositions[i].x, enzymePositions[i].y, enzymePositions[i].z)
    dummy.scale.setScalar(bound ? 0.0 : 1.0)
    dummy.updateMatrix()
    enzymeMesh.setMatrixAt(i, dummy.matrix)
  }
  enzymeMesh.instanceMatrix.needsUpdate = true
}

// ─── Animate ─────────────────────────────────────────────────────────────────
let lastTime = 0
function animate(time) {
  requestAnimationFrame(animate)
  const elapsed = (time - lastTime) / 1000
  lastTime = time
  
  updatePhysics()
  updateInstances()
  
  // Subtle scene rotation to show 3D
  scene.rotation.y += 0.0003
  
  controls.update()
  composer.render()
}
animate(0)

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

console.log('3696 Enzyme Kinetics initialized — Michaelis-Menten: E+S⇌ES→E+P')
