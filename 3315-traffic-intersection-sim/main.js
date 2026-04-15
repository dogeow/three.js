// 3315. Traffic Intersection Sim
// 交通路口信号灯模拟 - 多车道 + 车辆队列 + 信号灯时序
// type: traffic-intersection-sim
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 40, 30)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 3

scene.add(new THREE.AmbientLight(0x445577, 0.5))
const sun = new THREE.DirectionalLight(0xffeedd, 0.8)
sun.position.set(20, 40, 10)
sun.castShadow = true
scene.add(sun)

// 道路尺寸
const ROAD_W = 8
const LANE_W = ROAD_W / 2
const INTER_LEN = 40

// 路面
function makeRoad(x, z, rot) {
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, INTER_LEN),
    new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 })
  )
  road.rotation.x = -Math.PI / 2
  road.rotation.z = rot
  road.position.set(x, 0.05, z)
  road.receiveShadow = true
  scene.add(road)
  // 中心线
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 })
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, INTER_LEN), lineMat)
  line.rotation.x = -Math.PI / 2
  line.rotation.z = rot
  line.position.set(x, 0.06, z)
  scene.add(line)
}

// 十字路口
makeRoad(0, 0, 0)       // 南北
makeRoad(0, 0, Math.PI / 2) // 东西

// 地块
const blockMat = new THREE.MeshStandardMaterial({ color: 0x2a3a2a })
const blocks = [
  [-INTER_LEN / 2 - 5, -INTER_LEN / 2 - 5, 10, 10],
  [INTER_LEN / 2 + 5, -INTER_LEN / 2 - 5, 10, 10],
  [-INTER_LEN / 2 - 5, INTER_LEN / 2 + 5, 10, 10],
  [INTER_LEN / 2 + 5, INTER_LEN / 2 + 5, 10, 10],
]
for (const [x, z, w, d] of blocks) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), blockMat)
  b.position.set(x, 0.5, z)
  b.castShadow = true
  b.receiveShadow = true
  scene.add(b)
}

// 信号灯
// 0=南北绿灯/东西红灯, 1=南北黄灯/东西黄灯, 2=南北红灯/东西绿灯
let signalPhase = 0
let signalTimer = 0
const PHASE_DUR = [5, 1, 5] // 秒

function makeTrafficLight(x, z) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  )
  pole.position.y = 2
  g.add(pole)
  
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2.4, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  )
  housing.position.y = 4.2
  g.add(housing)
  
  const redMat = new THREE.MeshBasicMaterial({ color: 0x330000 })
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0x332200 })
  const greenMat = new THREE.MeshBasicMaterial({ color: 0x003300 })
  
  const rLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), redMat)
  rLight.position.set(0, 4.9, 0.45)
  g.add(rLight)
  
  const yLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), yellowMat)
  yLight.position.set(0, 4.2, 0.45)
  g.add(yLight)
  
  const grLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), greenMat)
  grLight.position.set(0, 3.5, 0.45)
  g.add(grLight)
  
  g.position.set(x, 0, z)
  g.userData = { rLight, yLight, grLight }
  return g
}

const lights = [
  makeTrafficLight(-ROAD_W / 2 - 1, -INTER_LEN / 2 - 2),  // 西南
  makeTrafficLight(ROAD_W / 2 + 1, INTER_LEN / 2 + 2),    // 东北
  makeTrafficLight(INTER_LEN / 2 + 2, -ROAD_W / 2 - 1),  // 东南
  makeTrafficLight(-INTER_LEN / 2 - 2, ROAD_W / 2 + 1),  // 西北
]
for (const l of lights) scene.add(l)

// 车辆
const cars = []
const carGeo = new THREE.BoxGeometry(1.5, 0.8, 3)
const carColors = [0xff3333, 0x3388ff, 0x33ff88, 0xffaa33, 0xaa33ff, 0xffffff]

function spawnCar() {
  if (cars.length > 40) return
  const dir = Math.random() < 0.5 ? 'NS' : 'EW'
  const color = carColors[Math.floor(Math.random() * carColors.length)]
  const mat = new THREE.MeshStandardMaterial({ color })
  const mesh = new THREE.Mesh(carGeo, mat)
  mesh.castShadow = true
  
  let x, z, speed, lane
  const laneOff = LANE_W / 2
  
  if (dir === 'NS') {
    const laneSign = Math.random() < 0.5 ? 1 : -1
    lane = laneSign > 0 ? laneOff : -laneOff
    x = lane
    z = laneSign > 0 ? -INTER_LEN * 1.5 : INTER_LEN * 1.5
    speed = (2 + Math.random() * 2) * laneSign * -1
  } else {
    const laneSign = Math.random() < 0.5 ? 1 : -1
    lane = laneSign > 0 ? laneOff : -laneOff
    z = lane
    x = laneSign > 0 ? INTER_LEN * 1.5 : -INTER_LEN * 1.5
    speed = (2 + Math.random() * 2) * laneSign * -1
  }
  
  mesh.position.set(x, 0.5, z)
  scene.add(mesh)
  cars.push({ mesh, dir, speed, lane, x, z, stopped: false })
}

