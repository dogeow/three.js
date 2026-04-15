// 3309. Quantum Walk 2D - Discrete-time quantum walk on a lattice
// type: physics
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const GRID = 100
const SCALE = 0.15

let scene, camera, renderer, controls
let probData, pointCloud, geo
let coinPhase = Math.PI / 2
let paused = false
let stepCount = 0
let maxProb = 0.001

// Quantum walk state: 4-component wavefunction (up/down/left/right)
let psi = {
  up: new Float32Array(GRID * GRID),
  down: new Float32Array(GRID * GRID),
  left: new Float32Array(GRID * GRID),
  right: new Float32Array(GRID * GRID)
}
let psiNew = {
  up: new Float32Array(GRID * GRID),
  down: new Float32Array(GRID * GRID),
  left: new Float32Array(GRID * GRID),
  right: new Float32Array(GRID * GRID)
}

function IX(x, y) { return y * GRID + x }

function init() {
  // Init wavefunction: localized Gaussian at center
  const cx = Math.floor(GRID / 2), cy = Math.floor(GRID / 2)
  const sigma = 2
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dx = x - cx, dy = y - cy
      const gauss = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))
      psi.up[IX(x, y)] = gauss / Math.sqrt(4)
      psi.down[IX(x, y)] = gauss / Math.sqrt(4)
      psi.left[IX(x, y)] = gauss / Math.sqrt(4)
      psi.right[IX(x, y)] = gauss / Math.sqrt(4)
    }
  }

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020208)
  scene.fog = new THREE.FogExp2(0x020208, 0.06)

  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500)
  camera.position.set(0, 50, 50)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  document.body.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.4

  // Point cloud for probability distribution
  const positions = new Float32Array(GRID * GRID * 3)
  const colors = new Float32Array(GRID * GRID * 3)
  geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    size: SCALE * 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  pointCloud = new THREE.Points(geo, mat)
  scene.add(pointCloud)

  // Grid plane
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID * SCALE * 1.5, GRID * SCALE * 1.5),
    new THREE.MeshBasicMaterial({ color: 0x080814, transparent: true, opacity: 0.5, wireframe: false })
  )
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -0.01
  scene.add(plane)

  // Grid lines
  const grid = new THREE.GridHelper(GRID * SCALE, 30, 0x222244, 0x111122)
  grid.position.y = 0
  scene.add(grid)

  // Axis
  const axisMat = new THREE.LineBasicMaterial({ color: 0x446688, transparent: true, opacity: 0.4 })
  const xLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-GRID*SCALE/2, 0.02, 0), new THREE.Vector3(GRID*SCALE/2, 0.02, 0)])
  const zLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.02, -GRID*SCALE/2), new THREE.Vector3(0, 0.02, GRID*SCALE/2)])
  scene.add(new THREE.Line(xLine, axisMat))
  scene.add(new THREE.Line(zLine, axisMat))

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const pt = new THREE.PointLight(0x00ffff, 1.5, 80)
  pt.position.set(20, 30, 20)
  scene.add(pt)

  updateProbabilityDisplay()
  setupGUI()
  setupEvents()
  animate()
}

function coinOperator(theta) {
  // Hadamard-like coin with phase
  const c = Math.cos(theta), s = Math.sin(theta)
  return {
    up_up: c, up_down: s, up_left: s, up_right: -c,
    down_up: -s, down_down: c, down_left: c, down_right: s,
    left_up: s, left_down: -c, left_left: c, left_right: s,
    right_up: -c, right_down: -s, right_left: -s, right_right: c
  }
}

function quantumStep() {
  const theta = coinPhase
  const c = Math.cos(theta), s = Math.sin(theta)
  // Apply coin + shift

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = IX(x, y)

      // Get neighbor contributions
      const up_y = (y + 1) % GRID, down_y = (y - 1 + GRID) % GRID
      const left_x = (x - 1 + GRID) % GRID, right_x = (x + 1) % GRID

      const i_up = IX(x, up_y), i_down = IX(x, down_y)
      const i_left = IX(left_x, y), i_right = IX(right_x, y)

      // Shift: each component moves in its direction
      const newUp = c * psi.up[i] - s * psi.down[i] + s * psi.left[i] - c * psi.right[i]
      const newDown = s * psi.up[i] + c * psi.down[i] + c * psi.left[i] + s * psi.right[i]
      const newLeft = s * psi.up[i] + c * psi.down[i] + c * psi.left[i] + s * psi.right[i]
      const newRight = -c * psi.up[i] - s * psi.down[i] - s * psi.left[i] + c * psi.right[i]

      psiNew.up[i_up] = newUp
      psiNew.down[i_down] = newDown
      psiNew.left[i_left] = newLeft
      psiNew.right[i_right] = newRight
    }
  }

  // Normalize
  let norm = 0
  for (let i = 0; i < GRID * GRID; i++) {
    const a = psiNew.up[i], b = psiNew.down[i], c2 = psiNew.left[i], d = psiNew.right[i]
    norm += a*a + b*b + c2*c2 + d*d
  }
  norm = Math.sqrt(norm) || 1

  for (let i = 0; i < GRID * GRID; i++) {
    psi.up[i] = psiNew.up[i] / norm
    psi.down[i] = psiNew.down[i] / norm
    psi.left[i] = psiNew.left[i] / norm
    psi.right[i] = psiNew.right[i] / norm
  }
}

function computeProbability() {
  probData = new Float32Array(GRID * GRID)
  maxProb = 0.001
  for (let i = 0; i < GRID * GRID; i++) {
    const p = psi.up[i]**2 + psi.down[i]**2 + psi.left[i]**2 + psi.right[i]**2
    probData[i] = p
    if (p > maxProb) maxProb = p
  }
}

function updateProbabilityDisplay() {
  computeProbability()
  const pos = geo.attributes.position.array
  const col = geo.attributes.color.array

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = IX(x, y)
      const p = probData[i]
      const idx = i * 3

      pos[idx] = (x - GRID / 2) * SCALE
      pos[idx + 1] = p * 15
      pos[idx + 2] = (y - GRID / 2) * SCALE

      // Color: probability magnitude mapped to cyan/magenta
      const norm = Math.min(1, p / maxProb)
      col[idx] = norm * 0.8       // R: rises with probability
      col[idx + 1] = norm * 0.3   // G: stays low
      col[idx + 2] = norm * 1.0    // B: high for quantum feel
    }
  }

  geo.attributes.position.needsUpdate = true
  geo.attributes.color.needsUpdate = true
  geo.computeBoundingSphere()
}

function setupGUI() {
  const gui = new GUI()
  gui.add({ coinPhase }, 'coinPhase', 0, Math.PI).name('Coin Phase θ').onChange(v => { coinPhase = v })
  gui.add({ paused }, 'paused').name('Pause')
}

function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') paused = !paused
  })
  window.addEventListener('click', e => {
    // Reset wavefunction to click position
    const rect = renderer.domElement.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const cx = Math.floor(nx * 0.5 * GRID + GRID / 2)
    const cy = Math.floor(ny * 0.5 * GRID + GRID / 2)
    const sigma = 2
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const dx = x - cx, dy = y - cy
        const gauss = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))
        const i = IX(x, y)
        psi.up[i] = psi.down[i] = psi.left[i] = psi.right[i] = gauss / 2
      }
    }
    stepCount = 0
  })
}

function animate() {
  requestAnimationFrame(animate)
  if (!paused) {
    quantumStep()
    stepCount++
    if (stepCount % 2 === 0) updateProbabilityDisplay()
  }
  controls.update()
  renderer.render(scene, camera)
}

init()
