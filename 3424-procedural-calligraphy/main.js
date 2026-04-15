// Procedural Calligraphy - Brush Stroke Simulation
import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf5f0e8)
const camera = new THREE.OrthographicCamera(-25, 25, 18, -18, 0.1, 100)
camera.position.set(0, 0, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// Canvas for ink rendering
const canvas = document.createElement('canvas')
canvas.width = 2048
canvas.height = 1440
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#f5f0e8'
ctx.fillRect(0, 0, 2048, 1440)

const texture = new THREE.CanvasTexture(canvas)
const planeGeo = new THREE.PlaneGeometry(50, 35)
const planeMat = new THREE.MeshBasicMaterial({ map: texture })
const canvasMesh = new THREE.Mesh(planeGeo, planeMat)
canvasMesh.position.z = -2
scene.add(canvasMesh)

// Brush colors
const colors = ['#1a1a2e', '#c41e3a', '#1e5631', '#0a3d62', '#7b2d26']
const params = {
  brushSize: 8,
  pressure: 0.8,
  inkDensity: 0.9,
  color: 0,
  wetness: 0.3,
  springiness: 0.4,
  clear: () => { ctx.fillStyle = '#f5f0e8'; ctx.fillRect(0, 0, 2048, 1440); texture.needsUpdate = true },
  char: '永'
}

// Spring-based brush
class BrushTip {
  constructor() {
    this.x = 0; this.y = 0
    this.vx = 0; this.vy = 0
    this.tx = 0; this.ty = 0
    this.angle = 0
    this.angularV = 0
  }
  update(dt) {
    const k = 10 * params.springiness
    const damp = 0.7
    const fx = (this.tx - this.x) * k - this.vx * damp
    const fy = (this.ty - this.y) * k - this.vy * damp
    this.vx += fx * dt
    this.vy += fy * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    // Angular spring
    const targetAngle = Math.atan2(this.vy, this.vx)
    this.angularV += (targetAngle - this.angle) * 5 - this.angularV * 0.5
    this.angle += this.angularV * dt
  }
}

const brush = new BrushTip()
let isDrawing = false
let lastX = 0, lastY = 0
let strokePoints = []
let allStrokes = []

// Convert screen to canvas coords
function screenToCanvas(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect()
  const nx = (clientX - rect.left) / rect.width
  const ny = (clientY - rect.top) / rect.height
  return { x: nx * 2048, y: ny * 1440 }
}

// Bezier stroke drawing
function drawStroke(points) {
  if (points.length < 2) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const col = colors[params.color]
  for (let i = 1; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 2)]
    const p1 = points[i - 1]
    const p2 = points[i]
    const t = i / points.length
    const w = params.brushSize * (0.3 + t * 0.7) * (0.5 + p1.pressure * 0.5)
    ctx.strokeStyle = col
    ctx.globalAlpha = params.inkDensity
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2
    ctx.quadraticCurveTo(p1.x, p1.y, mx, my)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // Ink spread effect
  if (params.wetness > 0.1) {
    ctx.globalAlpha = params.wetness * 0.3
    for (let i = 1; i < points.length; i++) {
      const p = points[i]
      const spread = w => 0.3 * params.wetness
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, w * 1.2, w * 0.8, brush.angle, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

// Auto-draw Chinese character "永"
function autoDrawChar() {
  const cx = 1024, cy = 720
  const scale = 5
  // 永: dot, horizontal, left-falling, right-falling, hook
  const strokes = [
    // Dot (dian)
    { pts: [{ x: 0, y: -6 }, { x: 2, y: -5 }, { x: 1, y: -3 }, { x: 0, y: -2 }], scale: 1 },
    // Horizontal (heng)
    { pts: [{ x: -4, y: -2 }, { x: -2, y: -2.2 }, { x: 0, y: -2 }, { x: 4, y: -2.5 }, { x: 5, y: -2 }], scale: 1.2 },
    // Left falling (pie)
    { pts: [{ x: -3, y: -2 }, { x: -1, y: 0 }, { x: -2, y: 3 }, { x: -3, y: 5 }], scale: 1.1 },
    // Right falling (na)
    { pts: [{ x: 2, y: -2 }, { x: 4, y: 1 }, { x: 5, y: 3 }, { x: 4, y: 5 }], scale: 1.1 },
    // Hook (gou)
    { pts: [{ x: -1, y: 2 }, { x: 1, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 4 }, { x: 3, y: 5 }], scale: 0.9 },
  ]
  allStrokes = []
  for (const stroke of strokes) {
    const pts = stroke.pts.map(p => ({
      x: cx + p.x * scale * stroke.scale,
      y: cy + p.y * scale * stroke.scale,
      pressure: 0.7 + Math.random() * 0.3
    }))
    allStrokes.push(pts)
    drawStroke(pts)
  }
  texture.needsUpdate = true
}

// Mouse events
renderer.domElement.addEventListener('mousedown', e => {
  if (e.button !== 0) return
  isDrawing = true
  const { x, y } = screenToCanvas(e.clientX, e.clientY)
  brush.tx = x / 80 - 12.8; brush.ty = -(y / 80 - 9)
  brush.x = brush.tx; brush.y = brush.ty
  lastX = brush.x; lastY = brush.y
  strokePoints = [{ x: brush.x * 80 + 1024, y: (18 - brush.y) * 80, pressure: params.pressure }]
})

renderer.domElement.addEventListener('mousemove', e => {
  if (!isDrawing) return
  const { x, y } = screenToCanvas(e.clientX, e.clientY)
  brush.tx = x / 80 - 12.8; brush.ty = -(y / 80 - 9)
  const dx = brush.tx - lastX, dy = brush.ty - lastY
  if (dx * dx + dy * dy > 0.001) {
    lastX = brush.x; lastY = brush.y
    strokePoints.push({ x: brush.x * 80 + 1024, y: (18 - brush.y) * 80, pressure: params.pressure })
    if (strokePoints.length > 1) {
      const p = strokePoints[strokePoints.length - 1]
      const pp = strokePoints[strokePoints.length - 2]
      ctx.strokeStyle = colors[params.color]
      ctx.lineWidth = params.brushSize * 0.8
      ctx.lineCap = 'round'
      ctx.globalAlpha = params.inkDensity
      ctx.beginPath()
      ctx.moveTo(pp.x, pp.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      ctx.globalAlpha = 1
      texture.needsUpdate = true
    }
  }
})

renderer.domElement.addEventListener('mouseup', () => {
  if (isDrawing) { isDrawing = false; strokePoints = [] }
})
renderer.domElement.addEventListener('mouseleave', () => { isDrawing = false; strokePoints = [] })

// GUI
const gui = new GUI()
gui.addColor({ c: colors[0] }, 'c').name('墨色').onChange(v => { const i = colors.indexOf(v); if (i >= 0) params.color = i })
gui.add(params, 'brushSize', 2, 30, 0.5).name('笔触大小')
gui.add(params, 'pressure', 0.1, 1.0, 0.05).name('压力')
gui.add(params, 'inkDensity', 0.3, 1.0, 0.05).name('墨色浓度')
gui.add(params, 'wetness', 0, 0.8, 0.05).name('湿润晕染')
gui.add(params, 'springiness', 0, 1, 0.05).name('弹性')
gui.add(params, 'clear').name('清除')
gui.add(params, 'char').name('书写永字')

// Draw initial character
autoDrawChar()

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  if (isDrawing) brush.update(dt)
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  renderer.setSize(innerWidth, innerHeight)
})
