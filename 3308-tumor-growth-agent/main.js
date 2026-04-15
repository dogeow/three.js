// 3308. Tumor Growth Agent-Based Model
// type: biology
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

// Agent states
const EMPTY = 0, HEALTHY = 1, PRETUMOR = 2, TUMOR = 3, DEAD = 4, IMMUNE = 5

const N = 80
const CELL_SIZE = 0.5

let scene, camera, renderer, controls
let grid = []
let cellMeshes = []   // InstancedMesh for each cell type
let time = 0
let paused = false
let generation = 0

// Parameters
let proliferationRate = 0.02
let deathRate = 0.005
let immuneResponse = 0.01
let nutrientLevel = 0.8

const COLORS = {
  [EMPTY]: new THREE.Color(0x0a0a14),
  [HEALTHY]: new THREE.Color(0x88ccaa),
  [PRETUMOR]: new THREE.Color(0xffaa44),
  [TUMOR]: new THREE.Color(0xff3333),
  [DEAD]: new THREE.Color(0x444444),
  [IMMUNE]: new THREE.Color(0x33aaff)
}

function IX(x, y) { return y * N + x }

function init() {
  // Init grid
  grid = new Uint8Array(N * N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = IX(x, y)
      // Healthy tissue with blood vessels (edges)
      if (x === 0 || x === N-1 || y === 0 || y === N-1) {
        grid[i] = HEALTHY
      } else if (Math.random() < 0.05) {
        grid[i] = IMMUNE  // immune cells scattered
      } else {
        grid[i] = EMPTY
      }
    }
  }

  // Seed tumor at center
  const cx = Math.floor(N / 2), cy = Math.floor(N / 2)
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const dist = dx * dx + dy * dy
      if (dist <= 8) {
        grid[IX(cx + dx, cy + dy)] = TUMOR
      }
    }
  }

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050508)
  scene.fog = new THREE.FogExp2(0x050508, 0.03)

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500)
  camera.position.set(0, 70, 70)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  document.body.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.2

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const sun = new THREE.DirectionalLight(0xffeedd, 0.8)
  sun.position.set(30, 50, 30)
  scene.add(sun)
  const pt = new THREE.PointLight(0xff4444, 0.8, 60)
  pt.position.set(-10, 20, -10)
  scene.add(pt)

  createCellMeshes()
  createBloodVessels()
  updateMeshes()

  setupGUI()
  setupEvents()
  animate()
}

function createCellMeshes() {
  for (const type of [HEALTHY, PRETUMOR, TUMOR, DEAD, IMMUNE]) {
    const geo = new THREE.BoxGeometry(CELL_SIZE * 0.85, CELL_SIZE * 0.85, CELL_SIZE * 0.85)
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS[type],
      emissive: COLORS[type],
      emissiveIntensity: type === TUMOR ? 0.3 : 0.1,
      roughness: 0.5,
      metalness: 0.1,
      transparent: type === EMPTY
    })
    const mesh = new THREE.InstancedMesh(geo, mat, N * N)
    mesh.count = 0
    mesh.userData.type = type
    scene.add(mesh)
    cellMeshes[type] = mesh
  }
}

function createBloodVessels() {
  // Draw blood vessel network along edges
  const points = []
  for (let x = 0; x < N; x++) {
    if (grid[IX(x, 0)] === HEALTHY) {
      points.push(new THREE.Vector3((x - N/2) * CELL_SIZE, 0.3, -N/2 * CELL_SIZE))
    }
    if (grid[IX(x, N-1)] === HEALTHY) {
      points.push(new THREE.Vector3((x - N/2) * CELL_SIZE, 0.3, (N/2) * CELL_SIZE))
    }
  }
  for (let y = 0; y < N; y++) {
    if (grid[IX(0, y)] === HEALTHY) {
      points.push(new THREE.Vector3(-N/2 * CELL_SIZE, 0.3, (y - N/2) * CELL_SIZE))
    }
    if (grid[IX(N-1, y)] === HEALTHY) {
      points.push(new THREE.Vector3((N/2) * CELL_SIZE, 0.3, (y - N/2) * CELL_SIZE))
    }
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.PointsMaterial({ color: 0xff2222, size: 0.4, transparent: true, opacity: 0.6 })
  scene.add(new THREE.Points(geo, mat))
}

function updateMeshes() {
  const dummy = new THREE.Object3D()
  const counts = {}

  for (const type of [HEALTHY, PRETUMOR, TUMOR, DEAD, IMMUNE]) {
    cellMeshes[type].count = 0
    counts[type] = 0
  }

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const type = grid[IX(x, y)]
      if (type === EMPTY) continue
      const mesh = cellMeshes[type]
      const idx = mesh.count
      dummy.position.set((x - N/2) * CELL_SIZE, 0, (y - N/2) * CELL_SIZE)
      dummy.scale.setScalar(1 + (type === TUMOR ? 0.2 * Math.sin(time * 2 + x * 0.3) : 0))
      dummy.rotation.y = type === IMMUNE ? time * 2 : time * 0.1 * type
      dummy.updateMatrix()
      mesh.setMatrixAt(idx, dummy.matrix)
      mesh.count++
      counts[type] = (counts[type] || 0) + 1
    }
  }

  for (const type of [HEALTHY, PRETUMOR, TUMOR, DEAD, IMMUNE]) {
    cellMeshes[type].instanceMatrix.needsUpdate = true
  }

  // Update info display
  const info = document.getElementById('info')
  if (info) {
    info.textContent = `Tumor CA · Gen ${generation} · T:${counts[TUMOR]||0} P:{counts[PRETUMOR]||0} H:{counts[HEALTHY]||0} I:{counts[IMMUNE]||0} · Click add tumor`
  }
}

