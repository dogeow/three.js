import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x060a12)
scene.fog = new THREE.FogExp2(0x060a12, 0.018)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300)
camera.position.set(22, 14, 22)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.5)
sun.position.set(15, 25, 10)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 120
sun.shadow.camera.left = sun.shadow.camera.bottom = -50
sun.shadow.camera.right = sun.shadow.camera.top = 50
scene.add(sun)

// ─── Ground ───────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x1a2e1a, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(200, 100, 0x1e3a1e, 0x0f1f0f)
grid.position.y = 0.01
scene.add(grid)

// Grass patches
const grassMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 1 })
for (let i = 0; i < 300; i++) {
  const angle = Math.random() * Math.PI * 2
  const r = 2 + Math.random() * 40
  const g = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.15 + Math.random() * 0.2, 4),
    grassMat
  )
  g.position.set(Math.cos(angle) * r, 0.07, Math.sin(angle) * r)
  g.rotation.y = Math.random() * Math.PI
  scene.add(g)
}

// ─── L-System Core ─────────────────────────────────────────────────────────────
const RULES = {
  X: 'F+[[X]-X]-F[-FX]+X',
  F: 'FF',
}

function lsystem(axiom, rules, iterations) {
  let s = axiom
  for (let i = 0; i < iterations; i++) {
    let next = ''
    for (const ch of s) {
      next += rules[ch] !== undefined ? rules[ch] : ch
    }
    s = next
    if (s.length > 500000) break // safety
  }
  return s
}

// ─── Turtle Renderer ────────────────────────────────────────────────────────────
function buildTree(axiom, rules, iter, angleDeg, lenScale, origin) {
  const angle = angleDeg * Math.PI / 180
  const stack = []
  let pos = origin.clone()
  let dir = new THREE.Vector3(0, 1, 0)
  let right = new THREE.Vector3(1, 0, 0)
  let up = new THREE.Vector3(0, 0, -1)
  let segLen = 0.35

  const branchSegs = [] // { start, end, radius }
  const leafPositions = []

  const rng = (() => {
    let seed = Math.random() * 99999
    return () => {
      seed = (seed * 16807 + 0) % 2147483647
      return (seed - 1) / 2147483646
    }
  })()

  for (const ch of axiom) {
    switch (ch) {
      case 'F': {
        const end = pos.clone().addScaledVector(dir, segLen)
        const radius = 0.02 + 0.04 * Math.max(0, (dir.y - 0.3) / 0.7)
        branchSegs.push({ start: pos.clone(), end: end.clone(), radius })
        pos = end
        segLen *= lenScale
        break
      }
      case '+': {
        const rotAxis = right.clone()
        dir.applyAxisAngle(rotAxis, angle * (0.85 + rng() * 0.3))
        up.applyAxisAngle(rotAxis, angle * (0.85 + rng() * 0.3))
        right.crossVectors(up, dir).normalize()
        up.crossVectors(dir, right).normalize()
        break
      }
      case '-': {
        const rotAxis = right.clone()
        dir.applyAxisAngle(rotAxis, -angle * (0.85 + rng() * 0.3))
        up.applyAxisAngle(rotAxis, -angle * (0.85 + rng() * 0.3))
        right.crossVectors(up, dir).normalize()
        up.crossVectors(dir, right).normalize()
        break
      }
      case '&': {
        const rotAxis = dir.clone().cross(up).normalize()
        dir.applyAxisAngle(rotAxis, angle)
        up.applyAxisAngle(rotAxis, angle)
        right.crossVectors(up, dir).normalize()
        up.crossVectors(dir, right).normalize()
        break
      }
      case '^': {
        const rotAxis = right.clone()
        dir.applyAxisAngle(rotAxis, angle)
        up.applyAxisAngle(rotAxis, angle)
        right.crossVectors(up, dir).normalize()
        up.crossVectors(dir, right).normalize()
        break
      }
      case '[': { stack.push({ pos: pos.clone(), dir: dir.clone(), right: right.clone(), up: up.clone(), segLen }); break }
      case ']': {
        const s = stack.pop()
        if (s) { pos = s.pos; dir = s.dir; right = s.right; up = s.up; segLen = s.segLen / lenScale }
        break
      }
      case 'X':
      case 'L': leafPositions.push(pos.clone()); break
    }
  }

  return { branchSegs, leafPositions }
}

