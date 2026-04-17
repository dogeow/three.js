import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1117)
scene.fog = new THREE.FogExp2(0x0d1117, 0.008)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 25, 80)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 8, 0)

// Lighting
scene.add(new THREE.AmbientLight(0x1a2233, 0.8))
const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8)
dirLight.position.set(30, 50, 20)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(2048, 2048)
dirLight.shadow.camera.left = -60
dirLight.shadow.camera.right = 60
dirLight.shadow.camera.top = 40
dirLight.shadow.camera.bottom = -20
scene.add(dirLight)

// Bridge parameters
const BRIDGE_LENGTH = 70
const TOWER_HEIGHT = 22
const DECK_HEIGHT = 10
const NUM_CABLE = 50

// Towers
function makeTower(x) {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, metalness: 0.5, roughness: 0.4 })
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, TOWER_HEIGHT, 1.2), mat)
  pillar.position.y = TOWER_HEIGHT / 2
  pillar.castShadow = true
  g.add(pillar)
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 1.5), mat)
  cap.position.y = TOWER_HEIGHT
  cap.castShadow = true
  g.add(cap)
  g.position.set(x, 0, 0)
  return g
}
scene.add(makeTower(-BRIDGE_LENGTH / 2))
scene.add(makeTower(BRIDGE_LENGTH / 2))

// Anchor points
const ANCHOR_LEFT = { x: -BRIDGE_LENGTH / 2, y: TOWER_HEIGHT - 2, z: 0 }
const ANCHOR_RIGHT = { x: BRIDGE_LENGTH / 2, y: TOWER_HEIGHT - 2, z: 0 }

// Deck
const deckGeo = new THREE.BoxGeometry(BRIDGE_LENGTH, 0.6, 5)
const deckMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.3, roughness: 0.6 })
const deck = new THREE.Mesh(deckGeo, deckMat)
deck.position.y = DECK_HEIGHT
deck.castShadow = true
deck.receiveShadow = true
scene.add(deck)

// Railing
const railMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.6 })
const railGeo = new THREE.BoxGeometry(BRIDGE_LENGTH, 0.08, 0.08)
for (const z of [2.4, -2.4]) {
  const rail = new THREE.Mesh(railGeo, railMat)
  rail.position.set(0, DECK_HEIGHT + 0.9, z)
  scene.add(rail)
}

// Ground / canyon
const groundGeo = new THREE.PlaneGeometry(300, 80, 40, 15)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1f1a, roughness: 0.9 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -10
ground.receiveShadow = true
scene.add(ground)

// Water
const waterGeo = new THREE.PlaneGeometry(300, 80, 20, 10)
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x112233, metalness: 0.4, roughness: 0.1,
  transparent: true, opacity: 0.85
})
const water = new THREE.Mesh(waterGeo, waterMat)
water.rotation.x = -Math.PI / 2
water.position.y = -9.5
scene.add(water)

// =========================================================
// Cable Physics (Verlet + distance constraints)
// =========================================================

function catenaryY(x) {
  const a = 14
  const offset = BRIDGE_LENGTH / 2 / a
  return a * Math.cosh((x + BRIDGE_LENGTH / 2) / a - offset) - a + DECK_HEIGHT
}

// Initialize cable positions
const cable = []
const oldCable = []
const SEG_LEN = BRIDGE_LENGTH / NUM_CABLE

for (let i = 0; i <= NUM_CABLE; i++) {
  const x = (i / NUM_CABLE - 0.5) * BRIDGE_LENGTH
  const y = catenaryY(x)
  cable.push({ x, y, z: 0, pinned: i === 0 || i === NUM_CABLE })
  oldCable.push({ x, y, z: 0 })
}

// Cable mesh (dynamic tube)
let cableMesh = null
function rebuildCableMesh() {
  if (cableMesh) scene.remove(cableMesh)
  const curve = new THREE.CatmullRomCurve3(cable.map(p => new THREE.Vector3(p.x, p.y, p.z)))
  const geo = new THREE.TubeGeometry(curve, 60, 0.18, 8, false)
  const mat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.5, roughness: 0.4 })
  cableMesh = new THREE.Mesh(geo, mat)
  cableMesh.castShadow = true
  scene.add(cableMesh)
}
rebuildCableMesh()

// Suspender lines
const suspenderGroup = new THREE.Group()
scene.add(suspenderGroup)
const SUSPENDER_N = 35