function countNeighbors(x, y, state) {
  let count = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const xi = (x + dx + N) % N, yi = (y + dy + N) % N
      if (grid[IX(xi, yi)] === state) count++
    }
  }
  return count
}

function CA_step() {
  const newGrid = new Uint8Array(grid)
  generation++

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = IX(x, y)
      const state = grid[i]
      const tumorNeighbors = countNeighbors(x, y, TUMOR)
      const healthyNeighbors = countNeighbors(x, y, HEALTHY)
      const immuneNeighbors = countNeighbors(x, y, IMMUNE)

      if (state === EMPTY) {
        // Empty can become pretumor or healthy
        if (tumorNeighbors > 0 && Math.random() < proliferationRate * tumorNeighbors * nutrientLevel) {
          newGrid[i] = PRETUMOR
        } else if (healthyNeighbors > 0 && Math.random() < 0.01) {
          newGrid[i] = HEALTHY
        }
      } else if (state === PRETUMOR) {
        // Pretumor -> tumor with some probability
        if (Math.random() < proliferationRate * 0.5) {
          newGrid[i] = TUMOR
        } else if (Math.random() < deathRate) {
          newGrid[i] = DEAD
        }
      } else if (state === TUMOR) {
        // Tumor growth and immune response
        if (immuneNeighbors > 2 && Math.random() < immuneResponse * immuneNeighbors) {
          newGrid[i] = DEAD
        } else if (Math.random() < proliferationRate * nutrientLevel * 0.3) {
          // Spread to neighbors
          const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]
          const dir = dirs[Math.floor(Math.random() * dirs.length)]
          const xi = (x + dir[0] + N) % N, yi = (y + dir[1] + N) % N
          if (grid[IX(xi, yi)] === EMPTY || grid[IX(xi, yi)] === PRETUMOR) {
            newGrid[IX(xi, yi)] = PRETUMOR
          }
        }
      } else if (state === DEAD) {
        // Dead cells can be cleared
        if (Math.random() < 0.02) newGrid[i] = EMPTY
      } else if (state === IMMUNE) {
        // Immune cells reproduce near tumors
        if (tumorNeighbors > 0 && Math.random() < 0.03) {
          const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
          const dir = dirs[Math.floor(Math.random() * dirs.length)]
          const xi = (x + dir[0] + N) % N, yi = (y + dir[1] + N) % N
          if (grid[IX(xi, yi)] === EMPTY) newGrid[IX(xi, yi)] = IMMUNE
        }
        // Immune cells can die
        if (Math.random() < 0.005) newGrid[i] = EMPTY
      }
    }
  }

  grid.set(newGrid)
}

function setupGUI() {
  const gui = new GUI()
  gui.add({ proliferationRate }, 'proliferationRate', 0, 0.1).name('Proliferation Rate')
  gui.add({ deathRate }, 'deathRate', 0, 0.05).name('Death Rate')
  gui.add({ immuneResponse }, 'immuneResponse', 0, 0.1).name('Immune Response')
  gui.add({ nutrientLevel }, 'nutrientLevel', 0.1, 1).name('Nutrient Level')
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
    if (e.code === 'KeyR') {
      generation = 0
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = IX(x, y)
          grid[i] = EMPTY
          if (x === 0 || x === N-1 || y === 0 || y === N-1) grid[i] = HEALTHY
          if (Math.random() < 0.05) grid[i] = IMMUNE
        }
      }
      const cx = Math.floor(N/2), cy = Math.floor(N/2)
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx*dx + dy*dy <= 8) grid[IX(cx+dx, cy+dy)] = TUMOR
        }
      }
    }
  })
  window.addEventListener('click', e => {
    const rect = renderer.domElement.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const gx = Math.floor(nx * 0.5 * N + N/2)
    const gy = Math.floor(ny * 0.5 * N + N/2)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xi = gx + dx, yi = gy + dy
        if (xi > 0 && xi < N-1 && yi > 0 && yi < N-1) {
          grid[IX(xi, yi)] = TUMOR
        }
      }
    }
  })
}

function animate() {
  requestAnimationFrame(animate)
  if (!paused) {
    for (let s = 0; s < 3; s++) CA_step()
    time += 0.016
    updateMeshes()
  }
  controls.update()
  renderer.render(scene, camera)
}

init()
