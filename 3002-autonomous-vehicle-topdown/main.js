// 3002. Autonomous Vehicle Topdown
// Autonomous Vehicle Topdown
// type: custom
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a2a1a)
scene.fog = new THREE.FogExp2(0x1a2a1a, 0.04)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 60, 0)
camera.rotation.x = -Math.PI / 2
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// Road network
const ROAD_W = 8
const ROAD_L = 80

function makeRoad(x, z, w, l, rotY = 0) {
  const geo = new THREE.PlaneGeometry(w, l)
  const mat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.rotation.z = rotY
  mesh.position.set(x, 0.01, z)
  mesh.receiveShadow = true
  scene.add(mesh)
  // Center line
  const lineGeo = new THREE.PlaneGeometry(0.2, l - 2)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 })
  const line = new THREE.Mesh(lineGeo, lineMat)
  line.rotation.x = -Math.PI / 2
  line.rotation.z = rotY
  line.position.set(x, 0.02, z)
  scene.add(line)
  // Edge lines
  for (const side of [-1, 1]) {
    const edgeGeo = new THREE.PlaneGeometry(0.15, l - 1)
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const edge = new THREE.Mesh(edgeGeo, edgeMat)
    edge.rotation.x = -Math.PI / 2
    edge.rotation.z = rotY
    edge.position.set(x + side * (w / 2 - 0.5), 0.02, z)
    scene.add(edge)
  }
  return mesh
}

// Grid of roads
for (let z = -60; z <= 60; z += ROAD_L) {
  makeRoad(0, z, ROAD_W * 3, ROAD_L)
}
for (let x = -60; x <= 60; x += ROAD_L) {
  makeRoad(x, 0, ROAD_W * 3, ROAD_L, Math.PI / 2)
}

// Grass ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0x1a3310 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Buildings at intersections
const buildingColors = [0x8b4513, 0x654321, 0x556b2f, 0x4a4a4a]
for (let bx = -60; bx <= 60; bx += ROAD_L) {
  for (let bz = -60; bz <= 60; bz += ROAD_L) {
    if (Math.abs(bx) < 5 && Math.abs(bz) < 5) continue // Skip center
    const w = 6 + Math.random() * 4
    const d = 6 + Math.random() * 4
    const h = 4 + Math.random() * 12
    const geo = new THREE.BoxGeometry(w, h, d)
    const mat = new THREE.MeshStandardMaterial({
      color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(
      bx + (Math.random() - 0.5) * 10,
      h / 2,
      bz + (Math.random() - 0.5) * 10
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
  }
}

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xfff0dd, 1)
sun.position.set(20, 40, 10)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 200
sun.shadow.camera.left = -100
sun.shadow.camera.right = 100
sun.shadow.camera.top = 100
sun.shadow.camera.bottom = -100
scene.add(sun)

// Vehicle class
class Vehicle {
  constructor(x, z, color, isAI = false) {
    this.isAI = isAI
    this.x = x
    this.z = z
    this.angle = Math.random() * Math.PI * 2
    this.speed = 0
    this.maxSpeed = isAI ? 8 + Math.random() * 4 : 15
    this.acceleration = 12
    this.turnSpeed = 2.5
    this.color = color

    // Car body
    const body = new THREE.Group()
    const bodyGeo = new THREE.BoxGeometry(2, 0.6, 4)
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 })
    body.add(new THREE.Mesh(bodyGeo, bodyMat))
    // Roof
    const roofGeo = new THREE.BoxGeometry(1.6, 0.5, 2)
    const roof = new THREE.Mesh(roofGeo, bodyMat)
    roof.position.y = 0.55
    roof.position.z = -0.3
    body.add(roof)
    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 })
    for (const wx of [-0.9, 0.9]) {
      for (const wz of [1.2, -1.2]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(wx, -0.2, wz)
        body.add(wheel)
      }
    }
    // Headlights
    const lightGeo = new THREE.BoxGeometry(0.3, 0.2, 0.05)
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc })
    for (const lx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(lightGeo, lightMat)
      hl.position.set(lx, -0.05, 2.0)
      body.add(hl)
    }
    // Brake lights
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    for (const lx of [-0.6, 0.6]) {
      const bl = new THREE.Mesh(lightGeo, brakeMat)
      bl.position.set(lx, -0.05, -2.0)
      body.add(bl)
    }
    body.position.y = 0.4
    body.castShadow = true
    scene.add(body)
    this.mesh = body

    // AI pathfinding
    if (isAI) {
      this.targetAngle = this.angle
      this.stuckTimer = 0
    }
  }

  update(dt, vehicles) {
    if (this.isAI) {
      this.updateAI(dt, vehicles)
    }
    // Physics
    this.x += Math.sin(this.angle) * this.speed * dt
    this.z += Math.cos(this.angle) * this.speed * dt

    // Keep on road (simple boundary)
    this.x = Math.max(-90, Math.min(90, this.x))
    this.z = Math.max(-90, Math.min(90, this.z))

    // Update mesh
    this.mesh.position.set(this.x, 0.4, this.z)
    this.mesh.rotation.y = this.angle
  }

  updateAI(dt, vehicles) {
    // Random direction changes
    if (Math.random() < 0.01) {
      this.targetAngle += (Math.random() - 0.5) * Math.PI / 2
    }

    // Obstacle avoidance
    const lookDist = 8
    let nearestDist = Infinity
    let nearestAngle = 0
    for (const other of vehicles) {
      if (other === this) continue
      const dx = other.x - this.x
      const dz = other.z - this.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < lookDist) {
        const angleToOther = Math.atan2(dx, dz)
        const angleDiff = angleToOther - this.angle
        if (dist < nearestDist) {
          nearestDist = dist
          nearestAngle = Math.atan2(dx, dz)
        }
        // Strong avoidance for close vehicles
        if (dist < 5) {
          this.targetAngle = angleToOther + Math.PI
        }
      }
    }

    // Steer toward target
    let angleDiff = this.targetAngle - this.angle
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

    this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnSpeed * dt)
    this.speed = this.maxSpeed * (1 - Math.abs(angleDiff) / Math.PI)
    if (this.speed < 2) this.speed = 2
  }
}

