// 3901. Procedural Weaving Textile Pattern
// 程序化编织纺织品图案
// type: procedural | textile | art
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1208)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 40)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0x443322, 1.5))
const dLight = new THREE.DirectionalLight(0xfff4e0, 1.2)
dLight.position.set(10, 20, 10)
dLight.castShadow = true
scene.add(dLight)
const fillLight = new THREE.PointLight(0x6688cc, 0.5, 50)
fillLight.position.set(-15, 5, 10)
scene.add(fillLight)

// ── Weaving patterns ───────────────────────────────────────────────────────────
// Possible weave patterns: plain, twill, satin, herringbone, basket, diagonal
const WEAVE_TYPES = {
  plain: (x, y, W) => ((x % 2 === 0 && y % 2 === 0) || (x % 2 === 1 && y % 2 === 1)) ? 0 : 1,
  twill: (x, y, W) => ((x + y) % W < 2) ? 0 : 1,
  satin: (x, y, W) => ((x + y * 3) % W < 1) ? 0 : 1,
  herringbone: (x, y, W) => ((x + y * 2) % (W * 2) < W) ? 0 : 1,
  basket: (x, y, W) => ((x % 2 === 0 && y % 2 === 0) || (x % 2 === 1 && y % 2 === 1) ? 0 : (x % 2 === 0 && y % 2 === 1) ? 2 : 3),
  diagonal: (x, y, W) => ((x + y) % W),
}

let currentPattern = 'twill'
let weaveSize = 8
let colorScheme = 0

const COLOR_SCHEMES = [
  // Natural linen
  [{ r: 0.85, g: 0.78, b: 0.65 }, { r: 0.65, g: 0.55, b: 0.40 }],
  // Deep indigo
  [{ r: 0.15, g: 0.20, b: 0.45 }, { r: 0.40, g: 0.45, b: 0.70 }],
  // Warm terracotta
  [{ r: 0.75, g: 0.40, b: 0.25 }, { r: 0.90, g: 0.70, b: 0.45 }],
  // Forest green
  [{ r: 0.20, g: 0.40, b: 0.30 }, { r: 0.40, g: 0.60, b: 0.45 }],
  // Midnight black
  [{ r: 0.08, g: 0.08, b: 0.10 }, { r: 0.35, g: 0.35, b: 0.38 }],
]

// ── Create woven cloth mesh ───────────────────────────────────────────────────
const CLOTH_W = 64, CLOTH_H = 64
const THREAD_W = 0.5, THREAD_H = 0.5, THREAD_D = 0.08

