import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000a05)
scene.fog = new THREE.FogExp2(0x000a05, 0.03)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 5, 14)
camera.lookAt(0, 2, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.2)
dirLight.position.set(10, 15, 10)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(2048, 2048)
dirLight.shadow.camera.near = 0.1
dirLight.shadow.camera.far = 50
dirLight.shadow.camera.left = -15
dirLight.shadow.camera.right = 15
dirLight.shadow.camera.top = 15
dirLight.shadow.camera.bottom = -15
scene.add(dirLight)

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x0a1f0a, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 3
controls.maxDistance = 30

// ─── L-System ─────────────────────────────────────────────────────────────────
const AXIOM = 'X'
const RULES = {
  'X': 'F+[[X]-X]-F[-FX]+X',
  'F': 'FF',
}

const SEASONS = ['春', '夏', '秋', '冬']
const SEASON_COLORS = {
  trunk:    [0x4a2d0a, 0x3d2510, 0x2d1a0a, 0x2a1a0f],
  leaf:     [0x86efac, 0x22c55e, 0xd97706, 0x7f1d1d],
  ground:   [0x0f3d0f, 0x0a1f0a, 0x1a1a0a, 0x1a0f0f],
  flower:   [0xf472b6, 0x000000, 0xf97316, 0x000000],
  sky:      [0x001a0a, 0x000a05, 0x050505, 0x05050a],
}

let params = {
  iterations: 6,
  angle: 25 * Math.PI / 180,
  lengthFactor: 0.7,
  trunkLen: 0.8,
  season: 0,
}

let treeGroup = new THREE.Group()
scene.add(treeGroup)

// Falling leaves
const leafParticles = []
const leafGeo = new THREE.BufferGeometry()
const leafPos = new Float32Array(300 * 3)
const leafCol = new Float32Array(300 * 3)
const leafLife = new Float32Array(300).fill(-1)
leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3))
leafGeo.setAttribute('color', new THREE.BufferAttribute(leafCol, 3))
const leafMat = new THREE.PointsMaterial({
  size: 0.12, vertexColors: true, transparent: true, opacity: 0.9,
  depthWrite: false, sizeAttenuation: true
})
const leafSystem = new THREE.Points(leafGeo, leafMat)
scene.add(leafSystem)

function lsystem(str, n) {
  let s = str
  for (let i = 0; i < n; i++) {
    let ns = ''
    for (const ch of s) ns += RULES[ch] || ch
    s = ns
  }
  return s
}

function buildTree() {
  // Clear
  while (treeGroup.children.length) {
    const c = treeGroup.children[0]
    treeGroup.remove(c)
    if (c.geometry) c.geometry.dispose()
    if (c.material) c.material.dispose()
  }

  const s = lsystem(AXIOM, params.iterations)
  const stack = []

  let cx = 0, cy = 0, cz = 0
  let angle = -Math.PI / 2 // start pointing up
  let heading = 0 // yaw

  const trunkColor = SEASON_COLORS.trunk[params.season]
  const leafColor = SEASON_COLORS.leaf[params.season]
  const flowerColor = SEASON_COLORS.flower[params.season]
  const season = params.season

  const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9, metalness: 0 })
  const leafMat = new THREE.MeshStandardMaterial({
    color: leafColor, roughness: 0.8, metalness: 0,
    side: THREE.DoubleSide, transparent: true, opacity: season === 3 ? 0.7 : 1.0,
  })
  const flowerMat = new THREE.MeshStandardMaterial({ color: flowerColor, roughness: 0.5 })

  let segLen = params.trunkLen
  let segIdx = 0
  const maxSegs = 20000
  const trunkPositions = new Float32Array(maxSegs * 6)
  const leafPositions = []
  const flowerPositions = []
  const trunkNormals = []

  function emitTrunk(x1, y1, z1, x2, y2, z2, r) {
    if (segIdx >= maxSegs) return
    const base = segIdx * 6
    // Two triangles forming a quad cylinder segment
    // Simple approach: store start/end + radius, build geometry later
    // Instead: use TubeGeometry segments
  }

  // Better: collect line segments, then build CylinderGeometry for each
  const segments = []

  function processChar(ch) {
    switch (ch) {
      case 'F': {
        const x2 = cx + segLen * Math.cos(angle) * Math.cos(heading)
        const y2 = cy + segLen * Math.sin(angle)
        const z2 = cz + segLen * Math.cos(angle) * Math.sin(heading)

        // Branch thickness decreases with depth
        const depth = segIdx > 0 ? Math.max(0.3, 1 - segIdx * 0.02) : 1
        const radius = 0.06 * depth

        segments.push({
          x1: cx, y1: cy, z1: cz,
          x2, y2, z2,
          r: radius,
          isLeaf: segIdx > params.iterations * 2,
          isFlower: segIdx > params.iterations * 2,
        })

        cx = x2; cy = y2; cz = z2
        segLen *= params.lengthFactor
        segIdx++
        break
      }
      case '+': angle += params.angle; break
      case '-': angle -= params.angle; break
      case '&': heading += params.angle; break
      case '^': heading -= params.angle; break
      case '[': stack.push({ x: cx, y: cy, z: cz, angle, heading, len: segLen, idx: segIdx }); break
      case ']':
        if (segIdx > params.iterations * 2) segLen = params.trunkLen * Math.pow(params.lengthFactor, Math.max(0, params.iterations - 2))
        const st = stack.pop()
        if (st) { cx = st.x; cy = st.y; cz = st.z; angle = st.angle; heading = st.heading; segLen = st.len * 1.2; segIdx = st.idx }
        break
    }
  }

  for (const ch of s) processChar(ch)

  // Build trunk segments as tubes
  segments.forEach(seg => {
    const dir = new THREE.Vector3(seg.x2 - seg.x1, seg.y2 - seg.y1, seg.z2 - seg.z1)
    const len = dir.length()
    if (len < 0.001) return
    dir.normalize()

    const geo = new THREE.CylinderGeometry(seg.r, seg.r * 0.8, len, 5, 1)
    const mat = seg.isLeaf ? (seg.isFlower ? flowerMat : leafMat) : trunkMat
    const mesh = new THREE.Mesh(geo, mat)

    // Position at midpoint
    mesh.position.set((seg.x1+seg.x2)/2, (seg.y1+seg.y2)/2, (seg.z1+seg.z2)/2)

    // Orient along direction
    const up = new THREE.Vector3(0, 1, 0)
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
    mesh.quaternion.copy(quat)

    mesh.castShadow = true
    mesh.receiveShadow = true
    treeGroup.add(mesh)
  })

  // Season effects
  if (season === 0) {
    // Spring flowers
    for (let i = 0; i < 60; i++) {
      const theta = Math.random() * Math.PI * 2
      const r = 0.5 + Math.random() * 3
      const h = 1 + Math.random() * 5
      const fGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 6, 6)
      const fMesh = new THREE.Mesh(fGeo, flowerMat)
      fMesh.position.set(Math.cos(theta)*r, h, Math.sin(theta)*r)
      treeGroup.add(fMesh)
    }
  }

  if (season === 3) {
    // Dead / bare tree - add some dead branches
  }

  updateGroundColor()
  updateSkyColor()
}