function segmentsToMesh(branchSegs, leafPositions, season) {
  const group = new THREE.Group()

  // Trunk color based on season
  const trunkColors = { spring: 0x5c3d1e, summer: 0x4a3016, autumn: 0x7a3a10, winter: 0x3d2b1f }
  const leafColors  = {
    spring: 0x4ade80,
    summer: 0x22c55e,
    autumn: 0xf97316,
    winter: 0xe2e8f0,
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColors[season], roughness: 0.9 })
  const leafMat  = new THREE.MeshStandardMaterial({
    color: leafColors[season],
    roughness: 0.7,
    transparent: season === 'winter',
    opacity: season === 'winter' ? 0.3 : 1,
  })

  // Build branches
  const geo = new THREE.CylinderGeometry(1, 1, 1, 5)
  branchSegs.forEach(seg => {
    const length = seg.start.distanceTo(seg.end)
    if (length < 0.001) return
    const mesh = new THREE.Mesh(geo, trunkMat)
    mesh.scale.set(seg.radius, length, seg.radius)
    mesh.position.copy(seg.start).add(seg.end).multiplyScalar(0.5)

    const dir = seg.end.clone().sub(seg.start).normalize()
    const up  = new THREE.Vector3(0, 1, 0)
    const axis = new THREE.Vector3().crossVectors(up, dir).normalize()
    const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(dir))))
    if (axis.length() > 0.001) {
      mesh.setRotationFromAxisAngle(axis, angle)
    } else if (dir.y < 0) {
      mesh.rotation.x = Math.PI
    }
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  })

  // Build leaves
  const leafGeo = new THREE.SphereGeometry(0.08, 5, 4)
  leafPositions.forEach((lp, i) => {
    if (i % (season === 'winter' ? 3 : 1) !== 0) return
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    const s = 0.6 + Math.random() * 0.8
    leaf.scale.setScalar(s)
    leaf.position.copy(lp)
    leaf.castShadow = true
    group.add(leaf)
  })

  return group
}

// ─── Season Colors ─────────────────────────────────────────────────────────────
const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter']
const SEASON_LABELS = ['春', '夏', '秋', '冬']
const GROUND_COLORS  = [0x1a2e1a, 0x1a3a14, 0x2a1a0a, 0x1a1a2a]
const FOG_COLORS     = [0x060a12, 0x060a12, 0x0a0804, 0x0a0a14]

let currentSeason = 0

function setSeason(idx) {
  currentSeason = idx
  const key = SEASON_KEYS[idx]
  ground.material.color.set(GROUND_COLORS[idx])
  scene.background.set(FOG_COLORS[idx])
  scene.fog.color.set(FOG_COLORS[idx])
  document.getElementById('seasonLabel').textContent = SEASON_LABELS[idx]
  rebuildTrees()
}

// ─── Tree Management ───────────────────────────────────────────────────────────
let treeGroups = []
let params = { iter: 6, angle: 25, lenScale: 0.6, treeCount: 4 }
let windTime = 0

function rebuildTrees() {
  treeGroups.forEach(g => scene.remove(g))
  treeGroups = []

  const axiom = lsystem('X', RULES, params.iter)
  document.getElementById('lsDisplay').textContent = axiom.slice(0, 200) + (axiom.length > 200 ? '...' : '')

  for (let t = 0; t < params.treeCount; t++) {
    const angle = (t / params.treeCount) * Math.PI * 2
    const r = 3 + Math.random() * 12
    const origin = new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r)
    const { branchSegs, leafPositions } = buildTree(axiom, RULES, params.iter, params.angle, params.lenScale, origin)
    const group = segmentsToMesh(branchSegs, leafPositions, SEASON_KEYS[currentSeason])
    scene.add(group)
    treeGroups.push(group)
  }
}

// ─── UI Controls ──────────────────────────────────────────────────────────────
function bindSlider(id, valId, param, fmt) {
  const slider = document.getElementById(id)
  const label  = document.getElementById(valId)
  slider.addEventListener('input', () => {
    label.textContent = fmt(slider.value)
    params[param] = parseFloat(slider.value)
  })
}
bindSlider('iterSlider',  'iterVal',  'iter',     v => v)
bindSlider('angleSlider', 'angleVal', 'angle',    v => v + '°')
bindSlider('lenSlider',   'lenVal',   'lenScale', v => parseFloat(v).toFixed(2))
bindSlider('treeSlider',  'treeVal',  'treeCount',v => v)

document.getElementById('btnRegen').addEventListener('click', rebuildTrees)
document.getElementById('btnSeason').addEventListener('click', () => {
  setSeason((currentSeason + 1) % 4)
})

// ─── Orbit Controls ───────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.minDistance = 5
controls.maxDistance = 80
controls.target.set(0, 2, 0)

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  windTime += delta

  // Wind sway
  treeGroups.forEach((g, ti) => {
    g.rotation.z = Math.sin(windTime * 0.8 + ti * 1.2) * 0.012
    g.rotation.x = Math.sin(windTime * 0.6 + ti * 0.9) * 0.008
  })

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene

rebuildTrees()
animate()