function createWeaveMesh() {
  scene.children.filter(c => c.userData && c.userData.isWeave).forEach(c => { scene.remove(c); c.geometry.dispose(); })
  scene.children.filter(c => c.userData && c.userData.isYarn).forEach(c => { scene.remove(c); c.geometry.dispose(); })

  const patternFn = WEAVE_TYPES[currentPattern]
  const colors = COLOR_SCHEMES[colorScheme]

  // Warp threads (vertical, running in y direction)
  const warpGroup = new THREE.Group()
  warpGroup.userData.isWeave = true
  for (let x = 0; x < CLOTH_W; x++) {
    const isOver = patternFn(x, 0, weaveSize) === 0
    const col = colors[isOver ? 0 : 1]
    const threadGeo = new THREE.CylinderGeometry(THREAD_W * 0.45, THREAD_W * 0.45, CLOTH_H * THREAD_H, 8)
    const threadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(col.r, col.g, col.b),
      roughness: 0.8, metalness: 0.05,
      emissive: new THREE.Color(col.r * 0.05, col.g * 0.05, col.b * 0.05)
    })
    const thread = new THREE.Mesh(threadGeo, threadMat)
    thread.position.set((x - CLOTH_W / 2) * THREAD_W, 0, 0)
    thread.castShadow = true
    thread.receiveShadow = true
    warpGroup.add(thread)
  }
  scene.add(warpGroup)

  // Weft threads (horizontal, running in x direction) — with interlace
  const weftGroup = new THREE.Group()
  weftGroup.userData.isWeave = true
  for (let y = 0; y < CLOTH_H; y++) {
    // Determine which warp positions this weft goes over vs under
    for (let x = 0; x < CLOTH_W; x++) {
      const warpOver = patternFn(x, y, weaveSize) === 0
      const weftOver = patternFn(x === 0 ? CLOTH_W - 1 : x - 1, y, weaveSize) === 0

      // For basket/other multi-pattern
      let heightOffset = 0
      if (!warpOver && !weftOver) heightOffset = THREAD_D * 2 // weft goes over warp
      else if (warpOver) heightOffset = -THREAD_D * 2 // warp goes over weft

      const isMain = patternFn(x, y, weaveSize) === 0
      const col = colors[isMain ? 0 : 1]
      const threadGeo = new THREE.BoxGeometry(THREAD_W * 0.85, THREAD_H * 0.85, THREAD_W)
      const threadMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(col.r, col.g, col.b),
        roughness: 0.85, metalness: 0.02,
        emissive: new THREE.Color(col.r * 0.03, col.g * 0.03, col.b * 0.03)
      })
      const thread = new THREE.Mesh(threadGeo, threadMat)
      thread.position.set(0, (y - CLOTH_H / 2) * THREAD_H, heightOffset)
      thread.castShadow = true
      thread.receiveShadow = true
      weftGroup.add(thread)
    }
  }
  // Weft in groups per row
  scene.add(weftGroup)

  // Add floating yarn spool decoration
  const yarnGroup = new THREE.Group()
  yarnGroup.userData.isYarn = true
  for (let i = 0; i < 5; i++) {
    const spoolGeo = new THREE.TorusGeometry(1.5, 0.6, 8, 24)
    const col = colors[i % 2]
    const spoolMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(col.r, col.g, col.b),
      roughness: 0.7, metalness: 0.1
    })
    const spool = new THREE.Mesh(spoolGeo, spoolMat)
    spool.position.set(-30 + i * 8, -25, -5 + Math.random() * 3)
    spool.rotation.x = Math.random() * 0.5
    spool.rotation.z = Math.random() * 0.5
    yarnGroup.add(spool)
  }
  scene.add(yarnGroup)
}

createWeaveMesh()

// ── Color-coded pattern visualization (top-down grid) ─────────────────────────
const PATTERN_SIZE = weaveSize
const patternGrid = new THREE.Group()
patternGrid.position.set(0, -22, 20)
scene.add(patternGrid)

function updatePatternGrid() {
  patternGrid.clear()
  const patternFn = WEAVE_TYPES[currentPattern]
  const colors = COLOR_SCHEMES[colorScheme]
  for (let y = 0; y < PATTERN_SIZE; y++) {
    for (let x = 0; x < PATTERN_SIZE; x++) {
      const v = patternFn(x, y, weaveSize)
      const geo = new THREE.PlaneGeometry(1.2, 1.2)
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colors[v % colors.length].r, colors[v % colors.length].g, colors[v % colors.length].b),
        side: THREE.DoubleSide
      })
      const cell = new THREE.Mesh(geo, mat)
      cell.position.set((x - PATTERN_SIZE / 2) * 1.3, (PATTERN_SIZE / 2 - y) * 1.3, 0)
      cell.rotation.x = -Math.PI / 2
      patternGrid.add(cell)
    }
  }
}
updatePatternGrid()

// ── UI Controls ────────────────────────────────────────────────────────────────
const patterns = Object.keys(WEAVE_TYPES)
let patternIdx = 0

const infoEl = document.createElement('div')
infoEl.style.cssText = 'position:fixed;top:20px;left:20px;color:#dcbba0;font-family:monospace;font-size:13px;z-index:10;pointer-events:none;line-height:1.9'
document.body.appendChild(infoEl)

const btnPanel = document.createElement('div')
btnPanel.style.cssText = 'position:fixed;bottom:20px;left:20px;display:flex;gap:8px;z-index:10'
document.body.appendChild(btnPanel)

