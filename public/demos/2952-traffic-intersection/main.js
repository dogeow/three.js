// 2952. Traffic Intersection
// 交通路口模拟 — 十字路口红绿灯、车辆排队、启停动画
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 50, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2.2

scene.add(new THREE.AmbientLight(0x334466, 0.8))
const dir = new THREE.DirectionalLight(0xffffff, 1.0)
dir.position.set(10, 30, 10)
dir.castShadow = true
scene.add(dir)

// 路面
const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.9 })
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 1.0 }))
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// 十字路口（两条垂直的路）
const roadGeo = new THREE.PlaneGeometry(12, 100)
// 横向路
const roadH = new THREE.Mesh(roadGeo, roadMat)
roadH.rotation.x = -Math.PI / 2
roadH.position.y = 0.01
scene.add(roadH)
// 纵向路
const roadV = new THREE.Mesh(new THREE.PlaneGeometry(100, 12), roadMat)
roadV.rotation.x = -Math.PI / 2
roadV.position.y = 0.01
scene.add(roadV)

// 人行横道
const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
for (let i = -3; i <= 3; i++) {
  if (i === 0) continue
  const stripeH = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), stripeMat)
  stripeH.rotation.x = -Math.PI / 2
  stripeH.position.set(i * 2, 0.02, 8)
  scene.add(stripeH)
  const stripeH2 = stripeH.clone()
  stripeH2.position.z = -8
  scene.add(stripeH2)
  const stripeV = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), stripeMat)
  stripeV.rotation.x = -Math.PI / 2
  stripeV.position.set(8, 0.02, i * 2)
  scene.add(stripeV)
  const stripeV2 = stripeV.clone()
  stripeV2.position.x = -8
  scene.add(stripeV2)
}

// 红绿灯
function createTrafficLight(x, z, rot) {
  const group = new THREE.Group()
  // 灯柱
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  )
  pole.position.y = 2.5
  group.add(pole)
  // 灯头
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.5, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  )
  box.position.y = 5.2
  group.add(box)
  // 红绿灯灯泡
  const redGeo = new THREE.SphereGeometry(0.18, 8, 6)
  const redMat = new THREE.MeshBasicMaterial({ color: 0x330000 })
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0x332200 })
  const greenMat = new THREE.MeshBasicMaterial({ color: 0x003300 })
  const red = new THREE.Mesh(redGeo, redMat)
  red.position.set(0, 5.7, 0.31)
  const yellow = new THREE.Mesh(redGeo, yellowMat)
  yellow.position.set(0, 5.2, 0.31)
  const green = new THREE.Mesh(redGeo, greenMat)
  green.position.set(0, 4.7, 0.31)
  group.add(red, yellow, green)
  group.position.set(x, 0, z)
  group.rotation.y = rot
  group.userData = { red, yellow, green }
  return group
}

const lights = [
  createTrafficLight(7, 7, -Math.PI / 2),
  createTrafficLight(-7, -7, Math.PI / 2),
  createTrafficLight(7, -7, Math.PI),
  createTrafficLight(-7, 7, 0)
]
for (const l of lights) scene.add(l)

// 车辆
const CAR_COLORS = [0xff4444, 0x4488ff, 0x44ff88, 0xffaa44, 0xaa44ff, 0xffffff, 0xff8844]
let carId = 0