function rebuildSuspenders() {
  while (suspenderGroup.children.length > 0) {
    suspenderGroup.remove(suspenderGroup.children[0])
  }
  const mat = new THREE.LineBasicMaterial({ color: 0x334455 })
  for (let i = 0; i < SUSPENDER_N; i++) {
    const t = (i + 0.5) / SUSPENDER_N
    const sx = (t - 0.5) * BRIDGE_LENGTH
    const sy = catenaryY(sx)
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(sx, sy, 0),
      new THREE.Vector3(sx, DECK_HEIGHT, 0),
    ])
    suspenderGroup.add(new THREE.Line(geo, mat))
  }
}
rebuildSuspenders()

// Walkers
const walkers = []
const walkerGeo = new THREE.SphereGeometry(0.45, 10, 8)
const walkerMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x332200, metalness: 0.1 })

function addWalker() {
  const mat = walkerMat.clone()
  const mesh = new THREE.Mesh(walkerGeo, mat)
  mesh.castShadow = true
  const dir = Math.random() > 0.5 ? 1 : -1
  mesh.position.set(-dir * (BRIDGE_LENGTH / 2 - 3), DECK_HEIGHT + 1.2, 0)
  scene.add(mesh)
  walkers.push({ mesh, dir, bobPhase: Math.random() * Math.PI * 2 })
}

addWalker(); addWalker(); addWalker()

// Physics
let windX = 0
let windTime = 0

function triggerWind(strength = 2.5) {
  windTime = 5.0
  windX = strength
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); triggerWind(3.0) }
  if (e.code === 'KeyW') addWalker()
})

function updatePhysics(dt) {
  const GRAVITY = -8.0
  const DAMPING = 0.985

  // Wind decay
  if (windTime > 0) {
    windTime -= dt
    windX *= 0.97
  }

  // Verlet integration
  for (let i = 1; i < NUM_CABLE; i++) {
    const p = cable[i]
    if (p.pinned) continue
    const vx = (p.x - oldCable[i].x) * DAMPING
    const vy = (p.y - oldCable[i].y) * DAMPING
    const vz = (p.z - oldCable[i].z) * DAMPING
    oldCable[i].x = p.x; oldCable[i].y = p.y; oldCable[i].z = p.z
    // Wind varies along cable
    const windF = windX * Math.sin(p.x * 0.3 + clock.getElapsedTime() * 2.0) * 0.012
    p.x += vx + windF * dt
    p.y += vy + GRAVITY * dt * dt
    p.z += vz
    // Deck support: cable can't go below deck
    if (p.y < DECK_HEIGHT) {
      p.y = DECK_HEIGHT
      oldCable[i].y = DECK_HEIGHT + 0.05
    }
  }

  // Distance constraints
  for (let iter = 0; iter < 8; iter++) {
    for (let i = 0; i < NUM_CABLE; i++) {
      const a = cable[i], b = cable[i + 1]
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001
      const diff = (dist - SEG_LEN) / dist * 0.5
      if (!a.pinned) { a.x += dx * diff; a.y += dy * diff; a.z += dz * diff }
      if (!b.pinned) { b.x -= dx * diff; b.y -= dy * diff; b.z -= dz * diff }
    }
    // Re-anchor endpoints
    cable[0].x = ANCHOR_LEFT.x; cable[0].y = ANCHOR_LEFT.y
    cable[NUM_CABLE].x = ANCHOR_RIGHT.x; cable[NUM_CABLE].y = ANCHOR_RIGHT.y
  }

  // Walkers
  for (const w of walkers) {
    w.mesh.position.x += w.dir * 2.0 * dt
    if (w.mesh.position.x > BRIDGE_LENGTH / 2 - 2) { w.dir = -1; w.mesh.material.color.setHex(0x44aaff) }
    if (w.mesh.position.x < -BRIDGE_LENGTH / 2 + 2) { w.dir = 1; w.mesh.material.color.setHex(0xffaa44) }
    const t = (w.mesh.position.x + BRIDGE_LENGTH / 2) / BRIDGE_LENGTH
    const idx = Math.max(1, Math.min(NUM_CABLE - 1, Math.round(t * NUM_CABLE)))
    const sag = cable[idx].y - DECK_HEIGHT
    w.mesh.position.y = DECK_HEIGHT + 1.2 + sag * 0.4 + Math.sin(clock.getElapsedTime() * 8 + w.bobPhase) * 0.05
    w.mesh.position.z = Math.sin(clock.getElapsedTime() * 2 + w.bobPhase) * 0.05
  }

  rebuildCableMesh()
  rebuildSuspenders()
}

// GUI
const gui = { windStrength: 2.5 }
import('https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm').then(({ GUI }) => {
  const panel = new GUI({ title: '🌉 Suspension Bridge' })
  panel.add(gui, 'windStrength', 0, 5).name('Wind Strength').onChange(v => {
    if (v > 0.5) triggerWind(v)
  })
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.025)
  updatePhysics(dt)
  controls.update()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