const btnPattern = document.createElement('button')
btnPattern.textContent = '🔄 Pattern: twill'
btnPattern.style.cssText = 'padding:8px 14px;background:#2a1a08;border:1px solid #664422;color:#dcbba0;border-radius:4px;cursor:pointer;font-family:monospace;font-size:12px'
btnPanel.appendChild(btnPattern)

const btnColor = document.createElement('button')
btnColor.textContent = '🎨 Color'
btnColor.style.cssText = 'padding:8px 14px;background:#2a1a08;border:1px solid #664422;color:#dcbba0;border-radius:4px;cursor:pointer;font-family:monospace;font-size:12px'
btnPanel.appendChild(btnColor)

const btnSize = document.createElement('button')
btnSize.textContent = '⬜ Size: 8'
btnSize.style.cssText = 'padding:8px 14px;background:#2a1a08;border:1px solid #664422;color:#dcbba0;border-radius:4px;cursor:pointer;font-family:monospace;font-size:12px'
btnPanel.appendChild(btnSize)

btnPattern.addEventListener('click', () => {
  patternIdx = (patternIdx + 1) % patterns.length
  currentPattern = patterns[patternIdx]
  btnPattern.textContent = `🔄 Pattern: ${currentPattern}`
  createWeaveMesh(); updatePatternGrid()
})

btnColor.addEventListener('click', () => {
  colorScheme = (colorScheme + 1) % COLOR_SCHEMES.length
  createWeaveMesh(); updatePatternGrid()
})

btnSize.addEventListener('click', () => {
  const sizes = [4, 6, 8, 10, 12, 16]
  const curIdx = sizes.indexOf(weaveSize)
  weaveSize = sizes[(curIdx + 1) % sizes.length]
  btnSize.textContent = `⬜ Size: ${weaveSize}`
  createWeaveMesh(); updatePatternGrid()
})

// ── Fabric fold animation ─────────────────────────────────────────────────────
// Add subtle fold geometry
const foldGeo = new THREE.PlaneGeometry(CLOTH_W * THREAD_W * 1.5, 3, 32, 8)
const foldPositions = foldGeo.attributes.position.array
for (let i = 0; i < foldPositions.length; i += 3) {
  const x = foldPositions[i]
  foldPositions[i + 2] = Math.sin(x * 0.3) * 0.3 // gentle wave
}
foldGeo.computeVertexNormals()
const foldMesh = new THREE.Mesh(foldGeo, new THREE.MeshStandardMaterial({
  color: 0x332211, roughness: 0.9, side: THREE.DoubleSide, wireframe: false
}))
foldMesh.position.set(0, -22, -12)
scene.add(foldMesh)

// ── Animation ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let camAngle = 0

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  const dt = clock.getDelta()

  // Gentle camera orbit
  camAngle += dt * 0.06
  camera.position.x = Math.sin(camAngle) * 40
  camera.position.z = Math.cos(camAngle) * 40
  camera.position.y = 5 + Math.sin(camAngle * 0.7) * 3
  camera.lookAt(0, -2, 0)

  // Subtle fold animation
  const pos = foldGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = Math.sin(x * 0.3 + t * 0.5) * 0.3
    pos.setZ(i, z)
  }
  pos.needsUpdate = true
  foldGeo.computeVertexNormals()

  // Pattern grid slow rotation
  patternGrid.rotation.y = t * 0.1

  // Info
  const csNames = ['Natural Linen', 'Deep Indigo', 'Terracotta', 'Forest', 'Midnight']
  infoEl.innerHTML = `Procedural Weaving<br>Pattern: <b>${currentPattern}</b><br>Color: <b>${csNames[colorScheme]}</b><br>Weave Size: <b>${weaveSize}×${weaveSize}</b><br>Threads: <b>${CLOTH_W * 2}</b><br><br>Bottom: pattern tile grid<br>[bottom buttons to change]`

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