function updateGroundColor() {
  const gc = SEASON_COLORS.ground[params.season]
  ground.material.color.setHex(gc)
}

function updateSkyColor() {
  const sc = SEASON_COLORS.sky[params.season]
  scene.background.setHex(sc)
  scene.fog.color.setHex(sc)
}

buildTree()

// ─── Falling Leaves ─────────────────────────────────────────────────────────────
function spawnLeaf() {
  for (let i = 0; i < leafLife.length; i++) {
    if (leafLife[i] < 0) {
      leafPos[i*3]   = (Math.random()-0.5) * 6
      leafPos[i*3+1] = 4 + Math.random() * 3
      leafPos[i*3+2] = (Math.random()-0.5) * 6
      const lc = SEASON_COLORS.leaf[params.season]
      leafCol[i*3]   = ((lc >> 16) & 0xff) / 255
      leafCol[i*3+1] = ((lc >> 8) & 0xff) / 255
      leafCol[i*3+2] = (lc & 0xff) / 255
      leafLife[i] = 2 + Math.random() * 2
      return
    }
  }
}

// ─── UI Controls ──────────────────────────────────────────────────────────────
let autoSeason = false
let seasonTimer = 0

document.getElementById('iterSlider').addEventListener('input', e => {
  params.iterations = parseInt(e.target.value)
  document.getElementById('iterVal').textContent = params.iterations
  buildTree()
})
document.getElementById('angleSlider').addEventListener('input', e => {
  params.angle = parseFloat(e.target.value) * Math.PI / 180
  document.getElementById('angleVal').textContent = e.target.value + '°'
  buildTree()
})
document.getElementById('lenSlider').addEventListener('input', e => {
  params.lengthFactor = parseFloat(e.target.value)
  document.getElementById('lenVal').textContent = parseFloat(e.target.value).toFixed(2)
  buildTree()
})
document.getElementById('seasonSlider').addEventListener('input', e => {
  params.season = parseInt(e.target.value)
  document.getElementById('seasonVal').textContent = SEASONS[params.season]
  buildTree()
})
document.getElementById('autoSeasonBtn').addEventListener('click', () => {
  autoSeason = !autoSeason
  document.getElementById('autoSeasonBtn').textContent = autoSeason ? '⏸ 暂停四季' : '🔄 自动四季'
})
document.getElementById('rebuildBtn').addEventListener('click', () => buildTree())

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let windPhase = 0

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const elapsed = clock.elapsedTime
  windPhase = elapsed

  // Auto season
  if (autoSeason) {
    seasonTimer += delta
    if (seasonTimer > 4) {
      seasonTimer = 0
      params.season = (params.season + 1) % 4
      document.getElementById('seasonSlider').value = params.season
      document.getElementById('seasonVal').textContent = SEASONS[params.season]
      buildTree()
    }
  }

  // Wind sway on branches
  treeGroup.children.forEach((child, i) => {
    if (child.position.y > 0.1) {
      const sway = Math.sin(windPhase * 1.5 + child.position.x * 0.5 + child.position.z * 0.3) * 0.03
      child.rotation.z = sway
    }
  })

  // Falling leaves in autumn
  if (params.season === 2 && Math.random() < 0.05) spawnLeaf()
  if (params.season === 0 && Math.random() < 0.02) spawnLeaf()

  // Update leaf particles
  for (let i = 0; i < leafLife.length; i++) {
    if (leafLife[i] < 0) {
      leafPos[i*3] = 0; leafPos[i*3+1] = -100; leafPos[i*3+2] = 0
      continue
    }
    leafLife[i] -= delta
    leafPos[i*3]   += Math.sin(windPhase * 2 + i) * 0.01
    leafPos[i*3+1] -= delta * 0.5
    leafPos[i*3+2] += Math.cos(windPhase * 1.5 + i * 0.3) * 0.01
  }
  leafGeo.attributes.position.needsUpdate = true

  // Light color shift
  const t = elapsed * 0.3
  dirLight.color.setHSL(0.1 + Math.sin(t) * 0.02, 0.6, 0.7)

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
window.treeGroup = treeGroup

animate()