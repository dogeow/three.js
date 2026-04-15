import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020210)
scene.fog = new THREE.FogExp2(0x020210, 0.008)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 25, 55)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// Post-processing
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.5, 0.4, 0.2)
composer.addPass(bloomPass)

// Lighting
const ambient = new THREE.AmbientLight(0x112244, 0.5)
scene.add(ambient)

const dirLight = new THREE.DirectionalLight(0x88ccff, 1.5)
dirLight.position.set(10, 30, 20)
scene.add(dirLight)

const pointLight = new THREE.PointLight(0x44aaff, 2.0, 80)
pointLight.position.set(0, 20, 0)
scene.add(pointLight)

// Grid
const grid = new THREE.GridHelper(80, 40, 0x0a1525, 0x050f1a)
grid.position.y = -0.5
scene.add(grid)

// =========================================================
// DLA Crystal Growth Simulation
// =========================================================

const MAX_PARTICLES = 2000
const GRID_SIZE = 80
const HALF = GRID_SIZE / 2

// DLA grid: 0 = empty, 1 = attached crystal
const grid3d = new Map()

// Instanced mesh for crystal particles
const crystalGeo = new THREE.OctahedronGeometry(0.35, 0)
const crystalMat = new THREE.MeshStandardMaterial({
  color: 0x88ddff,
  emissive: 0x2266aa,
  emissiveIntensity: 0.6,
  metalness: 0.3,
  roughness: 0.2,
  transparent: true,
  opacity: 0.9,
})
const crystalMesh = new THREE.InstancedMesh(crystalGeo, crystalMat, MAX_PARTICLES)
crystalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
crystalMesh.castShadow = true
scene.add(crystalMesh)

// Particle state: {x, y, z, vx, vy, vz, attached}
const particles = []
const dummy = new THREE.Object3D()
const color = new THREE.Color()

let attachedCount = 0
let activeParticleCount = 120
let growthSpeed = 1.0

// Initialize with center seed
function seedCrystal(x, y, z) {
  const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`
  if (grid3d.has(key)) return false
  grid3d.set(key, true)
  const idx = attachedCount++
  dummy.position.set(x, y, z)
  dummy.updateMatrix()
  crystalMesh.setMatrixAt(idx, dummy.matrix)
  // Vary color based on height
  const t = (y + 15) / 30
  color.setHSL(0.55 + t * 0.1, 0.8, 0.5 + t * 0.2)
  crystalMesh.setColorAt(idx, color)
  return true
}

// Seed at center
seedCrystal(0, 0, 0)
seedCrystal(1, 0, 0)
seedCrystal(-1, 0, 0)
seedCrystal(0, 1, 0)
seedCrystal(0, 0, 1)
seedCrystal(0, 0, -1)

// Spawn wandering particles
function spawnParticle() {
  const angle = Math.random() * Math.PI * 2
  const radius = 25 + Math.random() * 15
  return {
    x: Math.cos(angle) * radius,
    y: (Math.random() - 0.5) * 30,
    z: Math.sin(angle) * radius,
    vx: 0, vy: 0, vz: 0,
    attached: false,
    life: 200 + Math.random() * 200,
  }
}

for (let i = 0; i < activeParticleCount; i++) {
  particles.push(spawnParticle())
}

crystalMesh.instanceMatrix.needsUpdate = true
if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true

// Check if position has neighbors in crystal
function hasNeighbor(x, y, z) {
  for (let dx = -1.5; dx <= 1.5; dx += 1)
    for (let dy = -1.5; dy <= 1.5; dy += 1)
      for (let dz = -1.5; dz <= 1.5; dz += 1) {
        if (dx === 0 && dy === 0 && dz === 0) continue
        if (grid3d.has(`${Math.round(x + dx)},${Math.round(y + dy)},${Math.round(z + dz)}`)) return true
      }
  return false
}

const clock = new THREE.Clock()
let spacePressed = false

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault()
    grid3d.clear()
    attachedCount = 0
    particles.length = 0
    for (let i = 0; i < activeParticleCount; i++) particles.push(spawnParticle())
    crystalMesh.instanceMatrix.needsUpdate = true
  }
})

window.addEventListener('click', () => {
  // Add seed at random position near surface
  const angle = Math.random() * Math.PI * 2
  const radius = 5 + Math.random() * 10
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  const y = (Math.random() - 0.5) * 10
  seedCrystal(x, y, z)
  crystalMesh.instanceMatrix.needsUpdate = true
  if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true
})

// GUI
const gui = { growthSpeed: 1.0, particleCount: 120, bloomStrength: 1.5 }
import('https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm').then(({ GUI }) => {
  const panel = new GUI({ title: '🌸 Dendritic Growth' })
  panel.add(gui, 'growthSpeed', 0.1, 4.0).name('Growth Speed')
  panel.add(gui, 'particleCount', 20, 300).step(1).name('Particles').onChange(v => {
    while (particles.length < v) particles.push(spawnParticle())
    while (particles.length > v) particles.pop()
    activeParticleCount = v
  })
  panel.add(gui, 'bloomStrength', 0.3, 3.0).name('Bloom Strength').onChange(v => {
    bloomPass.strength = v
  })
})

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05) * gui.growthSpeed

  // Update wandering particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    if (p.attached) continue

    // Random walk with slight downward drift (crystal grows downward too)
    p.vx += (Math.random() - 0.5) * 0.15
    p.vy += (Math.random() - 0.5) * 0.1 - 0.01 // slight gravity
    p.vz += (Math.random() - 0.5) * 0.15

    // Damping
    p.vx *= 0.92
    p.vy *= 0.92
    p.vz *= 0.92

    p.x += p.vx * dt * 10
    p.y += p.vy * dt * 10
    p.z += p.vz * dt * 10

    p.life -= dt * 10

    // Check attachment
    if (hasNeighbor(p.x, p.y, p.z)) {
      if (attachedCount < MAX_PARTICLES) {
        seedCrystal(p.x, p.y, p.z)
        crystalMesh.instanceMatrix.needsUpdate = true
        if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true
      }
      p.attached = true
      particles.splice(i, 1)
      particles.push(spawnParticle())
      continue
    }

    // Remove if out of bounds or expired
    const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
    if (dist > 38 || p.life <= 0 || Math.abs(p.y) > 20) {
      particles.splice(i, 1)
      particles.push(spawnParticle())
    }
  }

  // Animate point light
  const elapsed = clock.getElapsedTime()
  pointLight.position.x = Math.sin(elapsed * 0.5) * 10
  pointLight.position.z = Math.cos(elapsed * 0.5) * 10

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
