// 3242. Lagrange Points Orbit
// 拉格朗日点轨道可视化 - 二体系统中5个平衡点的轨道动力学演示
// type: custom
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000008)
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 80, 100)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// Stars
const starGeo = new THREE.BufferGeometry()
const starPos = new Float32Array(4000 * 3)
for (let i = 0; i < 4000 * 3; i++) starPos[i] = (Math.random() - 0.5) * 2000
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })))

const params = {
  massRatio: 0.3,  // M2/M1 ratio
  showL1: true,
  showL2: true,
  showL3: true,
  showL4: true,
  showL5: true,
  showOrbits: true,
  showTestParticle: true,
  testParticle: 'L4',
  animSpeed: 1,
  orbitColor: 0x4488ff
}

const G = 0.5
const ORBIT_STEPS = 500

// Massive bodies
const m1 = 1000
const m2 = m1 * params.massRatio
const totalMass = m1 + m2

// Compute positions (normalized, COM at origin)
function getBodyPositions() {
  const r = 30
  const x1 = -m2 / totalMass * r
  const x2 = m1 / totalMass * r
  return { x1, x2 }
}

// Lagrange point positions (simplified coplanar)
function lagrangePoints(x1, x2, m1, m2) {
  const mu = m2 / (m1 + m2)
  const r = x2 - x1
  
  // L1: between the two masses
  const L1 = x1 + r * mu * 0.6
  // L2: beyond the smaller mass
  const L2 = x2 + r * (1 - mu) * 0.4
  // L3: opposite side of large mass
  const L3 = x1 - r * (1 - mu) * 0.8
  // L4: 60 degrees ahead
  const L4x = (x1 + x2) / 2
  const L4y = r * Math.sqrt(3) / 2 * 0.5
  // L5: 60 degrees behind
  const L5x = (x1 + x2) / 2
  const L5y = -r * Math.sqrt(3) / 2 * 0.5
  
  return [
    { pos: new THREE.Vector3(L1, 0, 0), label: 'L1', color: 0xff4444 },
    { pos: new THREE.Vector3(L2, 0, 0), label: 'L2', color: 0xff8800 },
    { pos: new THREE.Vector3(L3, 0, 0), label: 'L3', color: 0xff00ff },
    { pos: new THREE.Vector3(L4x, 0, L4y), label: 'L4', color: 0x00ff88 },
    { pos: new THREE.Vector3(L5x, 0, L5y), label: 'L5', color: 0x00ffff }
  ]
}

// Create body
function createBody(radius, color, emissive = 0) {
  const geo = new THREE.SphereGeometry(radius, 32, 32)
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.5,
    metalness: 0.2,
    roughness: 0.5
  })
  return new THREE.Mesh(geo, mat)
}

// Large mass (M1)
const body1 = createBody(5, 0xffdd00, 0xffaa00)
scene.add(body1)

// Small mass (M2)
const body2 = createBody(3, 0x4488ff, 0x2266ff)
scene.add(body2)

