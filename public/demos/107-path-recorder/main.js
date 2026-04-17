import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050810)
scene.fog = new THREE.FogExp2(0x050810, 0.016)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300)
camera.position.set(0, 6, 18)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

// ─── Lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.35))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.4)
sun.position.set(12, 20, 10)
scene.add(sun)

// ─── Environment ──────────────────────────────────────────────────────────────
// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 0.95 })
)
ground.rotation.x = -Math.PI / 2
scene.add(ground)

const grid = new THREE.GridHelper(120, 60, 0x0f2744, 0x091829)
grid.position.y = 0.01
scene.add(grid)

// Floating platforms
const platforms = []
const platMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.6 })

function makePlatform(x, y, z, w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    platMat.clone()
  )
  mesh.material.color.set(color)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  platforms.push(mesh)

  // Glow ring on top
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(Math.min(w, d) * 0.3, Math.min(w, d) * 0.45, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.set(x, y + h / 2 + 0.02, z)
  scene.add(ring)
}

makePlatform( 0,  1.5,  0,  4, 0.3, 4, 0x38bdf8)
makePlatform(-7,  3,  -5,  3, 0.3, 3, 0x818cf8)
makePlatform( 7,  2,  -4,  3, 0.3, 3, 0xf472b6)
makePlatform( 0,  5, -10,  5, 0.3, 5, 0x34d399)
makePlatform(-10, 4,   4,  3, 0.3, 3, 0xf59e0b)
makePlatform( 9,  3,   7,  3, 0.3, 3, 0x38bdf8)
makePlatform(-4,  6,   8,  3, 0.3, 3, 0x818cf8)
makePlatform( 5,  7, -13,  4, 0.3, 4, 0xf472b6)

// Central obelisk
const obelisk = new THREE.Mesh(
  new THREE.ConeGeometry(0.5, 4, 6),
  new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.2, metalness: 0.8 })
)
obelisk.position.set(0, 2.3, 0)
obelisk.castShadow = true
scene.add(obelisk)

// Particle field
const pCount = 2000
const pPos = new Float32Array(pCount * 3)
for (let i = 0; i < pCount * 3; i++) {
  pPos[i] = (Math.random() - 0.5) * 80
}
const pGeo = new THREE.BufferGeometry()
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
const pMesh = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({ color: 0x60a5fa, size: 0.08, transparent: true, opacity: 0.6 })
)
scene.add(pMesh)

// ─── Path Visualization ────────────────────────────────────────────────────────
let pathPoints = []
let pathCurve  = null
let pathLine   = null
let pathDotMeshes = []

const dotGeo = new THREE.SphereGeometry(0.12, 8, 8)
const dotMat = new THREE.MeshBasicMaterial({ color: 0x34d399 })

function rebuildPathViz() {
  // Remove old
  if (pathLine) { scene.remove(pathLine); pathLine.geometry.dispose() }
  pathLine = null
  for (const d of pathDotMeshes) { scene.remove(d) }
  pathDotMeshes = []

  if (pathPoints.length < 2) return

  pathCurve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.5)
  const pts = pathCurve.getSpacedPoints(pathPoints.length * 8)

  pathLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.6 })
  )
  scene.add(pathLine)

  // Dots at key frames
  for (const p of pathPoints) {
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.copy(p)
    scene.add(dot)
    pathDotMeshes.push(dot)
  }
}

function addPathPoint(pos, target) {
  pathPoints.push(pos.clone())
  rebuildPathViz()
}

// ─── Orbit Controls ──────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = true
controls.minDistance = 3
controls.maxDistance = 60
controls.target.set(0, 1, 0)

// ─── State ───────────────────────────────────────────────────────────────────
let isRecording  = false
let isPlaying    = false
let playbackT    = 0
let playbackSpeed = 1
let pathDuration  = 5  // seconds for full playback

const ui = {
  btnRec:      document.getElementById('btnRec'),
  btnPlay:     document.getElementById('btnPlay'),
  btnClear:    document.getElementById('btnClear'),
  btnSpeed1:   document.getElementById('btnSpeed1'),
  btnSpeed2:   document.getElementById('btnSpeed2'),
  btnSpeed05:  document.getElementById('btnSpeed05'),
  statStatus:  document.getElementById('statStatus'),
  statPoints:  document.getElementById('statPoints'),
  statProgress: document.getElementById('statProgress'),
}

// Keyboard shortcuts
window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') ui.btnRec.click()
  if (e.code === 'KeyP') ui.btnPlay.click()
  if (e.code === 'KeyC') ui.btnClear.click()
})

