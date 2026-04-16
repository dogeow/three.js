// 3711. Pool Billiards 3D
// Realistic 3D billiards with physics, cushion collisions, and aiming system
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
scene.background = new THREE.Color(0x1a3a0a)
scene.fog = new THREE.FogExp2(0x1a3a0a, 0.015)

const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
camera.position.set(0, 18, 12)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.minDistance = 5
controls.maxDistance = 40
controls.maxPolarAngle = Math.PI / 2.2
controls.target.set(0, 0, 0)

// ── Table ──────────────────────────────────────────────────────────────────
const TABLE_W = 24, TABLE_H = 12, BALL_R = 0.38, CUSHION_H = 0.35
const feltMat = new THREE.MeshStandardMaterial({ color: 0x0d5c0d, roughness: 0.9 })
const railMat = new THREE.MeshStandardMaterial({ color: 0x4a2800, roughness: 0.3, metalness: 0.2 })
const cushionMat = new THREE.MeshStandardMaterial({ color: 0x0a4a0a, roughness: 0.8 })

// Felt surface
const feltGeo = new THREE.BoxGeometry(TABLE_W, 0.2, TABLE_H)
const felt = new THREE.Mesh(feltGeo, feltMat)
felt.position.y = -0.1
felt.receiveShadow = true
scene.add(felt)

// Rails
function makeRail(w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), railMat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  scene.add(m)
}
makeRail(TABLE_W + 1.2, 0.5, 0.6, 0, 0.25, -TABLE_H / 2 - 0.3)  // long top
makeRail(TABLE_W + 1.2, 0.5, 0.6, 0, 0.25, TABLE_H / 2 + 0.3)  // long bottom
makeRail(0.6, 0.5, TABLE_H, -TABLE_W / 2 - 0.3, 0.25, 0)        // short left
makeRail(0.6, 0.5, TABLE_H, TABLE_W / 2 + 0.3, 0.25, 0)        // short right

// Cushions (inner raised lips)
function makeCushion(w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cushionMat)
  m.position.set(x, y, z)
  m.castShadow = true
  scene.add(m)
}
const cy = CUSHION_H / 2
makeCushion(TABLE_W - 0.4, CUSHION_H, 0.2, 0, cy, -TABLE_H / 2 + 0.1)
makeCushion(TABLE_W - 0.4, CUSHION_H, 0.2, 0, cy, TABLE_H / 2 - 0.1)
makeCushion(0.2, CUSHION_H, TABLE_H - 0.4, -TABLE_W / 2 + 0.1, cy, 0)
makeCushion(0.2, CUSHION_H, TABLE_H - 0.4, TABLE_W / 2 - 0.1, cy, 0)

// Pockets (just visual spheres at corners)
const pocketPositions = [
  [-TABLE_W/2, -TABLE_H/2], [0, -TABLE_H/2], [TABLE_W/2, -TABLE_H/2],
  [-TABLE_W/2, TABLE_H/2], [0, TABLE_H/2], [TABLE_W/2, TABLE_H/2]
]
pocketPositions.forEach(([px, pz]) => {
  const pocket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.15, 16),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  )
  pocket.position.set(px, -0.05, pz)
  scene.add(pocket)
})

// Table legs
;[-TABLE_W/2+1, TABLE_W/2-1].forEach(x => {
  ;[-TABLE_H/2+0.8, TABLE_H/2-0.8].forEach(z => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 8), railMat)
    leg.position.set(x, -2, z)
    leg.castShadow = true
    scene.add(leg)
  })
})

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const lamp = new THREE.PointLight(0xffeecc, 1.5, 30)
lamp.position.set(0, 8, 0)
lamp.castShadow = true
scene.add(lamp)
const lamp2 = new THREE.PointLight(0xffeecc, 0.8, 20)
lamp2.position.set(0, 7, 0)
scene.add(lamp2)

// ── Balls ─────────────────────────────────────────────────────────────────
const BALL_COLORS = [
  0xf5f5f5, // 0 cue
  0xffd700, // 1 yellow solid
  0x0044cc, // 2 blue solid
  0xdd1111, // 3 red solid
  0x660066, // 4 purple solid
  0xff6600, // 5 orange solid
  0x006633, // 6 green solid
  0x880000, // 7 maroon solid
  0x111111, // 8 black 8-ball
  0xffd700, // 9 yellow stripe
  0x0044cc, // 10 blue stripe
  0xdd1111, // 11 red stripe
  0x660066, // 12 purple stripe
  0xff6600, // 13 orange stripe
  0x006633, // 14 green stripe
  0x880000, // 15 maroon stripe
]

const balls = []
const ballGroup = new THREE.Group()
scene.add(ballGroup)

