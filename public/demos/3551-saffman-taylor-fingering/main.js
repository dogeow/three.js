// 3551. Saffman-Taylor Viscous Fingering — Hele-Shaw cell simulation
// 非混溶流体驱替中的粘性指状不稳定性
// 网格方法：压力场 + 界面追踪
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const GRID = 160
const CELL = 0.04

let paused = false
let flowRate = 5
let time = 0

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1117)

const camera = new THREE.OrthographicCamera(
  -GRID * CELL / 2, GRID * CELL / 2,
  GRID * CELL / 2, -GRID * CELL / 2, 0.1, 100)
camera.position.set(0, 20, 0)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Light setup
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)

// Pressure/velocity fields
const pressure = new Float32Array(GRID * GRID)
const pressurePrev = new Float32Array(GRID * GRID)
// saturation: 1 = defending fluid, 0 = invading fluid
const saturation = new Float32Array(GRID * GRID)
const nextSat = new Float32Array(GRID * GRID)

// Initialize: defending fluid fills the domain, inlet on left
for (let i = 0; i < GRID * GRID; i++) saturation[i] = 1.0

// Geometry: flat plane for the Hele-Shaw cell
const planeGeo = new THREE.PlaneGeometry(GRID * CELL, GRID * CELL)
const planeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
const plane = new THREE.Mesh(planeGeo, planeMat)
plane.rotation.x = -Math.PI / 2
scene.add(plane)

// Vertex colors for the plane
const colors = new Float32Array(GRID * GRID * 3)
planeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

// Boundary: inlet on left, outlet on right, no-slip top/bottom
function applyBoundaryConditions(p) {
  for (let y = 0; y < GRID; y++) {
    p[y * GRID + 0] = 1.0          // inlet pressure
    p[y * GRID + GRID - 1] = 0.0  // outlet pressure
  }
  for (let x = 0; x < GRID; x++) {
    p[0 * GRID + x] = p[1 * GRID + x]       // top no-slip
    p[(GRID - 1) * GRID + x] = p[(GRID - 2) * GRID + x]  // bottom no-slip
  }
}

function solvePressure(iterations = 20) {
  const h2 = CELL * CELL
  for (let iter = 0; iter < iterations; iter++) {
    pressurePrev.set(pressure)
    applyBoundaryConditions(pressure)
    for (let y = 1; y < GRID - 1; y++) {
      for (let x = 1; x < GRID - 1; x++) {
        const idx = y * GRID + x
        // Mobility: depends on saturation (defending fluid is more viscous)
        const mob = 0.1 + saturation[idx] * 0.9
        const laplacian = (
          (pressurePrev[idx - 1] + pressurePrev[idx + 1]) +
          (pressurePrev[idx - GRID] + pressurePrev[idx + GRID]) -
          4 * pressurePrev[idx]
        ) / h2
        pressure[idx] = pressurePrev[idx] + 0.25 * laplacian * mob
      }
    }
    applyBoundaryConditions(pressure)
  }
}

function updateSaturation(dt) {
  const h = CELL
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const idx = y * GRID + x
      // Darcy velocity from pressure gradient
      const u = -(pressure[idx + 1] - pressure[idx - 1]) / (2 * h)
      const v = -(pressure[idx + GRID] - pressure[idx - GRID]) / (2 * h)
      // Upwind scheme for saturation
      const fluxX = u > 0 ? saturation[idx - 1] : saturation[idx + 1]
      const fluxY = v > 0 ? saturation[idx - GRID] : saturation[idx + GRID]
      const div = (u * fluxX - u * saturation[idx]) / h +
                  (v * fluxY - v * saturation[idx]) / h
      // Invasion percolation: less viscous fluid moves faster in pores
      const mob = 0.1 + saturation[idx] * 0.9
      nextSat[idx] = Math.max(0, Math.min(1, saturation[idx] - dt * flowRate * mob * div))
    }
  }
  // Inject at inlet
  for (let y = 1; y < GRID - 1; y++) {
    const idx = y * GRID + 1
    nextSat[idx] = 0.0  // injecting air/displacing fluid
  }
  saturation.set(nextSat)
}

function updateColors() {
  const col = planeGeo.attributes.color.array
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const idx = y * GRID + x
      const s = saturation[idx]
      // Blue = invading fluid (air), Orange = defending fluid (oil)
      col[idx * 3 + 0] = (1 - s) * 0.1 + s * 1.0   // R: orange-ish
      col[idx * 3 + 1] = (1 - s) * 0.4 + s * 0.5   // G
      col[idx * 3 + 2] = (1 - s) * 0.8 + s * 0.1   // B: blue-ish
    }
  }
  planeGeo.attributes.color.needsUpdate = true
}

function injectPerturbation() {
  // Inject at multiple points along inlet to trigger fingering
  for (let y = 1; y < GRID - 1; y += 2) {
    const idx = y * GRID + 2
    saturation[idx] = 0.0
  }
}

// GUI
const gui = new GUI()
gui.add({ flowRate }, 'flowRate', 1, 20).name('Flow Rate').onChange(v => flowRate = v)
document.getElementById('resetBtn').addEventListener('click', () => {
  saturation.fill(1.0)
  pressure.fill(0.0)
  injectPerturbation()
})
document.getElementById('pauseBtn').addEventListener('click', () => paused = !paused)
document.getElementById('flowRate').addEventListener('input', e => {
  flowRate = parseFloat(e.target.value)
  document.getElementById('flowVal').textContent = flowRate
})

// Inject initial perturbation
injectPerturbation()
applyBoundaryConditions(pressure)

let lastTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  if (!paused) {
    const now = performance.now()
    const dt = Math.min((now - lastTime) / 1000, 0.02)
    lastTime = now
    time += dt
    // Multiple pressure solves per frame for stability
    solvePressure(15)
    updateSaturation(dt * 0.5)
    updateColors()
  }
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  const asp = innerWidth / innerHeight
  const w = GRID * CELL / 2
  camera.left = -w * asp
  camera.right = w * asp
  camera.top = w
  camera.bottom = -w
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
