// 2092. 音频响应粒子系统 - 增强版
// 功能：8000粒子 + 多色渐变 + 螺旋运动 + 脉冲呼吸效果
import * as THREE from 'three'

// ============================================================
// 场景初始化
// ============================================================
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000)
camera.position.z = 60

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

// 添加背景星云效果（淡淡的深蓝紫渐变）
scene.background = new THREE.Color(0x050510)
scene.fog = new THREE.FogExp2(0x050510, 0.008)

// ============================================================
// 粒子系统参数
// ============================================================
const PARTICLE_COUNT = 8000        // 粒子总数
const SPHERE_RADIUS = 35            // 粒子分布球体半径
const SPIRAL_SPEED = 0.3            // 螺旋旋转速度
const PULSE_SPEED = 1.2             // 脉冲呼吸频率
const COLOR_PALETTE = [             // 多色渐变调色板
  new THREE.Color(0xff3366),        // 玫红
  new THREE.Color(0xff6633),        // 橙红
  new THREE.Color(0xffcc00),        // 金黄
  new THREE.Color(0x33ff99),        // 青绿
  new THREE.Color(0x33ccff),        // 天蓝
  new THREE.Color(0x6633ff),        // 蓝紫
  new THREE.Color(0xff33cc),        // 粉紫
]

// ============================================================
// 粒子数据初始化
// ============================================================
const positions = new Float32Array(PARTICLE_COUNT * 3)
const velocities = new Float32Array(PARTICLE_COUNT * 3)
const colors = new Float32Array(PARTICLE_COUNT * 3)
const phases = new Float32Array(PARTICLE_COUNT)     // 每个粒子的独立相位
const spirals = new Float32Array(PARTICLE_COUNT)    // 螺旋参数
const baseSizes = new Float32Array(PARTICLE_COUNT)  // 粒子基础大小

for (let i = 0; i < PARTICLE_COUNT; i++) {
  // 随机球形分布初始位置
  const r = Math.random() * SPHERE_RADIUS
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)

  positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
  positions[i * 3 + 2] = r * Math.cos(phi)

  // 速度：向外扩散 + 随机扰动
  velocities[i * 3]     = (Math.random() - 0.5) * 0.05
  velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05
  velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05

  // 多色：根据粒子索引在调色板中选取颜色，并做平滑渐变
  const colorIdx = (i / PARTICLE_COUNT) * COLOR_PALETTE.length
  const idx0 = Math.floor(colorIdx) % COLOR_PALETTE.length
  const idx1 = (idx0 + 1) % COLOR_PALETTE.length
  const t = colorIdx - Math.floor(colorIdx)
  const mixed = COLOR_PALETTE[idx0].clone().lerp(COLOR_PALETTE[idx1], t)
  colors[i * 3]     = mixed.r
  colors[i * 3 + 1] = mixed.g
  colors[i * 3 + 2] = mixed.b

  // 独立相位，让粒子呼吸节奏不同步
  phases[i] = Math.random() * Math.PI * 2

  // 螺旋参数：每粒子有不同的螺旋密度
  spirals[i] = 0.5 + Math.random() * 1.5

  // 粒子大小变化范围
  baseSizes[i] = 0.08 + Math.random() * 0.12
}

// ============================================================
// 构建几何体与材质
// ============================================================
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

// 粒子材质：带透明度、大小衰减
const mat = new THREE.PointsMaterial({
  size: 0.15,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending,  // 加法混合，产生发光效果
  depthWrite: false,
})

const particles = new THREE.Points(geo, mat)
scene.add(particles)

// 添加中心发光球体（脉冲核心）
const coreGeo = new THREE.SphereGeometry(2, 32, 32)
const coreMat = new THREE.MeshBasicMaterial({
  color: 0xffcc00,
  transparent: true,
  opacity: 0.3,
})
const core = new THREE.Mesh(coreGeo, coreMat)
scene.add(core)

