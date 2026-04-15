import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1a0a)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 18, 12)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// ─── Table ────────────────────────────────────────────────────────────────────
const TABLE_W = 12, TABLE_H = 6, TABLE_Y = 0
const BALL_R = 0.28
const POCKET_R = 0.45

const feltMat = new THREE.MeshStandardMaterial({ color: 0x0d4a0d, roughness: 0.9, metalness: 0 })
const cushionMat = new THREE.MeshStandardMaterial({ color: 0x1a5c1a, roughness: 0.5, metalness: 0.1 })
const railMat = new THREE.MeshStandardMaterial({ color: 0x3d1f0a, roughness: 0.3, metalness: 0.2 })

// Felt surface
const felt = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.1, TABLE_H), feltMat)
felt.position.y = -0.05
felt.receiveShadow = true
scene.add(felt)

// Rails (4 sides)
function addRail(w, h, x, y, z, rx, ry) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, h), railMat)
  mesh.position.set(x, y, z)
  if (rx) mesh.rotation.x = rx
  if (ry) mesh.rotation.y = ry
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
}
const RH = 0.35, RW = 0.4
addRail(TABLE_W + RW * 2, RW, 0, RH / 2, -(TABLE_H / 2 + RW / 2))   // top
addRail(TABLE_W + RW * 2, RW, 0, RH / 2, (TABLE_H / 2 + RW / 2))    // bottom
addRail(RW, TABLE_H, -(TABLE_W / 2 + RW / 2), RH / 2, 0)             // left
addRail(RW, TABLE_H, (TABLE_W / 2 + RW / 2), RH / 2, 0)              // right

// Pockets (6)
const pocketGeo = new THREE.CylinderGeometry(POCKET_R, POCKET_R, 0.1, 16)
const pocketMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 })
const pocketPositions = [
  [-TABLE_W/2, 0, -TABLE_H/2], [0, 0, -TABLE_H/2], [TABLE_W/2, 0, -TABLE_H/2],
  [-TABLE_W/2, 0, TABLE_H/2],  [0, 0, TABLE_H/2],  [TABLE_W/2, 0, TABLE_H/2],
]
pocketPositions.forEach(p => {
  const pocket = new THREE.Mesh(pocketGeo, pocketMat)
  pocket.position.set(p[0], 0, p[2])
  scene.add(pocket)
})

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const lampLight = new THREE.PointLight(0xffedd5, 1.5, 20)
lampLight.position.set(0, 6, 0)
lampLight.castShadow = true
lampLight.shadow.mapSize.set(1024, 1024)
scene.add(lampLight)
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)

// ─── Balls ────────────────────────────────────────────────────────────────────
const BALL_COLORS = [
  0xffffff, // cue ball
  0xfef08a, // 1 yellow
  0x3b82f6, // 2 blue
  0xef4444, // 3 red
  0xa855f7, // 4 purple
  0xf97316, // 5 orange
  0x22c55e, // 6 green
  0x7f1d1d, // 7 maroon
  0x111827, // 8 black
  0xfef08a, // 9 stripe yellow
  0x3b82f6, // 10 stripe blue
  0xef4444, // 11 stripe red
  0xa855f7, // 12 stripe purple
  0xf97316, // 13 stripe orange
  0x22c55e, // 14 stripe green
  0x7f1d1d, // 15 stripe maroon
]
const BALL_STRIPED = [9,10,11,12,13,14,15]

let balls = []

