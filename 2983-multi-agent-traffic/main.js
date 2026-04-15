// 2983. Multi-Agent Traffic
// 多智能体交通仿真 - 车辆沿路径行驶、交叉路口、拥堵与让行

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 50, 80)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = true
controls.maxPolarAngle = Math.PI / 2.2

scene.add(new THREE.AmbientLight(0x223355, 0.8))
const sun = new THREE.DirectionalLight(0xfff0dd, 1.2)
sun.position.set(50, 80, 50)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 10
sun.shadow.camera.far = 300
sun.shadow.camera.left = -80
sun.shadow.camera.right = 80
sun.shadow.camera.top = 80
sun.shadow.camera.bottom = -80
scene.add(sun)

// Ground
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.95 }))
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Grid
const grid = new THREE.GridHelper(200, 40, 0x2d3a4f, 0x1a2436)
grid.position.y = 0.02
scene.add(grid)

// Road network
const ROAD_COLOR = 0x2a3142
const LANE_WIDTH = 3.5
const cars = []
const MAX_CARS = 60

// Car colors
const CAR_COLORS = [0xf87171, 0xfb923c, 0xfbbf24, 0x34d399, 0x60a5fa, 0xa78bfa, 0xf472b6, 0xffffff, 0x94a3b8]

// Simple intersection nodes
const nodes = [
  { id: 0, x: -30, z: -30 },
  { id: 1, x:   0, z: -30 },
  { id: 2, x:  30, z: -30 },
  { id: 3, x: -30, z:   0 },
  { id: 4, x:   0, z:   0 },
  { id: 5, x:  30, z:   0 },
  { id: 6, x: -30, z:  30 },
  { id: 7, x:   0, z:  30 },
  { id: 8, x:  30, z:  30 },
]

// Edges (connections between nodes)
const edges = [
  [0,1],[1,2],
  [3,4],[4,5],
  [6,7],[7,8],
  [0,3],[3,6],
  [1,4],[4,7],
  [2,5],[5,8],
]

// Build roads visually
function buildRoads() {
  const mat = new THREE.MeshStandardMaterial({ color: ROAD_COLOR, roughness: 0.9 })

  for (const [a, b] of edges) {
    const na = nodes[a], nb = nodes[b]
    const dx = nb.x - na.x, dz = nb.z - na.z
    const len = Math.sqrt(dx*dx + dz*dz)
    const angle = Math.atan2(dz, dx)

    // Main road
    const roadGeo = new THREE.PlaneGeometry(len, LANE_WIDTH * 2)
    const road = new THREE.Mesh(roadGeo, mat)
    road.rotation.x = -Math.PI / 2
    road.rotation.z = -angle
    road.position.set((na.x + nb.x)/2, 0.01, (na.z + nb.z)/2)
    road.receiveShadow = true
    scene.add(road)

    // Center line (dashed)
    const lineGeo = new THREE.PlaneGeometry(len, 0.15)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    const line = new THREE.Mesh(lineGeo, lineMat)
    line.rotation.x = -Math.PI / 2
    line.rotation.z = -angle
    line.position.set((na.x + nb.x)/2, 0.02, (na.z + nb.z)/2)
    scene.add(line)
  }
}

buildRoads()