// 外层光晕
const glowGeo = new THREE.SphereGeometry(4, 32, 32)
const glowMat = new THREE.MeshBasicMaterial({
  color: 0xff6600,
  transparent: true,
  opacity: 0.1,
  blending: THREE.AdditiveBlending,
})
const glow = new THREE.Mesh(glowGeo, glowMat)
scene.add(glow)

// 环境光
scene.add(new THREE.AmbientLight(0xffffff, 0.3))

// ============================================================
// 音频模拟（无音频输入时使用正弦波模拟节奏）
// ============================================================
let audioLevel = 0   // 当前"音频强度" 0~1

function simulateAudio(t) {
  // 用多个频率叠加模拟音频节拍感
  audioLevel =
    0.5 +
    0.3 * Math.sin(t * 2.1) +
    0.2 * Math.sin(t * 3.7) +
    0.15 * Math.sin(t * 5.3)
  audioLevel = Math.max(0, Math.min(1, audioLevel / 3))
}

// ============================================================
// 动画主循环
// ============================================================
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  const t = clock.getElapsedTime()
  const pos = geo.attributes.position

  // 模拟音频强度
  simulateAudio(t)

  // 脉冲因子：随时间和音频强度共同驱动
  const pulse = 0.5 + 0.5 * Math.sin(t * PULSE_SPEED)
  const audioPulse = audioLevel

  // 核心球体随脉冲呼吸缩放
  const coreScale = 1 + pulse * 0.4 + audioPulse * 0.3
  core.scale.setScalar(coreScale)
  coreMat.opacity = 0.2 + pulse * 0.2

  // 光晕跟随脉冲
  glow.scale.setScalar(coreScale * 1.8)
  glowMat.opacity = 0.05 + pulse * 0.1 + audioPulse * 0.08

  // 粒子颜色随脉冲微微变化（亮度调制）
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ix = i * 3
    const iy = i * 3 + 1
    const iz = i * 3 + 2

    // 螺旋运动：绕 Y 轴旋转
    const spiralFactor = spirals[i]
    const angle = t * SPIRAL_SPEED * spiralFactor + i * 0.001
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    // 原始位置
    const ox = pos.array[ix]
    const oy = pos.array[iy]
    const oz = pos.array[iz]

    // 螺旋变换（XY平面旋转）
    pos.array[ix] = ox * cosA - oy * sinA
    pos.array[iy] = ox * sinA + oy * cosA
    pos.array[iz] = oz

    // 粒子向内收缩 + 呼吸效果
    const breathe = 1 + Math.sin(t * PULSE_SPEED + phases[i]) * 0.05
    pos.array[ix] *= breathe
    pos.array[iy] *= breathe

    // 音频响应：粒子根据音频强度向外爆发
    const expand = 1 + audioPulse * 0.2 * Math.sin(t * 3 + phases[i])
    pos.array[ix] *= expand
    pos.array[iy] *= expand
    pos.array[iz] *= expand

    // 边界反弹（球形边界）
    const dist = Math.sqrt(
      pos.array[ix] ** 2 + pos.array[iy] ** 2 + pos.array[iz] ** 2
    )
    if (dist > SPHERE_RADIUS * 1.2) {
      const scale = (SPHERE_RADIUS * 0.8) / dist
      pos.array[ix] *= scale
      pos.array[iy] *= scale
      pos.array[iz] *= scale
    }

    // 颜色亮度随脉冲微微闪烁
    const brightness = 0.8 + pulse * 0.2 + audioPulse * 0.3
    const baseColor = new THREE.Color(colors[ix], colors[iy], colors[iz])
    const brightened = baseColor.clone().multiplyScalar(brightness)
    geo.attributes.color.array[ix] = brightened.r
    geo.attributes.color.array[iy] = brightened.g
    geo.attributes.color.array[iz] = brightened.b
  }

  pos.needsUpdate = true
  geo.attributes.color.needsUpdate = true

  // 摄像机轻微摆动，增强空间感
  camera.position.x = Math.sin(t * 0.2) * 3
  camera.position.y = Math.cos(t * 0.15) * 3
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
}

animate()

// ============================================================
// 响应式窗口调整
// ============================================================
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
})
