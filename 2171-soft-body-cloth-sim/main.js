// 2171. 软体布料模拟 — Enhanced Edition
// 软体布料模拟 + 物理交互 + 风力
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.025)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 8, 30)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// ─── Cloth Parameters ────────────────────────────────────────────────────────
const W = 25, H = 25
const REST = 0.45 // rest distance between particles
const GRAVITY = -0.008
const DAMPING = 0.98
const ITERATIONS = 8

const particles = []
const constraints = []

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const px = (x - W / 2) * REST
    const py = 10
    const pz = (y - H / 2) * REST
    particles.push({
      x: px, y: py, z: pz,
      ox: px, oy: py, oz: pz,
      pinned: y === 0 && (x === 0 || x === W - 1 || x === Math.floor(W / 2)),
      mass: 1.0
    })
  }
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (x < W - 1) constraints.push([i, i + 1, REST])
    if (y < H - 1) constraints.push([i, i + W, REST])
    if (x < W - 1 && y < H - 1) constraints.push([i, i + W + 1, REST * Math.SQRT2])
    if (x > 0 && y < H - 1) constraints.push([i, i + W - 1, REST * Math.SQRT2])
  }
}

// ─── Cloth Geometry ─────────────────────────────────────────────────────────
const posArr = new Float32Array(W * H * 3)
const norArr = new Float32Array(W * H * 3)
const uvArr = new Float32Array(W * H * 2)
const idxArr = []

for (let y = 0; y < H - 1; y++) {
  for (let x = 0; x < W - 1; x++) {
    const a = y * W + x, b = a + 1, c = a + W, d = c + 1
    idxArr.push(a, b, c, b, d, c)
  }
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    uvArr[i * 2] = x / (W - 1)
    uvArr[i * 2 + 1] = 1 - y / (H - 1)
  }
}

const clothGeo = new THREE.BufferGeometry()
clothGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
clothGeo.setAttribute('normal', new THREE.BufferAttribute(norArr, 3))
clothGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))
clothGeo.setIndex(idxArr)

// Cloth materials
const clothMat = new THREE.MeshPhongMaterial({
  color: 0xcc3344,
  side: THREE.DoubleSide,
  shininess: 60,
  specular: 0xffffff,
  wireframe: false
})

const clothWireMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.15
})

const clothMesh = new THREE.Mesh(clothGeo, clothMat)
clothMesh.castShadow = true
clothMesh.receiveShadow = true
scene.add(clothMesh)

const clothWire = new THREE.Mesh(clothGeo, clothWireMat)
scene.add(clothWire)

// ─── Pole / Hanging Bar ───────────────────────────────────────────────────────
const barGeo = new THREE.CylinderGeometry(0.15, 0.15, W * REST + 1, 12)
const barMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 })
const bar = new THREE.Mesh(barGeo, barMat)
bar.rotation.z = Math.PI / 2
bar.position.set(0, 10.2, -REST * 0.5)
scene.add(bar)

// Hanging hooks
for (let x = 0; x < W; x += Math.floor(W / 4)) {
  const hookGeo = new THREE.SphereGeometry(0.2, 8, 8)
  const hook = new THREE.Mesh(hookGeo, barMat)
  hook.position.set((x - W / 2) * REST, 10.15, 0)
  scene.add(hook)
}

// ─── Sphere Obstacle ─────────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(3, 32, 32)
const sphereMat = new THREE.MeshStandardMaterial({
  color: 0x334488,
  metalness: 0.6,
  roughness: 0.3,
  transparent: true,
  opacity: 0.85
})
const sphere = new THREE.Mesh(sphereGeo, sphereMat)
sphere.position.set(0, 2, 3)
sphere.castShadow = true
sphere.receiveShadow = true
scene.add(sphere)

// ─── Ground Plane ────────────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(60, 60)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -4
ground.receiveShadow = true
scene.add(ground)

// ─── Wind Particles ───────────────────────────────────────────────────────────
const windCount = 300
const windPositions = new Float32Array(windCount * 3)
for (let i = 0; i < windCount; i++) {
  windPositions[i * 3] = (Math.random() - 0.5) * 30
  windPositions[i * 3 + 1] = Math.random() * 15
  windPositions[i * 3 + 2] = (Math.random() - 0.5) * 20
}
const windGeo = new THREE.BufferGeometry()
windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3))
const windParticles = new THREE.Points(windGeo, new THREE.PointsMaterial({
  color: 0x88ccff, size: 0.1, transparent: true, opacity: 0.5, sizeAttenuation: true
}))
scene.add(windParticles)