// Create vehicles
const vehicles = []
// Player vehicle
const player = new Vehicle(0, 0, 0xe74c3c, false)
vehicles.push(player)
// AI vehicles
for (let i = 0; i < 15; i++) {
  const v = new Vehicle(
    (Math.random() - 0.5) * 120,
    (Math.random() - 0.5) * 120,
    [0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c][i % 5],
    true
  )
  v.angle = Math.floor(Math.random() * 4) * Math.PI / 2
  v.targetAngle = v.angle
  vehicles.push(v)
}

// Input
const keys = {}
window.addEventListener('keydown', e => { keys[e.code] = true })
window.addEventListener('keyup', e => { keys[e.code] = false })

// Camera follows player
camera.position.set(player.x, 60, player.z)

// HUD
const hudDiv = document.createElement('div')
hudDiv.style.cssText = 'position:fixed;top:20px;left:20px;color:#0f0;font:bold 16px monospace;background:rgba(0,0,0,0.6);padding:10px;border-radius:4px;line-height:1.8'
hudDiv.innerHTML = 'WASD / Arrows: Drive<br>AIs: 15 autonomous vehicles'
document.body.appendChild(hudDiv)

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  // Player input
  if (keys['ArrowUp'] || keys['KeyW']) {
    player.speed = Math.min(player.speed + player.acceleration * dt, player.maxSpeed)
  } else if (keys['ArrowDown'] || keys['KeyS']) {
    player.speed = Math.max(player.speed - player.acceleration * dt, -5)
  } else {
    player.speed *= 0.98
  }
  if (Math.abs(player.speed) > 0.5) {
    const turn = (keys['ArrowLeft'] || keys['KeyA']) ? -1 :
      (keys['ArrowRight'] || keys['KeyD']) ? 1 : 0
    player.angle += turn * player.turnSpeed * dt * Math.sign(player.speed)
  }

  // Update all vehicles
  for (const v of vehicles) {
    v.update(dt, vehicles)
  }

  // Camera follow
  const camSpeed = 3
  camera.position.x += (player.x - camera.position.x) * camSpeed * dt
  camera.position.z += (player.z + 40 - camera.position.z) * camSpeed * dt

  // HUD update
  hudDiv.innerHTML = `WASD: Drive<br>Speed: ${Math.abs(player.speed).toFixed(1)} km/h<br>AIs: ${vehicles.length - 1} vehicles on road`

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
