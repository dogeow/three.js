// 4235. Spacetime Minkowski Diagram
// Special relativity visualization with Lorentz transformation
// type: physics-visualization

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a12)
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500)
camera.position.set(0, 25, 65)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI * 0.9
controls.minDistance = 20

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
scene.add(new THREE.DirectionalLight(0xffffff, 0.8))

const SCALE = 3

// ct axis - Y axis, x axis - X axis, space-y - Z axis
function addLine(pts, color, opacity=0.9) {
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color, opacity, transparent: true })
  scene.add(new THREE.Line(geo, mat))
}

// Frame A axes
addLine([new THREE.Vector3(-40,0,0), new THREE.Vector3(40,0,0)], 0xff4444, 0.7) // x
addLine([new THREE.Vector3(0,-40,0), new THREE.Vector3(0,40,0)], 0x44ff44, 0.7) // ct
addLine([new THREE.Vector3(0,0,-40), new THREE.Vector3(0,0,40)], 0x4466ff, 0.5) // y

// Time hyperplanes (grid on X-Y plane at different ct)
for (let t = -12; t <= 12; t++) {
  const geo = new THREE.BufferGeometry()
  const pts = []
  for (let x = -15; x <= 15; x++) {
    pts.push(new THREE.Vector3(x*SCALE, t*SCALE, -30))
    pts.push(new THREE.Vector3(x*SCALE, t*SCALE, 30))
  }
  for (let y2 = -15; y2 <= 15; y2++) {
    pts.push(new THREE.Vector3(-30, t*SCALE, y2*SCALE))
    pts.push(new THREE.Vector3(30, t*SCALE, y2*SCALE))
  }
  geo.setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color: 0x223355, opacity: Math.max(0.05, 0.35 - Math.abs(t)*0.02), transparent: true })
  scene.add(new THREE.LineSegments(geo, mat))
}

// Light cone
function makeLightCone() {
  const pts = []
  for (let t = -12; t <= 12; t += 0.3) {
    const s = t * SCALE
    pts.push(new THREE.Vector3(0, t*SCALE, 0), new THREE.Vector3(s, t*SCALE, s))
    pts.push(new THREE.Vector3(0, t*SCALE, 0), new THREE.Vector3(-s, t*SCALE, s))
    pts.push(new THREE.Vector3(0, t*SCALE, 0), new THREE.Vector3(s, t*SCALE, -s))
    pts.push(new THREE.Vector3(0, t*SCALE, 0), new THREE.Vector3(-s, t*SCALE, -s))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color: 0xffee44, opacity: 0.4, transparent: true })
  scene.add(new THREE.LineSegments(geo, mat))
}
makeLightCone()

// Lorentz factor
function gamma(v) { return 1 / Math.sqrt(1 - v*v) }

// Worldlines for objects at different velocities
const worldlines = []
const velocities = [-0.6, -0.3, 0.0, 0.3, 0.6, 0.85, -0.85]
const wcolors = [0xff6644, 0xff9944, 0xffffff, 0x44ffaa, 0x44aaff, 0xff44ff, 0x66ff66]

for (let vi = 0; vi < velocities.length; vi++) {
  const v = velocities[vi]
  const color = wcolors[vi]
  const pts = []
  for (let t = -10; t <= 10; t += 0.08) {
    const x = v * t
    pts.push(new THREE.Vector3(x*SCALE, t*SCALE, 0))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color, opacity: 0.85, transparent: true })
  const line = new THREE.Line(geo, mat)
  scene.add(line)
  worldlines.push({v, line, color})

  // Event marker at t=3
  const dotGeo = new THREE.SphereGeometry(0.3, 8, 8)
  const dotMat = new THREE.MeshBasicMaterial({ color })
  const dot = new THREE.Mesh(dotGeo, dotMat)
  dot.position.set(v*3*SCALE, 3*SCALE, 0)
  scene.add(dot)

  // Length contraction labels
  if (v !== 0) {
    const labelPts = []
    for (let x2 = 0; x2 <= 4; x2 += 0.2) {
      const ct = 0
      const xBoosted = gamma(v) * (x2 - v * ct)
      labelPts.push(new THREE.Vector3(xBoosted*SCALE, ct*SCALE, 2))
    }
    const lGeo = new THREE.BufferGeometry().setFromPoints(labelPts)
    const lMat = new THREE.LineBasicMaterial({ color, opacity: 0.3, transparent: true })
    scene.add(new THREE.Line(lGeo, lMat))
  }
}

// Moving frame (v = 0.5c) - shows Lorentz contraction
const vBoost = 0.5
const boostPts = []
for (let ct = -8; ct <= 8; ct += 0.1) {
  const xBoosted = gamma(vBoost) * (0 - vBoost * ct)
  boostPts.push(new THREE.Vector3(xBoosted*SCALE, ct*SCALE, -2))
}
const boostGeo = new THREE.BufferGeometry().setFromPoints(boostPts)
const boostMat = new THREE.LineBasicMaterial({ color: 0xffcc00, opacity: 0.6, transparent: true })
scene.add(new THREE.Line(boostGeo, boostMat))

// Simultaneity planes (ct = const in moving frame)
for (let sct = -6; sct <= 6; sct += 2) {
  const planePts = []
  for (let x2 = -10; x2 <= 10; x2 += 0.5) {
    const ct = gamma(vBoost) * (sct + vBoost * x2)
    if (Math.abs(ct) < 12) planePts.push(new THREE.Vector3(x2*SCALE, ct*SCALE, -3))
  }
  if (planePts.length > 1) {
    const pGeo = new THREE.BufferGeometry().setFromPoints(planePts)
    const pMat = new THREE.LineBasicMaterial({ color: 0xffcc00, opacity: 0.25, transparent: true })
    scene.add(new THREE.Line(pGeo, pMat))
  }
}

// Axis labels using sprites
function makeLabel(text, pos, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'white'
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(text, 64, 40)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, opacity: 0.9 })
  const sprite = new THREE.Sprite(mat)
  sprite.position.copy(pos)
  sprite.scale.set(6, 3, 1)
  scene.add(sprite)
}
makeLabel('x', new THREE.Vector3(42, 0, 0), 0xff4444)
makeLabel('ct', new THREE.Vector3(0, 42, 0), 0x44ff44)
makeLabel('y', new THREE.Vector3(0, 0, 42), 0x4466ff)
makeLabel('light cone', new THREE.Vector3(12, 12, 8), 0xffee44)

// Info text
const infoEl = document.createElement('div')
infoEl.style.cssText = 'position:fixed;top:16px;left:16px;color:#aac;font-family:monospace;font-size:13px;pointer-events:none;line-height:1.6'
document.body.appendChild(infoEl)

let angle = 0
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  angle += 0.003
  camera.position.x = Math.sin(angle) * 65
  camera.position.z = Math.cos(angle) * 65
  camera.lookAt(0, 5, 0)

  const t = Date.now() * 0.001
  infoEl.innerHTML = `Minkowski Spacetime Diagram<br>` +
    `Speed of light: c = 1<br>` +
    `Lorentz factor gamma(0.5c) = ${gamma(0.5).toFixed(4)}<br>` +
    `Worldlines: stationary & moving objects<br>` +
    `Yellow: boosted frame (0.5c)<br>` +
    `Orbit controls: drag to rotate`

  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
