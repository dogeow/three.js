// 3714. Golf Physics Game
// 3D golf with terrain, ball physics, and hole-in scoring
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const W = innerWidth, H = innerHeight
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(W, H)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500)
camera.position.set(-30, 20, 30)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.minDistance = 5
controls.maxDistance = 100
controls.maxPolarAngle = Math.PI / 2.1
controls.target.set(0, 0, 0)

// ── Terrain ─────────────────────────────────────────────────────────────────
const TERRAIN_W = 80, TERRAIN_H = 80
const SEGS = 80

function fbm(x, z, octaves = 4) {
  let v = 0, amp = 1, freq = 1, max = 0
  for (let i = 0; i < octaves; i++) {
    v += amp * (Math.sin(x * freq * 0.3) * Math.cos(z * freq * 0.25) +
                Math.sin(x * freq * 0.5 + z * freq * 0.3) * 0.5)
    max += amp; amp *= 0.5; freq *= 2
  }
  return v / max
}

function getTerrainH(x, z) {
  const nx = x / TERRAIN_W, nz = z / TERRAIN_H
  const dune = Math.sin(nx * Math.PI * 3) * Math.cos(nz * Math.PI * 2) * 1.5
  const ridge = Math.exp(-((nx - 0.3) ** 2 + (nz - 0.5) ** 2) * 8) * 3
  const small = fbm(x * 0.15, z * 0.15) * 1.2
  const bowl = -Math.exp(-(nx * nx + nz * nz) * 6) * 2
  return dune + ridge + small + bowl
}

const terrainGeo = new THREE.PlaneGeometry(TERRAIN_W, TERRAIN_H, SEGS, SEGS)
const positions = terrainGeo.attributes.position
const colors = new Float32Array(positions.count * 3)
const grassColors = [[0x2d6a2d, 0x3d8a3d, 0x4da04d], [0x3d7a27, 0x5a9a3a, 0x6ab86a]]

for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i), z = positions.getY(i)
  const h = getTerrainH(x, z)
  positions.setZ(i, h)
  const col = grassColors[Math.floor(Math.random() * 2)]
  const c = new THREE.Color(col[Math.floor(Math.random() * 3)])
  colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
}
terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
terrainGeo.computeVertexNormals()

const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))
terrain.receiveShadow = true
scene.add(terrain)

// ── Hole ─────────────────────────────────────────────────────────────────────
const holeX = 25, holeZ = 5
const holeH = getTerrainH(holeX, holeZ)
const holeMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16),
  new THREE.MeshStandardMaterial({ color: 0x111111 })
)
holeMesh.position.set(holeX, holeH + 0.05, holeZ)
scene.add(holeMesh)

const flagPole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.06, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0xcccccc })
)
flagPole.position.set(holeX, holeH + 2, holeZ)
scene.add(flagPole)

const flagMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1.5, 0.8),
  new THREE.MeshBasicMaterial({ color: 0xff2222, side: THREE.DoubleSide })
)
flagMesh.position.set(holeX + 0.75, holeH + 3.5, holeZ)
scene.add(flagMesh)

// ── Ball ─────────────────────────────────────────────────────────────────────
const BALL_R = 0.2
const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_R, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
)
ballMesh.castShadow = true
scene.add(ballMesh)

let ballX = -25, ballZ = -10, ballY = getTerrainH(ballX, ballZ) + BALL_R
let ballVX = 0, ballVZ = 0, ballVY = 0
ballMesh.position.set(ballX, ballY, ballZ)

// ── Aiming ───────────────────────────────────────────────────────────────────
let isDragging = false, startMX = 0, startMY = 0, endMX = 0, endMY = 0
const aimArrow = new THREE.Group()
scene.add(aimArrow)
const shaftMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 1, 8),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
)
shaftMesh.rotation.z = Math.PI / 2
aimArrow.add(shaftMesh)
const headMesh = new THREE.Mesh(
  new THREE.ConeGeometry(0.2, 0.5, 8),
  new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 })
)
headMesh.rotation.z = -Math.PI / 2
aimArrow.add(headMesh)
aimArrow.visible = false

// ── HUD ──────────────────────────────────────────────────────────────────────
let strokes = 0, inHole = false
const hudEl = document.getElementById('hud')
function updateHud() {
  hudEl.innerHTML = strokes + '<small>STROKES</small>'
}
updateHud()

// ── Lighting ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const sun = new THREE.DirectionalLight(0xffffff, 1.2)
sun.position.set(30, 50, 20)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
scene.add(sun)

