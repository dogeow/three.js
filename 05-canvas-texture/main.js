import * as THREE from 'three'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 1.5, 7)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(3, 4, 5)
scene.add(light)

// ============ 工具函数 ============

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ============ 1. 时钟 ============
// 左球：Canvas 上实时绘制时钟，每帧更新时分秒指针

const clockCanvas = makeCanvas(256, 256)
const clockCtx = clockCanvas.getContext('2d')
const clockTex = new THREE.CanvasTexture(clockCanvas)

function drawClock(ctx, w, h) {
  const cx = w / 2, cy = h / 2, r = w * 0.42
  ctx.clearRect(0, 0, w, h)

  // 背景
  ctx.fillStyle = '#1a1a2e'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // 边框
  ctx.strokeStyle = '#4fc3f7'
  ctx.lineWidth = 4
  ctx.stroke()

  // 刻度
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
    const x1 = cx + Math.cos(angle) * (r - 10)
    const y1 = cy + Math.sin(angle) * (r - 10)
    const x2 = cx + Math.cos(angle) * (r - 2)
    const y2 = cy + Math.sin(angle) * (r - 2)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = i % 3 === 0 ? 3 : 1.5
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  const now = new Date()
  const sec = now.getSeconds() + now.getMilliseconds() / 1000
  const min = now.getMinutes() + sec / 60
  const hr  = (now.getHours() % 12) + min / 60

  // 秒针（红）
  const secA = (sec / 60) * Math.PI * 2 - Math.PI / 2
  ctx.strokeStyle = '#e74c3c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(secA) * (r * 0.85), cy + Math.sin(secA) * (r * 0.85))
  ctx.stroke()

  // 分针（白）
  const minA = (min / 60) * Math.PI * 2 - Math.PI / 2
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(minA) * (r * 0.7), cy + Math.sin(minA) * (r * 0.7))
  ctx.stroke()

  // 时针（蓝）
  const hrA = (hr / 12) * Math.PI * 2 - Math.PI / 2
  ctx.strokeStyle = '#4fc3f7'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(hrA) * (r * 0.5), cy + Math.sin(hrA) * (r * 0.5))
  ctx.stroke()

  // 中心圆
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.fill()

  // 数字时间文字
  ctx.fillStyle = '#aaa'
  ctx.font = '14px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(
    `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`,
    cx, cy + r + 18
  )
}

drawClock(clockCtx, 256, 256)
clockTex.needsUpdate = true

const clockMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshStandardMaterial({ map: clockTex })
)
clockMesh.position.x = -3.5
scene.add(clockMesh)

// ============ 2. 雷达波纹 ============
// 中球：Canvas 上绘制不断扩散的同心圆，模拟雷达扫描

const radarCanvas = makeCanvas(256, 256)
const radarCtx = radarCanvas.getContext('2d')
const radarTex = new THREE.CanvasTexture(radarCanvas)

let radarTime = 0