function createBall(x, z, colorIdx, isStripe = false) {
  const geo = new THREE.SphereGeometry(BALL_R, 24, 24)
  const mat = new THREE.MeshStandardMaterial({
    color: colorIdx === 0 ? 0xf5f5f0 : BALL_COLORS[colorIdx],
    roughness: 0.15,
    metalness: 0.1,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, BALL_R, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  return {
    mesh,
    x, z,
    vx: 0, vz: 0,
    colorIdx,
    isStripe,
    active: true,
  }
}

function initBalls() {
  balls.forEach(b => scene.remove(b.mesh))
  balls = []

  // Cue ball
  balls.push(createBall(-3.5, 0, 0))

  // Triangle rack
  const rackX = 3.5
  const startZ = 0
  const spacing = BALL_R * 2.05
  const rowSpacing = spacing * Math.cos(Math.PI / 6)

  let colorIdx = 1
  let placed = new Set()
  // Place 8-ball last
  const order = [1,2,3,4,5,6,7,9,10,11,12,13,14,15,8]
  let ri = 0

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const bx = rackX + row * spacing * 0.866
      const bz = startZ + (col - row / 2) * rowSpacing
      balls.push(createBall(bx, bz, order[ri], BALL_STRIPED.includes(order[ri])))
      ri++
    }
  }
}

initBalls()

// Stripe band (decorative overlay sphere)
function addStripe(b) {
  if (b.isStripe) {
    const stripeGeo = new THREE.TorusGeometry(BALL_R * 0.95, BALL_R * 0.35, 8, 24)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    const stripe = new THREE.Mesh(stripeGeo, stripeMat)
    stripe.rotation.x = Math.PI / 2
    b.mesh.add(stripe)
  }
}
balls.forEach(b => addStripe(b))

// ─── Aiming ────────────────────────────────────────────────────────────────────
const aimLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
const aimGeo = new THREE.BufferGeometry()
const aimLine = new THREE.Line(aimGeo, aimLineMat)
scene.add(aimLine)

// Power indicator
const powerFill = document.getElementById('powerFill')

let isDragging = false
let dragStartX = 0, dragStartY = 0
let aimX = 0, aimZ = 0
let maxPower = 12

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button !== 0) return
  const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(ndc, camera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const pt = new THREE.Vector3()
  if (raycaster.ray.intersectPlane(plane, pt)) {
    // Check if near cue ball
    const cb = balls[0]
    if (cb && cb.active) {
      const dx = pt.x - cb.x, dz = pt.z - cb.z
      if (Math.sqrt(dx*dx + dz*dz) < BALL_R * 4) {
        isDragging = true
        dragStartX = e.clientX
        dragStartY = e.clientY
      }
    }
  }
})

renderer.domElement.addEventListener('mousemove', e => {
  if (!isDragging) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  const dist = Math.sqrt(dx*dx + dy*dy)
  const power = Math.min(dist / 150, 1)
  powerFill.style.width = (power * 100) + '%'
  maxPower = power * 12
})

renderer.domElement.addEventListener('mouseup', e => {
  if (!isDragging) return
  isDragging = false
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  const dist = Math.sqrt(dx*dx + dy*dy)
  if (dist < 5) return

  const cb = balls[0]
  if (!cb || !cb.active) return

  // Direction: drag away from ball
  const nx = dx / dist
  const ny = dy / dist
  // Map screen drag to table direction (rough approximation)
  const power = Math.min(dist / 150, 1) * 12

  cb.vx = -nx * power
  cb.vz = ny * power
  powerFill.style.width = '0%'
})

// ─── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 8
controls.maxDistance = 30
controls.maxPolarAngle = Math.PI / 2.2

document.getElementById('resetBtn').addEventListener('click', () => {
  initBalls()
  balls.forEach(b => addStripe(b))
  document.getElementById('turnCount').textContent = '1'
  document.getElementById('ballCount').textContent = '16'
  document.getElementById('foulText').textContent = '否'
})

// ─── Physics ───────────────────────────────────────────────────────────────────
const FRICTION = 0.985
const MIN_VEL = 0.005
const RESTITUTION = 0.95

