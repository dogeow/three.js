import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x030510)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 10, 40)
camera.lookAt(0, 15, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 15, 0)

// Ambient light
scene.add(new THREE.AmbientLight(0xffffff, 0.1))

// Ground plane (dark reflective)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshStandardMaterial({ color: 0x080a12, roughness: 0.3, metalness: 0.8 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -2
scene.add(ground)

// Starfield
const starCount = 3000
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount * 3; i++) {
  starPos[i] = (Math.random() - 0.5) * 600
}
const starGeo = new THREE.BufferGeometry()
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.6 })))

// ─── Firework System ──────────────────────────────────────────────────────────
const PARTICLE_COUNT = 4000
const particles = []
let particleIndex = 0

const posArr = new Float32Array(PARTICLE_COUNT * 3)
const colArr = new Float32Array(PARTICLE_COUNT * 3)
const sizeArr = new Float32Array(PARTICLE_COUNT)
const lifeArr = new Float32Array(PARTICLE_COUNT).fill(-1) // -1 = inactive

const pGeo = new THREE.BufferGeometry()
pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
pGeo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3))
pGeo.setAttribute('size',     new THREE.BufferAttribute(sizeArr, 1))

const pMat = new THREE.PointsMaterial({
  size: 0.25,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
})

const pSystem = new THREE.Points(pGeo, pMat)
scene.add(pSystem)

const GRAVITY = -9.8
let totalLaunches = 0

// Trail buffer
const trailPosArr = new Float32Array(PARTICLE_COUNT * 3)
const trailColArr = new Float32Array(PARTICLE_COUNT * 3)
const trailSizeArr = new Float32Array(PARTICLE_COUNT)
const trailLifeArr = new Float32Array(PARTICLE_COUNT).fill(-1)

const trailGeo = new THREE.BufferGeometry()
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPosArr, 3))
trailGeo.setAttribute('color',    new THREE.BufferAttribute(trailColArr, 3))
trailGeo.setAttribute('size',     new THREE.BufferAttribute(trailSizeArr, 1))

const trailMat = new THREE.PointsMaterial({
  size: 0.12,
  vertexColors: true,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
})

const trailSystem = new THREE.Points(trailGeo, trailMat)
scene.add(trailSystem)

let trailIndex = 0

function spawnParticle(x, y, z, vx, vy, vz, r, g, b, size, life) {
  const i = particleIndex % PARTICLE_COUNT
  posArr[i*3]   = x; posArr[i*3+1] = y; posArr[i*3+2] = z
  colArr[i*3]   = r; colArr[i*3+1] = g; colArr[i*3+2] = b
  sizeArr[i]    = size
  lifeArr[i]   = life
  particleIndex++
}

function spawnTrail(x, y, z, r, g, b) {
  const i = trailIndex % PARTICLE_COUNT
  trailPosArr[i*3]   = x; trailPosArr[i*3+1] = y; trailPosArr[i*3+2] = z
  trailColArr[i*3]   = r; trailColArr[i*3+1] = g; trailColArr[i*3+2] = b
  trailSizeArr[i]    = 0.12
  trailLifeArr[i]    = 0.3
  trailIndex++
}

const PALETTES = [
  [1, 0.2, 0.1],   // red
  [1, 0.7, 0.1],   // orange
  [1, 1.0, 0.3],   // yellow
  [0.2, 1.0, 0.3], // green
  [0.2, 0.8, 1.0], // cyan
  [0.3, 0.4, 1.0], // blue
  [0.8, 0.3, 1.0], // purple
  [1.0, 0.3, 0.8], // pink
]

