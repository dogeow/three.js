// 2930. Traffic Flow Sim
// Agent-based traffic simulation at city intersection
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)
scene.fog = new THREE.Fog(0x1a1a2e, 50, 150)

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 60, 60)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)

// Lighting
scene.add(new THREE.AmbientLight(0x404060, 0.6))
const sun = new THREE.DirectionalLight(0xffe0a0, 1.2)
sun.position.set(30, 60, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
scene.add(sun)

// Road grid
const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.9 })
const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.8 })

// Horizontal road
const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(120, 16), roadMat)
hRoad.rotation.x = -Math.PI/2
hRoad.receiveShadow = true
scene.add(hRoad)

// Vertical road
const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(16, 120), roadMat)
vRoad.rotation.x = -Math.PI/2
vRoad.receiveShadow = true
scene.add(vRoad)

// Sidewalks
[[-20, 0], [20, 0]].forEach(([x, z]) => {
  const sw = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 120), sidewalkMat)
  sw.position.set(x, 0.15, 0)
  sw.receiveShadow = true
  scene.add(sw)
})
[[0, -20], [0, 20]].forEach(([x, z]) => {
  const sw = new THREE.Mesh(new THREE.BoxGeometry(120, 0.3, 6), sidewalkMat)
  sw.position.set(0, 0.15, z)
  sw.receiveShadow = true
  scene.add(sw)
})

// Traffic lights at intersection
const lightGeo = new THREE.BoxGeometry(1.5, 4, 1.5)
const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x440000 })
const greenMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400 })
const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x444400 })

const lightPositions = [[-8, 0], [8, 0], [0, -8], [0, 8]]
const trafficLights = []
lightPositions.forEach(([x, z]) => {
  const pole = new THREE.Mesh(lightGeo, poleMat)
  pole.position.set(x, 2, z)
  pole.castShadow = true
  scene.add(pole)

  const lightGroup = new THREE.Group()
  lightGroup.position.set(x, 4.5, z)
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), redMat.clone())
  red.position.y = 1
  const yellow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), yellowMat.clone())
  const green = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), greenMat.clone())
  green.position.y = -1
  lightGroup.add(red, yellow, green)
  scene.add(lightGroup)
  trafficLights.push({ red, yellow, green, redOn: true })
})

// Vehicle class
class Vehicle {
  constructor(lane, direction, color) {
    this.lane = lane
    this.direction = direction // 'ns' or 'ew'
    this.speed = 0.15 + Math.random() * 0.1
    this.stopped = false
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(direction === 'ns' ? 2.5 : 4, 1.5, direction === 'ns' ? 4 : 2.5),
      new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 })
    )
    this.mesh.castShadow = true
    scene.add(this.mesh)
    this.updatePosition()
  }

  updatePosition() {
    if (this.direction === 'ns') {
      this.mesh.position.set(this.lane * 5, 0.75, this.z || 0)
    } else {
      this.mesh.position.set(this.z || 0, 0.75, this.lane * 5)
      this.mesh.rotation.y = Math.PI/2
    }
  }

  setZ(z) { this.z = z; this.updatePosition() }
  setX(x) { this.x = x; this.mesh.position.x = x; }
}

// Vehicle pools
const vehicles = []
const vehicleColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1]

// Spawn vehicles on all 4 directions
function spawnVehicle(dir, lane) {
  const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)]
  const v = new Vehicle(lane, dir, color)
  if (dir === 'ns') {
    v.setZ(-70)
    v.zVel = v.speed
  } else {
    v.setX(-70)
    v.xVel = v.speed
  }
  vehicles.push(v)
}

// Initial vehicles
for (let i = 0; i < 12; i++) {
  spawnVehicle(i < 6 ? 'ns' : 'ew', i % 2 === 0 ? -1 : 1)
  if (i < 6) {
    vehicles[i].setZ(-30 + i * 10)
  } else {
    vehicles[i + 6 > vehicles.length - 1 ? vehicles.length - 1 : i].setX(-30 + (i - 6) * 10)
  }
}

// State: NS green or EW green
let nsGreen = true
let switchTimer = 0
const CYCLE = 300 // frames per phase

function updateTrafficLights() {
  switchTimer++
  if (switchTimer >= CYCLE) {
    switchTimer = 0
    nsGreen = !nsGreen
  }
  const yellowOn = switchTimer > CYCLE * 0.8
  trafficLights.forEach((tl, i) => {
    if (i < 2) { // NS lights
      tl.red.material.emissive.setHex(nsGreen ? (yellowOn ? 0 : 0x440000) : 0x440000)
      tl.yellow.material.emissive.setHex(yellowOn && !nsGreen ? 0x444400 : 0)
      tl.green.material.emissive.setHex(nsGreen && !yellowOn ? 0x004400 : 0)
    } else { // EW lights
      tl.red.material.emissive.setHex(nsGreen ? 0x440000 : (yellowOn ? 0x440000 : 0x440000))
      tl.yellow.material.emissive.setHex(yellowOn && nsGreen ? 0x444400 : 0)
      tl.green.material.emissive.setHex(!nsGreen && !yellowOn ? 0x004400 : 0)
    }
  })
}

function updateVehicles() {
  vehicles.forEach(v => {
    if (v.direction === 'ns') {
      const atIntersection = Math.abs(v.mesh.position.z) < 8
      const shouldStop = atIntersection && !nsGreen && v.zVel > 0 && v.mesh.position.z < 0
      const ahead = vehicles.some(o => o !== v && o.direction === 'ns' &&
        Math.abs(o.mesh.position.z - v.mesh.position.z) < 6 &&
        o.mesh.position.z * v.mesh.position.z < 0 && v.zVel > 0)
      if (shouldStop || ahead) {
        v.zVel = Math.max(0, v.zVel - 0.02)
      } else {
        v.zVel = Math.min(v.speed, v.zVel + 0.01)
      }
      v.setZ(v.mesh.position.z + v.zVel)
      if (v.mesh.position.z > 70) v.setZ(-70)
      if (v.mesh.position.z < -70) v.setZ(70)
    } else {
      const atIntersection = Math.abs(v.mesh.position.x) < 8
      const shouldStop = atIntersection && nsGreen && v.xVel > 0 && v.mesh.position.x < 0
      const ahead = vehicles.some(o => o !== v && o.direction === 'ew' &&
        Math.abs(o.mesh.position.x - v.mesh.position.x) < 6 &&
        o.mesh.position.x * v.mesh.position.x < 0 && v.xVel > 0)
      if (shouldStop || ahead) {
        v.xVel = Math.max(0, v.xVel - 0.02)
      } else {
        v.xVel = Math.min(v.speed, v.xVel + 0.01)
      }
      v.setX(v.mesh.position.x + v.xVel)
      if (v.mesh.position.x > 70) v.setX(-70)
      if (v.mesh.position.x < -70) v.setX(70)
    }
  })
}

function animate() {
  requestAnimationFrame(animate)
  updateTrafficLights()
  updateVehicles()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
