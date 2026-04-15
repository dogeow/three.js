// Agent-Based Schelling Segregation Model
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a12)
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 40, 40)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)

// Config
const GRID = 40
const CELL = 1
const params = { threshold: 0.35, density: 0.45, speed: 1, run: true, reset: () => initGrid() }

// Grid: 0=empty, 1=red, 2=blue
let grid = []
let happy = []
let total = 0

function initGrid() {
  grid = []
  happy = []
  total = 0
  for (let y = 0; y < GRID; y++) {
    grid[y] = []
    happy[y] = []
    for (let x = 0; x < GRID; x++) {
      const r = Math.random()
      if (r < params.density * 0.5) { grid[y][x] = 1; total++ }
      else if (r < params.density) { grid[y][x] = 2; total++ }
      else grid[y][x] = 0
      happy[y][x] = true
    }
  }
  updateMesh()
}

function getNeighbors(x, y) {
  let r = 0, b = 0, e = 0
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dx === 0 && dy === 0) continue
    const nx = (x + dx + GRID) % GRID, ny = (y + dy + GRID) % GRID
    const v = grid[ny][nx]
    if (v === 1) r++; else if (v === 2) b++; else e++
  }
  return { r, b, e }
}

function isHappy(x, y) {
  const v = grid[y][x]
  if (v === 0) return true
  const { r, b } = getNeighbors(x, y)
  const neighbors = r + b
  if (neighbors === 0) return true
  if (v === 1) return (r / neighbors) >= params.threshold
  return (b / neighbors) >= params.threshold
}

function step() {
  const moves = []
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    if (grid[y][x] === 0) continue
    if (!isHappy(x, y)) {
      moves.push({ x, y, v: grid[y][x] })
      grid[y][x] = 0
    }
  }
  // Shuffle moves
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]]
  }
  for (const m of moves) {
    let placed = false
    for (let dy = 0; dy < GRID && !placed; dy++) for (let dx = 0; dx < GRID && !placed; dx++) {
      const nx = (m.x + dx + GRID) % GRID, ny = (m.y + dy + GRID) % GRID
      if (grid[ny][nx] === 0) { grid[ny][nx] = m.v; placed = true }
    }
  }
  updateMesh()
}

function updateMesh() {
  scene.children.filter(c => c.userData.isGrid).forEach(c => scene.remove(c))
  const geometry = new THREE.BoxGeometry(CELL * 0.85, CELL * 0.15, CELL * 0.85)
  const redMat = new THREE.MeshStandardMaterial({ color: 0xe05050, roughness: 0.7 })
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x4060e0, roughness: 0.7 })
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    if (grid[y][x] === 0) continue
    const mesh = new THREE.Mesh(geometry, grid[y][x] === 1 ? redMat : blueMat)
    mesh.position.set((x - GRID / 2) * CELL, 0, (y - GRID / 2) * CELL)
    mesh.userData.isGrid = true
    scene.add(mesh)
  }
}

initGrid()

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(10, 20, 10)
scene.add(dirLight)

// GUI
const gui = new GUI()
gui.add(params, 'threshold', 0.1, 0.9, 0.01).name('相似邻居阈值')
gui.add(params, 'density', 0.1, 0.9, 0.01).name('人口密度').onChange(initGrid)
gui.add(params, 'speed', 1, 20, 1).name('每帧步数')
gui.add(params, 'run').name('运行')
gui.add(params, 'reset').name('重置')

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  if (params.run) {
    for (let i = 0; i < params.speed; i++) step()
  }
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