function launchFirework(x, y, z, size = 1) {
  totalLaunches++
  const [r, g, b] = PALETTES[Math.floor(Math.random() * PALETTES.length)]
  const [r2, g2, b2] = PALETTES[Math.floor(Math.random() * PALETTES.length)]

  // Rocket trail
  const speed = (3 + Math.random() * 3) * size
  let vy = speed
  const vx = (Math.random() - 0.5) * 1.5
  const vz = (Math.random() - 0.5) * 1.5
  let px = x, py = y, pz = z

  for (let t = 0; t < 40; t++) {
    const dt = 0.025
    py += vy * dt
    vy += GRAVITY * 0.5 * dt
    px += vx * dt
    pz += vz * dt
    spawnTrail(px, py, pz, r, g, b)
    if (py < 1) break
  }

  // Explosion at apex
  const ex = px, ey = py, ez = pz
  const count = Math.floor((120 + Math.random() * 80) * size)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)
    const spd   = (2 + Math.random() * 3.5) * size
    const vx    = Math.sin(phi) * Math.cos(theta) * spd
    const vy    = Math.sin(phi) * Math.sin(theta) * spd
    const vz    = Math.cos(phi) * spd
    const t     = 1.0 + Math.random() * 1.0
    const blend = Math.random()
    const cr = r * blend + r2 * (1 - blend)
    const cg = g * blend + g2 * (1 - blend)
    const cb = b * blend + b2 * (1 - blend)
    spawnParticle(ex, ey, ez, vx, vy, vz, cr, cg, cb, 0.2 + Math.random() * 0.15, t)
  }

  document.getElementById('fCount').textContent = totalLaunches
  document.getElementById('fCounter').textContent = totalLaunches
}

function autoLaunch() {
  const x = (Math.random() - 0.5) * 30
  const z = (Math.random() - 0.5) * 30
  const y = 3
  const size = Math.random() > 0.8 ? 1.5 : 1.0
  launchFirework(x, y, z, size)
}

let autoTimer = 0
const AUTO_INTERVAL = 4.0 // seconds between auto launches

// ─── Launch from click ────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster()
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

renderer.domElement.addEventListener('click', e => {
  const ndcX = (e.clientX / innerWidth)  * 2 - 1
  const ndcY = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
  const pt = new THREE.Vector3()
  raycaster.ray.intersectPlane(groundPlane, pt)
  if (pt) {
    launchFirework(pt.x, 3, pt.z, 1.0)
  }
})

window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    launchFirework((Math.random()-0.5)*25, 3, (Math.random()-0.5)*25, 1.6)
  }
  if (e.code === 'KeyR') {
    totalLaunches = 0
    document.getElementById('fCount').textContent = '0'
    document.getElementById('fCounter').textContent = '0'
  }
})

// ─── Clock & Update ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.elapsedTime

  // Auto launch
  autoTimer += delta
  if (autoTimer >= AUTO_INTERVAL) {
    autoTimer = 0
    autoLaunch()
    // Occasionally double launch
    if (Math.random() > 0.6) autoLaunch()
  }

  // Update particles
  let activeCount = 0
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (lifeArr[i] < 0) {
      sizeArr[i] = 0
      continue
    }
    lifeArr[i] -= delta
    if (lifeArr[i] < 0) {
      sizeArr[i] = 0
      continue
    }

    // Extract velocity from position change
    const px = posArr[i*3], py = posArr[i*3+1], pz = posArr[i*3+2]
    const fade = lifeArr[i]
    colArr[i*3]   *= 0.97
    colArr[i*3+1] *= 0.97
    colArr[i*3+2] *= 0.97
    sizeArr[i] = Math.max(0, fade * 0.2)

    // Gravity
    posArr[i*3+1] += (-9.8 * delta * delta * 10)
    activeCount++
  }

  // Update trails
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    if (trailLifeArr[i] < 0) {
      trailSizeArr[i] = 0; continue
    }
    trailLifeArr[i] -= delta
    if (trailLifeArr[i] < 0) {
      trailSizeArr[i] = 0; continue
    }
    trailColArr[i*3]   *= 0.92
    trailColArr[i*3+1] *= 0.92
    trailColArr[i*3+2] *= 0.92
    trailSizeArr[i] = trailLifeArr[i] * 0.3
  }

  pGeo.attributes.position.needsUpdate = true
  pGeo.attributes.color.needsUpdate = true
  pGeo.attributes.size.needsUpdate = true
  trailGeo.attributes.position.needsUpdate = true
  trailGeo.attributes.color.needsUpdate = true
  trailGeo.attributes.size.needsUpdate = true

  document.getElementById('pCount').textContent = activeCount

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
animate()