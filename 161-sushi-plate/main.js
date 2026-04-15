import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a0a00)
scene.fog = new THREE.FogExp2(0x1a0a00, 0.04)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 18, 10)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 8
controls.maxDistance = 30
controls.maxPolarAngle = Math.PI / 2.5

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.2)
dirLight.position.set(10, 15, 10)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(2048, 2048)
scene.add(dirLight)

// Warm overhead lamps
;[-5, 0, 5].forEach(x => {
  const lamp = new THREE.PointLight(0xfde68a, 0.8, 15)
  lamp.position.set(x, 6, 0)
  scene.add(lamp)
})

// ─── Conveyor Belt ───────────────────────────────────────────────────────────────
const BELT_R = 8
const beltGroup = new THREE.Group()
scene.add(beltGroup)

// Belt track
const trackGeo = new THREE.TorusGeometry(BELT_R, 0.15, 8, 64)
const trackMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.5 })
const track = new THREE.Mesh(trackGeo, trackMat)
track.rotation.x = Math.PI / 2
beltGroup.add(track)

// Belt surface (thin disk)
const beltGeo = new THREE.TorusGeometry(BELT_R, 0.05, 4, 64)
const beltMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 })
const belt = new THREE.Mesh(beltGeo, beltMat)
belt.rotation.x = Math.PI / 2
belt.position.y = 0.05
beltGroup.add(belt)

// Belt legs
;[-BELT_R, 0, BELT_R].forEach(x => {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 })
  )
  leg.position.set(x, -1, 0)
  beltGroup.add(leg)
})

// Counter / bar
const counter = new THREE.Mesh(
  new THREE.BoxGeometry(20, 0.4, 2),
  new THREE.MeshStandardMaterial({ color: 0x3d2510, roughness: 0.3, metalness: 0.2 })
)
counter.position.set(0, 1, -BELT_R - 1)
counter.castShadow = true
counter.receiveShadow = true
scene.add(counter)

// Counter top
const counterTop = new THREE.Mesh(
  new THREE.BoxGeometry(20, 0.05, 2.1),
  new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.2, metalness: 0.3 })
)
counterTop.position.set(0, 1.22, -BELT_R - 1)
scene.add(counterTop)

// Back wall
const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 8),
  new THREE.MeshStandardMaterial({ color: 0x1a0800 })
)
wall.position.set(0, 3, -BELT_R - 2.1)
scene.add(wall)

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x0d0800, roughness: 1 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -2
floor.receiveShadow = true
scene.add(floor)

// ─── Sushi Types ────────────────────────────────────────────────────────────────
const SUSHI_TYPES = [
  { name: '三文鱼寿司', price: 12, color: 0xff6347, topColor: 0xff6347, baseColor: 0xf5f5dc },
  { name: '金枪鱼寿司', price: 15, color: 0x4169e1, topColor: 0x4169e1, baseColor: 0xf5f5dc },
  { name: '鳗鱼寿司', price: 18, color: 0x8b4513, topColor: 0x8b4513, baseColor: 0xf5f5dc },
  { name: '虾寿司', price: 10, color: 0xffa07a, topColor: 0xffa07a, baseColor: 0xf5f5dc },
  { name: '玉子寿司', price: 8, color: 0xffd700, topColor: 0xffd700, baseColor: 0xf5f5dc },
  { name: '三文鱼子', price: 20, color: 0xff4500, topColor: 0xff4500, baseColor: 0xf5f5dc },
  { name: '黄瓜卷', price: 6, color: 0x228b22, topColor: 0x228b22, baseColor: 0xffffff },
  { name: '蟹棒寿司', price: 14, color: 0xff69b4, topColor: 0xff69b4, baseColor: 0xf5f5dc },
]

// ─── Plate System ────────────────────────────────────────────────────────────────
const plates = []
const PLATE_RADIUS = 0.55

