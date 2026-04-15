import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0d0d)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 18, 40)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.target.set(0, 5, 0)

// Lighting
scene.add(new THREE.AmbientLight(0x334455, 0.6))

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2)
dirLight.position.set(15, 30, 20)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(1024, 1024)
dirLight.shadow.camera.near = 0.5
dirLight.shadow.camera.far = 80
dirLight.shadow.camera.left = -25
dirLight.shadow.camera.right = 25
dirLight.shadow.camera.top = 25
dirLight.shadow.camera.bottom = -25
scene.add(dirLight)

// Container (transparent box)
const containerW = 20, containerH = 22, containerD = 20
const wallThick = 0.3

function makeWall(w, h, d, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x223344,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

scene.add(makeWall(containerW + wallThick * 2, wallThick, containerD + wallThick * 2, 0, 0, 0)) // bottom
scene.add(makeWall(wallThick, containerH, containerD, -(containerW / 2 + wallThick / 2), containerH / 2, 0)) // left
scene.add(makeWall(wallThick, containerH, containerD, (containerW / 2 + wallThick / 2), containerH / 2, 0)) // right
scene.add(makeWall(containerW, containerH, wallThick, 0, containerH / 2, -(containerD / 2 + wallThick / 2))) // back
scene.add(makeWall(containerW, containerH, wallThick, 0, containerH / 2, (containerD / 2 + wallThick / 2))) // front

// Grid floor line
const gridHelper = new THREE.GridHelper(containerW, 10, 0x334455, 0x1a2233)
gridHelper.position.y = 0.01
scene.add(gridHelper)

// =========================================================
// Granular Particle System
// =========================================================

const LARGE_RADIUS = 1.2
const SMALL_RADIUS = 0.5
const NUM_LARGE = 15
const NUM_SMALL = 600
const TOTAL = NUM_LARGE + NUM_SMALL

// Particle data
const particles = []

function randomInContainer() {
  return {
    x: (Math.random() - 0.5) * (containerW - 2),
    y: Math.random() * containerH + SMALL_RADIUS,
    z: (Math.random() - 0.5) * (containerD - 2),
  }
}

// Large particles (Brazil nuts) - blue
const largeGeo = new THREE.SphereGeometry(LARGE_RADIUS, 16, 12)
const largeMat = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  metalness: 0.1,
  roughness: 0.6,
  emissive: 0x112233,
})
const largeMesh = new THREE.InstancedMesh(largeGeo, largeMat, NUM_LARGE)
largeMesh.castShadow = true
largeMesh.receiveShadow = true
scene.add(largeMesh)

// Small particles - orange
const smallGeo = new THREE.SphereGeometry(SMALL_RADIUS, 10, 8)
const smallMat = new THREE.MeshStandardMaterial({
  color: 0xff8844,
  metalness: 0.1,
  roughness: 0.7,
  emissive: 0x221100,
})
const smallMesh = new THREE.InstancedMesh(smallGeo, smallMat, NUM_SMALL)
smallMesh.castShadow = true
smallMesh.receiveShadow = true
scene.add(smallMesh)

const dummy = new THREE.Object3D()
const colorObj = new THREE.Color()

function initParticles() {
  particles.length = 0

  // Place large particles first (at random positions)
  for (let i = 0; i < NUM_LARGE; i++) {
    const pos = randomInContainer()
    particles.push({
      isLarge: true,
      idx: i,
      x: pos.x, y: pos.y, z: pos.z,
      vx: 0, vy: 0, vz: 0,
      radius: LARGE_RADIUS,
    })
  }

  // Place small particles
  for (let i = 0; i < NUM_SMALL; i++) {
    const pos = randomInContainer()
    particles.push({
      isLarge: false,
      idx: i,
      x: pos.x, y: pos.y, z: pos.z,
      vx: 0, vy: 0, vz: 0,
      radius: SMALL_RADIUS,
    })
  }
}

initParticles()

