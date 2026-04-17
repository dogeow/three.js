// 3552. Spinodal Decomposition — Cahn-Hilliard equation
// 亚稳态物质自发相分离，Spinodal区域内组分起伏自发增长
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const GRID = 128
const CELL_SIZE = 0.05

let paused = false
let noiseAmp = 0.05
let time = 0

// Cahn-Hilliard fields
// c = concentration (order parameter), 0 = phase A, 1 = phase B
const c = new Float32Array(GRID * GRID)
const cNext = new Float32Array(GRID * GRID)
// chemical potential mu = F'(c) - kappa * laplacian(c)
// F(c) = alpha*c^2*(1-c)^2 (double-well potential)
// alpha controls barrier height, kappa controls interfacial width
const alpha = 1.0
const kappa = 0.04
const mobility = 1.0
const dt = 0.0005

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050510)

const camera = new THREE.OrthographicCamera(
  -GRID * CELL_SIZE / 2, GRID * CELL_SIZE / 2,
  GRID * CELL_SIZE / 2, -GRID * CELL_SIZE / 2, 0.1, 100)
camera.position.set(0, 20, 0)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Grid plane for visualization
const planeGeo = new THREE.PlaneGeometry(GRID * CELL_SIZE, GRID * CELL_SIZE)
const planeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
const plane = new THREE.Mesh(planeGeo, planeMat)
plane.rotation.x = -Math.PI / 2
scene.add(plane)

const colors = new Float32Array(GRID * GRID * 3)
planeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

// Periodic BCs for Laplacian
function periodic(idx) {
  return ((idx % GRID) + GRID) % GRID
}
function idx(x, y) { return periodic(y) * GRID + periodic(x) }

function laplacian(field, x, y) {
  const h2 = CELL_SIZE * CELL_SIZE
  return (
    field[idx(x+1, y)] + field[idx(x-1, y)] +
    field[idx(x, y+1)] + field[idx(x, y-1)] -
    4 * field[idx(x, y)]
  ) / h2
}

function dfdc(c_val) {
  // dF/dc = 2*alpha*c*(1-c)*(1-2c)
  return 2 * alpha * c_val * (1 - c_val) * (1 - 2 * c_val)
}

function initializeWithNoise(amp) {
  // Uniform concentration inside spinodal region (unstable)
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      c[y * GRID + x] = 0.5 + (Math.random() - 0.5) * amp
    }
  }
}

function stepCahnHilliard() {
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = idx(x, y)
      const mu = dfdc(c[i]) - kappa * laplacian(c, x, y)
      const lapMu = laplacian(c.map ? c : (() => {
        // compute laplacian of mu on the fly
        const muField = new Float32Array(GRID * GRID)
        for (let yy = 0; yy < GRID; yy++) {
          for (let xx = 0; xx < GRID; xx++) {
            muField[yy * GRID + xx] = dfdc(c[yy * GRID + xx]) - kappa * laplacian(c, xx, yy)
          }
        }
        return muField
      })(), x, y)
      // Actually compute mu field first
      cNext[i] = c[i] + dt * mobility * lapMu
      cNext[i] = Math.max(0, Math.min(1, cNext[i]))
    }
  }
}

// Precompute mu field
function computeMuField() {
  const mu = new Float32Array(GRID * GRID)
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      mu[idx(x, y)] = dfdc(c[idx(x, y)]) - kappa * laplacian(c, x, y)
    }
  }
  return mu
}

let muField = computeMuField()

function stepCH() {
  // Compute chemical potential
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      muField[idx(x, y)] = dfdc(c[idx(x, y)]) - kappa * laplacian(c, x, y)
    }
  }
  // Update concentration
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const lapMu = (
        muField[idx(x+1, y)] + muField[idx(x-1, y)] +
        muField[idx(x, y+1)] + muField[idx(x, y-1)] -
        4 * muField[idx(x, y)]
      ) / (CELL_SIZE * CELL_SIZE)
      const i = idx(x, y)
      cNext[i] = c[i] + dt * mobility * lapMu
      cNext[i] = Math.max(0, Math.min(1, cNext[i]))
    }
  }
  // Swap
  c.set(cNext)
}

function updateColors() {
  const col = planeGeo.attributes.color.array
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x
      const val = c[i]
      // Phase A = dark blue, Phase B = bright cyan
      // Interpolate between two phases
      const t = val
      // Cool warm colormap: dark blue -> cyan -> white
      col[i * 3 + 0] = t * 0.1 + (1 - t) * 0.0
      col[i * 3 + 1] = t * 0.8 + (1 - t) * 0.2
      col[i * 3 + 2] = t * 1.0 + (1 - t) * 0.6
    }
  }
  planeGeo.attributes.color.needsUpdate = true
}

const gui = new GUI()
gui.add({ noiseAmp }, 'noiseAmp', 0, 0.2).name('Noise ε').onChange(v => noiseAmp = v)
document.getElementById('resetBtn').addEventListener('click', () => {
  initializeWithNoise(noiseAmp)
  muField = computeMuField()
  time = 0
})
document.getElementById('pauseBtn').addEventListener('click', () => paused = !paused)
document.getElementById('noiseSlider').addEventListener('input', e => {
  noiseAmp = parseFloat(e.target.value) / 100
  document.getElementById('noiseVal').textContent = noiseAmp.toFixed(2)
})

initializeWithNoise(noiseAmp)
muField = computeMuField()

let lastTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  if (!paused) {
    const now = performance.now()
    const dtMs = Math.min(now - lastTime, 50)
    lastTime = now
    time += dtMs / 1000
    // Multiple steps per frame
    const steps = Math.ceil(dtMs / 16)
    for (let s = 0; s < steps * 4; s++) stepCH()
    updateColors()
  }
  controls.update()
  renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
  const asp = innerWidth / innerHeight
  const w = GRID * CELL_SIZE / 2
  camera.left = -w * asp; camera.right = w * asp
  camera.top = w; camera.bottom = -w
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
