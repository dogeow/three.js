// 3559. Traffic Flow Simulation
// 交通流模拟 - 车辆沿道路行驶，跟驰模型 + 变道
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.012)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 60, 60)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 道路网格
const roadMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 })
const laneMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.7 })
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), roadMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// 创建道路（3条水平 + 3条垂直）
function makeRoad(x, z, isHorizontal) {
  const group = new THREE.Group()
  const geo = isHorizontal
    ? new THREE.PlaneGeometry(120, 8)
    : new THREE.PlaneGeometry(8, 120)
  const road = new THREE.Mesh(geo, roadMat)
  road.rotation.x = -Math.PI / 2
  road.receiveShadow = true
  group.add(road)

  // 车道线（虚线）
  const dashCount = isHorizontal ? 20 : 20
  for (let i = 0; i < dashCount; i++) {
    const dashGeo = isHorizontal
      ? new THREE.PlaneGeometry(4, 0.3)
      : new THREE.PlaneGeometry(0.3, 4)
    const dash = new THREE.Mesh(dashGeo, laneMat)
    dash.rotation.x = -Math.PI / 2
    if (isHorizontal) {
      dash.position.set(-60 + i * 6 + 3, 0.01, 0)
    } else {
      dash.position.set(0, 0.01, -60 + i * 6 + 3)
    }
    group.add(dash)
  }
  group.position.set(x, 0.01, z)
  return group
}

const intersections = [
  [-40, -40], [-40, 0], [-40, 40],
  [0, -40],   [0, 0],   [0, 40],
  [40, -40],  [40, 0],  [40, 40],
]
for (const [x, z] of intersections) scene.add(makeRoad(x, z, true))
for (const [x, z] of intersections) scene.add(makeRoad(x, z, false))

// 车辆类
const CAR_COLORS = [0xff4444, 0x4488ff, 0x44ff88, 0xffcc00, 0xff8800, 0xffffff]
class Car {
  constructor(lane, startPos) {
    this.lane = lane // {dir:'H'|'V', index:0-2, laneOffset, start}
    this.speed = 0.08 + Math.random() * 0.06
    this.maxSpeed = 0.15
    this.accel = 0.002
    this.braking = 0.004
    this.len = 3 + Math.random() * 2
    this.w = 1.6
    this.h = 1.0 + Math.random() * 0.4
    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
    const geo = new THREE.BoxGeometry(this.lane.dir === 'H' ? this.len : this.w, this.h, this.lane.dir === 'H' ? this.w : this.len)
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
    scene.add(this.mesh)
    // 初始位置
    if (lane.dir === 'H') {
      this.mesh.position.set(startPos, this.h / 2, lane.laneOffset)
      this.mesh.rotation.y = 0
    } else {
      this.mesh.position.set(lane.laneOffset, this.h / 2, startPos)
      this.mesh.rotation.y = Math.PI / 2
    }
    this.v = this.speed
    this.target = null
  }

  update(cars) {
    // 简单的智能驾驶：检测前方车辆
    let minDist = Infinity
    for (const other of cars) {
      if (other === this) continue
      if (other.lane.dir !== this.lane.dir) continue
      const dx = this.mesh.position.x - other.mesh.position.x
      const dz = this.mesh.position.z - other.mesh.position.z
      if (this.lane.dir === 'H') {
        if (Math.abs(dz) < 3 && dx > 0 && dx < 20) minDist = Math.min(minDist, dx)
      } else {
        if (Math.abs(dx) < 3 && dz > 0 && dz < 20) minDist = Math.min(minDist, dz)
      }
    }

    if (minDist < 8) {
      this.v = Math.max(0, this.v - this.braking)
    } else {
      this.v = Math.min(this.maxSpeed, this.v + this.accel)
    }

    if (this.lane.dir === 'H') {
      this.mesh.position.x += this.v
      if (this.mesh.position.x > 80) this.mesh.position.x = -80
    } else {
      this.mesh.position.z += this.v
      if (this.mesh.position.z > 80) this.mesh.position.z = -80
    }
  }
}

// 创建车辆
const carLanes = []
// 水平车道 (z offset, start x)
const HLanes = [-2, 2]
const VLines = [-2, 2]
for (const oz of HLanes) {
  for (let i = 0; i < 8; i++) {
    carLanes.push(new Car({ dir: 'H', laneOffset: oz }, -80 + Math.random() * 160))
  }
}
for (const ox of VLines) {
  for (let i = 0; i < 8; i++) {
    carLanes.push(new Car({ dir: 'V', laneOffset: ox }, -80 + Math.random() * 160))
  }
}

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xffffff, 0.8)
sun.position.set(50, 80, 50)
sun.castShadow = true
scene.add(sun)

function animate() {
  requestAnimationFrame(animate)
  for (const car of carLanes) car.update(carLanes)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
