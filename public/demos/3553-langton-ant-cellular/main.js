// 3553. Langton's Ant — Turing-complete 2D cellular automaton
// Rules: WHITE cell + ant -> turn RIGHT, flip cell BLACK, move forward
//        BLACK cell + ant -> turn LEFT, flip cell WHITE, move forward
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const GRID = 200
const CELL = 0.1
let paused = false
let speed = 500  // steps per second
let steps = 0

// Grid: 0 = white, 1 = black
const grid = new Uint8Array(GRID * GRID)
function gidx(x, y) {
  return ((y % GRID + GRID) % GRID) * GRID + ((x % GRID + GRID) % GRID)
}

// Ant: position (x, y) in grid coords, direction (0=N, 1=E, 2=S, 3=W)
const ants = [{ x: GRID / 2, y: GRID / 2, dir: 0 }]

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050505)

const camera = new THREE.OrthographicCamera(
  -GRID * CELL / 2, GRID * CELL / 2,
  GRID * CELL / 2, -GRID * CELL / 2, 0.1, 100)
camera.position.set(0, 30, 0)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Grid plane
const planeGeo = new THREE.PlaneGeometry(GRID * CELL, GRID * CELL)
const planeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
const plane = new THREE.Mesh(planeGeo, planeMat)
plane.rotation.x = -Math.PI / 2
scene.add(plane)

const colors = new Float32Array(GRID * GRID * 3)
planeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

// Ant sprite (small cone)
const coneGeo = new THREE.ConeGeometry(0.2, 0.5, 8)
const coneMat = new THREE.MeshBasicMaterial({ color: 0xff4444 })
const antMeshes = []

function createAntMesh() {
  const mesh = new THREE.Mesh(coneGeo, coneMat)
  mesh.rotation.x = Math.PI / 2
  scene.add(mesh)
  return mesh
}

for (const ant of ants) antMeshes.push(createAntMesh())

function updateColors() {
  const col = planeGeo.attributes.color.array
  for (let i = 0; i < GRID * GRID; i++) {
    const val = grid[i]
    col[i * 3 + 0] = val ? 0.9 : 0.05  // R
    col[i * 3 + 1] = val ? 0.9 : 0.05  // G
    col[i * 3 + 2] = val ? 1.0 : 0.08  // B (slight blue for white cells)
  }
  planeGeo.attributes.color.needsUpdate = true
}

function updateAntMeshes() {
  for (let i = 0; i < ants.length; i++) {
    const ant = ants[i]
    const mesh = antMeshes[i]
    mesh.position.x = (ant.x - GRID / 2 + 0.5) * CELL
    mesh.position.z = (ant.y - GRID / 2 + 0.5) * CELL
    // dir: 0=N(-Z), 1=E(+X), 2=S(+Z), 3=W(-X)
    const angles = [0, -Math.PI / 2, Math.PI, Math.PI / 2]
    mesh.rotation.z = angles[ant.dir]
  }
}

function stepAnt(ant) {
  const i = gidx(ant.x, ant.y)
  const cell = grid[i]
  if (cell === 0) {
    ant.dir = (ant.dir + 1) % 4  // turn right on white
  } else {
    ant.dir = (ant.dir + 3) % 4  // turn left on black
  }
  grid[i] = 1 - cell  // flip cell
  // Move forward
  const dx = [0, 1, 0, -1]
  const dy = [-1, 0, 1, 0]
  ant.x = (ant.x + dx[ant.dir] + GRID) % GRID
  ant.y = (ant.y + dy[ant.dir] + GRID) % GRID
}

function reset() {
  grid.fill(0)
  ants.length = 0
  ants.push({ x: GRID / 2, y: GRID / 2, dir: 0 })
  while (antMeshes.length > 1) {
    const m = antMeshes.pop()
    scene.remove(m)
  }
  steps = 0
  updateColors()
  updateAntMeshes()
  document.getElementById('stepCount').textContent = '0'
  document.getElementById('antCount').textContent = '1'
}

updateColors()
updateAntMeshes()

let lastTime = performance.now()
let accumulator = 0

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const dt = now - lastTime
  lastTime = now

  if (!paused) {
    const stepsThisFrame = Math.floor((dt / 1000) * speed)
    for (let s = 0; s < stepsThisFrame; s++) {
      for (const ant of ants) stepAnt(ant)
      steps++
    }
    updateColors()
    updateAntMeshes()
    if (steps % 100 === 0) {
      document.getElementById('stepCount').textContent = steps.toLocaleString()
    }
  }
  controls.update()
  renderer.render(scene, camera)
}
animate()

document.getElementById('resetBtn').addEventListener('click', reset)
document.getElementById('pauseBtn').addEventListener('click', () => paused = !paused)
document.getElementById('addAntBtn').addEventListener('click', () => {
  if (ants.length < 10) {
    ants.push({
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
      dir: Math.floor(Math.random() * 4)
    })
    antMeshes.push(createAntMesh())
    document.getElementById('antCount').textContent = ants.length
  }
})
document.getElementById('speedSlider').addEventListener('input', e => {
  speed = parseInt(e.target.value)
  document.getElementById('speedVal').textContent = speed
})

window.addEventListener('resize', () => {
  const asp = innerWidth / innerHeight
  const w = GRID * CELL / 2
  camera.left = -w * asp; camera.right = w * asp
  camera.top = w; camera.bottom = -w
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