for (let i = 0; i < 12; i++) spawnCar()

// HUD
const hud = document.createElement('div')
hud.style.cssText = 'position:fixed;top:10px;left:10px;color:#8cf;font-family:monospace;font-size:13px;z-index:10;pointer-events:none'
document.body.appendChild(hud)

function updateLights(phase) {
  const nsGreen = phase === 0
  const ewGreen = phase === 2
  const nsYellow = phase === 1
  const ewYellow = phase === 1
  
  const rMat = (active) => new THREE.MeshBasicMaterial({ color: active ? 0xff0000 : 0x330000 })
  const yMat = (active) => new THREE.MeshBasicMaterial({ color: active ? 0xffcc00 : 0x332200 })
  const gMat = (active) => new THREE.MeshBasicMaterial({ color: active ? 0x00ff44 : 0x003300 })
  
  for (const l of lights) {
    const { rLight, yLight, grLight } = l.userData
    rLight.material = rMat(!nsGreen && !nsYellow)
    yLight.material = yMat(nsYellow)
    grLight.material = gMat(nsGreen)
  }
}

let time = 0
function animate() {
  requestAnimationFrame(animate)
  const dt = 0.016
  time += dt
  
  // 信号灯时序
  signalTimer += dt
  if (signalTimer >= PHASE_DUR[signalPhase]) {
    signalTimer = 0
    signalPhase = (signalPhase + 1) % 3
    updateLights(signalPhase)
  }
  
  // 车辆移动
  const nsGreen = signalPhase === 0
  const stopLine = INTER_LEN / 2 + 1
  
  for (let i = cars.length - 1; i >= 0; i--) {
    const car = cars[i]
    if (car.dir === 'NS') {
      // 检测前方车辆
      let ahead = null
      for (const other of cars) {
        if (other === car || other.dir !== 'NS') continue
        const dz = car.z - other.z
        if (car.speed < 0 && dz < 0 && dz > -15) { ahead = other; break; }
      }
      
      // 红灯停止
      let shouldStop = false
      if (!nsGreen) {
        if (car.speed < 0 && car.z > -stopLine && car.z < stopLine + 10) shouldStop = true
        if (car.speed > 0 && car.z < stopLine && car.z > -stopLine - 10) shouldStop = true
      }
      if (ahead) shouldStop = true
      
      if (shouldStop) car.speed *= 0.9
      else car.speed = Math.sign(car.speed) * Math.min(Math.abs(car.speed) + 0.02, 4)
      
      car.z += car.speed * dt * 2
      car.mesh.position.z = car.z
      car.mesh.rotation.y = car.speed > 0 ? Math.PI : 0
      
      // 超出边界则移除
      if (Math.abs(car.z) > INTER_LEN * 2) {
        scene.remove(car.mesh); cars.splice(i, 1)
      }
    } else {
      // EW
      let ahead = null
      for (const other of cars) {
        if (other === car || other.dir !== 'EW') continue
        const dx = car.x - other.x
        if (car.speed < 0 && dx < 0 && dx > -15) { ahead = other; break; }
      }
      
      const ewGreen = signalPhase === 2
      let shouldStop = false
      if (!ewGreen) {
        if (car.speed < 0 && car.x > -stopLine && car.x < stopLine + 10) shouldStop = true
        if (car.speed > 0 && car.x < stopLine && car.x > -stopLine - 10) shouldStop = true
      }
      if (ahead) shouldStop = true
      
      if (shouldStop) car.speed *= 0.9
      else car.speed = Math.sign(car.speed) * Math.min(Math.abs(car.speed) + 0.02, 4)
      
      car.x += car.speed * dt * 2
      car.mesh.position.x = car.x
      car.mesh.rotation.y = car.speed > 0 ? -Math.PI / 2 : Math.PI / 2
      
      if (Math.abs(car.x) > INTER_LEN * 2) {
        scene.remove(car.mesh); cars.splice(i, 1)
      }
    }
  }
  
  // 随机生成
  if (Math.random() < 0.03) spawnCar()
  
  hud.innerHTML = `🚦 Signal: ${['NS Green', 'Yellow', 'EW Green'][signalPhase]}<br>Cars: ${cars.length}`
  controls.update()
  renderer.render(scene, camera)
}

updateLights(0)
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
