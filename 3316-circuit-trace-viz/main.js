// 3316. Circuit Trace Viz
// PCB电路板走线可视化 - 程序化布线 + 信号传播动画
// type: circuit-trace-viz
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1a0a)
scene.fog = new THREE.FogExp2(0x0a1a0a, 0.015)
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 25, 25)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0x112211, 0.6))
const topLight = new THREE.DirectionalLight(0xaaffaa, 0.5)
topLight.position.set(0, 20, 0)
scene.add(topLight)

// PCB 绿色基板
const pcbGeo = new THREE.BoxGeometry(40, 0.3, 30)
const pcbMat = new THREE.MeshStandardMaterial({
  color: 0x004400,
  roughness: 0.3,
  metalness: 0.1
})
const pcb = new THREE.Mesh(pcbGeo, pcbMat)
pcb.receiveShadow = true
scene.add(pcb)

// 焊盘与元件
const pads = []
const traces = []
const components = []

function makePad(x, z, layer) {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16)
  const mat = new THREE.MeshStandardMaterial({ color: layer === 0 ? 0xddaa44 : 0x44aadd, metalness: 0.9, roughness: 0.2 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, 0.2, z)
  mesh.castShadow = true
  scene.add(mesh)
  pads.push({ mesh, x, z, layer, active: false, signal: 0 })
  return mesh
}

function makeIC(x, z, w, d, label) {
  const bodyGeo = new THREE.BoxGeometry(w, 0.6, d)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.set(x, 0.5, z)
  body.castShadow = true
  scene.add(body)
  // 引脚
  const pinGeo = new THREE.BoxGeometry(0.15, 0.1, 0.4)
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 })
  for (let i = 0; i < w * 2; i++) {
    const pin = new THREE.Mesh(pinGeo, pinMat)
    pin.position.set(x - w / 2 + i * 0.5 + 0.25, 0.75, z - d / 2 - 0.25)
    scene.add(pin)
  }
  for (let i = 0; i < w * 2; i++) {
    const pin = new THREE.Mesh(pinGeo, pinMat)
    pin.position.set(x - w / 2 + i * 0.5 + 0.25, 0.75, z + d / 2 + 0.25)
    scene.add(pin)
  }
  components.push({ mesh: body, x, z })
}

// IC 芯片
makeIC(-8, -5, 4, 3)
makeIC(6, 4, 3, 2)
makeIC(-5, 7, 2, 3)
makeIC(10, -8, 3, 2)

// 焊盘位置
const padPositions = [
  [-8, -5], [-7, -5], [-6, -5], [-5, -5],
  [6, 4], [7, 4], [8, 4],
  [-5, 7], [-5, 8],
  [10, -8], [11, -8],
  [-3, -5], [-9, -5],
  [6, 5], [6, 6],
  [-4, 7], [-6, 7]
]
for (const [x, z] of padPositions) makePad(x, z, 0)

// 程序化走线
function buildTrace(startX, startZ, endX, endZ, layer) {
  const geo = new THREE.BufferGeometry()
  const points = []
  const cx = startX, cz = startZ
  const ex = endX, ez = endZ
  
  // L型布线
  points.push(new THREE.Vector3(cx, 0.2, cz))
  if (Math.random() < 0.5) {
    points.push(new THREE.Vector3(ex, 0.2, cz))
  } else {
    points.push(new THREE.Vector3(cx, 0.2, ez))
  }
  points.push(new THREE.Vector3(ex, 0.2, ez))
  
  geo.setFromPoints(points)
  const color = layer === 0 ? 0xddaa44 : 0x44aadd
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 })
  const line = new THREE.Line(geo, mat)
  scene.add(line)
  
  // 过孔
  if (layer === 1) {
    const viaGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12)
    const viaMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 })
    const via = new THREE.Mesh(viaGeo, viaMat)
    via.position.set(ex, 0.2, ez)
    via.rotation.x = Math.PI / 2
    scene.add(via)
  }
  
  traces.push({ line, mat, startX, startZ, endX, endZ, layer, active: false, progress: 0, delay: Math.random() * 5 })
}