class Car {
  constructor() {
    this.id = carId++
    const color = CAR_COLORS[this.id % CAR_COLORS.length]
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.8, 1.0)
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 })
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat)
    this.mesh.castShadow = true
    // 车轮
    const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 10)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
    for (const [wx, wz] of [[-0.7, 0.5], [0.7, 0.5], [-0.7, -0.5], [0.7, -0.5]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat)
      w.rotation.z = Math.PI / 2
      w.position.set(wx, -0.3, wz)
      this.mesh.add(w)
    }
    // 头灯
    const lightGeo = new THREE.SphereGeometry(0.1, 6, 4)
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc })
    for (const lx of [-0.6, 0.6]) {
      const l = new THREE.Mesh(lightGeo, lightMat)
      l.position.set(lx, 0, 0.51)
      this.mesh.add(l)
    }
    scene.add(this.mesh)
    this.speed = 0
    this.maxSpeed = 8 + Math.random() * 4
    this.lane = 0  // 0=右车道 1=左车道
    this.direction = 'N'  // N S E W
    this.active = false
  }

  spawn(dir) {
    this.direction = dir
    this.active = true
    // dir: 'N'=向北(+z), 'S'=向南(-z), 'E'=向东(+x), 'W'=向西(-x)
    const laneOffset = 2.5  // 距离路中心
    switch (dir) {
      case 'N': // 从南向北
        this.mesh.position.set(-laneOffset, 0.4, -50)
        this.mesh.rotation.y = 0
        this.maxSpeed = 10 + Math.random() * 5
        break
      case 'S': // 从北向南
        this.mesh.position.set(laneOffset, 0.4, 50)
        this.mesh.rotation.y = Math.PI
        this.maxSpeed = 10 + Math.random() * 5
        break
      case 'E': // 从西向东
        this.mesh.position.set(-50, 0.4, laneOffset)
        this.mesh.rotation.y = -Math.PI / 2
        this.maxSpeed = 10 + Math.random() * 5
        break
      case 'W': // 从东向西
        this.mesh.position.set(50, 0.4, -laneOffset)
        this.mesh.rotation.y = Math.PI / 2
        this.maxSpeed = 10 + Math.random() * 5
        break
    }
    this.speed = this.maxSpeed
  }

  update(dt, lightState) {
    if (!this.active) return
    const stopLine = 6  // 停止线位置
    let shouldStop = false

    switch (this.direction) {
      case 'N':
        if (lightState !== 'NS_GREEN' && this.mesh.position.z > -stopLine && this.mesh.position.z < 50)
          shouldStop = true
        if (shouldStop && this.mesh.position.z > -stopLine + 2) {
          this.speed = Math.max(0, this.speed - 15 * dt)
        } else {
          this.speed = Math.min(this.maxSpeed, this.speed + 5 * dt)
          this.mesh.position.z += this.speed * dt
          if (this.mesh.position.z > 55) this.active = false
        }
        break
      case 'S':
        if (lightState !== 'NS_GREEN' && this.mesh.position.z < stopLine && this.mesh.position.z > -50)
          shouldStop = true
        if (shouldStop && this.mesh.position.z < stopLine - 2) {
          this.speed = Math.max(0, this.speed - 15 * dt)
        } else {
          this.speed = Math.min(this.maxSpeed, this.speed + 5 * dt)
          this.mesh.position.z -= this.speed * dt
          if (this.mesh.position.z < -55) this.active = false
        }
        break
      case 'E':
        if (lightState !== 'EW_GREEN' && this.mesh.position.x > -stopLine && this.mesh.position.x < 50)
          shouldStop = true
        if (shouldStop && this.mesh.position.x > -stopLine + 2) {
          this.speed = Math.max(0, this.speed - 15 * dt)
        } else {
          this.speed = Math.min(this.maxSpeed, this.speed + 5 * dt)
          this.mesh.position.x += this.speed * dt
          if (this.mesh.position.x > 55) this.active = false
        }
        break
      case 'W':
        if (lightState !== 'EW_GREEN' && this.mesh.position.x < stopLine && this.mesh.position.x > -50)
          shouldStop = true
        if (shouldStop && this.mesh.position.x < stopLine - 2) {
          this.speed = Math.max(0, this.speed - 15 * dt)
        } else {
          this.speed = Math.min(this.maxSpeed, this.speed + 5 * dt)
          this.mesh.position.x -= this.speed * dt
          if (this.mesh.position.x < -55) this.active = false
        }
        break
    }
  }
}

const cars = []
for (let i = 0; i < 30; i++) cars.push(new Car())

let lightState = 'NS_GREEN' // NS_GREEN 或 EW_GREEN
let lightTimer = 0
const GREEN_DURATION = 8
const YELLOW_DURATION = 2

function updateLights(dt) {
  lightTimer += dt
  let newState = lightState
  if (lightState === 'NS_GREEN' && lightTimer > GREEN_DURATION) {
    newState = 'NS_YELLOW'
    lightTimer = 0
  } else if (lightState === 'NS_YELLOW' && lightTimer > YELLOW_DURATION) {
    newState = 'EW_GREEN'
    lightTimer = 0
  } else if (lightState === 'EW_GREEN' && lightTimer > GREEN_DURATION) {
    newState = 'EW_YELLOW'
    lightTimer = 0
  } else if (lightState === 'EW_YELLOW' && lightTimer > YELLOW_DURATION) {
    newState = 'NS_GREEN'
    lightTimer = 0
  }

  if (newState !== lightState) {
    lightState = newState
    // 更新所有红绿灯颜色
    const isNSGreen = lightState === 'NS_GREEN'
    const isEWGreen = lightState === 'EW_GREEN'
    const isYellow = lightState.includes('YELLOW')
    for (const l of lights) {
      const { red, yellow, green } = l.userData
      red.material.color.setHex(isYellow ? 0x333300 : (isNSGreen ? 0x330000 : 0x003300))
      yellow.material.color.setHex(isYellow ? 0x333300 : 0x332200)
      green.material.color.setHex(isEWGreen ? 0x003300 : 0x003300)
      if (isNSGreen) green.material.color.setHex(0x003300)
      if (isEWGreen) red.material.color.setHex(0x003300)
    }
  }

  // 修正：EW绿时NS红
  const nsGreen = lightState === 'NS_GREEN' || lightState === 'NS_YELLOW'
  const ewGreen = lightState === 'EW_GREEN' || lightState === 'EW_YELLOW'
  for (const l of lights) {
    const { red, yellow, green } = l.userData
    red.material.color.setHex(nsGreen ? 0x330000 : 0x003300)
    yellow.material.color.setHex(lightState.includes('NS_YELLOW') ? 0x333300 : 0x332200)
    green.material.color.setHex(ewGreen ? 0x003300 : 0x003300)
  }
}

let spawnTimer = 0

function updateCars(dt) {
  spawnTimer += dt
  if (spawnTimer > 1.2) {
    spawnTimer = 0
    const dirs = ['N', 'S', 'E', 'W']
    const dir = dirs[Math.floor(Math.random() * dirs.length)]
    for (const car of cars) {
      if (!car.active) {
        car.spawn(dir)
        break
      }
    }
  }
  for (const car of cars) {
    car.update(dt, lightState)
  }
}

// GUI
const guiParams = { speed: 1.0 }
const gui = new GUI()
gui.add(guiParams, 'speed', 0.1, 3.0).name('模拟速度')

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05) * guiParams.speed
  updateLights(dt)
  updateCars(dt)
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