function createBall(num, x, z) {
  const isStripe = num > 8
  const baseColor = BALL_COLORS[num]
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.15,
    metalness: 0.1,
  })
  const geo = new THREE.SphereGeometry(BALL_R, 24, 24)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, BALL_R, z)
  mesh.castShadow = true
  mesh.receiveShadow = true

  // Stripe overlay for balls 9-15
  if (isStripe) {
    const stripeGeo = new THREE.TorusGeometry(BALL_R * 0.68, BALL_R * 0.18, 8, 24)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    const stripe = new THREE.Mesh(stripeGeo, stripeMat)
    mesh.add(stripe)
  }

  // Number label (tiny sphere on top)
  if (num > 0) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    )
    dot.position.y = BALL_R - 0.02
    mesh.add(dot)
  }

  ballGroup.add(mesh)
  return {
    mesh,
    x, z,
    vx: 0, vz: 0,
    num,
    pocketed: false
  }
}

// Rack formation (triangle)
function rack() {
  const startX = TABLE_W / 4
  const startZ = 0
  const dx = BALL_R * 1.866
  const dz = BALL_R * 2
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  let idx = 0
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const x = startX + row * dx
      const z = startZ + (col - row / 2) * dz
      const num = order[idx++]
      balls.push(createBall(num, x, z))
    }
  }
  // Cue ball
  balls.push(createBall(0, -TABLE_W / 4, 0))
}

rack()

// ── Physics ────────────────────────────────────────────────────────────────
const FRICTION = 0.985
const CUSHION_DAMP = 0.75
const MIN_VEL = 0.002

function pocketed(bx, bz) {
  return pocketPositions.some(([px, pz]) =>
    Math.hypot(bx - px, bz - pz) < 0.5
  )
}

function updatePhysics(dt) {
  let allStopped = true
  for (const ball of balls) {
    if (ball.pocketed) continue
    ball.vx *= FRICTION
    ball.vz *= FRICTION
    if (Math.abs(ball.vx) < MIN_VEL) ball.vx = 0
    if (Math.abs(ball.vz) < MIN_VEL) ball.vz = 0
    if (ball.vx !== 0 || ball.vz !== 0) allStopped = false
    ball.x += ball.vx
    ball.z += ball.vz

    // Cushion collisions
    const limitX = TABLE_W / 2 - BALL_R - 0.15
    const limitZ = TABLE_H / 2 - BALL_R - 0.15
    if (ball.x > limitX) { ball.x = limitX; ball.vx *= -CUSHION_DAMP }
    if (ball.x < -limitX) { ball.x = -limitX; ball.vx *= -CUSHION_DAMP }
    if (ball.z > limitZ) { ball.z = limitZ; ball.vz *= -CUSHION_DAMP }
    if (ball.z < -limitZ) { ball.z = -limitZ; ball.vz *= -CUSHION_DAMP }

    // Pocket detection
    if (pocketed(ball.x, ball.z)) {
      ball.pocketed = true
      ball.mesh.visible = false
      ball.vx = 0; ball.vz = 0
      continue
    }

    ball.mesh.position.x = ball.x
    ball.mesh.position.z = ball.z
  }

  // Ball-ball collisions
  for (let i = 0; i < balls.length; i++) {
    if (balls[i].pocketed) continue
    for (let j = i + 1; j < balls.length; j++) {
      if (balls[j].pocketed) continue
      const a = balls[i], b = balls[j]
      const dx = b.x - a.x, dz = b.z - a.z
      const dist = Math.hypot(dx, dz)
      if (dist < BALL_R * 2 && dist > 0) {
        const nx = dx / dist, nz = dz / dist
        const overlap = BALL_R * 2 - dist
        a.x -= nx * overlap * 0.5; a.z -= nz * overlap * 0.5
        b.x += nx * overlap * 0.5; b.z += nz * overlap * 0.5
        const dvx = a.vx - b.vx, dvz = a.vz - b.vz
        const dot = dvx * nx + dvz * nz
        if (dot > 0) {
          a.vx -= dot * nx; a.vz -= dot * nz
          b.vx += dot * nx; b.vz += dot * nz
        }
        allStopped = false
      }
    }
  }

  if (allStopped && balls.some(b => b.vx !== 0 || b.vz !== 0)) {
    balls.forEach(b => { b.vx = 0; b.vz = 0 })
  }
  return allStopped
}

// ── Aiming ─────────────────────────────────────────────────────────────────
let aiming = false, aimStartX = 0, aimStartY = 0
let aimEndX = 0, aimEndY = 0, power = 0
let spaceDown = false

const cueMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.07, 8, 12),
  new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.4 })
)
cueMesh.rotation.z = Math.PI / 2
cueMesh.visible = false
scene.add(cueMesh)

