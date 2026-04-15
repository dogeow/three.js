// Lattice Gas Automaton - FHP Model (Frisch-Hasslacher-Pomeau)
// Hexagonal grid, 6 directions + rest particle
import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

const GRID = 80
const CELL = 0.5
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x02020a)
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500)
camera.position.set(0, 60, 60)
const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// FHP directions: 6 neighbors at 60° intervals
// dir[i] = (cos(i*PI/3), sin(i*PI/3))
const DX = [1, 0.5, -0.5, -1, -0.5, 0.5]
const DY = [0, Math.sqrt(3)/2, Math.sqrt(3)/2, 0, -Math.sqrt(3)/2, -Math.sqrt(3)/2]
const NDIRS = 6

// Each cell: bitmask of which directions have particles
// bit i set = particle moving in direction i
let grid = []
let nextGrid = []
let obstacle = new Set()

// Initialize: random particles + circular obstacle
function init() {
  grid = []
  nextGrid = []
  obstacle.clear()
  for (let y = 0; y < GRID; y++) {
    grid[y] = new Uint8Array(GRID)
    nextGrid[y] = new Uint8Array(GRID)
    for (let x = 0; x < GRID; x++) {
      let bits = 0
      for (let d = 0; d < NDIRS; d++) {
        if (Math.random() < 0.2) bits |= (1 << d)
      }
      grid[y][x] = bits
      // Circular obstacle in center
      const cx = x - GRID/2, cy = y - GRID/2
      if (cx*cx + cy*cy < 144) obstacle.add(y * GRID + x)
    }
  }
}

// Streaming + collision step
function step() {
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (obstacle.has(y * GRID + x)) { nextGrid[y][x] = 0; continue }
      const idx = y * GRID + x
      let bits = grid[y][x]
      // Streaming: incoming from opposite directions
      let incoming = 0
      for (let d = 0; d < NDIRS; d++) {
        const px = Math.floor(x - DX[d] + GRID) % GRID
        const py = Math.floor(y - DY[d] + GRID) % GRID
        if (grid[py][px] & (1 << d)) incoming |= (1 << d)
      }
      // Collision: simple rule - if exactly 2 opposite particles, bounce one
      let n = 0
      for (let d = 0; d < NDIRS; d++) if (incoming & (1 << d)) n++
      let out = incoming
      if (n === 2) {
        // Check for opposite pair
        for (let d = 0; d < NDIRS; d++) {
          if ((incoming & (1 << d)) && (incoming & (1 << ((d + 3) % NDIRS)))) {
            // Scatter randomly
            out = (1 << Math.floor(Math.random() * NDIRS))
            break
          }
        }
      }
      // Add left-moving bias for flow
      if (Math.random() < 0.02) out |= (1 << 3) // left direction
      nextGrid[y][x] = out
    }
  }
  ;[grid, nextGrid] = [nextGrid, grid]
}

// Visualize as instanced boxes colored by velocity
const count = GRID * GRID
const instancedMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(CELL * 0.85, CELL * 0.2, CELL * 0.85),
  new THREE.MeshBasicMaterial(),
  count
)
scene.add(instancedMesh)

const dummy = new THREE.Object3D()
const color = new THREE.Color()
const velColors = [
  0x4fc3f7, 0x29b6f6, 0x039be5, 0x0288d1, 0x0277bd, 0x01579b,
  0xb3e5fc, 0x81d4fa, 0x4fc3f7, 0x29b6f6, 0x039be5, 0x0288d1
]

function updateMesh() {
  let i = 0
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const cx = x - GRID / 2
      const cy = y - GRID / 2
      dummy.position.set(cx * CELL, 0, cy * CELL)
      if (obstacle.has(y * GRID + x)) {
        dummy.scale.set(0, 0, 0)
      } else {
        const bits = grid[y][x]
        let vx = 0, vy = 0, n = 0
        for (let d = 0; d < NDIRS; d++) {
          if (bits & (1 << d)) { vx += DX[d]; vy += DY[d]; n++ }
        }
        const speed = n > 0 ? Math.sqrt(vx*vx + vy*vy) / n : 0
        const hue = speed > 0 ? Math.min(speed * 0.8, 0.8) : 0
        color.setHSL(hue, 0.9, 0.5 + speed * 0.3)
        instancedMesh.setColorAt(i, color)
        const sc = 0.5 + speed * 2
        dummy.scale.set(sc, sc * 0.5, sc)
      }
      dummy.updateMatrix()
      instancedMesh.setMatrixAt(i++, dummy.matrix)
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true
}

init()

const params = { speed: 5, showObstacle: true, density: 0.2 }
const gui = new GUI()
gui.add(params, 'speed', 1, 20, 1).name('模拟步数/帧')
gui.add(params, 'density', 0.05, 0.4, 0.01).name('初始密度').onChange(() => {
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    let bits = 0
    for (let d = 0; d < NDIRS; d++) if (Math.random() < params.density) bits |= (1 << d)
    grid[y][x] = bits
  }
})
gui.add(params, 'showObstacle').name('显示障碍物').onChange(v => {
  obstacle.forEach(idx => { if (v) {} else {} })
})

const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const dt = clock.getDelta()
  for (let i = 0; i < params.speed; i++) step()
  updateMesh()
  renderer.render(scene, camera)
}
animate()
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
