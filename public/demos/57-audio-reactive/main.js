import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 6, 20)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0, 0)

// ============ 灯光 ============
scene.add(new THREE.AmbientLight(0x222244, 1))

// ============ 频谱环形柱体 ============
const BAR_COUNT = 64
const bars = []
const barGroup = new THREE.Group()
scene.add(barGroup)

// 频谱颜色：低频(冷色) -> 高频(暖色)
function barColor(i) {
  const t = i / BAR_COUNT
  // 青 -> 洋红 -> 黄
  if (t < 0.5) {
    return new THREE.Color().setHSL(0.5 - t * 0.4, 1, 0.55)
  } else {
    return new THREE.Color().setHSL(0.9 - (t - 0.5) * 0.5, 1, 0.55)
  }
}

for (let i = 0; i < BAR_COUNT; i++) {
  const angle = (i / BAR_COUNT) * Math.PI * 2
  const radius = 6

  const geo = new THREE.BoxGeometry(0.22, 1, 0.22)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: barColor(i),
    emissiveIntensity: 1.5,
    metalness: 0.7,
    roughness: 0.3
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
  mesh.rotation.y = -angle

  barGroup.add(mesh)
  bars.push({ mesh, angle, baseY: 0, radius })
}

// ============ 中心 TorusKnot（低频脉冲） ============
const knotGeo = new THREE.TorusKnotGeometry(2.2, 0.6, 160, 24, 2, 3)
const knotMat = new THREE.MeshStandardMaterial({
  color: 0x110022,
  emissive: new THREE.Color(0x00ffff),
  emissiveIntensity: 0.6,
  metalness: 0.9,
  roughness: 0.2
})
const knot = new THREE.Mesh(knotGeo, knotMat)
scene.add(knot)

// 内圈光环
const ringGeo = new THREE.TorusGeometry(3.5, 0.05, 8, 80)
const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff })
const innerRing = new THREE.Mesh(ringGeo, ringMat)
innerRing.rotation.x = Math.PI / 2
scene.add(innerRing)

// ============ 加法混合粒子（高频响应） ============
const PARTICLE_COUNT = 800
const particleGeo = new THREE.BufferGeometry()
const positions = new Float32Array(PARTICLE_COUNT * 3)
const particleSizes = new Float32Array(PARTICLE_COUNT)

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI
  const r = 8 + Math.random() * 12
  positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
  positions[i * 3 + 2] = r * Math.cos(phi)
  particleSizes[i] = Math.random() * 2 + 0.5
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1))

const particleMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.08,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})

const particles = new THREE.Points(particleGeo, particleMat)
scene.add(particles)

// ============ Web Audio API ============
let audioCtx = null
let analyser = null
let dataArray = null
let isMicMode = false
let demoPhase = 0

// 合成音频：多频率正弦波 + 噪声
function getSyntheticFreq(index, total) {
  const t = index / total
  // 低频较强，高频较弱
  const bass   = Math.sin(demoPhase * 0.8 + t * 8) * 0.7
  const mid    = Math.sin(demoPhase * 2.1 + t * 16) * 0.4
  const high   = Math.sin(demoPhase * 5.3 + t * 32) * 0.2
  const noise  = (Math.random() - 0.5) * 0.15
  const raw = (bass + mid + high + noise + 1) * 0.5
  return Math.max(0, Math.min(255, raw * 220 + 35))
}

async function enableMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    source.connect(analyser)
    dataArray = new Uint8Array(analyser.frequencyBinCount)
    return true
  } catch (e) {
    alert('无法访问麦克风：' + e.message)
    return false
  }
}

// ============ UI 切换 ============
const toggleBtn = document.getElementById('toggleBtn')
const modeBadge = document.getElementById('modeBadge')

