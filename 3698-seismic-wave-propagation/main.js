/**
 * 3698. Seismic Wave Propagation
 * Visualizes P-waves, S-waves, and surface waves (Rayleigh/Love) radiating from an earthquake epicenter
 * 
 * Science: Earthquakes generate body waves (P and S) and surface waves.
 * P-waves are compression waves (6 km/s in crust), S-waves are shear waves (3.5 km/s).
 * Surface waves (Rayleigh ~3 km/s, Love ~4 km/s) cause the most destruction.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050810)
scene.fog = new THREE.FogExp2(0x050810, 0.006)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(80, 60, 120)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI * 0.88

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.75)
composer.addPass(bloom)

// Lights
scene.add(new THREE.AmbientLight(0x223344, 0.5))
const dirLight = new THREE.DirectionalLight(0x88aabb, 0.8)
dirLight.position.set(50, 80, 60)
scene.add(dirLight)

// ─── Earth model ─────────────────────────────────────────────────────────────
// Flat terrain grid to show surface displacement
const GRID = 80
const SPACING = 2.5
const groundGeo = new THREE.PlaneGeometry(GRID * SPACING, GRID * SPACING, GRID, GRID)
groundGeo.rotateX(-Math.PI / 2)

const groundMat = new THREE.MeshStandardMaterial({
  color: 0x2a3a4a,
  roughness: 0.9,
  metalness: 0.1,
  wireframe: false,
  vertexColors: true
})

// Color vertices by depth (green surface, brown deep)
const pos = groundGeo.attributes.position
const colors = new Float32Array(pos.count * 3)
for (let i = 0; i < pos.count; i++) {
  const depth = -pos.getY(i)
  const t = Math.min(1, depth / 30)
  // Surface: brown/green, deep: dark gray
  colors[i * 3] = 0.2 + t * 0.15
  colors[i * 3 + 1] = 0.25 + t * 0.1
  colors[i * 3 + 2] = 0.2 + t * 0.1
}
groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.position.y = 0
scene.add(ground)

// Wireframe overlay
const wireGeo = new THREE.PlaneGeometry(GRID * SPACING, GRID * SPACING, GRID, GRID)
wireGeo.rotateX(-Math.PI / 2)
const wireMat = new THREE.MeshBasicMaterial({ color: 0x334455, wireframe: true, transparent: true, opacity: 0.15 })
const wireGround = new THREE.Mesh(wireGeo, wireMat)
wireGround.position.y = 0.01
scene.add(wireGround)

// Store original Y positions
const origY = new Float32Array(pos.count)
for (let i = 0; i < pos.count; i++) origY[i] = pos.getY(i)

// Epicenter marker
const epiGeo = new THREE.RingGeometry(1.5, 2.0, 32)
const epiMat = new THREE.MeshBasicMaterial({ color: 0xff4422, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
const epicenter = new THREE.Mesh(epiGeo, epiMat)
epicenter.rotation.x = -Math.PI / 2
epicenter.position.y = 0.1
scene.add(epicenter)

// Depth indicator
const depthLineGeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 8)
const depthLineMat = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.5 })
const depthLine = new THREE.Mesh(depthLineGeo, depthLineMat)
depthLine.position.y = -8
scene.add(depthLine)

// ─── Wave system ─────────────────────────────────────────────────────────────
// P-wave: primary compression wave — fastest, shown as expanding sphere
const P_WAVE_SPEED = 6.0    // km/s (scaled)
const S_WAVE_SPEED = 3.5    // km/s
const SURF_WAVE_SPEED = 2.8  // km/s

const MAX_WAVE_RINGS = 40
const RING_DETAIL = 64

const pWaveGeo = new THREE.TorusGeometry(1, 0.15, 8, RING_DETAIL)
const pWaveMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.7 })
const pWaveRings = []
for (let i = 0; i < MAX_WAVE_RINGS; i++) {
  const m = new THREE.Mesh(pWaveGeo.clone(), pWaveMat.clone())
  m.rotation.x = Math.PI / 2
  m.visible = false
  scene.add(m)
  pWaveRings.push({ mesh: m, radius: 0, active: false, opacity: 0.7 })
}

const sWaveGeo = new THREE.TorusGeometry(1, 0.2, 8, RING_DETAIL)
const sWaveMat = new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.6 })
const sWaveRings = []
for (let i = 0; i < MAX_WAVE_RINGS; i++) {
  const m = new THREE.Mesh(sWaveGeo.clone(), sWaveMat.clone())
  m.rotation.x = Math.PI / 2
  m.visible = false
  scene.add(m)
  sWaveRings.push({ mesh: m, radius: 0, active: false, opacity: 0.6 })
}

const surfWaveGeo = new THREE.TorusGeometry(1, 0.25, 8, RING_DETAIL)
const surfWaveMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.5 })
const surfWaveRings = []
for (let i = 0; i < MAX_WAVE_RINGS / 2; i++) {
  const m = new THREE.Mesh(surfWaveGeo.clone(), surfWaveMat.clone())
  m.rotation.x = Math.PI / 2
  m.visible = false
  scene.add(m)
  surfWaveRings.push({ mesh: m, radius: 0, active: false, opacity: 0.5 })
}

// ─── Seismic source ──────────────────────────────────────────────────────────
let epicenterX = 0, epicenterZ = 0
let focusDepth = 8.0  // km
let magnitude = 5.0
let simTime = 0

// Epicenter position on grid
function worldToGrid(wx, wz) {
  const gx = Math.round(wx / SPACING + GRID / 2)
  const gz = Math.round(wz / SPACING + GRID / 2)
  return { gx, gz }
}

function triggerEarthquake() {
  // Reset all rings
  for (const r of pWaveRings) { r.active = false; r.radius = 0; r.mesh.visible = false }
  for (const r of sWaveRings) { r.active = false; r.radius = 0; r.mesh.visible = false }
  for (const r of surfWaveRings) { r.active = false; r.radius = 0; r.mesh.visible = false }
  
  // Spawn first P-wave ring immediately
  let pIdx = 0
  pWaveRings[pIdx].active = true
  pWaveRings[pIdx].radius = focusDepth * 0.3 // start at depth
  pWaveRings[pIdx].mesh.visible = true
  
  // Delayed S-wave
  setTimeout(() => {
    sWaveRings[0].active = true
    sWaveRings[0].radius = 0
    sWaveRings[0].mesh.visible = true
  }, 500)
  
  // Surface wave after P+S arrive at surface
  setTimeout(() => {
    surfWaveRings[0].active = true
    surfWaveRings[0].radius = 0
    surfWaveRings[0].mesh.visible = true
  }, 1200)
  
  // Epicenter pulse
  epicenter.scale.setScalar(1)
}

// ─── Input ───────────────────────────────────────────────────────────────────
window.addEventListener('click', (e) => {
  const nx = (e.clientX / innerWidth) * 2 - 1
  const ny = -(e.clientY / innerHeight) * 2 + 1
  
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera({ x: nx, y: ny }, camera)
  const hits = raycaster.intersectObject(ground)
  
  if (hits.length > 0) {
    const p = hits[0].point
    epicenterX = p.x
    epicenterZ = p.z
    epicenter.position.set(epicenterX, 0.1, epicenterZ)
    depthLine.position.set(epicenterX, -focusDepth / 2, epicenterZ)
    depthLine.scale.y = focusDepth
    triggerEarthquake()
  }
})

window.addEventListener('wheel', (e) => {
  magnitude = Math.max(1, Math.min(9, magnitude + e.deltaY * -0.002))
  document.getElementById('mag').textContent = magnitude.toFixed(1)
})

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    triggerEarthquake()
  }
  if (e.key === 'ArrowUp') {
    focusDepth = Math.min(30, focusDepth + 1)
    document.getElementById('depth').textContent = focusDepth.toFixed(0)
    depthLine.scale.y = focusDepth
    depthLine.position.y = -focusDepth / 2
  }
  if (e.key === 'ArrowDown') {
    focusDepth = Math.max(2, focusDepth - 1)
    document.getElementById('depth').textContent = focusDepth.toFixed(0)
    depthLine.scale.y = focusDepth
    depthLine.position.y = -focusDepth / 2
  }
})

// ─── Ground displacement ─────────────────────────────────────────────────────
function applyGroundDisplacement() {
  const attr = groundGeo.attributes.position
  const posArray = attr.array
  const magScale = magnitude * 0.3
  
  for (let i = 0; i < attr.count; i++) {
    const wx = posArray[i * 3]
    const wz = posArray[i * 3 + 2]
    
    const dx = wx - epicenterX
    const dz = wz - epicenterZ
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    if (dist < 0.01) {
      attr.setY(i, origY[i] + magScale * 2.0)
      continue
    }
    
    const depthFactor = Math.max(0, 1 - focusDepth / 30)
    const wavePhase = (dist / P_WAVE_SPEED - simTime * 0.5) * 8
    const attenuation = 1.0 / (1 + dist * 0.03)
    
    // P-wave contribution (small, fast)
    const pContrib = Math.sin(wavePhase) * Math.exp(-dist * 0.02) * magScale * 0.3 * depthFactor
    
    // S-wave (medium)
    const sPhase = (dist / S_WAVE_SPEED - simTime * 0.5) * 8
    const sContrib = Math.sin(sPhase) * Math.exp(-dist * 0.015) * magScale * 0.6 * depthFactor
    
    // Surface wave (largest, slowest, stays at surface)
    const surfPhase = (dist / SURF_WAVE_SPEED - simTime * 0.5) * 6
    const surfContrib = Math.sin(surfPhase) * Math.exp(-dist * 0.008) * magScale * 1.2 * Math.max(0, 1 - dist * 0.005)
    
    const totalDisp = pContrib + sContrib + surfContrib
    attr.setY(i, origY[i] + totalDisp)
  }
  
  attr.needsUpdate = true
  groundGeo.computeVertexNormals()
}

// ─── Wave ring updates ───────────────────────────────────────────────────────
function updateWaveRings() {
  const speedP = P_WAVE_SPEED * 0.8
  const speedS = S_WAVE_SPEED * 0.8
  const speedSurf = SURF_WAVE_SPEED * 0.8
  
  // P-waves
  for (const r of pWaveRings) {
    if (!r.active) continue
    r.radius += speedP * 0.016 * 8
    
    if (r.radius > 200) {
      r.active = false
      r.mesh.visible = false
    } else {
      r.mesh.position.set(epicenterX, 0.5, epicenterZ)
      r.mesh.scale.setScalar(r.radius)
      r.mesh.material.opacity = r.opacity * Math.max(0, 1 - r.radius / 200)
    }
  }
  
  // S-waves
  for (const r of sWaveRings) {
    if (!r.active) continue
    r.radius += speedS * 0.016 * 8
    
    if (r.radius > 180) {
      r.active = false
      r.mesh.visible = false
    } else {
      r.mesh.position.set(epicenterX, 0.3, epicenterZ)
      r.mesh.scale.setScalar(r.radius)
      r.mesh.material.opacity = r.opacity * Math.max(0, 1 - r.radius / 180)
    }
  }
  
  // Surface waves
  for (const r of surfWaveRings) {
    if (!r.active) continue
    r.radius += speedSurf * 0.016 * 8
    
    if (r.radius > 160) {
      r.active = false
      r.mesh.visible = false
    } else {
      r.mesh.position.set(epicenterX, 0.2, epicenterZ)
      r.mesh.scale.setScalar(r.radius)
      r.mesh.material.opacity = r.opacity * Math.max(0, 1 - r.radius / 160)
    }
  }
  
  // Auto-spawn new rings
  if (simTime % 0.5 < 0.02) {
    // Find inactive ring to spawn
    const inactiveP = pWaveRings.find(r => !r.active)
    if (inactiveP && Math.random() < 0.3) {
      inactiveP.active = true
      inactiveP.radius = focusDepth * 0.3
      inactiveP.mesh.visible = true
    }
    const inactiveS = sWaveRings.find(r => !r.active)
    if (inactiveS && Math.random() < 0.2) {
      inactiveS.active = true
      inactiveS.radius = 0
      inactiveS.mesh.visible = true
    }
    const inactiveSurf = surfWaveRings.find(r => !r.active)
    if (inactiveSurf && Math.random() < 0.15) {
      inactiveSurf.active = true
      inactiveSurf.radius = 0
      inactiveSurf.mesh.visible = true
    }
  }
}

// ─── UI ──────────────────────────────────────────────────────────────────────
const barP = document.getElementById('bar-p')
const barS = document.getElementById('bar-s')
const barSurf = document.getElementById('bar-surf')
const timeEl = document.getElementById('time')

function updateUI() {
  // Find max ring radii
  const maxP = Math.max(...pWaveRings.map(r => r.radius))
  const maxS = Math.max(...sWaveRings.map(r => r.radius))
  const maxSurf = Math.max(...surfWaveRings.map(r => r.radius))
  
  barP.style.width = Math.min(100, maxP / 2) + '%'
  barS.style.width = Math.min(100, maxS / 2) + '%'
  barSurf.style.width = Math.min(100, maxSurf / 2) + '%'
  
  timeEl.textContent = simTime.toFixed(1)
  
  // Epicenter pulse
  epicenter.scale.setScalar(1 + Math.sin(simTime * 5) * 0.1)
}

// ─── Animate ─────────────────────────────────────────────────────────────────
let lastTime = 0
function animate(time) {
  requestAnimationFrame(animate)
  const dt = Math.min(0.05, (time - lastTime) / 1000)
  lastTime = time
  simTime += dt
  
  updateWaveRings()
  applyGroundDisplacement()
  updateUI()
  
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

console.log('3698 Seismic Wave Propagation — P/S/Surface waves, epicenter visualization')