function createPlate(sushiType, angle) {
  const group = new THREE.Group()

  // Plate
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(PLATE_RADIUS, PLATE_RADIUS * 0.85, 0.08, 32),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3, metalness: 0.1 })
  )
  plate.castShadow = true
  group.add(plate)

  // Sushi on plate
  const sushi = sushiType
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 12),
    new THREE.MeshStandardMaterial({ color: sushi.topColor, roughness: 0.4 })
  )
  top.scale.set(1.2, 0.6, 1)
  top.position.y = 0.12
  top.castShadow = true
  group.add(top)

  // Rice underneath
  const rice = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: sushi.baseColor, roughness: 0.9 })
  )
  rice.position.y = 0.02
  group.add(rice)

  // Nori band
  const nori = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.02, 4, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a1a0a })
  )
  nori.rotation.x = Math.PI / 2
  nori.position.y = 0.18
  group.add(nori)

  // Set angle on belt
  group.rotation.y = angle
  group.position.set(
    Math.sin(angle) * BELT_R,
    1.2,
    Math.cos(angle) * BELT_R
  )

  beltGroup.add(group)

  const plateData = {
    group,
    type: sushi,
    angle,
    speed: 0.15 + Math.random() * 0.1,
  }
  plates.push(plateData)
  return plateData
}

// Initial plates
for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2
  const type = SUSHI_TYPES[Math.floor(Math.random() * SUSHI_TYPES.length)]
  createPlate(type, angle)
}

// ─── Ordering ───────────────────────────────────────────────────────────────────
let itemCount = 0
let totalBill = 0

function orderPlate(plate) {
  itemCount++
  totalBill += plate.type.price
  document.getElementById('itemCount').textContent = itemCount
  document.getElementById('totalBill').textContent = totalBill

  // Flash effect
  const mesh = plate.group.children[0]
  const origColor = mesh.material.color.getHex()
  mesh.material.emissive.setHex(0xffd700)
  mesh.material.emissiveIntensity = 0.5
  setTimeout(() => {
    mesh.material.emissiveIntensity = 0
  }, 300)

  // Remove from plates array and scene
  const idx = plates.indexOf(plate)
  if (idx !== -1) plates.splice(idx, 1)
  beltGroup.remove(plate.group)

  // Spawn new plate after delay
  setTimeout(() => {
    const angle = Math.random() * Math.PI * 2
    const type = SUSHI_TYPES[Math.floor(Math.random() * SUSHI_TYPES.length)]
    createPlate(type, angle)
  }, 2000 + Math.random() * 3000)
}

// ─── Raycasting ────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster()
renderer.domElement.addEventListener('click', e => {
  const ndc = new THREE.Vector2(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1
  )
  raycaster.setFromCamera(ndc, camera)
  const meshes = plates.map(p => p.group.children[0])
  const hits = raycaster.intersectObjects(meshes)
  if (hits.length > 0) {
    const hitMesh = hits[0].object
    const plate = plates.find(p => p.group.children[0] === hitMesh)
    if (plate) orderPlate(plate)
  }
})

// ─── UI Controls ──────────────────────────────────────────────────────────────
document.getElementById('addPlateBtn').addEventListener('click', () => {
  const angle = Math.random() * Math.PI * 2
  const type = SUSHI_TYPES[Math.floor(Math.random() * SUSHI_TYPES.length)]
  createPlate(type, angle)
})

document.getElementById('resetBillBtn').addEventListener('click', () => {
  itemCount = 0
  totalBill = 0
  document.getElementById('itemCount').textContent = '0'
  document.getElementById('totalBill').textContent = '0'
})

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') {
    itemCount = 0
    totalBill = 0
    document.getElementById('itemCount').textContent = '0'
    document.getElementById('totalBill').textContent = '0'
  }
})

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const elapsed = clock.elapsedTime

  // Rotate belt
  plates.forEach(p => {
    p.angle += p.speed * delta
    if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2
    p.group.rotation.y = p.angle
    p.group.position.x = Math.sin(p.angle) * BELT_R
    p.group.position.z = Math.cos(p.angle) * BELT_R

    // Gentle bob
    p.group.position.y = 1.2 + Math.sin(elapsed * 2 + p.angle) * 0.02
  })

  // Counter bill display glow
  document.getElementById('totalBill').parentElement.style.color =
    totalBill > 100 ? '#ef4444' : totalBill > 50 ? '#eab308' : '#fbbf24'

  // Plate count
  document.getElementById('plateCount').textContent = plates.length

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.renderer = renderer
window.controls = controls
window.plates = plates

animate()