// L-point markers
const lMarkers = []
const lLabels = []
function createLMarker(lp) {
  const group = new THREE.Group()
  
  // Diamond marker
  const markerGeo = new THREE.OctahedronGeometry(1.5, 0)
  const markerMat = new THREE.MeshStandardMaterial({
    color: lp.color,
    emissive: lp.color,
    emissiveIntensity: 0.8,
    metalness: 0.5,
    roughness: 0.2
  })
  const marker = new THREE.Mesh(markerGeo, markerMat)
  group.add(marker)
  
  // Glow ring
  const ringGeo = new THREE.RingGeometry(2, 2.5, 6)
  const ringMat = new THREE.MeshBasicMaterial({ color: lp.color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = Math.PI / 2
  group.add(ring)
  
  // Label
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000008'
  ctx.fillRect(0, 0, 128, 64)
  ctx.fillStyle = '#' + lp.color.toString(16).padStart(6, '0')
  ctx.font = 'bold 36px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(lp.label, 64, 44)
  const tex = new THREE.CanvasTexture(canvas)
  const labelGeo = new THREE.PlaneGeometry(3, 1.5)
  const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  const label = new THREE.Mesh(labelGeo, labelMat)
  label.position.y = 3
  group.add(label)
  
  group.position.copy(lp.pos)
  return { group, marker, ring, lp }
}

let lPoints = []
function updateLPoints() {
  const { x1, x2 } = getBodyPositions()
  lPoints = lagrangePoints(x1, x2, m1, m2)
  
  // Remove old markers
  lMarkers.forEach(m => scene.remove(m.group))
  lMarkers.length = 0
  
  const showFns = [params.showL1, params.showL2, params.showL3, params.showL4, params.showL5]
  lPoints.forEach((lp, i) => {
    if (showFns[i]) {
      const m = createLMarker(lp)
      scene.add(m.group)
      lMarkers.push(m)
    }
  })
}
updateLPoints()

// Test particle
const testParticle = createBody(0.8, 0xffffff, 0xffffff)
scene.add(testParticle)
let testParticleTrail = []

const testTrails = []
function createTrail(color) {
  const positions = new Float32Array(ORBIT_STEPS * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.LineBasicMaterial({ color, opacity: 0.4, transparent: true })
  const line = new THREE.Line(geo, mat)
  scene.add(line)
  return { line, positions: [], index: 0 }
}

let currentTrail = null
function updateTestParticle(targetL) {
  if (currentTrail) {
    scene.remove(currentTrail.line)
  }
  currentTrail = createTrail(targetL.lp.color)
  testTrails.push(currentTrail)
}

function computeOrbit(lPoint, dt) {
  // Simplified Lissajous-like orbit around L4/L5
  const { x1, x2 } = getBodyPositions()
  const r = x2 - x1
  const baseY = lPoint.pos.z
  const baseX = lPoint.pos.x
  return {
    x: baseX + Math.cos(time * 0.5) * 3,
    y: Math.sin(time * 0.7) * 2,
    z: baseY + Math.sin(time * 0.5) * 3
  }
}

// Orbital path around L4/L5 (trojan orbits)
function computeTrojanOrbit(lp, t) {
  const amp = 4
  return new THREE.Vector3(
    lp.pos.x + amp * Math.cos(t * 0.3),
    amp * 0.3 * Math.sin(t * 0.5),
    lp.pos.z + amp * Math.sin(t * 0.3)
  )
}

let time = 0
let currentL = null

function animate() {
  requestAnimationFrame(animate)
  const dt = 0.016 * params.animSpeed
  time += dt
  
  const { x1, x2 } = getBodyPositions()
  body1.position.set(x1, 0, 0)
  body2.position.set(x2, 0, 0)
  
  // Rotate bodies slightly
  body1.rotation.y += 0.005 * params.animSpeed
  body2.rotation.y += 0.01 * params.animSpeed
  
  // Animate L markers
  lMarkers.forEach(m => {
    m.ring.rotation.z += 0.02 * params.animSpeed
    m.marker.rotation.y += 0.03 * params.animSpeed
  })
  
  // Test particle orbit
  if (params.showTestParticle && currentL) {
    const pos = computeTrojanOrbit(currentL.lp, time)
    testParticle.position.copy(pos)
    
    if (currentTrail) {
      currentTrail.positions.push(pos.clone())
      if (currentTrail.positions.length > ORBIT_STEPS) currentTrail.positions.shift()
      const posArr = currentTrail.line.geometry.attributes.position.array
      for (let i = 0; i < currentTrail.positions.length; i++) {
        posArr[i * 3] = currentTrail.positions[i].x
        posArr[i * 3 + 1] = currentTrail.positions[i].y
        posArr[i * 3 + 2] = currentTrail.positions[i].z
      }
      currentTrail.line.geometry.attributes.position.needsUpdate = true
      currentTrail.line.geometry.setDrawRange(0, currentTrail.positions.length)
    }
  }
  
  controls.update()
  renderer.render(scene, camera)
}
animate()

// GUI
const gui = new GUI()
gui.add(params, 'massRatio', 0.01, 0.5, 0.01).name('质量比 M2/M1').onChange(() => {
  updateLPoints()
  if (currentL) updateTestParticle(currentL.lp)
})
gui.add(params, 'showL1').name('显示 L1').onChange(updateLPoints)
gui.add(params, 'showL2').name('显示 L2').onChange(updateLPoints)
gui.add(params, 'showL3').name('显示 L3').onChange(updateLPoints)
gui.add(params, 'showL4').name('显示 L4 (特洛伊)').onChange(() => { updateLPoints(); if (currentL && currentL.lp.label !== 'L4') { currentL = lMarkers.find(m => m.lp.label === 'L4'); if (currentL) updateTestParticle(currentL.lp) } })
gui.add(params, 'showL5').name('显示 L5 (特洛伊)').onChange(() => { updateLPoints(); if (currentL && currentL.lp.label !== 'L5') { currentL = lMarkers.find(m => m.lp.label === 'L5'); if (currentL) updateTestParticle(currentL.lp) } })
gui.add(params, 'showTestParticle').name('显示试验质点')
gui.add(params, 'animSpeed', 0.1, 5, 0.1).name('动画速度')
gui.add({ orbitL4: () => { currentL = lMarkers.find(m => m.lp.label === 'L4'); if (currentL) updateTestParticle(currentL.lp) } }, 'orbitL4').name('→ 轨道 L4')
gui.add({ orbitL5: () => { currentL = lMarkers.find(m => m.lp.label === 'L5'); if (currentL) updateTestParticle(currentL.lp) } }, 'orbitL5').name('→ 轨道 L5')

// Start with L4 orbit
setTimeout(() => {
  const l4 = lMarkers.find(m => m.lp.label === 'L4')
  if (l4) { currentL = l4; updateTestParticle(l4.lp) }
}, 100)

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
