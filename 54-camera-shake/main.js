import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080c14)
scene.fog = new THREE.FogExp2(0x080c14, 0.018)

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 6, 14)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0, 0)
controls.update()

// 灯光
scene.add(new THREE.AmbientLight(0xffffff, 0.35))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
dirLight.position.set(8, 12, 6)
scene.add(dirLight)
const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.4)
fillLight.position.set(-6, 4, -8)
scene.add(fillLight)

// 地面
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(14, 64),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -2.5
scene.add(ground)

// ============ 场景物体 ============
const objects = []

// 中心大球
const centerSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.5, roughness: 0.25 })
)
centerSphere.position.y = 0
scene.add(centerSphere)
objects.push(centerSphere)

// 四周的方块
const boxPositions = [
  [-4, 0, -3], [4, 0, -3], [-5, 0, 2], [5, 0, 2],
  [-2.5, 0, 4], [2.5, 0, 4], [0, 0, -5]
]
boxPositions.forEach((pos, i) => {
  const size = 0.6 + Math.random() * 0.8
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL((i / boxPositions.length) * 0.8 + 0.5, 0.8, 0.55),
      metalness: 0.4,
      roughness: 0.35
    })
  )
  mesh.position.set(...pos)
  scene.add(mesh)
  objects.push(mesh)
})

// 顶部悬浮的金字塔（小锥体）
const pyramidPositions = [
  [-3, 1.5, 0], [3, 1.5, 0], [0, 2, -4], [0, 1.5, 5]
]
pyramidPositions.forEach((pos, i) => {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.9, 4),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL((i / pyramidPositions.length) * 0.6, 0.9, 0.6),
      metalness: 0.6,
      roughness: 0.2,
      emissive: new THREE.Color().setHSL((i / pyramidPositions.length) * 0.6, 0.9, 0.15),
      emissiveIntensity: 0.5
    })
  )
  mesh.position.set(...pos)
  scene.add(mesh)
  objects.push(mesh)
})

// 小圆环
const torusData = [
  { pos: [-2, 0.5, -2], color: 0x06b6d4 },
  { pos: [2, 0.5, 2], color: 0xa855f7 }
]
torusData.forEach(d => {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.15, 16, 48),
    new THREE.MeshStandardMaterial({ color: d.color, metalness: 0.7, roughness: 0.2 })
  )
  mesh.position.set(...d.pos)
  scene.add(mesh)
  objects.push(mesh)
})

// ============ 相机震动系统 ============
// 保存相机原始位置（世界坐标）
const cameraOrigin = new THREE.Vector3(0, 6, 14)
const targetOrigin = new THREE.Vector3(0, 0, 0)

let shakeState = null   // 当前震动状态
let continuousShake = false

// 多频正弦噪声：模拟 Perlin-like 随机偏移
function noiseOffset(t, seed) {
  return (
    Math.sin(t * 17.3 + seed * 5.1) * 0.5 +
    Math.sin(t * 31.7 + seed * 11.3) * 0.3 +
    Math.sin(t * 53.1 + seed * 23.7) * 0.2
  )
}

function shake(intensity, duration, isContinuous = false) {
  shakeState = {
    intensity,
    duration,
    elapsed: 0,
    continuous: isContinuous
  }
  continuousShake = isContinuous
  controls.enabled = false
  triggerFlash(intensity)
}

function triggerFlash(intensity) {
  const flash = document.getElementById('flash')
  const opacity = Math.min(intensity * 0.18, 0.35)
  flash.style.opacity = opacity
  requestAnimationFrame(() => {
    flash.style.opacity = 0
  })
}

function updateShake(dt) {
  if (!shakeState) return

  shakeState.elapsed += dt

  // 计算剩余时间比例 t (0 -> 1)
  const t = Math.min(shakeState.elapsed / shakeState.duration, 1)

  // 震动强度指数衰减：开始剧烈，快速变弱
  const decay = Math.pow(1 - t, 2.5)
  const currentIntensity = shakeState.intensity * decay

  if (!shakeState.continuous) {
    if (t >= 1) {
      // 震动结束，相机归位
      shakeState = null
      continuousShake = false
      controls.enabled = true
      return
    }
  }

  // 多轴噪声偏移，模拟真实震动感
  const time = performance.now() * 0.001
  const dx = noiseOffset(time, 1) * currentIntensity
  const dy = noiseOffset(time, 2) * currentIntensity * 0.5  // 垂直震动更小
  const dz = noiseOffset(time, 3) * currentIntensity

  // 叠加在原始位置上
  camera.position.set(
    cameraOrigin.x + dx,
    cameraOrigin.y + dy,
    cameraOrigin.z + dz
  )
}

// ============ 按钮事件 ============
const btnLight = document.getElementById('btn-light')
const btnHeavy = document.getElementById('btn-heavy')
const btnContinuous = document.getElementById('btn-continuous')
const btnStop = document.getElementById('btn-stop')

btnLight.addEventListener('click', () => {
  shake(0.12, 0.5)
  setActive(btnLight)
})

btnHeavy.addEventListener('click', () => {
  shake(0.45, 1.0)
  setActive(btnHeavy)
})

btnContinuous.addEventListener('click', () => {
  shake(0.22, 9999, true)
  setActive(btnContinuous)
})

btnStop.addEventListener('click', () => {
  shakeState = null
  continuousShake = false
  controls.enabled = true
  camera.position.copy(cameraOrigin)
  setActive(btnStop)
})

function setActive(btn) {
  ;[btnLight, btnHeavy, btnContinuous, btnStop].forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
}

// 点击画面轻摇
renderer.domElement.addEventListener('click', () => {
  if (!continuousShake) {
    shake(0.12, 0.5)
    setActive(btnLight)
  }
})

// ============ 渲染循环 ============
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  // 更新震动
  updateShake(dt)

  // 物体自转
  objects.forEach((obj, i) => {
    obj.rotation.y += (0.004 + i * 0.0008)
    obj.rotation.x += (0.002 + i * 0.0004)
  })

  // 中心球体上下浮动
  centerSphere.position.y = Math.sin(elapsed * 1.2) * 0.3

  controls.update()
  renderer.render(scene, camera)
}
animate()

// ============ 窗口调整 ============
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})