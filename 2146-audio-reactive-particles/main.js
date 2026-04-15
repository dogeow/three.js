// 2146. 音频响应粒子
// 音频响应粒子系统 - 增强版
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.015)

const camera = new THREE.PerspectiveCamera(80, innerWidth/innerHeight, 0.1, 2000)
camera.position.set(0, 15, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 20
controls.maxDistance = 200

// 粒子系统配置
const COUNT = 8000
const positions = new Float32Array(COUNT * 3)
const velocities = new Float32Array(COUNT * 3)
const colors = new Float32Array(COUNT * 3)
const sizes = new Float32Array(COUNT)
const phases = new Float32Array(COUNT)
const originalPositions = new Float32Array(COUNT * 3)

for (let i = 0; i < COUNT; i++) {
  // 球形分布
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = 15 + Math.random() * 25
  const x = r * Math.sin(phi) * Math.cos(theta)
  const y = r * Math.sin(phi) * Math.sin(theta)
  const z = r * Math.cos(phi)
  positions[i*3] = x
  positions[i*3+1] = y
  positions[i*3+2] = z
  originalPositions[i*3] = x
  originalPositions[i*3+1] = y
  originalPositions[i*3+2] = z
  
  velocities[i*3] = (Math.random() - 0.5) * 0.02
  velocities[i*3+1] = (Math.random() - 0.5) * 0.02
  velocities[i*3+2] = (Math.random() - 0.5) * 0.02
  
  // 彩虹色渐变
  const hue = Math.random()
  const c = new THREE.Color().setHSL(hue, 0.9, 0.6)
  colors[i*3] = c.r
  colors[i*3+1] = c.g
  colors[i*3+2] = c.b
  
  sizes[i] = 0.5 + Math.random() * 1.5
  phases[i] = Math.random() * Math.PI * 2
}

const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

// 粒子材质
const particleMat = new THREE.PointsMaterial({
  size: 0.8,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true
})

const particles = new THREE.Points(geo, particleMat)
scene.add(particles)

// 中心发光球
const coreGeo = new THREE.IcosahedronGeometry(3, 4)
const coreMat = new THREE.MeshBasicMaterial({ 
  color: 0x4488ff,
  transparent: true,
  opacity: 0.3,
  wireframe: true
})
const core = new THREE.Mesh(coreGeo, coreMat)
scene.add(core)

// 外层光晕
const glowGeo = new THREE.SphereGeometry(5, 32, 32)
const glowMat = new THREE.MeshBasicMaterial({
  color: 0x2244aa,
  transparent: true,
  opacity: 0.1
})
const glow = new THREE.Mesh(glowGeo, glowMat)
scene.add(glow)

// 环境光
scene.add(new THREE.AmbientLight(0x222244, 0.5))

// 鼠标交互
const mouse = new THREE.Vector2()
const targetMouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()

window.addEventListener('mousemove', (e) => {
  targetMouse.x = (e.clientX / innerWidth) * 2 - 1
  targetMouse.y = -(e.clientY / innerHeight) * 2 + 1
})

// 模拟音频数据
let audioBass = 0, audioMid = 0, audioHigh = 0
let targetBass = 0, targetMid = 0, targetHigh = 0

window.addEventListener('click', () => {
  // 模拟音频脉冲
  targetBass = Math.random() * 0.8 + 0.2
  targetMid = Math.random() * 0.6 + 0.2
  targetHigh = Math.random() * 0.5 + 0.2
})

const clock = new THREE.Clock()
const tempVec = new THREE.Vector3()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()
  
  // 平滑音频值
  audioBass += (targetBass - audioBass) * 0.05
  audioMid += (targetMid - audioMid) * 0.08
  audioHigh += (targetHigh - audioHigh) * 0.1
  targetBass *= 0.98
  targetMid *= 0.97
  targetHigh *= 0.96
  
  // 鼠标跟随
  mouse.lerp(targetMouse, 0.05)
  
  const pos = geo.attributes.position
  
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3
    const ox = originalPositions[i3]
    const oy = originalPositions[i3+1]
    const oz = originalPositions[i3+2]
    
    // 基于音频的脉动
    const dist = Math.sqrt(ox*ox + oy*oy + oz*oz)
    const normDist = dist / 40
    const bassEffect = audioBass * Math.sin(t * 3 + phases[i]) * (1 - normDist)
    const midEffect = audioMid * Math.sin(t * 5 + phases[i] * 2) * 0.5
    const highEffect = audioHigh * Math.sin(t * 8 + phases[i] * 3) * 0.3
    
    // 径向脉动
    const pulse = 1 + bassEffect * 0.3 + midEffect * 0.2
    pos.array[i3] = ox * pulse + velocities[i3] * (1 + audioMid * 2)
    pos.array[i3+1] = oy * pulse + velocities[i3+1] * (1 + audioMid * 2)
    pos.array[i3+2] = oz * pulse + velocities[i3+2] * (1 + audioMid * 2)
    
    // 鼠标吸引/排斥
    const mInfluence = mouse.length() * 0.5
    pos.array[i3] += mouse.x * mInfluence * (1 - normDist) * 0.3
    pos.array[i3+1] += mouse.y * mInfluence * (1 - normDist) * 0.3
    
    // 边界反弹
    if (Math.abs(pos.array[i3]) > 45) velocities[i3] *= -0.9
    if (Math.abs(pos.array[i3+1]) > 45) velocities[i3+1] *= -0.9
    if (Math.abs(pos.array[i3+2]) > 45) velocities[i3+2] *= -0.9
  }
  
  pos.needsUpdate = true
  
  // 核心球动画
  core.rotation.x = t * 0.3
  core.rotation.y = t * 0.5
  const coreScale = 1 + audioBass * 0.5
  core.scale.setScalar(coreScale)
  coreMat.opacity = 0.2 + audioBass * 0.3
  
  glow.scale.setScalar(1 + audioMid * 0.3)
  
  // 粒子系统整体旋转
  particles.rotation.y = t * 0.02
  particles.rotation.x = Math.sin(t * 0.1) * 0.1
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