function drawRadar(ctx, w, h) {
  const cx = w / 2, cy = h / 2, r = w * 0.42
  ctx.clearRect(0, 0, w, h)

  // 背景
  ctx.fillStyle = '#0a1f0a'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // 边框
  ctx.strokeStyle = '#00e676'
  ctx.lineWidth = 3
  ctx.stroke()

  // 同心圆
  for (let i = 1; i <= 4; i++) {
    ctx.strokeStyle = `rgba(0,230,118,${0.15 * i})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, (r / 4) * i, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 十字线
  ctx.strokeStyle = 'rgba(0,230,118,0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx + r, cy)
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx, cy + r)
  ctx.stroke()

  // 扩散波（3 个，随时间向外扩散并淡出）
  for (let waveIdx = 0; waveIdx < 3; waveIdx++) {
    const phase = (radarTime * 0.6 + waveIdx / 3) % 1  // 0~1
    const waveR = r * phase
    const alpha = 1 - phase
    ctx.strokeStyle = `rgba(0,230,118,${alpha})`
    ctx.lineWidth = 2.5 * (1 - phase * 0.5)
    ctx.beginPath()
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 中心亮点
  ctx.fillStyle = '#00e676'
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.fill()
}

drawRadar(radarCtx, 256, 256)
radarTex.needsUpdate = true

const radarMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshStandardMaterial({ map: radarTex })
)
radarMesh.position.x = 0
scene.add(radarMesh)

// ============ 3. 随时间变色的渐变纹理 ============
// 右球：Canvas 上绘制动态渐变，颜色随时间连续变化

const gradientCanvas = makeCanvas(256, 256)
const gradientCtx = gradientCanvas.getContext('2d')
const gradientTex = new THREE.CanvasTexture(gradientCanvas)

let colorOffset = 0

function drawGradient(ctx, w, h, offset) {
  ctx.clearRect(0, 0, w, h)

  const cx = w / 2, cy = h / 2, r = w * 0.42

  // HSL 色相随时间转动，产生彩虹效果
  const hue1 = (offset * 360) % 360
  const hue2 = (hue1 + 120) % 360
  const hue3 = (hue1 + 240) % 360

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  grad.addColorStop(0,   `hsla(${hue1},90%,60%,1)`)
  grad.addColorStop(0.5, `hsla(${hue2},90%,50%,1)`)
  grad.addColorStop(1,   `hsla(${hue3},90%,40%,1)`)

  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // 边框
  ctx.strokeStyle = `hsla(${hue1},80%,70%,0.8)`
  ctx.lineWidth = 4
  ctx.stroke()

  // 高光
  const shine = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r)
  shine.addColorStop(0,    'rgba(255,255,255,0.5)')
  shine.addColorStop(0.3,  'rgba(255,255,255,0.1)')
  shine.addColorStop(1,    'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // 底部色相数值
  ctx.fillStyle = '#fff'
  ctx.font = '13px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`HUE: ${Math.round(hue1)}\u00b0`, cx, cy + r + 18)
}

drawGradient(gradientCtx, 256, 256, 0)
gradientTex.needsUpdate = true

const gradientMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshStandardMaterial({ map: gradientTex })
)
gradientMesh.position.x = 3.5
scene.add(gradientMesh)

// ============ 标注文字（用 Sprites 实现） ============

function makeLabel(text, color) {
  const c = makeCanvas(512, 64)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 512, 64)
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  roundRect(ctx, 0, 0, 512, 64, 8)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = 'bold 28px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 32)

  const tex = new THREE.CanvasTexture(c)
  const mat = new THREE.SpriteMaterial({ map: tex })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(3, 0.375, 1)
  return sprite
}

const label1 = makeLabel('\u65f6\u949f  Clock', '#4fc3f7')
label1.position.set(-3.5, -1.8, 0)
scene.add(label1)

const label2 = makeLabel('\u96f7\u8fbe\u6ce2  Radar', '#00e676')
label2.position.set(0, -1.8, 0)
scene.add(label2)

const label3 = makeLabel('\u53d8\u8272\u6e10\u53d8  Gradient', '#ff9800')
label3.position.set(3.5, -1.8, 0)
scene.add(label3)

// ============ 渲染循环 ============

function animate() {
  requestAnimationFrame(animate)

  radarTime += 0.016
  colorOffset = (colorOffset + 0.008) % 1

  // 每帧重绘三个 Canvas
  drawClock(clockCtx, 256, 256)
  clockTex.needsUpdate = true

  drawRadar(radarCtx, 256, 256)
  radarTex.needsUpdate = true

  drawGradient(gradientCtx, 256, 256, colorOffset)
  gradientTex.needsUpdate = true

  // 球体慢速旋转，方便从各角度观察
  clockMesh.rotation.y   += 0.004
  radarMesh.rotation.y    += 0.006
  gradientMesh.rotation.y += 0.005

  renderer.render(scene, camera)
}
animate()

// ============ 响应窗口大小变化 ============

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})