// ─── Lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x223355, 0.8))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
dirLight.position.set(10, 20, 10)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(1024, 1024)
scene.add(dirLight)
const rimLight = new THREE.PointLight(0x4488ff, 3, 40)
rimLight.position.set(-10, 5, -10)
scene.add(rimLight)

// ─── Mouse Interaction ───────────────────────────────────────────────────────
const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
let mouseForce = { x: 0, y: 0, z: 0 }

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1
  mouse.y = -(e.clientY / innerHeight) * 2 + 1
})

window.addEventListener('mousedown', () => {
  mouseForce.z = 3
  setTimeout(() => { mouseForce.z = 0 }, 500)
})

// ─── Wind ────────────────────────────────────────────────────────────────────
let windPhase = 0
function getWind(t) {
  return {
    x: Math.sin(t * 0.7) * 0.012 + Math.cos(t * 1.3) * 0.006,
    y: Math.sin(t * 0.5) * 0.003,
    z: Math.cos(t * 0.9) * 0.015 + Math.sin(t * 1.7) * 0.008
  }
}

// ─── Cloth Simulation Update ─────────────────────────────────────────────────
function updateCloth() {
  const wind = getWind(windPhase)
  windPhase += 0.016

  // Apply forces
  for (const p of particles) {
    if (p.pinned) continue
    const vx = (p.x - p.ox) * DAMPING
    const vy = (p.y - p.oy) * DAMPING + GRAVITY
    const vz = (p.z - p.oz) * DAMPING
    p.ox = p.x; p.oy = p.y; p.oz = p.z
    p.x += vx + wind.x + mouseForce.x
    p.y += vy + wind.y + mouseForce.y
    p.z += vz + wind.z + mouseForce.z
    mouseForce.x *= 0.9; mouseForce.y *= 0.9; mouseForce.z *= 0.9

    // Sphere collision
    const dx = p.x - sphere.position.x
    const dy = p.y - sphere.position.y
    const dz = p.z - sphere.position.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const minD = 3.2
    if (dist < minD) {
      const n = { x: dx / dist, y: dy / dist, z: dz / dist }
      p.x = sphere.position.x + n.x * minD
      p.y = sphere.position.y + n.y * minD
      p.z = sphere.position.z + n.z * minD
    }
  }

  // Constraint satisfaction
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const [a, b, rest] of constraints) {
      const pa = particles[a], pb = particles[b]
      const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < 0.0001) continue
      const diff = (dist - rest) / dist * 0.5
      const cx = dx * diff, cy = dy * diff, cz = dz * diff
      if (!pa.pinned) { pa.x += cx; pa.y += cy; pa.z += cz }
      if (!pb.pinned) { pb.x -= cx; pb.y -= cy; pb.z -= cz }
    }
  }

  // Update geometry
  for (let i = 0; i < particles.length; i++) {
    posArr[i * 3] = particles[i].x
    posArr[i * 3 + 1] = particles[i].y
    posArr[i * 3 + 2] = particles[i].z
  }
  clothGeo.attributes.position.needsUpdate = true
  clothGeo.computeVertexNormals()

  // Wind particles drift
  const wp = windGeo.attributes.position
  for (let i = 0; i < windCount; i++) {
    wp.array[i * 3] += wind.x * 50 + Math.sin(windPhase + i) * 0.02
    wp.array[i * 3 + 1] += wind.y * 50
    wp.array[i * 3 + 2] += wind.z * 50
    if (wp.array[i * 3] > 15) wp.array[i * 3] = -15
    if (wp.array[i * 3] < -15) wp.array[i * 3] = 15
    if (wp.array[i * 3 + 1] > 15) wp.array[i * 3 + 1] = 0
    if (wp.array[i * 3 + 2] > 10) wp.array[i * 3 + 2] = -10
  }
  wp.needsUpdate = true
}

// ─── Animation ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let sphereRot = 0

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  updateCloth()

  // Sphere rotation
  sphere.rotation.y = t * 0.5
  sphere.rotation.x = Math.sin(t * 0.3) * 0.2

  // Rim light animation
  rimLight.intensity = 2 + Math.sin(t * 2) * 1

  // Wind particles opacity
  windParticles.material.opacity = 0.3 + Math.sin(t * 1.5) * 0.2

  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
