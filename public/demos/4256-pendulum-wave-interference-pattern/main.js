// 4256. Pendulum Wave Interference Pattern
// 单摆波干涉图：不同频率单摆的拍频与干涉
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 20, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// 参数
const N = 40 // 摆的数量
const L_MIN = 1.5, L_MAX = 6.0 // 摆长范围
const g = 9.8
const dt = 0.016
const heights = []
const thetas = []
const angvels = []
const meshes = []
const pivotY = 15

// 创建摆
for (let i = 0; i < N; i++) {
  const t = i / (N - 1)
  const L = L_MIN + t * (L_MAX - L_MIN)
  const omega = Math.sqrt(g / L)
  heights.push(L)
  thetas.push(0)
  angvels.push(0)

  // 挂点
  const x = (i - N / 2) * 1.5
  const pivotGeo = new THREE.SphereGeometry(0.2, 8, 8)
  const pivotMesh = new THREE.Mesh(pivotGeo, new THREE.MeshBasicMaterial({ color: 0x888888 }))
  pivotMesh.position.set(x, pivotY, 0)
  scene.add(pivotMesh)

  // 摆线
  const lineGeo = new THREE.BufferGeometry()
  const pts = new Float32Array([0, 0, 0, 0, -L, 0])
  lineGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.7 }))
  line.position.set(x, pivotY, 0)
  scene.add(line)

  // 摆球
  const hue = i / N
  const bobGeo = new THREE.SphereGeometry(0.4, 16, 16)
  const bobMat = new THREE.MeshPhongMaterial({
    color: new THREE.Color().setHSL(hue, 0.8, 0.5),
    emissive: new THREE.Color().setHSL(hue, 0.8, 0.2)
  })
  const bob = new THREE.Mesh(bobGeo, bobMat)
  scene.add(bob)

  meshes.push({ line, bob, L, x, omega })
}

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xffffff, 0.8)
sun.position.set(20, 30, 20)
scene.add(sun)

// 初始化：所有摆同时释放，频率差异造成拍频
for (let i = 0; i < N; i++) {
  angvels[i] = Math.sqrt(g / heights[i]) * 0.15
}

let time = 0
const clock = new THREE.Clock()

function update() {
  time += dt

  for (let i = 0; i < N; i++) {
    const L = heights[i]
    const omega = Math.sqrt(g / L)

    // 简谐运动
    const theta = thetas[i]
    const angAccel = -(g / L) * Math.sin(theta)
    angvels[i] += angAccel * dt
    angvels[i] *= 0.9995 // 微弱阻尼
    thetas[i] += angvels[i] * dt

    // 限制摆角
    thetas[i] = Math.max(-Math.PI * 0.4, Math.min(Math.PI * 0.4, thetas[i]))

    const m = meshes[i]
    const bobX = m.x + Math.sin(thetas[i]) * L
    const bobY = pivotY - Math.cos(thetas[i]) * L
    const bobZ = 0

    // 更新线
    const lp = m.line.geometry.attributes.position.array
    lp[0] = 0; lp[1] = 0; lp[2] = 0
    lp[3] = bobX - m.x; lp[4] = bobY - pivotY; lp[5] = bobZ
    m.line.geometry.attributes.position.needsUpdate = true

    m.bob.position.set(bobX, bobY, bobZ)
  }

  // 计算群聚模式：相邻摆的相位差
  let sync = 0
  for (let i = 0; i < N - 1; i++) {
    const phaseDiff = Math.abs(thetas[i] - thetas[i + 1])
    sync += Math.cos(phaseDiff)
  }
  sync /= (N - 1)
  scene.fog = new THREE.FogExp2(0x050508, 0.008 + sync * 0.01)
}

// 点击重置
window.addEventListener('click', () => {
  for (let i = 0; i < N; i++) {
    thetas[i] = 0
    angvels[i] = Math.sqrt(g / heights[i]) * (0.1 + Math.random() * 0.1)
  }
})

function animate() {
  requestAnimationFrame(animate)
  update()
  controls.update()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
