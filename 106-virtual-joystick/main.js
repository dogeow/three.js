import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x060a12)
scene.fog = new THREE.FogExp2(0x060a12, 0.04)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 4, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// ─── Lights ───────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
sun.position.set(8, 14, 6)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 60
sun.shadow.camera.left = sun.shadow.camera.bottom = -22
sun.shadow.camera.right = sun.shadow.camera.top = 22
sun.shadow.bias = -0.001
scene.add(sun)

// ─── Ground ────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Grid
const grid = new THREE.GridHelper(80, 80, 0x1e3a5f, 0x0f2744)
grid.position.y = 0.01
scene.add(grid)

// Scattered boxes
const boxMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3 })
const boxColors = [0x38bdf8, 0x818cf8, 0x34d399, 0xf59e0b, 0xf472b6]
const boxes = []

function spawnBox(x, z) {
  const w = 0.8 + Math.random() * 1.2
  const h = 0.5 + Math.random() * 2.5
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, w),
    boxMat.clone()
  )
  mesh.material.color.set(boxColors[Math.floor(Math.random() * boxColors.length)])
  mesh.position.set(x, h / 2, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  boxes.push(mesh)
}

for (let i = 0; i < 60; i++) {
  const angle = Math.random() * Math.PI * 2
  const r = 4 + Math.random() * 18
  spawnBox(Math.cos(angle) * r, Math.sin(angle) * r)
}

// ─── Character (capsule-like) ───────────────────────────────────────────────
const charGroup = new THREE.Group()

const bodyMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.28, 0.6, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.6 })
)
bodyMesh.position.y = 0.9
bodyMesh.castShadow = true
charGroup.add(bodyMesh)

// Eyes
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
for (const side of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat)
  eye.position.set(side * 0.12, 1.12, 0.22)
  charGroup.add(eye)
}

scene.add(charGroup)
charGroup.position.set(0, 0, 0)

// Shadow blob under character
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), blobMat)
blob.rotation.x = -Math.PI / 2
blob.position.y = 0.02
scene.add(blob)

// ─── State ─────────────────────────────────────────────────────────────────
let moveX = 0, moveZ = 0
let velY = 0
let isJumping = false
let charRotY = 0

const GRAVITY = -22
const JUMP_FORCE = 9
const MOVE_SPEED = 6
const keys = {}

// ─── Keyboard ───────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => { keys[e.code] = true })
window.addEventListener('keyup',   e => { keys[e.code] = false })

// ─── Virtual Joystick ───────────────────────────────────────────────────────
const joystickZone  = document.getElementById('joystickZone')
const joystickThumb = document.getElementById('joystickThumb')
const joystickBase  = document.getElementById('joystickBase')
const maxDist = 43

let joystickActive = false
let joystickOriginX = 0, joystickOriginY = 0

function getJoyPos(e) {
  const rect = joystickBase.getBoundingClientRect()
  const cx = rect.left + rect.width  / 2
  const cy = rect.top  + rect.height / 2
  return { cx, cy }
}

function onJoyStart(e) {
  joystickActive = true
  const { cx, cy } = getJoyPos(e)
  joystickOriginX = cx
  joystickOriginY = cy
  e.preventDefault()
}

function onJoyMove(e) {
  if (!joystickActive) return
  const touch = e.touches ? e.touches[0] : e
  const { cx, cy } = getJoyPos(e)
  let dx = touch.clientX - cx
  let dy = touch.clientY - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > maxDist) {
    dx = dx / dist * maxDist
    dy = dy / dist * maxDist
  }
  joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`
  moveX = dx / maxDist
  moveZ = dy / maxDist
  e.preventDefault()
}

function onJoyEnd(e) {
  joystickActive = false
  joystickThumb.style.transform = 'translate(0, 0)'
  moveX = 0
  moveZ = 0
  e.preventDefault()
}

joystickBase.addEventListener('mousedown',  onJoyStart)
joystickBase.addEventListener('touchstart', onJoyStart, { passive: false })
window.addEventListener('mousemove',  onJoyMove)
window.addEventListener('touchmove',  onJoyMove, { passive: false })
window.addEventListener('mouseup',    onJoyEnd)
window.addEventListener('touchend',    onJoyEnd, { passive: false })

// ─── Jump Button ────────────────────────────────────────────────────────────
const btnJump = document.getElementById('btnJump')
function doJump() {
  if (!isJumping) {
    velY = JUMP_FORCE
    isJumping = true
  }
}
btnJump.addEventListener('mousedown',  doJump)
btnJump.addEventListener('touchstart', doJump, { passive: false })
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && !isJumping) doJump()
})

// ─── Camera orbit (disabled while moving) ───────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 4
controls.maxDistance = 20
controls.target.set(0, 1, 0)

// ─── Clock ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()

// Bobble animation for idle
let bobPhase = 0

function animate() {
  requestAnimationFrame(animate)

  const delta = Math.min(clock.getDelta(), 0.05)

  // Input from keyboard
  let kx = 0, kz = 0
  if (keys['KeyW'] || keys['ArrowUp'])    kz = -1
  if (keys['KeyS'] || keys['ArrowDown'])  kz =  1
  if (keys['KeyA'] || keys['ArrowLeft'])  kx = -1
  if (keys['KeyD'] || keys['ArrowRight']) kx =  1

  // Combine joystick + keyboard
  const inputX = moveX !== 0 ? moveX : kx
  const inputZ = moveZ !== 0 ? moveZ : kz

  if (Math.abs(inputX) > 0.02 || Math.abs(inputZ) > 0.02) {
    const angle = Math.atan2(inputX, -inputZ)
    charRotY += (angle - charRotY) * 12 * delta
    charGroup.rotation.y = charRotY

    charGroup.position.x += inputX * MOVE_SPEED * delta
    charGroup.position.z += inputZ * MOVE_SPEED * delta
    charGroup.position.y += velY * delta

    bobPhase += delta * 14
    bodyMesh.position.y = 0.9 + Math.sin(bobPhase) * 0.05

    isJumping = true // mark as moving
  } else {
    // Idle bobble
    bobPhase += delta * 2.5
    bodyMesh.position.y = 0.9 + Math.sin(bobPhase) * 0.03
  }

  // Gravity & ground
  if (charGroup.position.y > 0) {
    velY += GRAVITY * delta
    charGroup.position.y += velY * delta
  }
  if (charGroup.position.y <= 0) {
    charGroup.position.y = 0
    velY = 0
    isJumping = false
  }

  // Clamp movement area
  charGroup.position.x = Math.max(-36, Math.min(36, charGroup.position.x))
  charGroup.position.z = Math.max(-36, Math.min(36, charGroup.position.z))

  // Blob shadow scale
  blob.position.set(charGroup.position.x, 0.02, charGroup.position.z)
  const shadowScale = Math.max(0.3, 1 - charGroup.position.y * 0.1)
  blob.scale.setScalar(shadowScale)
  blob.material.opacity = 0.35 * shadowScale

  // Camera follow
  const cx = charGroup.position.x
  const cz = charGroup.position.z + 10
  camera.position.x += (cx - camera.position.x) * 4 * delta
  camera.position.z += (cz - camera.position.z) * 4 * delta
  camera.position.y += (4.5 + charGroup.position.y * 0.3 - camera.position.y) * 4 * delta
  controls.target.set(charGroup.position.x, 1, charGroup.position.z)

  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.scene = scene
window.charGroup = charGroup

animate()