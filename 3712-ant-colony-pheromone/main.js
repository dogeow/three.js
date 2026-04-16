// 3712. Ant Colony Pheromone
// Swarm simulation with pheromone trail deposition and diffusion
import * as THREE from 'three'

const W = innerWidth, H = innerHeight
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(W, H)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a0a00)
scene.fog = new THREE.FogExp2(0x1a0a00, 0.04)

const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200)
camera.position.set(0, 45, 35)
camera.lookAt(0, 0, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xffcc88, 1)
sun.position.set(10, 30, 10)
scene.add(sun)

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x3d2200, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
scene.add(ground)

// ── Pheromone Grid ─────────────────────────────────────────────────────────
const GRID = 128
const pheromoneFood = new Float32Array(GRID * GRID)  // food trail (red)
const pheromoneHome = new Float32Array(GRID * GRID)   // home trail (orange)

// Ground mesh with dynamic texture
const canvas = document.createElement('canvas')
canvas.width = GRID; canvas.height = GRID
const ctx2d = canvas.getContext('2d')
const groundTex = new THREE.CanvasTexture(canvas)

const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 })
)
groundMesh.rotation.x = -Math.PI / 2
groundMesh.position.y = 0.01
scene.add(groundMesh)

// Pheromone visual layers (thin planes above ground)
const pheroFoodMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.0, depthWrite: false })
)
pheroFoodMesh.rotation.x = -Math.PI / 2
pheroFoodMesh.position.y = 0.05
scene.add(pheroFoodMesh)

// ── Ant Home ───────────────────────────────────────────────────────────────
const HOME_X = 0, HOME_Z = 0
const homeMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16),
  new THREE.MeshStandardMaterial({ color: 0x884400, roughness: 0.5 })
)
homeMesh.position.set(HOME_X, 0.15, HOME_Z)
scene.add(homeMesh)

// ── Food Sources ───────────────────────────────────────────────────────────
const foods = []
const foodMeshes = []

function placeFood(x, z) {
  const wx = (x / GRID - 0.5) * 40
  const wz = (z / GRID - 0.5) * 40
  foods.push({ x: wx, z: wz, gx: x, gz: z, amount: 30 })
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x44ff44, roughness: 0.5 })
  )
  mesh.position.set(wx, 0.6, wz)
  scene.add(mesh)
  foodMeshes.push(mesh)
}

placeFood(GRID * 0.8, GRID * 0.3)
placeFood(GRID * 0.2, GRID * 0.8)

// ── Ants ─────────────────────────────────────────────────────────────────
const N_ANTS = 300
const ants = []

function randAngle() { return Math.random() * Math.PI * 2 }

for (let i = 0; i < N_ANTS; i++) {
  const angle = randAngle()
  ants.push({
    x: HOME_X + (Math.random() - 0.5) * 1,
    z: HOME_Z + (Math.random() - 0.5) * 1,
    angle,
    carrying: false,
    mesh: (() => {
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.4, 4),
        new THREE.MeshStandardMaterial({ color: 0xdd8800 })
      )
      m.rotation.x = Math.PI / 2
      scene.add(m)
      return m
    })()
  })
}

// ── Simulation ────────────────────────────────────────────────────────────
const W_SIZE = 40
const DEPOSIT = 0.4
const DIFFUSE_RATE = 0.92
const DECAY = 0.97
const SENSE_DIST = 1.2
const SENSE_ANGLE = Math.PI / 4

function gridToWorld(g) { return (g / GRID - 0.5) * W_SIZE }
function worldToGrid(w) { return Math.floor((w / W_SIZE + 0.5) * GRID) }

function sense(ant, foodTrail, leftOffset, rightOffset) {
  const lAngle = ant.angle + leftOffset
  const rAngle = ant.angle + rightOffset
  const lx = worldToGrid(ant.x + Math.cos(lAngle) * SENSE_DIST)
  const lz = worldToGrid(ant.z + Math.sin(lAngle) * SENSE_DIST)
  const rx = worldToGrid(ant.x + Math.cos(rAngle) * SENSE_DIST)
  const rz = worldToGrid(ant.z + Math.sin(rAngle) * SENSE_DIST)
  const get = (arr, gx, gz) => {
    gx = Math.max(0, Math.min(GRID - 1, gx))
    gz = Math.max(0, Math.min(GRID - 1, gz))
    return arr[gz * GRID + gx]
  }
  return [get(foodTrail, lx, lz), get(foodTrail, rx, rz)]
}