// 随机生成连接
const connections = [
  [[-8, -5], [-3, -5]], [[-5, -5], [-3, -5]], [[-3, -5], [6, 4]],
  [[6, 4], [6, 5]], [[7, 4], [8, 4]], [[6, 5], [6, 6]],
  [[-5, 7], [-5, 8]], [[-5, 7], [-4, 7]], [[-4, 7], [-6, 7]],
  [[10, -8], [11, -8]], [[-7, -5], [-9, -5]],
  [[6, 4], [10, -8]]
]
for (const [[sx, sz], [ex, ez]] of connections) {
  buildTrace(sx, sz, ex, ez, 0)
}

// 顶层布线（蓝色，跳跃）
for (let i = 0; i < 5; i++) {
  const sx = (Math.random() - 0.5) * 36
  const sz = (Math.random() - 0.5) * 26
  const ex = (Math.random() - 0.5) * 36
  const ez = (Math.random() - 0.5) * 26
  buildTrace(sx, sz, ex, ez, 1)
}

// 信号传播动画
let globalTime = 0
const signalGeo = new THREE.BufferGeometry()
const signalLine = new THREE.Line(
  signalGeo,
  new THREE.LineBasicMaterial({ color: 0x00ffaa })
)

let currentTrace = -1
let traceProgress = 0
let tracePhase = 'idle' // idle, propagating, done
const PROP_SPEED = 3.0 // units per second

function animateTrace(t) {
  if (tracePhase === 'idle') {
    currentTrace = (currentTrace + 1) % traces.length
    traceProgress = 0
    tracePhase = 'propagating'
  }
  
  if (tracePhase === 'propagating') {
    const tr = traces[currentTrace]
    traceProgress += 0.02 * PROP_SPEED
    
    // 构建传播点
    const sx = tr.startX, sz = tr.startZ
    const ex = tr.endX, ez = tr.endZ
    const tClamped = Math.min(traceProgress, 1)
    
    const signalPoints = []
    signalPoints.push(new THREE.Vector3(sx, 0.3, sz))
    if (Math.abs(ex - sx) > 0.1) {
      const midX = sx + (ex - sx) * Math.min(tClamped * 2, 1)
      signalPoints.push(new THREE.Vector3(midX, 0.3, sz))
    } else {
      const midZ = sz + (ez - sz) * Math.min(tClamped * 2, 1)
      signalPoints.push(new THREE.Vector3(sx, 0.3, midZ))
    }
    
    if (tClamped > 0.5) {
      const t2 = (tClamped - 0.5) * 2
      const mx2 = Math.abs(ex - sx) > 0.1 ? ex : sx
      const mz2 = Math.abs(ex - sx) > 0.1 ? sz : sz + (ez - sz) * Math.min(tClamped * 2, 1)
      signalPoints.push(new THREE.Vector3(mx2, 0.3, mz2))
      if (t2 > 0) {
        const ex2 = ex, ez2 = ez
        signalPoints.push(new THREE.Vector3(ex2, 0.3, ez2))
      }
    }
    
    if (signalPoints.length > 1) {
      signalGeo.setFromPoints(signalPoints)
      if (!signalLine.parent) scene.add(signalLine)
    }
    
    if (traceProgress >= 1) {
      tracePhase = 'done'
      setTimeout(() => {
        tracePhase = 'idle'
        scene.remove(signalLine)
      }, 800)
    }
  }
}

// 走线发光效果
function updateTraceGlow() {
  for (const tr of traces) {
    const dist = Math.abs(globalTime - tr.delay)
    const glow = Math.max(0, 1 - dist % 5)
    tr.mat.opacity = 0.3 + glow * 0.7
  }
}

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  globalTime += dt
  
  animateTrace(globalTime)
  updateTraceGlow()
  
  // 走线脉冲
  for (const tr of traces) {
    const pulse = Math.sin(globalTime * 2 + tr.delay * 3) * 0.3 + 0.7
    tr.mat.opacity = pulse
  }
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