// ─── Record ──────────────────────────────────────────────────────────────────
let lastRecordPos = null
const RECORD_INTERVAL = 0.08 // seconds between samples

ui.btnRec.addEventListener('click', () => {
  if (isPlaying) {
    isPlaying = false
    ui.btnPlay.classList.remove('active')
  }
  isRecording = !isRecording
  ui.btnRec.classList.toggle('active', isRecording)

  if (isRecording) {
    lastRecordPos = camera.position.clone()
    pathPoints = []
    controls.enabled = true
    updateStatus()
  } else {
    controls.enabled = true
    updateStatus()
  }
})

// ─── Playback ────────────────────────────────────────────────────────────────
ui.btnPlay.addEventListener('click', () => {
  if (pathPoints.length < 2) return
  if (isRecording) {
    isRecording = false
    ui.btnRec.classList.remove('active')
  }
  isPlaying = !isPlaying
  ui.btnPlay.classList.toggle('active', isPlaying)

  if (isPlaying) {
    playbackT = 0
    controls.enabled = false
    updateStatus()
  } else {
    controls.enabled = true
    updateStatus()
  }
})

// ─── Speed ───────────────────────────────────────────────────────────────────
function setSpeed(s) {
  playbackSpeed = s
  ui.btnSpeed1.classList.toggle('active', s === 1)
  ui.btnSpeed2.classList.toggle('active', s === 2)
  ui.btnSpeed05.classList.toggle('active', s === 0.5)
}
ui.btnSpeed1.addEventListener('click',  () => setSpeed(1))
ui.btnSpeed2.addEventListener('click',  () => setSpeed(2))
ui.btnSpeed05.addEventListener('click', () => setSpeed(0.5))

// ─── Clear ───────────────────────────────────────────────────────────────────
ui.btnClear.addEventListener('click', () => {
  isRecording = false
  isPlaying   = false
  pathPoints  = []
  playbackT   = 0
  pathCurve   = null
  if (pathLine) { scene.remove(pathLine); pathLine = null }
  for (const d of pathDotMeshes) scene.remove(d)
  pathDotMeshes = []
  ui.btnRec.classList.remove('active')
  ui.btnPlay.classList.remove('active')
  controls.enabled = true
  updateStatus()
})

function updateStatus() {
  if (isRecording) {
    ui.statStatus.innerHTML = '<span class="status-dot recording"></span>录制中'
  } else if (isPlaying) {
    ui.statStatus.innerHTML = '<span class="status-dot playing"></span>回放中'
  } else {
    ui.statStatus.innerHTML = '<span class="status-dot idle"></span>空闲'
  }
  ui.statPoints.textContent = pathPoints.length
  setSpeed(playbackSpeed)
}

// ─── Clock ───────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let recordTimer = 0

// ─── Animation Loop ──────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()

  // Recording
  if (isRecording) {
    recordTimer += delta
    if (recordTimer >= RECORD_INTERVAL) {
      recordTimer = 0
      const p = camera.position.clone()
      const t = controls.target.clone()
      if (!lastRecordPos || p.distanceTo(lastRecordPos) > 0.15) {
        addPathPoint(p, t)
        lastRecordPos = p.clone()
      }
    }
    ui.statPoints.textContent = pathPoints.length
  }

  // Playback
  if (isPlaying && pathCurve) {
    playbackT += delta * playbackSpeed / pathDuration
    if (playbackT >= 1) {
      playbackT = 1
      isPlaying = false
      ui.btnPlay.classList.remove('active')
      controls.enabled = true
    }

    const t = playbackT
    const pos = pathCurve.getPoint(t)
    const lookAhead = pathCurve.getPoint(Math.min(1, t + 0.04))

    camera.position.lerp(pos, 0.12)
    controls.target.lerp(lookAhead, 0.12)

    ui.statProgress.textContent = (t * 100).toFixed(1) + '%'
  } else if (!isPlaying) {
    ui.statProgress.textContent = '—'
    controls.update()
  }

  // Animate particles
  pMesh.rotation.y += delta * 0.02

  // Pulse recording dots
  for (let i = 0; i < pathDotMeshes.length; i++) {
    pathDotMeshes[i].scale.setScalar(1 + Math.sin(clock.elapsedTime * 3 + i) * 0.3)
  }

  renderer.render(scene, camera)
}

// Init
setSpeed(1)
updateStatus()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.camera = camera
window.pathPoints = pathPoints

animate()