const aimLine = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
)
scene.add(aimLine)

function getCueBall() { return balls.find(b => b.num === 0 && !b.pocketed) }
const statusEl = document.getElementById('status')
const powerEl = document.getElementById('power-val')
const powerFill = document.getElementById('power-fill')

function updateAimLine(sx, sy, ex, ey) {
  const cue = getCueBall()
  if (!cue) return
  const ray = new THREE.Raycaster()
  const mouse1 = new THREE.Vector2(sx, sy)
  const mouse2 = new THREE.Vector2(ex, ey)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit1 = new THREE.Vector3(), hit2 = new THREE.Vector3()
  ray.setFromCamera(mouse1, camera)
  ray.ray.intersectPlane(plane, hit1)
  ray.setFromCamera(mouse2, camera)
  ray.ray.intersectPlane(plane, hit2)
  if (!hit1 || !hit2) return
  const dx = hit2.x - hit1.x, dz = hit2.z - hit1.z
  const dist = Math.hypot(dx, dz)
  const angle = Math.atan2(dz, dx)
  const pullback = Math.min(dist * 0.25, 4)
  cueMesh.position.set(cue.x + Math.cos(angle) * pullback, BALL_R, cue.z + Math.sin(angle) * pullback)
  cueMesh.rotation.y = -angle
  cueMesh.visible = true
  // Draw ghost line
  const pts = [new THREE.Vector3(cue.x, BALL_R, cue.z),
               new THREE.Vector3(hit2.x, BALL_R, hit2.z)]
  aimLine.geometry.setFromPoints(pts)
  return { angle, pullback, dist }
}

let lastAiming = false
function animate() {
  requestAnimationFrame(animate)
  controls.update()

  const stopped = updatePhysics(1 / 60)

  if (aiming && spaceDown) {
    const result = updateAimLine(aimStartX, aimStartY, aimEndX, aimEndY)
    if (result) {
      power = Math.min(result.dist * 2.5, 100)
      powerEl.textContent = Math.round(power)
      powerFill.style.width = power + '%'
      statusEl.textContent = `Power: ${Math.round(power)}%`
    }
  } else if (aiming && !spaceDown) {
    // Shoot!
    const result = updateAimLine(aimStartX, aimStartY, aimEndX, aimEndY)
    if (result) {
      const speed = power * 0.015
      const cue = getCueBall()
      if (cue) {
        cue.vx = Math.cos(result.angle) * speed
        cue.vz = Math.sin(result.angle) * speed
      }
    }
    aiming = false
    cueMesh.visible = false
    aimLine.geometry.setFromPoints([])
    power = 0; powerEl.textContent = '0'; powerFill.style.width = '0%'
    statusEl.textContent = 'Ball in motion...'
  }

  // Rotate stripe balls
  balls.forEach(b => {
    if (!b.pocketed && (Math.abs(b.vx) > 0.01 || Math.abs(b.vz) > 0.01)) {
      b.mesh.rotation.x += b.vz * 2
      b.mesh.rotation.z -= b.vx * 2
    }
  })

  if (stopped && !aiming) {
    statusEl.textContent = 'Rack em up — drag to aim'
  }

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.addEventListener('mousedown', e => {
  if (e.button !== 0) return
  aiming = true
  aimStartX = (e.clientX / innerWidth) * 2 - 1
  aimStartY = -(e.clientY / innerHeight) * 2 + 1
  aimEndX = aimStartX; aimEndY = aimStartY
})

window.addEventListener('mousemove', e => {
  if (!aiming) return
  aimEndX = (e.clientX / innerWidth) * 2 - 1
  aimEndY = -(e.clientY / innerHeight) * 2 + 1
})

window.addEventListener('mouseup', e => {
  if (e.button !== 0) return
  aiming = false
})

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); spaceDown = true }
})

window.addEventListener('keyup', e => {
  if (e.code === 'Space') {
    spaceDown = false
    // shoot on release
    const cue = getCueBall()
    if (cue && aiming) {
      const result = updateAimLine(aimStartX, aimStartY, aimEndX, aimEndY)
      if (result && power > 1) {
        const speed = power * 0.015
        cue.vx = Math.cos(result.angle) * speed
        cue.vz = Math.sin(result.angle) * speed
      }
    }
    aiming = false; cueMesh.visible = false
    aimLine.geometry.setFromPoints([])
    power = 0; powerEl.textContent = '0'; powerFill.style.width = '0%'
  }
  if (e.code === 'KeyR') {
    // Reset
    balls.forEach(b => { b.pocketed = false; b.mesh.visible = true })
    balls.length = 0
    rack()
  }
})
