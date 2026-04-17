// 008. Animation Basics — 动画基础
// 演示 requestAnimationFrame、基于时间的动画、简单运动效果
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0a)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 6, 15)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)

// ========== 三个小球，展示不同的动画方式 ==========

// 小球 1：匀速上下弹跳（正弦波动）
const ball1Geo = new THREE.SphereGeometry(0.8, 32, 32)
const ball1Mat = new THREE.MeshStandardMaterial({ color: 0xff4466, roughness: 0.3 })
const ball1 = new THREE.Mesh(ball1Geo, ball1Mat)
ball1.position.set(-5, 0, 0)
scene.add(ball1)

// 小球 2：旋转 + 缩放动画
const ball2Geo = new THREE.SphereGeometry(0.8, 32, 32)
const ball2Mat = new THREE.MeshStandardMaterial({ color: 0x44aaff, roughness: 0.3 })
const ball2 = new THREE.Mesh(ball2Geo, ball2Mat)
ball2.position.set(0, 0, 0)
scene.add(ball2)

// 小球 3：沿圆形轨道运动
const ball3Geo = new THREE.SphereGeometry(0.8, 32, 32)
const ball3Mat = new THREE.MeshStandardMaterial({ color: 0x44ff88, roughness: 0.3 })
const ball3 = new THREE.Mesh(ball3Geo, ball3Mat)
ball3.position.set(5, 0, 0)
scene.add(ball3)

// 连接小球 2 和小球 3 的线（展示父子动画）
const lineGeo = new THREE.CylinderGeometry(0.03, 0.03, 5, 8)
const lineMat = new THREE.MeshBasicMaterial({ color: 0x666666 })
const line = new THREE.Mesh(lineGeo, lineMat)
line.position.set(2.5, 0, 0)
scene.add(line)

// 地面
const groundGeo = new THREE.PlaneGeometry(20, 20)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111133, roughness: 0.8 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.position.y = -2
scene.add(ground)

// ========== 动画循环 ==========
// 核心：用 elapsedTime（总流逝时间）来驱动动画，而非帧数
// 这样动画速度与设备帧率无关，始终一致
let startTime = Date.now()

function animate() {
  requestAnimationFrame(animate)

  const elapsed = (Date.now() - startTime) * 0.001  // 转换为秒

  // --- 小球 1：上下弹跳（正弦曲线） ---
  // Math.sin(elapsed) 返回 -1 到 1，振幅 * 3 控制幅度
  ball1.position.y = Math.abs(Math.sin(elapsed * 2)) * 4

  // --- 小球 2：自身旋转 + 脉冲缩放 ---
  ball2.rotation.y = elapsed * 1.5
  ball2.rotation.x = elapsed * 0.8
  // 缩放在 0.8 ~ 1.2 之间脉冲
  const scale = 1 + Math.sin(elapsed * 3) * 0.2
  ball2.scale.set(scale, scale, scale)

  // --- 小球 3：圆形轨道运动 ---
  const radius = 5
  ball3.position.x = Math.cos(elapsed * 1.2) * radius
  ball3.position.z = Math.sin(elapsed * 1.2) * radius
  // 上下浮动
  ball3.position.y = Math.sin(elapsed * 2.5) * 1.5

  // --- 连接线跟随小球 3 移动并旋转 ---
  line.position.x = (ball2.position.x + ball3.position.x) / 2
  line.position.z = (ball2.position.z + ball3.position.z) / 2
  // 让线始终指向两个小球
  const dx = ball3.position.x - ball2.position.x
  const dz = ball3.position.z - ball2.position.z
  line.rotation.z = Math.atan2(dx, dz)
  line.rotation.x = Math.PI / 2

  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
