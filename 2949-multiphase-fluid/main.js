// 2949. Multiphase Fluid
// 多相流体模拟 — 油水分层+交互张力，点击倾倒油相
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a1a)
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 5, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

scene.add(new THREE.AmbientLight(0x334466, 0.8))
const dir = new THREE.DirectionalLight(0x88aaff, 1.5)
dir.position.set(10, 20, 10)
scene.add(dir)
const rim = new THREE.DirectionalLight(0xff6644, 0.5)
rim.position.set(-10, -5, -10)
scene.add(rim)

// 容器
const containerGeo = new THREE.BoxGeometry(30, 30, 30)
const edges = new THREE.EdgesGeometry(containerGeo)
const containerLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x334466, opacity: 0.3, transparent: true }))
scene.add(containerLine)

// 水相粒子（重，深蓝色）
const WATER_COUNT = 1200
const waterPositions = new Float32Array(WATER_COUNT * 3)
const waterGeo = new THREE.BufferGeometry()
waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPositions, 3))
const waterMat = new THREE.PointsMaterial({
  color: 0x2255ff,
  size: 0.8,
  transparent: true,
  opacity: 0.75,
  blending: THREE.NormalBlending,
  depthWrite: false
})
const waterPoints = new THREE.Points(waterGeo, waterMat)
scene.add(waterPoints)

// 油相粒子（轻，橙黄色）
const OIL_COUNT = 800
const oilPositions = new Float32Array(OIL_COUNT * 3)
const oilGeo = new THREE.BufferGeometry()
oilGeo.setAttribute('position', new THREE.BufferAttribute(oilPositions, 3))
const oilMat = new THREE.PointsMaterial({
  color: 0xffaa22,
  size: 0.7,
  transparent: true,
  opacity: 0.8,
  blending: THREE.NormalBlending,
  depthWrite: false
})
const oilPoints = new THREE.Points(oilGeo, oilMat)
scene.add(oilPoints)

// 初始化粒子位置
const GRAVITY = -9.8
const containerHalf = 14.8
let waterVel = new Float32Array(WATER_COUNT * 3).fill(0)
let oilVel = new Float32Array(OIL_COUNT * 3).fill(0)

function initWater() {
  for (let i = 0; i < WATER_COUNT; i++) {
    waterPositions[i * 3] = (Math.random() - 0.5) * 25
    waterPositions[i * 3 + 1] = -5 + Math.random() * 10
    waterPositions[i * 3 + 2] = (Math.random() - 0.5) * 25
  }
}

function initOil() {
  for (let i = 0; i < OIL_COUNT; i++) {
    oilPositions[i * 3] = (Math.random() - 0.5) * 20
    oilPositions[i * 3 + 1] = 8 + Math.random() * 8
    oilPositions[i * 3 + 2] = (Math.random() - 0.5) * 20
  }
}

initWater()
initOil()

// 简化的SPH-like邻居力
function applyForces() {
  const dt = 0.016
  const BOUND = containerHalf

  // 水相：重力 + 排斥 + 容器碰撞
  for (let i = 0; i < WATER_COUNT; i++) {
    const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2
    // 重力（水密度大，下沉）
    waterVel[iy] += GRAVITY * dt * 0.9

    // 油水交互：油在上所以对水有向上排斥
    for (let j = 0; j < OIL_COUNT; j++) {
      const ox = j * 3, oy = j * 3 + 1, oz = j * 3 + 2
      const dx = waterPositions[ix] - oilPositions[ox]
      const dy = waterPositions[iy] - oilPositions[oy]
      const dz = waterPositions[iz] - oilPositions[oz]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < 3.0 && dist > 0.01) {
        const force = (3.0 - dist) / 3.0 * 2.0
        waterVel[iy] += dy / dist * force * dt * 30
      }
    }

    // 速度阻尼
    waterVel[ix] *= 0.98; waterVel[iy] *= 0.98; waterVel[iz] *= 0.98

    // 更新位置
    waterPositions[ix] += waterVel[ix] * dt
    waterPositions[iy] += waterVel[iy] * dt
    waterPositions[iz] += waterVel[iz] * dt

    // 容器碰撞
    if (waterPositions[ix] > BOUND) { waterPositions[ix] = BOUND; waterVel[ix] *= -0.4 }
    if (waterPositions[ix] < -BOUND) { waterPositions[ix] = -BOUND; waterVel[ix] *= -0.4 }
    if (waterPositions[iy] > BOUND) { waterPositions[iy] = BOUND; waterVel[iy] *= -0.4 }
    if (waterPositions[iy] < -BOUND) { waterPositions[iy] = -BOUND; waterVel[iy] *= -0.4 }
    if (waterPositions[iz] > BOUND) { waterPositions[iz] = BOUND; waterVel[iz] *= -0.4 }
    if (waterPositions[iz] < -BOUND) { waterPositions[iz] = -BOUND; waterVel[iz] *= -0.4 }
  }

  // 油相：重力（密度小，上浮）
  for (let i = 0; i < OIL_COUNT; i++) {
    const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2
    oilVel[iy] += GRAVITY * dt * 0.3  // 油密度小，上浮感

    // 容器碰撞
    if (oilPositions[ix] > BOUND) { oilPositions[ix] = BOUND; oilVel[ix] *= -0.3 }
    if (oilPositions[ix] < -BOUND) { oilPositions[ix] = -BOUND; oilVel[ix] *= -0.3 }
    if (oilPositions[iy] > BOUND) { oilPositions[iy] = BOUND; oilVel[iy] *= -0.3 }
    if (oilPositions[iy] < -BOUND) { oilPositions[iy] = -BOUND; oilVel[iy] *= -0.3 }
    if (oilPositions[iz] > BOUND) { oilPositions[iz] = BOUND; oilVel[iz] *= -0.3 }
    if (oilPositions[iz] < -BOUND) { oilPositions[iz] = -BOUND; oilVel[iz] *= -0.3 }

    oilVel[ix] *= 0.97; oilVel[iy] *= 0.97; oilVel[iz] *= 0.97
    oilPositions[ix] += oilVel[ix] * dt
    oilPositions[iy] += oilVel[iy] * dt
    oilPositions[iz] += oilVel[iz] * dt
  }
}

// 点击倾倒油
window.addEventListener('click', (e) => {
  const rect = renderer.domElement.getBoundingClientRect()
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
  const wx = nx * 15
  const wy = Math.max(ny * 10 + 5, 5)
  const wz = (Math.random() - 0.5) * 5
  for (let k = 0; k < 60; k++) {
    const idx = Math.floor(Math.random() * OIL_COUNT)
    oilPositions[idx * 3] = wx + (Math.random() - 0.5) * 4
    oilPositions[idx * 3 + 1] = wy + Math.random() * 5
    oilPositions[idx * 3 + 2] = wz + (Math.random() - 0.5) * 4
    oilVel[idx * 3] = (Math.random() - 0.5) * 2
    oilVel[idx * 3 + 1] = -Math.random() * 3
    oilVel[idx * 3 + 2] = (Math.random() - 0.5) * 2
  }
  oilGeo.attributes.position.needsUpdate = true
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  applyForces()
  waterGeo.attributes.position.needsUpdate = true
  oilGeo.attributes.position.needsUpdate = true
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
