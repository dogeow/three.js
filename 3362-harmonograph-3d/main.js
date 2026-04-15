// 3362. Harmonograph 3D — artistic pendulum drawing machine
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050508)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 22)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.5, 0.4, 0.1)
composer.addPass(bloom)

scene.add(new THREE.AmbientLight(0xffffff, 0.3))

// Parameters
const params = {
  f1: 1.0,
  f2: 0.97,
  f3: 0.5,
  phase1: 0,
  phase2: Math.PI / 2,
  damping: 0.0015,
  trailLength: 3000,
  enable3D: true,
  penSize: 0.18,
  shakeAndClear: () => resetHarmonograph()
}

let f1 = params.f1, f2 = params.f2, f3 = params.f3
let ph1 = params.phase1, ph2 = params.phase2
let damp = params.damping
let enable3D = params.enable3D

// Drawing surface (subtle)
const surfaceGeo = new THREE.PlaneGeometry(30, 30)
const surfaceMat = new THREE.MeshBasicMaterial({ color: 0x0a0a12, transparent: true, opacity: 0.4 })
const surface = new THREE.Mesh(surfaceGeo, surfaceMat)
surface.rotation.x = -Math.PI / 2
surface.position.y = -0.01
scene.add(surface)

// Harmonograph trail geometry
const MAX_PTS = 5000
const positions = new Float32Array(MAX_PTS * 3)
const colors = new Float32Array(MAX_PTS * 3)
const trailGeo = new THREE.BufferGeometry()
trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1.0, linewidth: 1 })
const trail = new THREE.Line(trailGeo, trailMat)
scene.add(trail)

// Pen sphere
const penGeo = new THREE.SphereGeometry(params.penSize, 16, 16)
const penMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaddff, emissiveIntensity: 2, roughness: 0.2 })
const pen = new THREE.Mesh(penGeo, penMat)
scene.add(pen)

// Trail points
let points = []
let time = 0
let drawing = true
const amplitude = 7

function harmonograph(t) {
  const decay = Math.exp(-damp * t)
  const x = Math.sin(f1 * t + ph1) * decay * amplitude
  const y = Math.sin(f2 * t + ph2) * decay * amplitude
  const z = enable3D ? Math.sin(f3 * t) * decay * amplitude * 0.6 : 0
  return [x, y, z]
}

// Gradient colors: cyan → magenta → orange
function pointColor(t, maxT) {
  const ratio = t / Math.max(maxT, 1)
  const r = Math.min(1, ratio * 2)
  const g = Math.max(0, Math.min(1, 1 - Math.abs(ratio - 0.5) * 2))
  const b = Math.max(0, 1 - ratio * 1.5)
  return [r, g, b]
}

function resetHarmonograph() {
  points = []
  time = 0
  drawing = true
  f1 = params.f1; f2 = params.f2; f3 = params.f3
  ph1 = params.phase1; ph2 = params.phase2
  damp = params.damping
  enable3D = params.enable3D
  penMat.emissive.setHex(0xaaddff)
  surface.visible = true
}

function updateTrail() {
  const n = Math.min(points.length, MAX_PTS)
  for (let i = 0; i < n; i++) {
    const pt = points[points.length - n + i]
    positions[i * 3] = pt[0]; positions[i * 3 + 1] = pt[1]; positions[i * 3 + 2] = pt[2]
    const c = pointColor(i, n)
    colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2]
  }
  trailGeo.setDrawRange(0, n)
  trailGeo.attributes.position.needsUpdate = true
  trailGeo.attributes.color.needsUpdate = true
}

// GUI
const gui = new GUI()
gui.add(params, 'f1', 0.1, 3, 0.001).name('Freq 1').onChange(v => f1 = v)
gui.add(params, 'f2', 0.1, 3, 0.001).name('Freq 2').onChange(v => f2 = v)
gui.add(params, 'f3', 0.1, 3, 0.001).name('Freq 3 (Z)').onChange(v => f3 = v)
gui.add(params, 'phase1', 0, Math.PI * 2, 0.01).name('Phase 1').onChange(v => ph1 = v)
gui.add(params, 'phase2', 0, Math.PI * 2, 0.01).name('Phase 2').onChange(v => ph2 = v)
gui.add(params, 'damping', 0, 0.01, 0.0001).name('Damping')
gui.add(params, 'trailLength', 500, 5000, 100).name('Trail Length')
gui.add(params, 'enable3D').name('3D Z-Axis')
gui.add(params, 'penSize', 0.05, 0.5, 0.05).name('Pen Size').onChange(v => {
  pen.geometry.dispose(); pen.geometry = new THREE.SphereGeometry(v, 16, 16)
})
gui.add(params, 'shakeAndClear').name('Shake & Clear')

// Click to reset
window.addEventListener('click', (e) => {
  if (e.target.tagName === 'CANVAS') resetHarmonograph()
})

const clock = new THREE.Clock()
let lastTime = 0
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()

  if (drawing) {
    const dt_small = 0.02
    for (let step = 0; step < 3; step++) {
      const pt = harmonograph(time)
      points.push(pt)
      if (points.length > params.trailLength) points.shift()
      time += dt_small
    }
    updateTrail()

    if (points.length > 0) {
      const last = points[points.length - 1]
      pen.position.set(last[0], last[1], last[2])
    }

    // Check if drawing has essentially stopped
    if (points.length > 10) {
      const lastPt = points[points.length - 1]
      const first = points[points.length - 1]
      const dist = Math.sqrt(lastPt.reduce((s, v, i) => s + (v - first[i]) ** 2, 0))
      if (dist < 0.1 && time > 100) {
        drawing = false
        penMat.emissive.setHex(0x444466)
      }
    }
  }

  controls.update()
  composer.render()
}
animate()

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})