toggleBtn.addEventListener('click', async () => {
  if (!isMicMode) {
    const ok = await enableMicrophone()
    if (ok) {
      isMicMode = true
      toggleBtn.textContent = '切换到合成音频'
      toggleBtn.classList.add('active')
      modeBadge.textContent = '当前模式：麦克风输入'
    }
  } else {
    isMicMode = false
    if (audioCtx) {
      audioCtx.close()
      audioCtx = null
      analyser = null
      dataArray = null
    }
    toggleBtn.textContent = '切换到麦克风输入'
    toggleBtn.classList.remove('active')
    modeBadge.textContent = '当前模式：合成音频（演示）'
  }
})

// ============ 渲染循环 ============
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // 获取频谱数据
  let freqData
  if (isMicMode && analyser) {
    analyser.getByteFrequencyData(dataArray)
    freqData = dataArray
  } else {
    // 合成音频：随时间推进
    demoPhase += 0.03
    freqData = new Uint8Array(BAR_COUNT)
    for (let i = 0; i < BAR_COUNT; i++) {
      freqData[i] = getSyntheticFreq(i, BAR_COUNT)
    }
  }

  // ---- 更新环形柱体 ----
  // 只取前半段映射到 BAR_COUNT，保持环形对称
  const mappedLen = Math.min(freqData.length, BAR_COUNT)
  let totalEnergy = 0
  let bassEnergy = 0

  for (let i = 0; i < BAR_COUNT; i++) {
    const fi = Math.floor((i / BAR_COUNT) * mappedLen)
    const val = freqData[fi] || 0
    totalEnergy += val

    // 前 1/4 视为低频（Bass）
    if (i < BAR_COUNT / 4) bassEnergy += val

    const normalized = val / 255
    const bar = bars[i]

    // 高度随频谱值变化
    const height = normalized * 8 + 0.1
    bar.mesh.scale.y = height
    bar.mesh.position.y = height * 0.5

    // 发光强度随能量变化
    bar.mesh.material.emissiveIntensity = 0.5 + normalized * 2.5

    // 微小浮动
    bar.mesh.position.y += Math.sin(t * 3 + i * 0.5) * 0.05
  }

  // ---- 更新中心 TorusKnot（低频脉冲） ----
  const bassNorm = bassEnergy / (BAR_COUNT / 4) / 255
  const pulse = 1 + bassNorm * 0.4
  knot.scale.set(pulse, pulse, pulse)
  knot.rotation.x = t * 0.3
  knot.rotation.y = t * 0.4

  // 发光随低频增强
  knotMat.emissiveIntensity = 0.4 + bassNorm * 1.2

  // 颜色随低频在青/洋红之间漂移
  const hue = bassNorm * 0.3
  knotMat.emissive.setHSL(0.5 - hue, 1, 0.5)
  innerRing.material.color.setHSL(0.5 - hue, 1, 0.5)
  innerRing.scale.set(pulse * 0.95, pulse * 0.95, 1)

  // ---- 更新粒子（高频响应） ----
  const positions = particles.geometry.attributes.position.array
  const highNorm = totalEnergy / BAR_COUNT / 255

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ix = i * 3
    const ox = positions[ix]
    const oy = positions[ix + 1]
    const oz = positions[ix + 2]

    const dist = Math.sqrt(ox * ox + oy * oy + oz * oz)
    const offset = highNorm * 3 * Math.sin(t * 4 + i)

    positions[ix]     = ox * (1 + offset * 0.02)
    positions[ix + 1] = oy * (1 + offset * 0.02)
    positions[ix + 2] = oz * (1 + offset * 0.02)
  }
  particles.geometry.attributes.position.needsUpdate = true
  particleMat.opacity = 0.4 + highNorm * 0.6
  particleMat.size = 0.06 + highNorm * 0.12

  // 环形柱体整体旋转
  barGroup.rotation.y = t * 0.08

  // 粒子旋转
  particles.rotation.y = t * 0.05
  particles.rotation.x = t * 0.03

  controls.update()
  renderer.render(scene, camera)
}
animate()

// ============ 响应式 ============
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(devicePixelRatio)
})