function getTerrainNormal(x, z) {
  const eps = 0.3
  const hL = getTerrainH(x - eps, z), hR = getTerrainH(x + eps, z)
  const hD = getTerrainH(x, z - eps), hU = getTerrainH(x, z + eps)
  return new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize()
}

function getTerrainSlope(x, z) {
  const n = getTerrainNormal(x, z)
  return new THREE.Vector3(n.x, 0, n.z).normalize()
}

function shoot(power, angle) {
  const speed = power * 0.35
  const gx = getTerrainSlope(ballX, ballZ)
  ballVX = Math.cos(angle) * speed
  ballVZ = Math.sin(angle) * speed
  ballVY = 0.08 * speed
  strokes++
  updateHud()
  inHole = false
}

function resetBall() {
  ballX = -25; ballZ = -10; ballY = getTerrainH(ballX, ballZ) + BALL_R
  ballVX = 0; ballVZ = 0; ballVY = 0; strokes = 0; inHole = false
  updateHud()
}

function updateBall(dt) {
  if (Math.abs(ballVX) < 0.001 && Math.abs(ballVZ) < 0.001 && Math.abs(ballVY) < 0.001) return
  const g = 9.8, mu = 0.4
  const normal = getTerrainNormal(ballX, ballZ)
  const slopeF = new THREE.Vector3(normal.x, 0, normal.z)

  ballVX += slopeF.x * mu * g * dt
  ballVZ += slopeF.z * mu * g * dt
  ballVX *= 0.97; ballVZ *= 0.97
  ballVY -= g * dt

  ballX += ballVX * dt * 10
  ballZ += ballVZ * dt * 10
  ballY += ballVY * dt * 10

  const groundH = getTerrainH(ballX, ballZ) + BALL_R

  if (ballY < groundH) {
    ballY = groundH
    if (Math.abs(ballVY) > 0.5) ballVY *= -0.3
    else ballVY = 0
  }

  // Boundary
  const bound = TERRAIN_W / 2 - 2
  if (Math.abs(ballX) > bound) { ballVX *= -0.5; ballX = Math.sign(ballX) * bound }
  if (Math.abs(ballZ) > bound) { ballVZ *= -0.5; ballZ = Math.sign(ballZ) * bound }

  // Hole check
  const distToHole = Math.hypot(ballX - holeX, ballZ - holeZ)
  const ballSpeed = Math.hypot(ballVX, ballVZ)
  if (distToHole < 0.8 && ballSpeed < 1.5 && !inHole) {
    ballX = holeX; ballZ = holeZ; ballY = holeH + BALL_R
    ballVX = 0; ballVZ = 0; ballVY = 0; inHole = true
    hudEl.innerHTML = 'HOLE IN ' + (strokes === 1 ? 'ONE!' : strokes + '!') + '<small>STROKES</small>'
  }

  ballMesh.position.set(ballX, ballY, ballZ)
}

let lastT = 0
function animate() {
  requestAnimationFrame(t => { animate(); lastT = t })
  const dt = Math.min((performance.now() - lastT) / 1000, 0.05)
  controls.update()
  updateBall(0.016)

  // Animate flag
  flagMesh.position.x = holeX + 0.75 + Math.sin(performance.now() * 0.003) * 0.1

  renderer.render(scene, camera)
}
animate()

// ── Input ────────────────────────────────────────────────────────────────────
window.addEventListener('mousedown', e => {
  if (e.button !== 0) return
  isDragging = true
  startMX = e.clientX; startMY = e.clientY
  endMX = startMX; endMY = startMY
})

window.addEventListener('mousemove', e => {
  if (!isDragging) return
  endMX = e.clientX; endMY = e.clientY
  const dx = endMX - startMX, dy = endMY - startMY
  const power = Math.min(Math.hypot(dx, dy) * 0.3, 15)
  const angle = Math.atan2(dy, dx)
  const len = power * 0.8
  aimArrow.visible = power > 0.5
  if (aimArrow.visible) {
    aimArrow.position.set(ballX, ballY + 0.5, ballZ)
    aimArrow.rotation.y = -angle
    shaftMesh.scale.y = len
    shaftMesh.position.x = len / 2
    headMesh.position.x = len + 0.2
  }
})

window.addEventListener('mouseup', e => {
  if (e.button !== 0 || !isDragging) return
  isDragging = false
  const dx = endMX - startMX, dy = endMY - startMY
  const power = Math.min(Math.hypot(dx, dy) * 0.3, 15)
  const angle = Math.atan2(dy, dx)
  aimArrow.visible = false
  if (power > 1) shoot(power, angle)
})

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') resetBall()
})

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