// Car class
class Car {
  constructor() {
    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6, emissive: new THREE.Color(color).multiplyScalar(0.05) })
    const group = new THREE.Group()

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 3.5), bodyMat)
    body.position.y = 0.5
    body.castShadow = true
    group.add(body)

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.8), bodyMat)
    cabin.position.y = 1.1
    cabin.position.z = -0.2
    cabin.castShadow = true
    group.add(cabin)

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
    const wheelPos = [[-0.9, 0.3, 1.0], [0.9, 0.3, 1.0], [-0.9, 0.3, -1.0], [0.9, 0.3, -1.0]]
    for (const [wx, wy, wz] of wheelPos) {
      const w = new THREE.Mesh(wheelGeo, wheelMat)
      w.rotation.z = Math.PI / 2
      w.position.set(wx, wy, wz)
      group.add(w)
    }

    // Headlights
    const lightGeo = new THREE.SphereGeometry(0.12, 8, 8)
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc })
    for (const [lx, lz] of [[-0.6, 1.8], [0.6, 1.8]]) {
      const l = new THREE.Mesh(lightGeo, lightMat)
      l.position.set(lx, 0.5, lz)
      group.add(l)
    }

    scene.add(group)
    this.mesh = group
    this.speed = 8 + Math.random() * 12
    this.maxSpeed = this.speed
    this.targetSpeed = this.speed

    // Pick random start node
    this.currentNode = Math.floor(Math.random() * nodes.length)
    const n = nodes[this.currentNode]
    this.mesh.position.set(n.x, 0, n.z)

    // Pick next node
    this._pickNext()
  }

  _pickNext() {
    const neighbors = []
    for (const [a, b] of edges) {
      if (a === this.currentNode) neighbors.push(b)
      if (b === this.currentNode) neighbors.push(a)
    }
    if (neighbors.length === 0) {
      this.targetNode = null; return
    }
    this.targetNode = neighbors[Math.floor(Math.random() * neighbors.length)]
  }

  update(dt) {
    if (this.targetNode === null) { this._pickNext(); return }

    const target = nodes[this.targetNode]
    const dx = target.x - this.mesh.position.x
    const dz = target.z - this.mesh.position.z
    const dist = Math.sqrt(dx*dx + dz*dz)

    // Check distance to other cars ahead
    let minDist = Infinity
    for (const other of cars) {
      if (other === this) continue
      const odx = other.mesh.position.x - this.mesh.position.x
      const odz = other.mesh.position.z - this.mesh.position.z
      const od = Math.sqrt(odx*odx + odz*odz)
      // Check if other car is ahead
      const fwd = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y))
      const rel = new THREE.Vector3(odx, 0, odz).normalize()
      const dot = fwd.dot(rel)
      if (dot > 0.7 && od < 10) {
        minDist = Math.min(minDist, od)
      }
    }

    // Slow down if too close
    if (minDist < 5) {
      this.targetSpeed = 0
    } else if (minDist < 10) {
      this.targetSpeed = this.maxSpeed * 0.4
    } else {
      this.targetSpeed = this.maxSpeed
    }

    this.speed += (this.targetSpeed - this.speed) * dt * 3

    if (dist < 2.0) {
      this.currentNode = this.targetNode
      this._pickNext()
      return
    }

    const move = this.speed * dt
    if (move > dist) {
      this.mesh.position.set(target.x, 0, target.z)
    } else {
      this.mesh.position.x += (dx / dist) * move
      this.mesh.position.z += (dz / dist) * move
    }

    this.mesh.rotation.y = Math.atan2(-dz, dx)
  }
}

// Spawn initial cars
function spawnCar() {
  if (cars.length >= MAX_CARS) return
  cars.push(new Car())
}

for (let i = 0; i < 20; i++) spawnCar()

// GUI
const gui = new GUI()
const params = {
  carCount: 20,
  maxSpeed: 20,
  autoSpawn: true,
}

gui.add(params, 'carCount', 0, MAX_CARS, 1).name('Cars').onChange(v => {
  while (cars.length > v) {
    const c = cars.pop()
    scene.remove(c.mesh)
  }
  while (cars.length < v) spawnCar()
})

gui.add(params, 'autoSpawn').name('Auto Spawn')

// HUD
const hud = document.createElement('div')
hud.style.cssText = 'position:fixed;top:16px;left:16px;color:#60a5fa;font-family:monospace;font-size:13px;pointer-events:none;line-height:1.8'
hud.innerHTML = '<div style="color:#f87171">● Multi-Agent Traffic</div><div>Multi-vehicle traffic simulation</div><div>Vehicles follow road network</div>'
document.body.appendChild(hud)

const clock = new THREE.Clock()
let spawnTimer = 0

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  // Auto spawn
  if (params.autoSpawn) {
    spawnTimer += dt
    if (spawnTimer > 2.0 && cars.length < MAX_CARS) {
      spawnCar()
      spawnTimer = 0
    }
  }

  for (const car of cars) car.update(dt)
  controls.update()
  renderer.render(scene, camera)
}

animate()