function stepAnt(ant) {
  const trail = ant.carrying ? pheromoneHome : pheromoneFood
  const otherTrail = ant.carrying ? pheromoneFood : pheromoneHome

  const [fl, fr] = sense(ant, trail, -SENSE_ANGLE, SENSE_ANGLE)
  const [fol, for_] = sense(ant, otherTrail, -SENSE_ANGLE, SENSE_ANGLE)

  let newAngle = ant.angle

  if (ant.carrying) {
    // Go toward home
    const homeAngle = Math.atan2(HOME_Z - ant.z, HOME_X - ant.x)
    const diff = ((homeAngle - ant.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    newAngle += diff * 0.3 + (Math.random() - 0.5) * 0.5
  } else {
    // Follow food trail, avoid home
    const homeAngle = Math.atan2(HOME_Z - ant.z, HOME_X - ant.x)
    const avoid = Math.cos(homeAngle - ant.angle) > 0.8
    if (!avoid && (fl + fr > 0.01 || for_ + fol > 0.01)) {
      if (fl > fr) newAngle += SENSE_ANGLE * 0.5
      else if (fr > fl) newAngle -= SENSE_ANGLE * 0.5
      else newAngle += (Math.random() - 0.5) * 0.6
    } else {
      newAngle += (Math.random() - 0.5) * 1.2
    }
  }

  // Clamp angle
  newAngle = newAngle % (Math.PI * 2)
  ant.angle = newAngle

  const speed = 0.06
  ant.x += Math.cos(ant.angle) * speed
  ant.z += Math.sin(ant.angle) * speed

  // Boundary bounce
  const bound = W_SIZE / 2 - 0.5
  if (Math.abs(ant.x) > bound) { ant.x = Math.sign(ant.x) * bound; ant.angle = Math.PI - ant.angle }
  if (Math.abs(ant.z) > bound) { ant.z = Math.sign(ant.z) * bound; ant.angle = -ant.angle }

  // Deposit pheromone
  const gx = worldToGrid(ant.x), gz = worldToGrid(ant.z)
  if (gx >= 0 && gx < GRID && gz >= 0 && gz < GRID) {
    const idx = gz * GRID + gx
    trail[idx] = Math.min(1, trail[idx] + DEPOSIT)
  }

  // Pick up food
  if (!ant.carrying) {
    for (let i = 0; i < foods.length; i++) {
      const f = foods[i]
      if (f.amount > 0 && Math.hypot(ant.x - f.x, ant.z - f.z) < 1.0) {
        ant.carrying = true
        ant.angle += Math.PI  // turn around
        f.amount--
        if (f.amount <= 0) { foodMeshes[i].visible = false }
        break
      }
    }
  }

  // Deposit at home
  if (ant.carrying) {
    if (Math.hypot(ant.x - HOME_X, ant.z - HOME_Z) < 2) {
      ant.carrying = false
      ant.angle += Math.PI
    }
  }

  // Visual
  ant.mesh.position.set(ant.x, 0.3, ant.z)
  ant.mesh.rotation.y = -ant.angle
  ant.mesh.material.color.setHex(ant.carrying ? 0x44ff44 : 0xdd8800)
}

function diffusePheromone() {
  const newFood = new Float32Array(pheromoneFood.length)
  const newHome = new Float32Array(pheromoneHome.length)
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const idx = y * GRID + x
      let fs = 0, hs = 0, count = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          fs += pheromoneFood[(y + dy) * GRID + (x + dx)]
          hs += pheromoneHome[(y + dy) * GRID + (x + dx)]
          count++
        }
      }
      newFood[idx] = pheromoneFood[idx] * DIFFUSE_RATE + (fs / count) * (1 - DIFFUSE_RATE)
      newHome[idx] = pheromoneHome[idx] * DIFFUSE_RATE + (hs / count) * (1 - DIFFUSE_RATE)
    }
  }
  for (let i = 0; i < pheromoneFood.length; i++) {
    pheromoneFood[i] = newFood[i] * DECAY
    pheromoneHome[i] = newHome[i] * DECAY
  }
}

function updatePheroTexture() {
  const imgData = ctx2d.createImageData(GRID, GRID)
  const d = imgData.data
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const idx = y * GRID + x
      const fi = pheromoneFood[idx]
      const hi = pheromoneHome[idx]
      const i4 = idx * 4
      d[i4] = Math.min(255, fi * 255 + hi * 50)     // R
      d[i4 + 1] = Math.min(255, hi * 180)           // G
      d[i4 + 2] = 0                                   // B
      d[i4 + 3] = Math.min(255, (fi + hi) * 200)     // A
    }
  }
  ctx2d.putImageData(imgData, 0, 0)
  groundTex.needsUpdate = true
}

let t = 0
function animate() {
  requestAnimationFrame(animate); t++

  for (let i = 0; i < ants.length; i++) stepAnt(ants[i])

  if (t % 3 === 0) diffusePheromone()
  if (t % 2 === 0) updatePheroTexture()

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

window.addEventListener('keydown', e => {
  if (e.code === 'KeyR') {
    pheromoneFood.fill(0)
    pheromoneHome.fill(0)
    ants.forEach(a => {
      a.x = HOME_X + (Math.random() - 0.5)
      a.z = HOME_Z + (Math.random() - 0.5)
      a.carrying = false
    })
    foods.forEach((f, i) => { f.amount = 30; foodMeshes[i].visible = true })
  }
})
