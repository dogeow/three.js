// Abstract Expressionism - Jackson Pollock Style Drip Painting
import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1510)
const camera = new THREE.OrthographicCamera(-25, 25, 18, -18, 0.1, 100)
camera.position.set(0, 0, 50)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// Canvas for paint drips
const canvas = document.createElement('canvas')
canvas.width = 1024
canvas.height = 768
const ctx = canvas.getContext('2d')

const texture = new THREE.CanvasTexture(canvas)
const planeGeo = new THREE.PlaneGeometry(50, 36)
const planeMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
const canvasMesh = new THREE.Mesh(planeGeo, planeMat)
canvasMesh.position.z = -5
scene.add(canvasMesh)

// Paint colors
const palette = [
  '#e63946', '#f4a261', '#2a9d8f', '#264653', '#e9c46a',
  '#a8dadc', '#457b9d', '#1d3557', '#ffb703', '#8ecae6',
  '#ffffff', '#cccccc'
]
const params = {
  color: 0,
  gravity: 9.8,
  viscosity: 0.85,
  splatter: 0.6,
  brushSize: 8,
  clearCanvas: () => { ctx.fillStyle = '#1a1510'; ctx.fillRect(0, 0, 1024, 768); texture.needsUpdate = true },
  drip: true,
  splatMode: true
}

ctx.fillStyle = '#1a1510'
ctx.fillRect(0, 0, 1024, 768)

// Particles for drips
const drips = []
const MAX_DROPS = 2000

class Drip {
  constructor() { this.reset() }
  reset() {
    this.x = 512 + (Math.random() - 0.5) * 600
    this.y = -10
    this.vx = (Math.random() - 0.5) * 30
    this.vy = Math.random() * 5 + 2
    this.life = 1.0
    this.size = params.brushSize * (0.5 + Math.random() * 1.5)
    this.color = palette[Math.floor(Math.random() * palette.length)]
    this.trail = []
    this.splatted = false
  }
  update(dt) {
    if (this.splatted) { this.life -= dt * 0.5; return }
    this.vy += params.gravity * dt * 15
    this.vx *= params.viscosity
    this.x += this.vx * dt * 20
    this.y += this.vy * dt * 20
    this.trail.push({ x: this.x, y: this.y, s: this.size * 0.5 })
    if (this.trail.length > 30) this.trail.shift()
    const canvasY = this.y + 384
    if (canvasY > 768) {
      this.splat()
    } else if (this.x < 0 || this.x > 1024) {
      this.splatted = true
    }
  }
  draw() {
    if (this.splatted) {
      ctx.globalAlpha = Math.max(0, this.life)
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.arc(this.x, this.y + 384, this.size * 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      return
    }
    ctx.strokeStyle = this.color
    ctx.lineCap = 'round'
    for (let i = 1; i < this.trail.length; i++) {
      const t0 = this.trail[i - 1], t1 = this.trail[i]
      ctx.lineWidth = t1.s * (i / this.trail.length)
      ctx.beginPath()
      ctx.moveTo(t0.x, t0.y + 384)
      ctx.lineTo(t1.x, t1.y + 384)
      ctx.stroke()
    }
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y + 384, this.size * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  splat() {
    this.splatted = true
    this.life = 0.8 + Math.random() * 0.4
    // Big splat
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y + 384, this.size * 2, 0, Math.PI * 2)
    ctx.fill()
    // Splatter drops
    if (Math.random() < params.splatter) {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2
        const dist = this.size * (1 + Math.random() * 2)
        ctx.beginPath()
        ctx.arc(this.x + Math.cos(angle) * dist, this.y + 384 + Math.sin(angle) * dist, this.size * 0.3 * Math.random(), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

// Initialize
for (let i = 0; i < 60; i++) drips.push(new Drip())

// Canvas click to add drips
renderer.domElement.addEventListener('click', e => {
  const rect = renderer.domElement.getBoundingClientRect()
  const cx = (e.clientX - rect.left) / rect.width * 1024
  const cy = (e.clientY - rect.top) / rect.height * 768
  for (let i = 0; i < 8; i++) {
    const d = new Drip()
    d.x = cx + (Math.random() - 0.5) * 50
    d.y = cy - 384 - Math.random() * 30
    d.vy = Math.random() * 3
    drips.push(d)
    if (drips.length > MAX_DROPS) drips.shift()
  }
  texture.needsUpdate = true
})

const gui = new GUI()
gui.add(params, 'clearCanvas').name('清除画布')
gui.addColor({ c: params.color }, 'c').name('当前颜色').onChange(v => {
  const idx = palette.indexOf(v) >= 0 ? palette.indexOf(v) : 0
  document.body.style.cursor = `crosshair`
})
gui.add(params, 'gravity', 1, 25, 0.5).name('重力')
gui.add(params, 'viscosity', 0.5, 1.0, 0.01).name('粘度')
gui.add(params, 'splatter', 0, 1, 0.05).name('飞溅度')
gui.add(params, 'brushSize', 2, 30, 1).name('笔刷大小')

const clock = new THREE.Clock()
let frameCount = 0
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  frameCount++
  // Spawn new drips
  if (frameCount % 3 === 0 && drips.length < MAX_DROPS) {
    drips.push(new Drip())
  }
  // Update
  for (let i = drips.length - 1; i >= 0; i--) {
    drips[i].update(dt)
    if (drips[i].life <= 0) drips.splice(i, 1)
  }
  // Redraw canvas
  ctx.fillStyle = '#1a1510'
  ctx.globalAlpha = 0.05
  ctx.fillRect(0, 0, 1024, 768)
  ctx.globalAlpha = 1
  for (const d of drips) d.draw()
  texture.needsUpdate = true
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  renderer.setSize(innerWidth, innerHeight)
})