function resolveCollision(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  const dist2 = dx * dx + dy * dy + dz * dz
  const minDist = a.radius + b.radius
  if (dist2 < minDist * minDist && dist2 > 0.0001) {
    const dist = Math.sqrt(dist2)
    const overlap = (minDist - dist) * 0.5
    const nx = dx / dist
    const ny = dy / dist
    const nz = dz / dist

    a.x -= nx * overlap
    a.y -= ny * overlap
    a.z -= nz * overlap
    b.x += nx * overlap
    b.y += ny * overlap
    b.z += nz * overlap

    // Velocity impulse
    const relVx = b.vx - a.vx
    const relVy = b.vy - a.vy
    const relVz = b.vz - a.vz
    const relDot = relVx * nx + relVy * ny + relVz * nz
    if (relDot < 0) {
      const restitution = 0.3
      const j = -(1 + restitution) * relDot / 2
      a.vx -= j * nx; a.vy -= j * ny; a.vz -= j * nz
      b.vx += j * nx; b.vy += j * ny; b.vz += j * nz
    }
  }
}

let shaking = false
let shakeTime = 0
let shakeIntensity = 0

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault()
    shaking = true
    shakeTime = 5.0
    shakeIntensity = 1.0
  }
  if (e.code === 'KeyR') {
    initParticles()
  }
})

// GUI
const gui = { shakeStrength: 1.0, gravity: -20, restitution: 0.3 }
import('https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm').then(({ GUI }) => {
  const panel = new GUI({ title: '🌰 Granular Segregation' })
  panel.add(gui, 'shakeStrength', 0.2, 3.0).name('Shake Strength')
  panel.add(gui, 'gravity', -40, -5).name('Gravity')
  panel.add(gui, 'restitution', 0.0, 0.8).name('Bounciness')
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.02)

  const gravity = gui.gravity
  const restitution = gui.restitution

  // Shake
  if (shaking && shakeTime > 0) {
    shakeTime -= dt
  } else {
    shaking = false
  }

  const shakeAmp = shaking ? gui.shakeStrength * 0.8 : 0

  // Apply forces
  for (const p of particles) {
    p.vy += gravity * dt

    if (shaking) {
      p.vx += (Math.random() - 0.5) * shakeAmp
      p.vy += Math.random() * shakeAmp * 0.3
      p.vz += (Math.random() - 0.5) * shakeAmp
    }

    // Damping
    p.vx *= 0.98
    p.vy *= 0.995
    p.vz *= 0.98

    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt

    // Wall collisions
    const r = p.radius
    if (p.x - r < -containerW / 2) { p.x = -containerW / 2 + r; p.vx *= -restitution }
    if (p.x + r > containerW / 2) { p.x = containerW / 2 - r; p.vx *= -restitution }
    if (p.z - r < -containerD / 2) { p.z = -containerD / 2 + r; p.vz *= -restitution }
    if (p.z + r > containerD / 2) { p.z = containerD / 2 - r; p.vz *= -restitution }
    if (p.y - r < 0) { p.y = r; p.vy *= -restitution }
    if (p.y + r > containerH) { p.y = containerH - r; p.vy *= -restitution }
  }

  // Particle-particle collisions (spatial hash for speed)
  const cellSize = LARGE_RADIUS * 2.5
  const cellMap = new Map()

  for (const p of particles) {
    const cx = Math.floor(p.x / cellSize)
    const cy = Math.floor(p.y / cellSize)
    const cz = Math.floor(p.z / cellSize)
    const key = `${cx},${cy},${cz}`
    if (!cellMap.has(key)) cellMap.set(key, [])
    cellMap.get(key).push(p)
  }

  for (const p of particles) {
    const cx = Math.floor(p.x / cellSize)
    const cy = Math.floor(p.y / cellSize)
    const cz = Math.floor(p.z / cellSize)
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`
          const cell = cellMap.get(key)
          if (!cell) continue
          for (const other of cell) {
            if (other === p) continue
            resolveCollision(p, other)
          }
        }
  }

  // Update instance matrices
  for (const p of particles) {
    dummy.position.set(p.x, p.y, p.z)
    dummy.updateMatrix()
    if (p.isLarge) {
      largeMesh.setMatrixAt(p.idx, dummy.matrix)
    } else {
      smallMesh.setMatrixAt(p.idx, dummy.matrix)
    }
  }

  largeMesh.instanceMatrix.needsUpdate = true
  smallMesh.instanceMatrix.needsUpdate = true

  // Camera shake
  if (shaking) {
    camera.position.x += (Math.random() - 0.5) * 0.3
    camera.position.z += (Math.random() - 0.5) * 0.3
  }

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