function updatePhysics(dt) {
  let allStopped = true

  // Move balls
  balls.forEach(b => {
    if (!b.active) return
    b.x += b.vx * dt
    b.z += b.vz * dt

    // Friction
    b.vx *= FRICTION
    b.vz *= FRICTION

    if (Math.abs(b.vx) > MIN_VEL || Math.abs(b.vz) > MIN_VEL) {
      allStopped = false
    } else {
      b.vx = 0
      b.vz = 0
    }

    // Wall collision
    const hw = TABLE_W / 2 - BALL_R - 0.1
    const hh = TABLE_H / 2 - BALL_R - 0.1
    if (b.x < -hw) { b.x = -hw; b.vx *= -RESTITUTION }
    if (b.x > hw)  { b.x = hw;  b.vx *= -RESTITUTION }
    if (b.z < -hh) { b.z = -hh; b.vz *= -RESTITUTION }
    if (b.z > hh)  { b.z = hh;  b.vz *= -RESTITUTION }

    b.mesh.position.x = b.x
    b.mesh.position.z = b.z

    // Rolling rotation
    const spd = Math.sqrt(b.vx*b.vx + b.vz*b.vz)
    if (spd > MIN_VEL) {
      const axis = new THREE.Vector3(-b.vz, 0, b.vx).normalize()
      const angle = spd * dt / BALL_R
      b.mesh.rotateOnWorldAxis(axis, angle)
    }
  })

  // Ball-ball collision
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i]
    if (!a.active) continue
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j]
      if (!b.active) continue
      const dx = b.x - a.x
      const dz = b.z - a.z
      const dist = Math.sqrt(dx*dx + dz*dz)
      if (dist < BALL_R * 2) {
        // Separate
        const overlap = BALL_R * 2 - dist
        const nx = dx / dist, nz = dz / dist
        a.x -= nx * overlap / 2
        a.z -= nz * overlap / 2
        b.x += nx * overlap / 2
        b.z += nz * overlap / 2

        // Impulse
        const dvx = b.vx - a.vx
        const dvz = b.vz - a.vz
        const dot = dvx * nx + dvz * nz
        if (dot < 0) {
          a.vx += dot * nx * RESTITUTION
          a.vz += dot * nz * RESTITUTION
          b.vx -= dot * nx * RESTITUTION
          b.vz -= dot * nz * RESTITUTION
          allStopped = false
        }
      }
    }
  }

  // Pocket detection
  let cueFoul = false
  balls.forEach(b => {
    if (!b.active) return
    pocketPositions.forEach(p => {
      const dx = b.x - p[0], dz = b.z - p[2]
      if (Math.sqrt(dx*dx + dz*dz) < POCKET_R) {
        b.active = false
        b.mesh.visible = false
        if (b.colorIdx === 0) cueFoul = true
      }
    })
  })

  document.getElementById('ballCount').textContent = balls.filter(b => b.active).length
  document.getElementById('foulText').textContent = cueFoul ? '是 ⚠️' : '否'

  if (cueFoul) {
    setTimeout(() => {
      const cb = balls[0]
      cb.active = true
      cb.mesh.visible = true
      cb.x = -3.5; cb.z = 0
      cb.vx = 0; cb.vz = 0
      cb.mesh.position.set(cb.x, BALL_R, cb.z)
    }, 500)
  }

  return allStopped
}

// ─── Animate ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
let isMoving = false
let turnCount = 1

function animate() {
  requestAnimationFrame(animate)
  const delta = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.elapsedTime

  const stopped = updatePhysics(delta)

  // Aim line
  const cb = balls[0]
  if (cb && cb.active && isDragging) {
    const dx = renderer.domElement.clientWidth / 2 - dragStartX
    const dz = renderer.domElement.clientHeight / 2 - dragStartY
    const len = Math.sqrt(dx*dx + dz*dz)
    if (len > 5) {
      const pts = [
        new THREE.Vector3(cb.x, BALL_R, cb.z),
        new THREE.Vector3(cb.x - (dx / len) * 3, BALL_R, cb.z + (dz / len) * 3),
      ]
      aimGeo.setFromPoints(pts)
      aimLine.visible = true
    }
  } else {
    aimLine.visible = false
  }

  // Check win
  const remaining = balls.filter(b => b.active && b.colorIdx !== 0).length
  if (remaining === 0 && stopped) {
    turnCount++
    document.getElementById('turnCount').textContent = turnCount
    setTimeout(() => initBalls(), 1000)
  }

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
window.balls = balls

animate()